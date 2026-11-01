# Auditoria del flujo de visitas, auditorias y servicios API para modo offline

Fecha: 2026-10-05
Proyecto: Trust (Prolat)
Alcance: revision de solo lectura del cliente Flutter, los modelos y las vistas Django de visitas, auditorias, evidencias y firmas, como base para el modo offline con cola de sincronizacion (revision 2026-W43, #3).
Commit base revisado: `ad9f945` (`fix(frontend): inicializar origen fijo al crear accion correctiva`).
Modo: no se modifico codigo de produccion, datos ni servicios. Solo se agrego este documento.

## 1. Resumen ejecutivo

La app Flutter es hoy estrictamente online. No existe base de datos local, cache de entidades, deteccion de conectividad, cola de envio, reintentos ni estado de sincronizacion por elemento. Todo el flujo de visita y auditoria depende de llamadas HTTP sincronicas contra `https://trust.supplymax.net/api`:

1. El login exige red; no hay sesion persistida mas alla del correo y la contrasena guardados para biometria.
2. Las pantallas de inicio cargan visitas, auditorias, dosificadores y dashboard desde la API; sin red muestran un error y no hay datos de respaldo.
3. El boton "Iniciar" exige un `PATCH` en linea y GPS. Sin red no se puede comenzar la visita ni la auditoria, por lo que tampoco se puede capturar nada.
4. Fotos, videos y firma viven solo en memoria y en archivos temporales del dispositivo. Si la app se cierra o el telefono se queda sin bateria, se pierde todo.
5. La finalizacion envia un unico `PATCH` multipart con el informe completo, la firma en base64 y hasta 4 evidencias. Si falla la red antes de la respuesta, no hay reintento ni forma de saber si el servidor alcanzo a guardar.
6. El backend no tiene versionado, marca de tiempo de cliente, idempotencia ni log de sincronizacion. Un reintento despues de un exito parcial devuelve 400 porque el estado ya es `completed`.

Conclusion: habilitar offline no es un ajuste de la capa HTTP; requiere una capa local nueva (entidades, archivos, cola y log) y cambios de contrato en el backend para idempotencia y resolucion de conflictos.

## 2. Inventario de entidades

### 2.1 Entidades del servidor

| Entidad | Modelo | Campos relevantes | Medios asociados |
| --- | --- | --- | --- |
| Visita | `Visit` (`backend/core/models.py:146`) | `area`, `dispenser`, `inspector`, `visited_at`, `visit_type`, `status` (`scheduled`/`completed`), `started_at`, `completed_at`, coordenadas de inicio/fin, `visit_report` (JSON) | `VisitMedia` (`models.py:197`), FK `visit`, `media_type`, `file` |
| Auditoria | `Audit` (`models.py:224`) | `area`, `form`, `form_name`, `form_schema` (copia del esquema), `inspector`, `audited_at`, `status`, `started_at`, `completed_at`, coordenadas, `audit_report` (JSON) | `AuditMedia` (`models.py:262`) |
| Plantilla de auditoria | `AuditForm` (`models.py:209`) | `name`, `schema` JSON, `is_active` | Ninguno |
| Incidencia | `Incident` (`models.py:346`) | `client`, `branch`, `area`, `dispenser`, `description`, `created_at` | `IncidentMedia` (`models.py:367`) |

No hay campo `updated_at`, `version`, `revision`, `client_generated_at` ni `sync_id` en `Visit` ni en `Audit`. `VisitMedia` y `AuditMedia` tampoco tienen hash, tamano ni identificador de cliente.

### 2.2 Modelos locales en Flutter

| Archivo | Contenido | Persistencia |
| --- | --- | --- |
| `flutter/lib/src/models/visit.dart` | DTO de lectura: id, cliente, sucursal, area, fechas, inspector, estado, tipo, contadores | Ninguna; se reconstruye desde JSON |
| `flutter/lib/src/models/audit.dart` | DTO de lectura: id, cliente, sucursal, area, inspector, fechas, estado, `form_schema`, `audit_report` | Ninguna |
| `flutter/lib/src/models/incident.dart` | DTO de incidencia y medios | Ninguna |

No existen modelos para "visita en curso", "respuesta de checklist", "firma", "evidencia pendiente" ni "operacion de cola". El estado de captura vive en variables de `State` (`_evidenceFiles`, `_answers`, `_checklistDispensers`, `_signatureController`).

`flutter/pubspec.yaml:7-31` no incluye `sqflite`, `drift`, `hive`, `isar`, `shared_preferences`, `path_provider`, `connectivity_plus` ni `workmanager`. Solo `flutter_secure_storage` (`pubspec.yaml:29`), usado exclusivamente en `login_screen.dart:445-447` para recordar correo y contrasena de biometria; no guarda datos operativos.

## 3. Contrato API actual

Base: `ApiClient.baseUrl` (`flutter/lib/src/services/api_client.dart:8-11`), configurable con `--dart-define=TRUST_API_BASE_URL` y por defecto `https://trust.supplymax.net/api`.

Autenticacion: cabecera `X-Current-User-Email` con el correo del usuario (`api_client.dart:172-182`). No hay token de sesion ni expiracion. El backend resuelve el usuario con `_get_current_user` (`backend/core/views.py:174`). Se envia `X-CSRFToken` cuando se obtuvo de `GET /csrf/`, pero las vistas moviles y de login son `@csrf_exempt`; el token no es un requisito real para ellas.

Rutas declaradas en `backend/core/urls.py`:

| Metodo y ruta | Vista | Uso en Flutter | Respuesta |
| --- | --- | --- | --- |
| `POST /login/` | `login` (`views.py:5001`) | `ApiClient.login` (`api_client.dart:45`) | `{user: {...}}`; acepta `fcm_token` y `device_type` |
| `GET /csrf/` | `csrf_token` (`views.py:3021`) | `_ensureCsrfToken` (`api_client.dart:141`) | `{csrf_token}` |
| `GET /visits/` | `visits` (`views.py:3859`) | `loadVisits`, `loadVisitsByMonth`, `loadVisitReportData` | `{results: [visita]}`; filtro `?month=YYYY-MM` |
| `PATCH /visits/<id>/mobile-flow/` | `visit_mobile_flow` (`views.py:3960`) | `startVisit`, `completeVisit` | visita serializada |
| `GET /audits/` | `audits` (`views.py:4155`) | `loadAudits`, `loadAuditsByMonth`, `loadAuditReportData` | `{results: [auditoria]}` |
| `PATCH /audits/<id>/mobile-flow/` | `audit_mobile_flow` (`views.py:4244`) | `startAudit`, `completeAudit` | auditoria serializada |
| `POST /audits/` | `audits` | `createAudit` | auditoria creada, 201 |
| `GET /audits/forms/` | `audit_forms` (`views.py:4082`) | No usado por la app movil | `{results: [...]}` |
| `GET /audits/forms/<id>/` | `audit_form_detail` (`views.py:4114`) | No usado por la app movil | plantilla |
| `GET /incidents/` | `incidents` (`views.py:4815`) | `loadIncidents` | `{results: [incidencia]}` |
| `POST /incidents/` | `incidents` | `createIncident` | incidencia creada, 201; JSON o multipart |
| `GET /incidents/<id>/` | `incident_detail` (`views.py:4890`) | `loadIncidentById` | incidencia |
| `POST /incidents/<id>/schedule-visit/` | `incident_schedule_visit` (`views.py:4904`) | `scheduleVisitFromIncident` | visita creada y la incidencia se elimina |
| `GET /dispensers/`, `/products/`, `/nozzles/`, `/areas/`, `/branches/`, `/clients/` | catalogos | checklist y formularios | `{results: [...]}` |
| `GET /visits/<id>/report`, `/audits/<id>/report` | PDF | `downloadVisitReportPdf`, `downloadAuditReportPdf` | PDF binario |
| `GET /notifications/` | `notifications` (`views.py:4768`) | `loadNotifications` | `{results: [...]}` |
| `POST /register-fcm/` | `register_fcm_token` (`views.py:4983`) | No se llama; el token va en `POST /login/` | 200 |

Serializacion de visita (`views.py:939-989`): incluye `id`, `client`, `client_id`, `branch`, `branch_id`, `area`, `area_id`, `area_dispensers_count`, `dispenser`, `dispenser_id`, `inspector`, `inspector_id`, `visited_at`, `notes`, `visit_type`, `visit_type_label`, `status`, `status_label`, `started_at`, `completed_at`, coordenadas, `visit_report`, `dispenser_reports` y `media` (`id`, `type`, `file`). Si una visita programada ya paso de fecha, el estado serializado se transforma en `overdue` solo para lectura.

Serializacion de auditoria (`views.py:1002-1050`): agrega `form_id`, `form_name`, `form_schema`, `audited_at` y `audit_report`, con la misma estructura de medios.

### 3.1 Payload de inicio de visita

`TrustRepository.startVisit` (`trust_repository.dart:489-505`):

```json
{
  "action": "start",
  "start_latitude": -12.046374,
  "start_longitude": -77.042793
}
```

El backend exige usuario con rol `inspector` (`views.py:3962`), visita existente y dentro del alcance, estado `scheduled` y ambas coordenadas (`views.py:3988-4005`). Guarda `started_at`, coordenadas e inspector. No acepta inicio repetido: un segundo `start` devuelve 400.

### 3.2 Payload de finalizacion de visita

`TrustRepository.completeVisit` (`trust_repository.dart:507-539`) usa JSON si no hay archivos y multipart si los hay. El informe enviado por `visit_execution_screen.dart:866-884` es:

```json
{
  "action": "complete",
  "end_latitude": -12.046374,
  "end_longitude": -77.042793,
  "visit_report": {
    "checklist": [
      {
        "id": "dispenser-12",
        "label": "D-01",
        "location": "Sotano",
        "checked": true,
        "comment": "Sin observaciones",
        "photo_count": 2,
        "photo": null
      }
    ],
    "comments": "Texto libre",
    "location_verified": true,
    "responsible_name": "Nombre del responsable",
    "responsible_signature": "data:image/png;base64,<PNG>"
  }
}
```

En multipart, `visit_report` viaja como string JSON y los archivos usan el campo `evidence_files` (`visit_execution_screen.dart:864`, `views.py:4042`). El backend acepta tambien el alias `evidence`.

Validaciones del backend antes de guardar (`views.py:4010-4035`): estado `scheduled`, `started_at` existente, coordenadas finales, informe JSON valido, `location_verified` verdadero, nombre y firma no vacios. Luego sobrescribe `status`, `completed_at`, coordenadas y `visit_report`, y crea un `VisitMedia` por archivo.

### 3.3 Payload de auditoria

Inicio (`trust_repository.dart:106-122`): mismo contrato que visita con `action: "start"` y coordenadas.

Finalizacion (`trust_repository.dart:124-156`): `action: "complete"`, coordenadas finales y `audit_report`:

```json
{
  "answers": [
    {
      "id": 1,
      "label": "Pregunta",
      "response_type": "yes_no",
      "value": "Si",
      "question_weight": 10,
      "response_scores": {"Si": 10, "No": 0}
    }
  ],
  "comments": "Texto libre",
  "location_verified": true,
  "responsible_name": "Nombre del responsable",
  "responsible_signature": "data:image/png;base64,<PNG>"
}
```

El backend agrega al informe el formulario completo, ubicaciones de inicio/fin, el analisis `ai_analysis` generado con DeepSeek, `score` y `summary` (`views.py:4300-4320`). Es decir, el servidor enriquece el documento; el cliente no puede reconstruir ese resultado sin red.

## 4. Flujo de captura actual

### 4.1 Visita (`flutter/lib/src/screens/visit_execution_screen.dart`)

1. `_loadData` (`:585`) pide la visita y todos los dosificadores antes de mostrar el checklist. Si falla, muestra "Error cargando visitas" y deja la pantalla sin datos.
2. Paso 1, ubicacion: `_onStartVisit` (`:639`) pide permisos, obtiene GPS con `_validatePhoneLocation` (`:1001`) y llama `startVisit`. Sin respuesta exitosa, `_locationValidated` queda en falso y no se avanza.
3. Paso 2, checklist: por cada dosificador se registran `checked`, comentario y hasta 4 fotos (`:331-427`). Las fotos se comprimen a JPEG de hasta 10 MB (`:748-786`).
4. Paso 3, evidencias: hasta 4 fotos o videos de 10 MB (`:47-48`, `:715-747`). Se guardan como `File` en memoria; no se copian a un directorio persistente propio.
5. Paso 4, firma: `SignatureController` en memoria (`:37`), nombre del responsable, confirmacion de ubicacion y comentarios.
6. `_finishVisit` (`:818`) valida firma y nombre, vuelve a pedir GPS, arma la lista de archivos (evidencias generales mas fotos por dosificador), envia `completeVisit` y solo entonces muestra exito y ofrece el PDF.

Observacion critica: el checklist conserva `photo_count` pero envia `photo: null` (`:848-849`). Todos los archivos se concatenan en `evidence_files` (`:855-856`) sin un identificador que los relacione con el dosificador. El servidor no puede reconstruir que foto corresponde a que item.

### 4.2 Auditoria (`flutter/lib/src/screens/audit_execution_screen.dart`)

1. Las preguntas se construyen desde `widget.audit.formSchema` en `_loadQuestions` (`:77`). No se recarga la auditoria desde el servidor.
2. Paso 1: `_onStartAudit` (`:344`) exige GPS y `startAudit` en linea.
3. Paso 2: respuestas obligatorias en memoria.
4. Paso 3: hasta 4 evidencias (`:45-46`, `:560-586`), con el mismo esquema de compresion.
5. Paso 4: firma y nombre; `_finishAudit` (`:394`) envia `completeAudit` con `audit_report` y `evidence_files`.
6. La barra de progreso (`_startUploadProgress`, `:518-547`) es simulada con un `Timer` que avanza hasta 92 por ciento; no refleja bytes ni estado real de subida. Si falla, se oculta y se muestra el error.

### 4.3 Firma y comprobante

- La firma no tiene endpoint propio. Se serializa como PNG base64 dentro de `visit_report.responsible_signature` o `audit_report.responsible_signature` (`visit_execution_screen.dart:882`, `audit_execution_screen.dart:443`).
- El "comprobante" es el PDF que se genera en el servidor (`Comprobante de Visita`, `views.py:1568`) y se descarga con `GET /visits/<id>/report` o `/audits/<id>/report`. No existe una entidad local de comprobante ni se guarda una copia al finalizar.

## 5. Puntos de fallo sin conexion

| Punto | Ubicacion | Comportamiento actual sin red | Impacto |
| --- | --- | --- | --- |
| Login | `login_screen.dart:259-290` | `POST /login/` lanza excepcion; no hay verificacion local | No se puede entrar ni siquiera con biometria |
| Carga de inicio | `home_screen.dart:150-169` | `Future.wait` de visitas y auditorias falla completo | Dashboard vacio con texto de error |
| Detalle de visita | `visit_execution_screen.dart:585-638` | Falla `loadVisitById` o `loadDispensers` | No se muestra checklist ni datos del area |
| Inicio de visita | `visit_execution_screen.dart:639-669` | Falla el `PATCH` | No se habilita la captura |
| Inicio de auditoria | `audit_execution_screen.dart:344-368` | Falla el `PATCH` | No se habilita la captura |
| Captura de fotos/video | `visit_execution_screen.dart:715-786`; `audit_execution_screen.dart:560-599` | La captura funciona, pero el archivo queda en cache temporal y en memoria | Se pierde al cerrar la app o al limpiar cache |
| Firma | `visit_execution_screen.dart:37`; `audit_execution_screen.dart:35` | Vive solo en el controlador de UI | Se pierde al cerrar la app |
| Finalizacion | `visit_execution_screen.dart:818-887`; `audit_execution_screen.dart:394-451` | Un unico intento; excepcion de red descarta el envio | Trabajo perdido; no hay reintento |
| Respuesta perdida | `views.py:4010-4075` y `:4290-4358` | El servidor pudo guardar y el cliente no recibio respuesta | Reintento devuelve 400 por estado `completed` |
| PDF/comprobante | `trust_repository.dart:608-642` | Requiere red | No hay comprobante offline |
| Notificaciones push | `push_notification_service.dart:13-80` | Solo primer plano; no hay handler de fondo ni cache | Avisos perdidos sin conexion |
| CSRF | `api_client.dart:141-170` | `_csrfChecked` se marca antes de la peticion y no se reintenta | Si el primer `GET /csrf/` falla, no se vuelve a pedir en toda la sesion |

Ademas, `ApiClient` no configura timeouts. Una peticion en una red inestable puede quedar colgada indefinidamente y el usuario solo ve "Finalizando..." sin salida.

## 6. Concurrencia y resolucion de conflictos

El requisito pide priorizar "la version mas reciente del tecnico". Hoy el contrato no permite implementarlo:

1. No hay identificador de version ni `updated_at` en `Visit`/`Audit`. La unica marca es `started_at`/`completed_at`, que el servidor escribe con su propio reloj.
2. `visit_mobile_flow` y `audit_mobile_flow` solo permiten `complete` si el estado es `scheduled`. El servidor no compara informes ni acepta una version nueva sobre una completada.
3. El cliente no envia `client_completed_at`, `device_id`, `sync_id` ni un contador de revision.
4. No existe log de sincronizacion ni historial de versiones del informe. La ultima escritura del servidor reemplaza el JSON completo; no hay merge por pregunta ni por item de checklist.
5. La unica "prioridad" posible hoy seria la del primer envio que llegue, no la del tecnico con el dato mas reciente.

Para cumplir el requisito se necesita, como minimo:

- `client_report_id` (UUID generado en el dispositivo) y `client_completed_at` en el payload.
- Indice unico por `client_report_id` para idempotencia: si llega dos veces, devolver el mismo resultado en vez de 400.
- Campo `revision` o `server_updated_at` devuelto por la API y enviado por el cliente.
- Regla explicita: si el `client_completed_at` entrante es mayor que el ultimo aplicado y el estado permite correccion, aceptar y guardar la version anterior en un historial; si es menor, responder 409 con la version vigente.
- Log de sincronizacion con `sync_id`, entidad, id remoto, accion, intento, resultado, codigo HTTP, mensaje y timestamps de dispositivo/servidor.

## 7. Propuesta de capa local y cola (siguiente fase)

Entidades locales sugeridas (SQLite o Drift, con archivos en `ApplicationDocumentsDirectory`):

| Tabla | Proposito | Campos clave |
| --- | --- | --- |
| `local_visits` | Copia de visitas asignadas y estado local | `server_id`, `area_id`, `status`, `payload_json`, `fetched_at` |
| `local_audits` | Copia de auditorias y esquema | `server_id`, `form_schema_json`, `payload_json`, `fetched_at` |
| `visit_drafts` | Visita en curso | `client_report_id`, `server_id`, `started_at`, `start_lat/lng`, `answers_json`, `signature_path`, `status` |
| `audit_drafts` | Auditoria en curso | equivalente a `visit_drafts` |
| `evidence_files` | Evidencias y firmas | `client_report_id`, `local_path`, `mime`, `bytes`, `sha256`, `kind`, `dispenser_id`, `uploaded` |
| `sync_queue` | Operaciones pendientes | `id`, `entity`, `operation`, `client_report_id`, `payload_json`, `attempts`, `next_retry_at`, `last_error`, `state` (`pending`/`syncing`/`synced`/`error`) |
| `sync_log` | Bitacora | `sync_id`, `entity`, `server_id`, `http_status`, `result`, `message`, `created_at` |

Reglas de implementacion:

1. Guardar el borrador en cada cambio de paso, no solo al finalizar. La firma se escribe como PNG en disco al confirmarla.
2. Encolar `start` y `complete` como operaciones separadas; el `start` debe poder resolverse al reconectar antes del `complete`.
3. Reintentos con backoff exponencial y limite; estados visibles `pendiente`, `sincronizado`, `error` por elemento.
4. Disparar la cola al recuperar conectividad y al abrir la app, no solo con un boton manual.
5. Descargar catalogos y asignaciones al iniciar sesion para que el checklist y las preguntas funcionen sin red.
6. No borrar archivos locales hasta confirmar `200` con el `client_report_id` aceptado; si el servidor responde 409, conservar la version local y mostrar conflicto.
7. Registrar en `sync_log` cada intento, incluidos los fallidos, y exponerlo en una pantalla de diagnostico.

## 8. Verificacion realizada

Comandos ejecutados en el workspace, sin tocar produccion:

```text
$ git rev-parse --short HEAD
ad9f945

$ cd flutter && export PATH=/opt/flutter-sdk/flutter/bin:$PATH && flutter --version
Flutter 3.47.9 • channel stable
Tools • Dart 3.13.7 • DevTools 2.60.0

$ flutter pub get
Changed 4 dependencies!
103 packages have newer versions incompatible with dependency constraints.

$ flutter analyze
Analyzing flutter...
No issues found! (ran in 20.1s)
```

Nota: `flutter pub get` actualizo cuatro dependencias transitivas en `flutter/pubspec.lock` (`matcher`, `meta`, `test_api`, `vector_math`) y el SDK minimo de Dart a `>=3.11.0-0`. Ese cambio no forma parte de esta auditoria y se revirtio; `flutter analyze` se repitio despues de restaurar el lock y volvio a pasar sin observaciones (11.7 s).

No se modifico el backend ni se ejecutaron migraciones. La revision de contratos se hizo por lectura de `backend/core/urls.py`, `backend/core/views.py` y `backend/core/models.py`.

## 9. Riesgos y decisiones pendientes

1. **Tamano de evidencias**: 4 archivos de hasta 10 MB por reporte implican hasta 40 MB por envio. La cola debe trocear o subir archivos por separado para no repetir toda la carga ante un fallo.
2. **Mapeo foto-dosificador**: hoy se pierde. Es necesario enviar `dispenser_id` o `checklist_item_id` por archivo, o un manifiesto JSON de evidencias.
3. **Firma en JSON**: un PNG base64 dentro del JSON duplica el tamano y no se puede reanudar. Conviene subirla como archivo multipart con su propio estado.
4. **Enriquecimiento del servidor**: `audit_report` se completa con `ai_analysis` y `score` en el servidor. El cliente debe mostrar el reporte como "pendiente de procesamiento" hasta sincronizar, no simular un resultado local.
5. **Idempotencia**: sin `client_report_id` la cola no puede distinguir "no llego" de "llego y se perdio la respuesta". Es el cambio de backend mas urgente.
6. **Sesion offline**: guardar la contrasena para biometria no sustituye una sesion local. Se necesita una sesion de dispositivo con expiracion y un modo offline explicito, no reutilizar credenciales.
7. **Comprobantes**: si el cliente exige un comprobante visible sin red, debe generarse un PDF local preliminar y reemplazarse por el oficial al sincronizar; hoy solo existe el PDF del servidor.
