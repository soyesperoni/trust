# Auditoria de acciones correctivas: modelos, notificaciones y superficie real

Fecha: 2026-10-05
Proyecto: Trust (Prolat)
Alcance: revision de solo lectura de `backend/core/models.py`, `backend/core/views.py`,
`backend/core/urls.py`, `backend/core/fcm_manager.py`, las pantallas web de incidencias,
visitas y auditorias, y verificacion en produccion con sesion existente.
Revision solicitada: 2026-W43 (#3).
Commit base de produccion verificado: `3531fe4`.
Commit base del workspace: `26ef37a`.

No se modifico codigo, configuracion, datos ni servicios de produccion en esta fase.
Este documento es el unico artefacto nuevo y sirve de base para la implementacion.

## 1. Resumen ejecutivo

La plataforma ya tiene el ciclo de deteccion (incidencias, visitas y auditorias) y la
evidencia asociada, pero no tiene el ciclo de cierre. No existe un modelo de accion
correctiva, no hay responsable ni fecha limite sobre incidencias o hallazgos, y el
estado de una incidencia no puede cambiar: `Incident` solo guarda `description` y
`created_at`.

Las tres pantallas indicadas en la tarea existen y son las que ve el usuario en
produccion. Las tres cargan sus datos desde la API y ya tienen un punto natural para
insertar el bloque de acciones correctivas. La autenticacion web no usa cookie de
Django: el frontend envia `x-current-user-email` desde `localStorage`. Por eso una
prueba con `force_login()` debe acompanarse de esa cabecera.

Brechas principales:

1. Falta `CorrectiveAction` y su evidencia de cierre.
2. `Incident` no tiene estado, responsable, fecha limite ni historial de cierre.
3. Los informes de visita y auditoria muestran observaciones y recomendaciones, pero
   no permiten convertirlas en acciones con seguimiento.
4. Las notificaciones existentes son eventos de creacion/finalizacion. No hay
   recordatorio de vencimiento ni marca de envio para evitar duplicados.
5. El listado de incidencias no tiene filtros por estado, responsable ni fecha porque
   esos campos no existen hoy.

## 2. Superficie real verificada

### 2.1 Rutas y componentes

| Funcion | Ruta publica | Archivo real | Fuente de datos |
| --- | --- | --- | --- |
| Detalle de incidencia | `/clientes/incidencias/<id>/detalle` | `frontend/src/app/clientes/incidencias/[id]/detalle/page.tsx` | `GET /api/incidents/<id>/` |
| Informe de visita | `/clientes/visitas/<id>/informe` | `frontend/src/app/clientes/visitas/[id]/informe/page.tsx` | `GET /api/visits/` y `GET /api/dispensers/` |
| Informe de auditoria | `/clientes/auditorias/<id>/informe` | `frontend/src/app/clientes/auditorias/[id]/informe/page.tsx` | `GET /api/audits/` |
| Login | `/` | `frontend/src/app/page.tsx` | `POST /api/login/` |

No hay desajuste entre las rutas de la tarea y las pantallas reales. Las tres rutas
autenticadas renderizan el encabezado correcto y no presentan desbordamiento
horizontal en 1366x768 ni en 390x844.

### 2.2 Modelo de sesion web

- `frontend/src/app/lib/session.ts` guarda el usuario en
  `localStorage["trust.currentUser"]`.
- `getSessionUserEmail()` devuelve el correo y cada pagina lo envia en la cabecera
  `x-current-user-email`.
- `backend/core/views.py:169-173` (`_get_current_user`) resuelve el usuario solo por
  esa cabecera. No consulta `request.user` ni la sesion de Django.
- `AppShell` exige `hasSessionUser()` y aplica listas de rutas permitidas por rol en
  `frontend/src/app/lib/permissions.ts`.

Consecuencia para pruebas: `Client().force_login(user)` autentica el cliente de
Django, pero la API de Trust ignora esa sesion. La prueba autenticada debe enviar
tambien `HTTP_X_CURRENT_USER_EMAIL`. En navegador basta sembrar
`localStorage["trust.currentUser"]` con un usuario real, sin contrasena.

### 2.3 Verificacion en navegador real

Se uso Chromium headless con Playwright, viewports 1366x768 y 390x844, sobre
`https://trust.supplymax.net`. Se abrio el login sin sesion y luego se sembro el
usuario real `admin@gmail.com` (`general_admin`) en `localStorage`.

Resultado:

```text
desktop 1366x768
/                                  h1 "Bienvenido de nuevo"       overflow false
/clientes/incidencias/3/detalle    h1 "Incidencia #3"             overflow false
/clientes/visitas/24/informe       h1 "Informe técnico de visita #24" overflow false
/clientes/auditorias/27/informe    h1 "Informe de Auditoría #27"  overflow false

mobile 390x844
/                                  h1 "Bienvenido de nuevo"       overflow false
/clientes/incidencias/3/detalle    h1 "Incidencia #3"             overflow false
/clientes/visitas/24/informe       h1 "Informe técnico de visita #24" overflow false
/clientes/auditorias/27/informe    h1 "Informe de Auditoría #27"  overflow false
```

Las capturas revisadas confirman:

- Login centrado y legible en escritorio.
- Detalle de incidencia en movil con barra superior, tarjeta de titulo y tarjetas
  apiladas; sin scroll horizontal.
- Informe de visita en escritorio con barra lateral, boton PDF y aviso de informe no
  registrado. Las visitas 24 y auditoria 27 estan programadas, por eso el PDF esta
  deshabilitado. Para una prueba funcional de cierre deben usarse visitas
  finalizadas (por ejemplo 23) y auditorias finalizadas (por ejemplo 18).

Comandos ejecutados en el servidor para la prueba autenticada de API:

```bash
cd /opt/trust/backend
.venv/bin/python manage.py shell -c "
from django.test import Client
from core.models import User
u=User.objects.get(email='admin@gmail.com')
c=Client(); c.force_login(u)
h={'HTTP_X_CURRENT_USER_EMAIL':u.email,'HTTP_HOST':'localhost'}
r1=c.get('/api/incidents/3/',**h)
r2=c.get('/api/visits/',**h)
r3=c.get('/api/audits/',**h)
print('incident',r1.status_code,sorted(r1.json().keys()))
print('visits',r2.status_code,len(r2.json().get('results',[])))
print('audits',r3.status_code,len(r3.json().get('results',[])))
"
```

Salida:

```text
incident 200 ['area', 'area_id', 'branch', 'branch_id', 'client', 'client_id', 'created_at', 'description', 'dispenser', 'dispenser_id', 'id', 'media']
visits 200 9
audits 200 11
```

Nota: `HTTP_HOST` debe ser `localhost`; el `ALLOWED_HOSTS` de produccion rechaza
`testserver` y `trust.supplymax.net` en el cliente de pruebas.

## 3. Modelos y relaciones actuales

### 3.1 Jerarquia de ubicacion

```text
Client 1---N Branch 1---N Area 1---N Dispenser
                              |
                              +---N Visit
                              +---N Audit
                              +---N Incident
```

`Incident`, `Visit` y `Audit` llegan a la ubicacion por `area`; `Incident` ademas
guarda `client` y `branch` de forma directa con `on_delete=PROTECT`.

### 3.2 Incidencia

`backend/core/models.py:346-379`

| Campo | Tipo | Observacion |
| --- | --- | --- |
| `client` | FK `Client`, PROTECT | obligatorio |
| `branch` | FK `Branch`, PROTECT | obligatorio |
| `area` | FK `Area`, PROTECT | obligatorio |
| `dispenser` | FK `Dispenser`, SET_NULL | opcional |
| `description` | TextField | obligatorio |
| `created_at` | DateTime auto_now_add | sin `updated_at` |

`IncidentMedia` (`models.py:367-379`) tiene `incident` (CASCADE), `media_type`
(`photo`/`video`), `file` (`FileField`, `incidents/media/`) y `description`.
Es el patron a replicar para la evidencia de cierre.

No existen `status`, `responsible`, `due_date`, `closed_at` ni historial. La
incidencia es hoy un registro inmutable de deteccion.

### 3.3 Visita

`backend/core/models.py:146-195`

- `area` (CASCADE), `dispenser` (SET_NULL), `inspector` (SET_NULL).
- `visited_at`, `notes`, `visit_type` (`technical`/`commercial`).
- `status` (`scheduled`/`completed`), `started_at`, `completed_at`, coordenadas.
- `visit_report` JSON con `comments`, `responsible_name`,
  `responsible_signature`, `checklist` y reportes por dosificador.
- `VisitMedia` (`models.py:197-210`) con `visit` (CASCADE), `media_type`
  (`photo`/`video`/`other`) y `file` (`visits/media/`).

Los hallazgos de una visita no estan estructurados: viven en texto libre dentro de
`visit_report.comments`, `notes` y `dispenser_reports[].comment`.

### 3.4 Auditoria

`backend/core/models.py:224-274`

- `area` (CASCADE), `form` (PROTECT), `form_name`, `form_schema`.
- `inspector` (SET_NULL), `audited_at`, `notes`, `status`
  (`scheduled`/`completed`), coordenadas.
- `audit_report` JSON con respuestas, `ai_analysis` (`score`,
  `executive_summary`, `strengths`, `risks`, `recommendations`, `next_steps`,
  `business_impact`, `context_notes`) y datos del responsable.
- `AuditMedia` (`models.py:262-274`) con `audit` (CASCADE), `media_type` y
  `file` (`audits/media/`).

Tampoco existe una entidad `Finding`. Los riesgos y recomendaciones son listas de
texto generadas por el analisis, no registros con ID. Por eso la accion correctiva
debe guardar una copia legible del hallazgo (`finding_reference`) y, si se quiere
trazabilidad exacta, el indice o ruta JSON de origen.

### 3.5 Usuario y alcance

`backend/core/models.py:381-396`

- `role`: `general_admin`, `account_admin`, `branch_admin`, `inspector`.
- `clients`, `branches`, `areas`: M2M que definen el alcance.
- `_build_access_scope()` (`views.py:194-234`) devuelve `None` para
  `general_admin` e `inspector` (sin restriccion) y conjuntos de IDs para
  `account_admin` y `branch_admin`.
- `_filter_queryset_by_scope()` (`views.py:240-252`) aplica el filtro por
  `area_id`, `branch_id` o `client_id`.

Para que el listado de acciones correctivas respete el alcance sin consultas
polimorficas, el modelo debe guardar `area` de forma directa y poblarla desde la
incidencia, visita o auditoria de origen.

### 3.6 Notificaciones existentes

- `backend/core/fcm_manager.py`: `send_push_notification(user, ...)` y
  `send_push_notification_to_devices(devices, ...)`; usa `FirebaseConfig` activo y
  `FCMDevice.registration_id`.
- `_send_area_push_notification()` (`views.py:331-361`) busca usuarios activos por
  area, sucursal o cliente y envia a todos sus dispositivos.
- `_send_email_async()` (`views.py:503-507`) lanza un hilo.
- `send_gmail_notification()` (`views.py:460-501`) usa `GmailAPISettings` con
  `refresh_token`; devuelve `False` si no hay token o si Gmail falla.
- `_process_incident_created_email()` (`views.py:600-638`) y los procesos de visita
  y auditoria notifican a todos los usuarios relacionados con el area.
- `GET /api/notifications/` (`views.py:4340-4385`) no lee una tabla de
  notificaciones: arma la lista con visitas e incidencias recientes.

No hay Celery ni cola de tareas en Trust. Los recordatorios de vencimiento deben
ser un comando de gestion idempotente ejecutado por cron o systemd timer.

## 4. Modelo propuesto

### 4.1 `CorrectiveAction`

```python
class CorrectiveAction(models.Model):
    class Origin(models.TextChoices):
        INCIDENT = "incident", "Incidencia"
        FINDING = "finding", "Hallazgo"

    class Status(models.TextChoices):
        OPEN = "open", "Abierta"
        IN_PROGRESS = "in_progress", "En curso"
        CLOSED = "closed", "Cerrada"

    origin = models.CharField(max_length=20, choices=Origin.choices)
    incident = models.ForeignKey(
        Incident, on_delete=models.PROTECT, null=True, blank=True,
        related_name="corrective_actions",
    )
    audit = models.ForeignKey(
        Audit, on_delete=models.PROTECT, null=True, blank=True,
        related_name="corrective_actions",
    )
    visit = models.ForeignKey(
        Visit, on_delete=models.PROTECT, null=True, blank=True,
        related_name="corrective_actions",
    )
    area = models.ForeignKey(
        Area, on_delete=models.PROTECT, related_name="corrective_actions",
    )
    finding_reference = models.CharField(max_length=255, blank=True)
    description = models.TextField()
    responsible = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="corrective_actions",
    )
    due_date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True,
    )
    closure_notes = models.TextField(blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="closed_corrective_actions",
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_corrective_actions",
    )
    assigned_notified_at = models.DateTimeField(null=True, blank=True)
    due_reminder_sent_at = models.DateTimeField(null=True, blank=True)
    overdue_notified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

Campos obligatorios del pedido: `origin`, `description`, `responsible`,
`due_date`, `status` y evidencia de cierre. `area` es denormalizacion de alcance,
no un campo de negocio nuevo.

Reglas de integridad:

- `origin=incident` exige `incident` y deja `audit`/`visit` en `NULL`.
- `origin=finding` exige al menos `audit` o `visit`, y deja `incident` en `NULL`.
- `area` debe coincidir con `incident.area`, `audit.area` o `visit.area`; se valida
  en `clean()` y en el serializador.
- `status=closed` exige `closed_at`, `closed_by` y al menos una evidencia con
  `kind=closure`.
- Una accion cerrada no se reabre en esta fase. Si se necesita, se crea una nueva
  accion enlazada al mismo origen.
- `due_date` no puede ser anterior a la fecha de creacion al crear; al editar una
  accion abierta se permite mantener la fecha original.

Indices recomendados:

```text
(status, due_date)
(responsible, status)
(area, status)
(incident), (audit), (visit)
```

### 4.2 `CorrectiveActionMedia`

```python
class CorrectiveActionMedia(models.Model):
    class Kind(models.TextChoices):
        EVIDENCE = "evidence", "Evidencia"
        CLOSURE = "closure", "Evidencia de cierre"

    action = models.ForeignKey(
        CorrectiveAction, on_delete=models.CASCADE, related_name="media",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.EVIDENCE)
    file = models.FileField(upload_to="corrective_actions/media/")
    description = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="corrective_action_media",
    )
    created_at = models.DateTimeField(auto_now_add=True)
```

Se recomienda `FileField` por consistencia con `IncidentMedia`, `VisitMedia` y
`AuditMedia`. La vista debe validar MIME de imagen (`image/jpeg`, `image/png`,
`image/webp`), tamano maximo (por ejemplo 10 MB) y extension. La evidencia de cierre
se sube en el endpoint de cierre, no en un campo suelto, para poder exigir al menos
una foto y registrar quien la subio.

### 4.3 Migracion

- Archivo nuevo: `backend/core/migrations/0022_correctiveaction.py`.
- Dependencia: `("core", "0021_supportticket_target_system")`.
- Operaciones: `CreateModel` de `CorrectiveAction`, `CreateModel` de
  `CorrectiveActionMedia`, `AddIndex` y `AddConstraint`.
- No requiere migracion de datos porque no hay registros previos.
- Registrar ambos modelos en `backend/core/admin.py` con `list_display`,
  `list_filter` y `search_fields`.

## 5. Notificaciones y recordatorios

### 5.1 Asignacion

Se dispara al crear la accion y cuando cambia `responsible`.

- Destinatario: solo `action.responsible`; no se reutiliza
  `_send_area_push_notification()` porque notificaria a toda el area.
- Push: `send_push_notification(responsible, title, body, data)` con
  `data={"event": "corrective_action_assigned", "action_id": str(action.id)}`.
- Correo: nuevo `_process_corrective_action_assigned_email(action_id)` dentro de
  `_send_email_async`, con el patron de `_process_incident_created_email()`.
  Debe comprobar `GmailAPISettings.objects.filter(is_enabled=True).first()` y
  `refresh_token`, y no bloquear la respuesta HTTP.
- Si el responsable no tiene `FCMDevice` o correo, la accion se crea igual y se
  registra el fallo en log. No se debe fallar la transaccion por una notificacion.
- Marcar `assigned_notified_at` solo si al menos un canal tuvo exito; si no, dejar
  `NULL` para permitir reintento.

Texto sugerido:

```text
Titulo: Nueva accion correctiva asignada
Cuerpo: <descripcion corta> · vence <dd/mm/aaaa>
```

### 5.2 Vencimiento

Comando nuevo: `backend/core/management/commands/send_corrective_due_reminders.py`.

Seleccion:

```python
today = timezone.localdate()
due = CorrectiveAction.objects.filter(
    status__in=[CorrectiveAction.Status.OPEN, CorrectiveAction.Status.IN_PROGRESS],
    due_date=today,
    due_reminder_sent_at__isnull=True,
)
overdue = CorrectiveAction.objects.filter(
    status__in=[CorrectiveAction.Status.OPEN, CorrectiveAction.Status.IN_PROGRESS],
    due_date__lt=today,
    overdue_notified_at__isnull=True,
)
```

Para cada accion: push al responsable con `event=corrective_action_due` o
`corrective_action_overdue`, correo con el mismo patron y `update()` del campo de
marca correspondiente. El comando debe ser idempotente y aceptar `--dry-run`.

Programacion recomendada (zona horaria de operacion, no la UTC de Django):

```cron
0 12 * * * cd /opt/trust/backend && .venv/bin/python manage.py send_corrective_due_reminders >> /var/log/trust/corrective_reminders.log 2>&1
```

12:00 UTC equivale a 07:00 en Panama. Alternativa equivalente: systemd timer
diario. La fase de despliegue debe instalar el cron o el timer; el comando por si
solo no envia nada.

### 5.3 Bandeja de notificaciones

`GET /api/notifications/` debe agregar las acciones del usuario actual:

- Asignadas a el y abiertas/en curso.
- Vencidas o que vencen hoy.
- `type="corrective_action"`, `id=f"action-{id}"`, enlace a
  `/clientes/acciones-correctivas?action={id}`.

La bandeja actual no tiene estado leido/no leido persistente. No se debe simular
`unread`; se mantiene `False` como en visitas e incidencias.

## 6. API propuesta

### 6.1 Patron existente

`backend/core/urls.py` usa funciones planas, no `ViewSet`. Las vistas de escritura
combinan `@csrf_exempt` con `@require_http_methods`, extraen datos con
`_extract_user_data()` (soporta JSON y multipart) y responden `JsonResponse`.
Los permisos se resuelven con `_get_current_user()`, `_build_access_scope()` y
`_filter_queryset_by_scope()`.

### 6.2 Endpoints

| Metodo | Ruta | Funcion |
| --- | --- | --- |
| GET, POST | `/api/corrective-actions/` | listar con filtros y crear |
| GET, PATCH, DELETE | `/api/corrective-actions/<id>/` | detalle, edicion y baja |
| POST | `/api/corrective-actions/<id>/close/` | cierre con evidencia multipart |
| GET | `/api/corrective-actions/summary/` | contadores por estado y vencidas |

Filtros de `GET /api/corrective-actions/`:

```text
status=open|in_progress|closed
responsible_id=<id>
due_from=YYYY-MM-DD
due_to=YYYY-MM-DD
origin=incident|finding
incident_id=<id>
audit_id=<id>
visit_id=<id>
search=<texto>
```

Todos los filtros son opcionales y combinables. El orden por defecto es
`due_date`, `id`. El listado debe devolver `count` y `results`.

Respuesta de accion:

```json
{
  "id": 1,
  "origin": "incident",
  "origin_label": "Incidencia",
  "incident_id": 3,
  "audit_id": null,
  "visit_id": null,
  "area_id": 5,
  "area": "BAKERY",
  "branch": "Bella Vista",
  "client": "CLIENTE 1",
  "finding_reference": "",
  "description": "Reemplazar dosificador",
  "responsible_id": 2,
  "responsible": "Admin Admin",
  "due_date": "2026-10-15",
  "status": "open",
  "status_label": "Abierta",
  "is_overdue": false,
  "closure_notes": "",
  "closed_at": null,
  "media": [],
  "created_at": "2026-10-05T12:00:00+00:00"
}
```

### 6.3 Permisos

| Accion | general_admin | branch_admin | inspector | account_admin |
| --- | --- | --- | --- | --- |
| Ver en alcance | si | si | si | si |
| Crear desde incidencia | si | si | no | no |
| Crear desde informe | si | si | si | no |
| Reasignar responsable | si | si | no | no |
| Cambiar estado | si | si | solo asignadas | no |
| Cerrar con evidencia | si | si | solo asignadas | no |
| Eliminar | si | no | no | no |

El alcance se aplica siempre con `area_id`. Un usuario sin acceso al area debe
recibir 403 aunque conozca el ID.

### 6.4 Serializacion y archivos

- `_serialize_corrective_action()` debe incluir nombres legibles de cliente,
  sucursal, area, responsable y origen, no solo IDs.
- `media` debe devolver `id`, `kind`, `file` (URL), `description`,
  `uploaded_by`, `created_at`.
- En `POST /close/`, exigir `closure_notes` no vacio y al menos un archivo en
  `closure_files`. Crear `CorrectiveActionMedia(kind=CLOSURE)` y luego marcar la
  accion como cerrada en una transaccion atomica.
- Validar que la accion no este ya cerrada (409) y que el usuario tenga alcance.
- Limitar tamano y tipo de archivo antes de guardar.

## 7. Puntos de insercion en la interfaz

### 7.1 Detalle de incidencia

Archivo: `frontend/src/app/clientes/incidencias/[id]/detalle/page.tsx`

- Barra superior: linea 113, contenedor `mb-6 flex flex-wrap ...`. Agregar a la
  derecha el boton `Nueva accion correctiva` con icono `task_alt`, visible en
  escritorio y movil.
- Despues de la tarjeta de titulo (linea 133) y antes de `Información general`
  (linea 137): insertar una tarjeta `Acciones correctivas` a ancho completo
  (`xl:col-span-3`) con:
  - contador por estado;
  - lista de acciones vinculadas con responsable, fecha limite y badge de estado;
  - enlace `Ver todas` al listado filtrado por `incident_id`;
  - estado vacio con CTA.
- Mantener el modal de creacion con `origin="incident"` y `incident_id` fijo.
- El campo `description` puede precargarse con la descripcion de la incidencia,
  pero debe ser editable.

### 7.2 Informe de visita

Archivo: `frontend/src/app/clientes/visitas/[id]/informe/page.tsx`

- Barra de acciones: linea 335, junto al boton `Descargar PDF` (linea 343).
  Agregar `Nueva accion correctiva` con `origin="finding"`, `visit_id` fijo y
  `area` tomada de la visita.
- Despues del hero (linea 363-365) y antes del grid (linea 367): insertar tarjeta
  `Acciones correctivas` con `id="acciones-correctivas"` y `xl:col-span-3`.
  Debe listar acciones de la visita y permitir crear desde:
  - observaciones generales (`reportComments`);
  - comentario de un dosificador (`dispenserReportsMap`).
- El selector de hallazgo debe guardar en `finding_reference` una etiqueta como
  `Observacion general` o `Dosificador DOS001`, no el texto completo.
- Si la visita no esta finalizada, se permite crear la accion igualmente, pero el
  modal debe indicar que el informe aun no esta registrado.

### 7.3 Informe de auditoria

Archivo: `frontend/src/app/clientes/auditorias/[id]/informe/page.tsx`

- Barra de acciones: linea 246, junto al boton `Descargar PDF` (linea 254).
  Agregar el mismo CTA con `origin="finding"` y `audit_id` fijo.
- Despues del hero (linea 274-276) y antes del grid (linea 278): insertar tarjeta
  `Acciones correctivas` a ancho completo.
- En el modal, ofrecer como `finding_reference` las entradas de
  `audit_report.ai_analysis.risks`, `recommendations` y `next_steps`, con opcion
  de texto libre. Son listas de texto, no hallazgos con ID.
- Si no hay analisis AI, permitir crear desde las observaciones (`notes`) o desde
  texto libre.

### 7.4 Listado filtrable

Archivo nuevo: `frontend/src/app/clientes/acciones-correctivas/page.tsx`

- Encabezado `DashboardHeader` con titulo `Acciones correctivas`.
- Filtros en una barra superior:
  - estado (`Todas`, `Abierta`, `En curso`, `Cerrada`);
  - responsable (select alimentado por `/api/users/`, solo usuarios del alcance);
  - fecha desde y fecha hasta (`input type="date"`);
  - origen (opcional);
  - boton `Limpiar`.
- Escritorio (1366x768): tabla con columnas Accion, Origen, Responsable,
  Vence, Estado y Evidencia. Las filas vencidas usan badge rojo.
- Movil (390x844): tarjetas apiladas, filtros en grid de una columna y boton
  `Filtrar` a ancho completo. No usar tabla con scroll horizontal.
- Cada fila/tarjeta enlaza al origen y abre el detalle de la accion.
- Boton `Nueva accion` con seleccion de origen manual (incidencia o hallazgo).
- Modal/drawer de cierre con `input type="file" accept="image/*"
  capture="environment"`, preview y notas obligatorias.

### 7.5 Navegacion y permisos

- `frontend/src/app/components/DashboardSidebar.tsx:39-40`: agregar
  `{ icon: "task_alt", label: "Acciones", href: "/clientes/acciones-correctivas",
  accountAdminOnly: true, branchAdminOnly: true }` despues de Incidencias.
- `frontend/src/app/components/MobileBottomNav.tsx:16-20`: agregar una quinta
  entrada `Acciones` con icono `task_alt`. Verificar que a 390 px las cinco
  etiquetas no se corten; si ocurre, usar `Acciones` como etiqueta corta.
- `frontend/src/app/components/AppShell.tsx:27-43`: agregar
  `/clientes/acciones-correctivas` a `navigationPriority` antes de
  `/clientes/incidencias` para que el estado activo sea correcto.
- `frontend/src/app/lib/permissions.ts`: agregar el prefijo a
  `ACCOUNT_ADMIN_ALLOWED_PATH_PREFIXES`, `BRANCH_ADMIN_ALLOWED_PATH_PREFIXES` e
  `INSPECTOR_ALLOWED_PATH_PREFIXES`. No agregarlo a los bloqueos.
- Si el inspector solo debe ver sus acciones, el backend ya lo limita por
  `responsible_id`; la ruta puede permanecer visible.

## 8. Plan de implementacion sugerido

1. Crear modelos y migracion `0022`; registrar en admin; correr
   `python manage.py makemigrations --check` y `manage.py check`.
2. Implementar serializador, filtros, permisos y endpoints en `views.py`/`urls.py`.
3. Implementar notificacion de asignacion y comando de vencimientos con pruebas
   de idempotencia.
4. Crear la pagina de listado y el componente reutilizable de formulario/cierre.
5. Insertar las tarjetas y CTA en las tres pantallas existentes.
6. Actualizar navegacion y permisos de rutas.
7. Probar en Django con usuario real y datos `zz-e2e-`; borrar esos datos al
   terminar. No crear tickets ni mensajes reales.
8. Ejecutar `npm --prefix frontend run build` y las pruebas de backend.
9. Desplegar en la fase 5 y verificar en 1366x768 y 390x844.

## 9. Pruebas recomendadas para la fase de implementacion

Backend:

- Crear accion desde incidencia y comprobar `area` derivada y `origin`.
- Rechazar accion `origin=incident` sin incidencia.
- Rechazar accion `origin=finding` sin visita ni auditoria.
- Rechazar cierre sin foto o sin notas.
- Verificar que un `branch_admin` de otra area recibe 403.
- Verificar filtros por estado, responsable y rango de fechas.
- Verificar que el comando de vencimiento no reenvia si la marca ya existe.
- Mockear `send_push_notification` y `send_gmail_notification` para no enviar
  mensajes reales en las pruebas.

Frontend:

- `npm --prefix frontend run build`.
- Navegador 1366x768: tabla, filtros y modal.
- Navegador 390x844: tarjetas, filtros apilados y ausencia de scroll horizontal.
- Crear accion desde incidencia 3 y desde informe de visita/auditoria; comprobar
  que aparece en el listado y en el origen.

## 10. Observaciones y riesgos

1. La autenticacion es solo por cabecera. Cualquier prueba de API debe enviar
   `x-current-user-email`; `force_login()` por si solo no autentica.
2. `ALLOWED_HOSTS` no incluye `testserver`; usar `HTTP_HOST=localhost` en
   `Client()`.
3. Las visitas 24 y auditoria 27 estan programadas. Para probar cierre usar
   registros finalizados (visita 23, auditoria 18) o crear datos `zz-e2e-`.
4. `GmailAPISettings` puede estar deshabilitado o sin `refresh_token`; el flujo
   debe degradar a push y registrar el fallo, no romper la creacion.
5. No hay Celery. El recordatorio depende de cron o systemd timer; sin eso, el
   comando existe pero no se ejecuta.
6. `GET /api/notifications/` es derivado, no persistente. Agregar acciones no
   requiere migracion de notificaciones, pero tampoco habra historial de leidas.
7. Los hallazgos de auditoria son texto libre. Sin `finding_reference` se pierde
   la conexion legible entre la recomendacion y la accion.
8. El listado debe reutilizar `_filter_queryset_by_scope()` con `area_id`; un
   filtro por relaciones polimorficas seria fragil y mas costoso.
9. La pagina de incidencia ya usa `xl:col-span-3` para sus tarjetas; la nueva
   tarjeta debe seguir ese patron para no romper el grid en 1366 px.
10. No se detectaron desbordamientos horizontales en las pantallas actuales. La
    nueva UI debe mantener ese resultado en 390x844.

## 11. Evidencia de comandos de solo lectura

```bash
cd /root/trust
git status -s
git log --oneline -3
```

Salida relevante:

```text
26ef37a feat(mobile): aviso de correo no autorizado en login
3531fe4 test(mobile): cubrir avisos de estado reutilizables
33cf2bc fix(api): exponer estado de Gmail desde Django
```

```bash
./run_remote.sh 'cd /opt/trust && git rev-parse --short HEAD &&
systemctl is-active trust-backend.service trust-frontend.service'
```

Salida:

```text
3531fe4
active
active
```

```bash
curl -sI https://trust.supplymax.net
```

La comprobacion en navegador se ejecuto con Playwright contra la URL publica y
los resultados se transcriben en la seccion 2.3. No se crearon usuarios, tickets,
solicitudes ni mensajes reales.
