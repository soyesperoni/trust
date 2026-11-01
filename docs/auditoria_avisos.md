# Auditoria de avisos: correo, sesion, PDF e impresora/biometria

Fecha: 2026-10-05
Proyecto: Trust (Prolat)
Alcance: revision de flujos y puntos de integracion para los avisos solicitados en la revision 2026-W43 (#3).
Modo: solo lectura. No se modifico codigo, configuracion, datos ni servicios de produccion.
Commit base de produccion: `b919cbe` (`fix(deploy): serialize deploys with flock and clear stale next build lock`).

## 1. Resumen ejecutivo

Se revisaron las rutas web, las vistas Django y el codigo Flutter indicados. El resultado principal es que tres de los cuatro avisos se pueden implementar sobre senales que ya existen, pero el aviso de impresora termica no tiene hoy un flujo que lo respalde.

| Aviso | Senal disponible | Punto de integracion | Estado |
| --- | --- | --- | --- |
| Correo no autorizado | `GmailAPISettings.refresh_token`, `is_enabled` | API de estado nueva + banner global | Viable; falta endpoint y UI |
| Sesion expirada | Cabecera `X-Current-User-Email` y respuestas 401 | `session.ts`, `AppShell`, paginas con fetch | Parcial; hoy no existe expiracion real |
| PDF de visita/auditoria no registrada | `status` en la API y 400 del backend | Boton e inmediaciones en ambas paginas de informe | Viable; hoy el boton siempre esta activo |
| Impresora termica no disponible | Ninguna | No existe integracion de impresion termica | Bloqueado por alcance; el codigo solo usa la hoja de compartir del sistema |
| Biometria no disponible | `local_auth` en el login | `login_screen.dart` | Viable; hoy solo muestra SnackBar generico |

Hallazgos que cambian la premisa de la tarea:

1. No hay impresora termica en la app Flutter. `grep` sobre `flutter/lib` y `flutter/pubspec.yaml` no encuentra `printer`, `thermal`, `bluetooth` ni equivalentes. El paquete `printing` se usa unicamente para `Printing.sharePdf` en las pantallas de informe, que abre la hoja de compartir/imprimir del sistema operativo.
2. La sesion web no expira. El frontend guarda un objeto de usuario en `localStorage`; el backend identifica al usuario por la cabecera `X-Current-User-Email`. No hay cookie de sesion, token con vencimiento ni comprobacion de inactividad. El 401 solo aparece si la cabecera falta o el usuario ya no existe/esta inactivo.
3. Gmail no tiene pantalla en el frontend. La autorizacion se gestiona desde el admin de Django (`/admin/core/gmailapisettings/`) y las vistas `gmail_authorize`/`gmail_oauth2callback`, que exigen sesion de superusuario en Django. El login web de Trust no crea esa sesion.
4. En produccion la cuenta de Gmail esta configurada, habilitada y con `refresh_token`; por tanto el banner de correo no se mostraria hoy. El aviso sigue siendo necesario para cuando se revoque o venza la autorizacion.

## 2. Correo: Gmail no autorizado

### 2.1 Flujo actual

- Modelo `GmailAPISettings` en `backend/core/models.py:291-347`.
  - Campos relevantes: `email`, `is_enabled`, `refresh_token`, `access_token`, `token_expiry`.
  - `get_access_token()` devuelve `None` si no hay `refresh_token` o si Google rechaza el refresco. No hay un estado explicito de "no autorizado"; la unica senal es la ausencia de token o el fallo al refrescar.
- Envio en `backend/core/views.py:460-499`.
  - `send_gmail_notification()` registra el error y devuelve `False` cuando no hay token o cuando Gmail responde distinto de 200.
- Notificaciones automaticas en `backend/core/views.py:509-598` (visitas y auditorias) y `:600-638` (incidencias).
  - Solo comprueban `settings_obj` y `settings_obj.refresh_token`; no consultan `is_enabled` en `send_gmail_notification` y no propagan el fallo a la interfaz.
  - La llamada se ejecuta en un hilo (`_send_email_async`, `:503-507`), por lo que el usuario que finaliza la visita nunca recibe el resultado.
- OAuth en `backend/core/views.py:394-457` y `backend/core/urls.py:47-48`.
  - `gmail_authorize` esta protegido con `@user_passes_test(lambda u: u.is_superuser)`.
  - `gmail_oauth2callback` guarda el token y redirige al admin.
- Admin en `backend/core/admin.py:341-365`. Muestra "Conectado/Desconectado" y un boton de autorizacion, pero solo dentro de Django admin.
- No existe endpoint publico ni componente frontend que consulte el estado de Gmail. `grep` de `gmail` en `frontend/src` no devuelve coincidencias.

### 2.2 Punto de integracion propuesto

Backend:

1. Agregar `GET /api/integrations/email-status/` en `backend/core/views.py` y registrarlo en `backend/core/urls.py`.
2. Devolver solo estado, nunca secretos ni tokens:

```json
{
  "configured": true,
  "enabled": true,
  "authorized": true,
  "sender_email": "notificaciones@dominio.com",
  "can_authorize": false,
  "authorize_url": null,
  "checked_at": "2026-10-05T12:00:00Z"
}
```

Reglas:

- `configured`: existe una fila de `GmailAPISettings` con `client_id` y `client_secret`.
- `enabled`: `is_enabled` es verdadero.
- `authorized`: hay `refresh_token` y el ultimo intento de refresco no fallo. Para no hacer una llamada a Google en cada carga, se puede considerar autorizado si existe `refresh_token`; el fallo real se detecta en el envio y se puede persistir en un campo nuevo `last_error`/`last_error_at`.
- `can_authorize`: verdadero solo para `is_superuser` o, si se decide, para `GENERAL_ADMIN`.
- `authorize_url`: solo se devuelve si `can_authorize` es verdadero.
- El endpoint debe exigir usuario valido con `_get_current_user(request)` y responder 401 si no lo hay.

3. Resolver el desacople de autenticacion para el enlace de autorizacion. `gmail_authorize` exige sesion de Django, pero el login web no la crea. Opcion recomendada:
   - `POST /api/gmail/authorize-ticket/` para un administrador autenticado por la API.
   - Generar un token firmado con `django.core.signing` (caducidad 10 minutos, un solo uso).
   - Aceptar en `gmail_authorize` un `ticket` valido ademas de la sesion de superusuario.
   - Devolver como `authorize_url` la ruta `/api/gmail/authorize/?ticket=...`.
   - No reutilizar la cabecera `X-Current-User-Email` como prueba de identidad para OAuth: es susceptible de falsificacion.

4. Agregar un codigo estable al fallo de envio (`email_not_authorized`, `email_disabled`, `email_send_failed`) y registrar `last_error` para diagnostico. No cambiar el contrato actual de las notificaciones.

Frontend:

1. Crear `frontend/src/app/components/StatusNotice.tsx` (o `StatusBanner.tsx`) reutilizable:
   - Variantes `info`, `warning`, `error`, `success`.
   - Props: `title`, `message`, `action`, `onAction`, `dismissible`, `icon`.
   - `role="status"` y `aria-live="polite"` para avisos no bloqueantes; `role="alert"` para error.
   - Layout en columna en movil y fila en escritorio; ancho completo; sin emojis.
2. Crear `EmailAuthorizationBanner` y montarlo en `frontend/src/app/components/AppShell.tsx`, dentro de `<main>` antes de `{children}` (`AppShell.tsx:122-128`), para que aparezca en todas las pantallas con sesion y tambien en movil.
3. Consultar el estado una vez al montar y al recuperar el foco (`visibilitychange`), con cache de 60 segundos. No bloquear el render de la pagina mientras carga.
4. Mostrar el banner solo si `configured && enabled && !authorized`. Si `!configured` o `!enabled`, mostrar un aviso distinto solo a administradores, porque el usuario final no puede corregirlo.
5. El enlace debe abrir la autorizacion en la misma pestana o en una nueva, y al volver mostrar el estado actualizado. Evitar un enlace muerto cuando `can_authorize` sea falso.

Mensajes propuestos:

- Banner principal:
  - Titulo: "El correo de Trust no esta autorizado"
  - Texto: "Las notificaciones y los informes por correo no se estan enviando. Autoriza la cuenta de Gmail para reanudarlos."
  - Accion: "Autorizar correo"
- Usuario sin permiso de autorizacion:
  - Texto: "Las notificaciones por correo no estan disponibles. Pide a un administrador que autorice la cuenta de Gmail."
- Cuenta deshabilitada:
  - Titulo: "El envio de correo esta desactivado"
  - Texto: "Un administrador debe activar la cuenta de correo en la configuracion."
- Token vencido o revocado:
  - Titulo: "La autorizacion de Gmail vencio"
  - Texto: "Vuelve a conectar la cuenta para reanudar las notificaciones y los informes por correo."
  - Accion: "Volver a autorizar"
- Confirmacion al regresar de Google:
  - "Cuenta de correo autorizada. Las notificaciones se reanudaran en el proximo envio."

Pruebas:

- Endpoint con `refresh_token` presente, ausente y con `is_enabled=false`.
- Banner visible en escritorio (>= 768 px) y movil (<= 480 px), sin desbordar el header.
- Enlace de autorizacion valido y de un solo uso.
- No enviar correos reales durante la prueba; usar mocks o el estado de la base.

## 3. Sesion expirada

### 3.1 Flujo actual

- Login web en `frontend/src/app/page.tsx:22-63` y `:67-84`.
  - Prueba varios endpoints (`/api/login/`, backend directo y proxy Next).
  - Al responder bien, guarda el usuario y hace `router.push("/dashboard")` (`:80`).
  - Los errores se muestran con `window.alert` (`:86`).
- Almacenamiento en `frontend/src/app/lib/session.ts:8-56`.
  - `getSessionUserRaw()` lee `localStorage["trust.currentUser"]`.
  - `hasSessionUser()` solo comprueba que exista email, nombre o id.
  - No hay `expires_at`, `issued_at` ni comprobacion de inactividad.
- `useCurrentUser` en `frontend/src/app/hooks/useCurrentUser.ts:25-44` y `:75-110`.
  - Vuelve a leer el mismo `localStorage`, consulta `/api/users` y empareja por email.
  - Si la sesion expirara, este hook no lo detectaria.
- `AppShell` en `frontend/src/app/components/AppShell.tsx:61-105`.
  - Redirige a `/` cuando `hasSession` es falso.
  - No hay temporizador ni escucha de respuestas 401.
- Backend en `backend/core/views.py:169-174`.
  - `_get_current_user()` devuelve `None` si falta la cabecera o el usuario no esta activo.
  - Los endpoints de informe responden 401 con `{"error": "Usuario no autenticado."}` (`:4198-4205`, `:4224-4231`).
- No hay un manejador global de 401 en el frontend. `dashboard/page.tsx:82-91` convierte cualquier respuesta no OK en "No se pudo cargar el dashboard."; las paginas de informe hacen lo mismo y reemplazan todo el contenido por un texto rojo (`visitas/[id]/informe/page.tsx:322`, `auditorias/[id]/informe/page.tsx:234`).

Conclusion: hoy no existe una "expiracion" que avisar. Para cumplir el pedido hay que definir una politica de vigencia y, ademas, manejar el 401 del backend.

### 3.2 Punto de integracion propuesto

1. Extender el objeto de sesion en `session.ts`:
   - Agregar `expires_at` al JSON guardado, sin cambiar los campos que ya consumen los componentes.
   - Definir una constante, por ejemplo `SESSION_TTL_MS = 12 * 60 * 60 * 1000` (12 horas) o el valor que defina producto.
   - `getSessionUserRaw()` debe borrar la entrada y devolver `null` si `expires_at` ya paso.
   - `setSessionUser()` debe renovar `expires_at` en cada login.
   - `useCurrentUser.getSessionUserSnapshot()` y `getSessionEmailSnapshot()` deben usar la misma validacion, no leer `localStorage` en crudo.
2. Crear un helper `fetchWithSession(input, init)` en `frontend/src/app/lib/session.ts`:
   - Ejecuta `fetch`.
   - Si `response.status === 401`, llama a `clearSessionUser()` y redirige a `/?session=expired`.
   - Conserva la respuesta para que el llamador pueda leer el cuerpo si no es 401.
   - No redirigir en 403 (permisos) ni en 400/404 (datos).
3. Reemplazar los fetch autenticados prioritarios por el helper:
   - `frontend/src/app/dashboard/page.tsx:83`
   - `frontend/src/app/clientes/visitas/[id]/informe/page.tsx:295`
   - `frontend/src/app/clientes/auditorias/[id]/informe/page.tsx:209`
   - Notificaciones del header (`DashboardHeader.tsx:66`) y cualquier otra llamada que dependa de la cabecera.
4. Agregar un temporizador de expiracion en `AppShell` o en un hook `useSessionExpiry`:
   - Al montar, calcular el tiempo restante.
   - Al vencer, `clearSessionUser()` y `router.replace("/?session=expired")`.
   - Recalcular al recuperar visibilidad de la pestana.
5. En `frontend/src/app/page.tsx`, leer `window.location.search` en un `useEffect` (para evitar el requisito de `Suspense` de `useSearchParams` en Next) y mostrar el aviso cuando `session=expired`.
6. Mantener el redirect actual de `AppShell` para sesiones ausentes, pero pasar el motivo cuando corresponda.

Mensajes propuestos:

- Aviso en login:
  - Titulo: "Tu sesion expiro"
  - Texto: "Por seguridad, vuelve a iniciar sesion para continuar."
  - El formulario queda enfocado en el campo de correo.
- Aviso por 401 durante una accion:
  - "Tu sesion expiro. Te llevaremos al inicio de sesion para que puedas continuar."
  - No mostrar el error tecnico del backend.
- Si el usuario fue desactivado (403):
  - "Tu cuenta ya no tiene acceso a Trust. Contacta a un administrador."
  - No redirigir como si fuera una expiracion.

Consideraciones:

- La expiracion en cliente no es un control de seguridad: el backend sigue confiando en la cabecera. Sirve para la experiencia de usuario, no para proteger datos.
- Si se quiere seguridad real, el paso posterior es migrar a sesion de Django o a un token firmado con vencimiento. Ese cambio es mayor y no es necesario para este pedido.
- El texto debe estar en espanol y sin emojis. Usar "sesion" con tilde solo si el resto de la interfaz lo hace; el codigo actual mezcla ambos estilos.

## 4. PDF de visita o auditoria no registrada

### 4.1 Flujo actual

Visita:

- `frontend/src/app/clientes/visitas/[id]/informe/page.tsx:288-315`.
  - `downloadVisitReport()` llama a `/api/visits/${visitId}/report`.
  - Si la respuesta no es OK, lanza el mensaje del backend y lo guarda en `error`.
- Boton en `:341-348`.
  - Siempre habilitado, sin `disabled`, sin condicion de estado y sin aviso previo.
- Render de error en `:322`.
  - `if (error || !visit)` reemplaza toda la pagina por un texto rojo. Un 400 por visita no finalizada hace desaparecer el informe y el boton.
- El tipo `Visit` ya incluye `status?: string` (`:24`).

Auditoria:

- `frontend/src/app/clientes/auditorias/[id]/informe/page.tsx:204-227`.
  - `downloadAuditReport()` llama a `/api/audits/${auditId}/report`.
  - Mismo patron de error global.
- Boton en `:246-254`, siempre habilitado.
- Render de error en `:234`, reemplaza toda la pagina.
- El tipo `Audit` (`:10-44`) no declara `status`, aunque la API si lo devuelve.

Backend:

- `backend/core/views.py:4198-4219` (`audit_report_pdf`).
  - 401 si no hay usuario.
  - 404 si no existe o no esta en el alcance.
  - 400 si `audit.status != Audit.Status.COMPLETED`, con "Solo puedes descargar informe de auditorias finalizadas."
- `backend/core/views.py:4223-4245` (`visit_report_pdf`).
  - Mismas reglas, con "Solo puedes descargar informe de visitas finalizadas."
- `backend/core/views.py:4269-4308` repite la validacion para las variantes `report-puppeteer`.
- La serializacion ya expone `status` y `status_label` en `_serialize_visit` (`:929-980`) y `_serialize_audit` (`:992-1043`). El estado puede ser `scheduled`, `overdue` o `completed`.

### 4.2 Punto de integracion propuesto

1. En ambas paginas, calcular:

```ts
const isCompleted = record?.status === "completed";
const canDownload = Boolean(record) && isCompleted;
```

2. Agregar `status?: string` y `status_label?: string` al tipo `Audit`.
3. Mantener el boton visible pero deshabilitado cuando no se pueda generar:
   - `disabled={!canDownload}`
   - `aria-disabled={!canDownload}`
   - `aria-describedby="report-availability-notice"`
   - Estilos `disabled:cursor-not-allowed disabled:opacity-50`.
   - En movil, el boton y el aviso deben apilarse; no ocultar el aviso en pantallas pequenas.
4. Colocar el aviso inmediatamente debajo del boton o del encabezado, no como reemplazo de la pagina:

Visita no finalizada:

- Titulo: "El informe aun no esta disponible"
- Texto: "La visita no esta registrada como finalizada. Completa el registro para generar el PDF."
- Si `status === "overdue"`: "La visita esta vencida y aun no se ha registrado. Completa el registro para generar el PDF."
- Accion: "Ir a la visita" (si existe ruta de ejecucion) o "Reintentar" cuando el estado pudo cambiar.

Auditoria no finalizada:

- Titulo: "El informe aun no esta disponible"
- Texto: "La auditoria no esta registrada como finalizada. Completa el registro para generar el PDF."
- Si `status === "overdue"`: "La auditoria esta vencida y aun no se ha registrado. Completa el registro para generar el PDF."
- Accion: "Ir a la auditoria" o "Reintentar".

Error del servidor al descargar:

- 400: "No se pudo generar el PDF porque el registro aun no esta finalizado." + "Reintentar".
- 401: aplicar el flujo de sesion expirada de la seccion 3.
- 403/404: "No tienes acceso a este informe o ya no esta disponible."
- Error de red: "No se pudo conectar con el servidor. Revisa tu conexion e intenta de nuevo." + "Reintentar".

5. Separar el estado de error de descarga del estado de carga del informe:
   - Hoy `error` controla ambas cosas. Usar `loadError` y `downloadNotice` para que un fallo de PDF no borre el informe.
6. Agregar un codigo estable en el backend para no depender del texto:
   - `{"error": "Solo puedes descargar informe de visitas finalizadas.", "code": "report_not_available", "status": "scheduled"}`
   - Mantener el mensaje actual por compatibilidad.
7. Refrescar el estado antes de habilitar el boton si el usuario vuelve desde la pantalla de ejecucion. Un `fetch` con `cache: "no-store"` al recuperar el foco es suficiente.

Pruebas:

- Visita `completed` y auditoria `completed`: boton habilitado, PDF 200.
- Visita `scheduled`/`overdue` y auditoria `scheduled`/`overdue`: boton deshabilitado y aviso visible, sin llamada al endpoint.
- Forzar un 400 del backend: el informe permanece visible y el aviso aparece junto al boton.
- Forzar 401: redireccion al login con el mensaje de sesion expirada.
- Verificar en 360 px, 768 px y 1280 px.

## 5. Movil: impresora termica y biometria

### 5.1 Hallazgo sobre la impresora

La tarea indica revisar `flutter/lib/src/screens/visit_execution_screen.dart`, `audit_execution_screen.dart` y `push_notification_service.dart` para localizar el uso de impresora termica. Esa integracion no existe:

- `grep -rni "printer|thermal|bluetooth|impresora" flutter/lib flutter/pubspec.yaml` no devuelve coincidencias.
- El unico uso de impresion esta en `flutter/lib/src/screens/visit_report_screen.dart:72-93` y `audit_report_screen.dart:70-91`, con `Printing.sharePdf(...)`. Eso abre la hoja de compartir/imprimir del sistema, no una impresora termica.
- Las pantallas de ejecucion solo completan la visita/auditoria:
  - `visit_execution_screen.dart:820-884` valida firma, nombre, ubicacion y llama a `completeVisit`.
  - `audit_execution_screen.dart:395-447` hace lo equivalente con `completeAudit`.
- `push_notification_service.dart` no tiene relacion con impresion ni biometria.

Por tanto, no se puede mostrar un aviso de "impresora termica no disponible" en un flujo que no intenta imprimir. Hacerlo seria un mensaje enganoso. Hay dos caminos:

Opcion A, si el requisito real es imprimir el informe desde el movil:

1. Agregar una capa `ThermalPrinterService` (Bluetooth/USB) con:
   - `Future<bool> isAvailable()`
   - `Future<void> connect()`
   - `Future<void> printReport(bytes)`
   - `Future<void> retry()`
2. Inyectarla en las pantallas de informe y, si se imprime automaticamente al finalizar, en las pantallas de ejecucion.
3. Mostrar el aviso solo cuando `isAvailable()` sea falso o la conexion falle.
4. Mensajes:
   - Titulo: "Impresora termica no disponible"
   - Texto: "No se detecto una impresora termica conectada. Verifica que este encendida, con papel y vinculada por Bluetooth al telefono."
   - Accion: "Reintentar"
   - Accion secundaria: "Compartir PDF" (fallback con `Printing.sharePdf`).
   - Si falla la conexion: "No se pudo conectar con la impresora. Acercate al equipo, verifica el Bluetooth y vuelve a intentar."
   - Si no hay papel: "La impresora no tiene papel. Coloca un rollo nuevo y reintenta."
5. No bloquear la finalizacion de la visita por un fallo de impresora; el registro debe guardarse igual.

Opcion B, si el requisito es solo compartir/imprimir con el sistema:

1. Usar `Printing.info()` antes de `sharePdf` y comprobar `canShare`/`canPrint` cuando la version del paquete lo permita.
2. Mostrar un aviso de "No hay servicio de impresion disponible en este dispositivo" con "Reintentar" y "Guardar PDF".
3. Aclarar en el texto que no es una impresora termica.

Recomendacion: confirmar con producto cual de las dos opciones se quiere. La opcion A es la unica que cumple literalmente el pedido, pero requiere una integracion nueva y pruebas con hardware.

### 5.2 Biometria

Flujo actual en `flutter/lib/src/screens/login_screen.dart`:

- `_loadBiometricStatus()` (`:57-71`) lee `biometric_enabled`, email y contrasena de `flutter_secure_storage`.
- `_loginWithBiometrics()` (`:128-193`):
  - Comprueba `canCheckBiometrics || isDeviceSupported`.
  - Si no hay soporte, lanza `Exception('Este dispositivo no soporta autenticacion biometrica.')`.
  - Llama a `_localAuth.authenticate(...)` con `biometricOnly: true`.
  - Si el usuario cancela, retorna sin mensaje.
  - Si faltan credenciales guardadas, lanza `Exception('No hay credenciales biometricas guardadas.')`.
  - Captura `PlatformException` y muestra un `SnackBar` con `error.message` o un texto generico.
- `_promptEnableBiometricLoginIfNeeded()` (`:196-255`) ofrece activar la biometria despues del login.
- El boton se deshabilita si `_isBiometricLoading` o `!_isBiometricLoginEnabled` (`:454-465`).
- No hay aviso persistente, no hay instrucciones de reintento y no se distingue entre "no configurada", "bloqueada" y "no disponible".

Punto de integracion propuesto:

1. Crear un helper `BiometricAvailability` que devuelva:
   - `supported`: `canCheckBiometrics || isDeviceSupported`.
   - `enrolled`: `getAvailableBiometrics()` no vacio.
   - `reason`: `not_supported`, `not_enrolled`, `locked_out`, `no_credentials`, `cancelled`.
2. En el login, mostrar una tarjeta o banner debajo del boton biometrico cuando `supported` sea falso o `enrolled` este vacio:
   - Titulo: "Biometria no disponible"
   - Texto: "Este dispositivo no tiene Face ID o huella configurada. Activala en Ajustes del telefono o inicia sesion con tu correo y contrasena."
   - Accion: "Reintentar" (vuelve a ejecutar `_loadBiometricStatus()` y la comprobacion).
   - Accion secundaria: "Usar contrasena" (enfoca el campo de contrasena).
3. Manejar `PlatformException` por codigo:
   - `NotAvailable` / `NotEnrolled`: "No hay biometria configurada en este dispositivo. Configurala en Ajustes y vuelve a intentar."
   - `LockedOut`: "La biometria esta bloqueada temporalmente. Desbloquea el telefono con tu PIN y reintenta."
   - `PermanentlyLockedOut`: "La biometria esta bloqueada. Configurala de nuevo en Ajustes del telefono."
   - `PasscodeNotSet`: "El telefono no tiene PIN de respaldo. Configura un PIN y vuelve a intentar."
   - Cualquier otro: "No se pudo validar la biometria. Reintenta o inicia sesion con tu contrasena."
4. Si faltan credenciales guardadas:
   - "Vuelve a iniciar sesion con correo y contrasena para activar la biometria en este telefono."
5. Si el usuario cancela, no mostrar error; dejar el formulario disponible.
6. No usar `SnackBar` como unico canal: el aviso debe quedar visible mientras el usuario corrige el problema. El SnackBar puede complementar, no reemplazar.
7. Agregar `Semantics`/`liveRegion` para accesibilidad y probar en iOS y Android.

## 6. Contratos y componentes propuestos

### 6.1 Frontend web

`StatusNotice`:

```ts
type StatusNoticeVariant = "info" | "warning" | "error" | "success";

type StatusNoticeProps = {
  variant: StatusNoticeVariant;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  dismissible?: boolean;
  id?: string;
};
```

`EmailStatus`:

```ts
type EmailStatus = {
  configured: boolean;
  enabled: boolean;
  authorized: boolean;
  sender_email?: string;
  can_authorize: boolean;
  authorize_url?: string | null;
};
```

Uso:

- `EmailAuthorizationBanner` en `AppShell`.
- `ReportAvailabilityNotice` en las dos paginas de informe.
- `SessionExpiredNotice` en `page.tsx`.

### 6.2 Backend

- `GET /api/integrations/email-status/`
- `POST /api/gmail/authorize-ticket/` (solo administrador)
- Campos opcionales en `GmailAPISettings`: `last_error`, `last_error_at`, `last_success_at`.
- Codigos de error estables en los endpoints de informe: `report_not_available`, `not_found`, `forbidden`, `unauthenticated`.

### 6.3 Flutter

- `lib/src/services/thermal_printer_service.dart` (nuevo, si se aprueba opcion A).
- `lib/src/widgets/status_notice.dart` (nuevo, reutilizable).
- `lib/src/services/biometric_availability.dart` (nuevo).
- No modificar `push_notification_service.dart` para estos avisos: no es su responsabilidad.

## 7. Verificacion realizada

No se crearon usuarios, tickets, solicitudes ni mensajes. No se enviaron correos. No se reiniciaron servicios ni se ejecuto despliegue.

### 7.1 Estado de produccion

```bash
./run_remote.sh 'cd /opt/trust && git log --oneline -1 && systemctl is-active trust-backend.service trust-frontend.service'
```

Salida:

```text
b919cbe fix(deploy): serialize deploys with flock and clear stale next build lock
active
active
```

### 7.2 Estado de Gmail y registros de prueba (solo lectura)

```bash
./run_remote.sh 'cd /opt/trust/backend && .venv/bin/python manage.py shell -c "
from core.models import GmailAPISettings, User, Visit, Audit
s=GmailAPISettings.objects.first()
print(\"gmail_configured\", bool(s), \"enabled\", bool(s and s.is_enabled), \"refresh\", bool(s and s.refresh_token))
u=User.objects.filter(is_active=True).order_by(\"id\").first()
print(\"user\", u.id, u.role, (u.email[:3]+\"***\") if u and u.email else None)
v=Visit.objects.filter(status=\"completed\").order_by(\"-id\").first(); print(\"visit_done\", v.id if v else None)
v2=Visit.objects.exclude(status=\"completed\").order_by(\"-id\").first(); print(\"visit_pending\", v2.id if v2 else None)
a=Audit.objects.filter(status=\"completed\").order_by(\"-id\").first(); print(\"audit_done\", a.id if a else None)
" 2>&1 | tail -10'
```

Salida:

```text
gmail_configured True enabled True refresh True
user 1 general_admin None
visit_done 23
visit_pending 24
audit_done 18
```

Interpretacion: la cuenta de Gmail esta autorizada en este momento; el banner no se mostraria hoy. Existe una visita finalizada (23), una no finalizada (24) y una auditoria finalizada (18) para probar los estados del PDF.

### 7.3 Prueba autenticada de los endpoints de informe

Se uso un usuario activo existente con email, sin contrasena y sin crear usuarios. La direccion se obtuvo en el servidor y no se imprime en este informe.

```bash
./run_remote.sh 'cd /opt/trust/backend && EMAIL=$(.venv/bin/python manage.py shell -c "from core.models import User; u=User.objects.filter(is_active=True).exclude(email=\"\").order_by(\"id\").first(); print(u.email if u else \"\")" 2>/dev/null | tail -1); echo "auth_email_present=$([ -n "$EMAIL" ] && echo yes || echo no)"; for p in "visits/23/report" "audits/18/report" "visits/24/report"; do code=$(curl -s -o /tmp/tr.out -w "%{http_code}" -H "X-Current-User-Email: $EMAIL" "http://127.0.0.1:8020/api/$p"); ct=$(file -b --mime-type /tmp/tr.out); echo "$p auth code=$code type=$ct"; done; curl -s -o /tmp/tr.out -w "visits/23/report noauth code=%{http_code}\n" "http://127.0.0.1:8020/api/visits/23/report"; head -c 160 /tmp/tr.out; echo; rm -f /tmp/tr.out'
```

Salida:

```text
auth_email_present=yes
visits/23/report auth code=200 type=application/pdf
audits/18/report auth code=200 type=application/pdf
visits/24/report auth code=400 type=application/json
visits/23/report noauth code=401
{"error": "Usuario no autenticado."}
```

Mensaje exacto del 400 para la visita no finalizada:

```bash
curl -s -H "X-Current-User-Email: <usuario>" "http://127.0.0.1:8020/api/visits/24/report"
```

```json
{"error": "Solo puedes descargar informe de visitas finalizadas."}
```

### 7.4 Rutas publicas

```bash
curl -s -o /dev/null -w "public_home=%{http_code}\n" https://trust.supplymax.net/
curl -s -o /dev/null -w "public_report_route=%{http_code}\n" https://trust.supplymax.net/clientes/visitas/23/informe
```

Salida:

```text
public_home=200
public_report_route=200
```

La ruta del informe responde 200 a nivel de pagina, pero los datos y el PDF requieren la cabecera de usuario; el backend es quien aplica el 401.

### 7.5 Comprobaciones estaticas

```bash
grep -rni "printer|thermal|bluetooth|biometric|local_auth|fingerprint|huella|impresora" flutter/lib flutter/pubspec.yaml
```

Resultado: solo aparecen referencias a `local_auth` y biometria en `flutter/lib/src/screens/login_screen.dart`; ninguna a impresora termica.

```bash
grep -rn "status === 401\|response.status === 401\|sesion expirada\|session expired" frontend/src
```

Resultado: sin coincidencias. No existe manejo global de 401.

No se ejecuto `npm run build` porque esta fase solo agrega documentacion y no modifica TypeScript, React, Django ni Dart. El build queda para la fase en que se implementen los avisos.

## 8. Plan de implementacion sugerido

Fase 2, backend:

1. Endpoint de estado de correo y ticket de autorizacion.
2. Codigos estables y campos de ultimo error en `GmailAPISettings`.
3. Pruebas unitarias de estados y permisos.

Fase 3, web:

1. `StatusNotice`, banner de correo en `AppShell`.
2. Expiracion y manejo global de 401.
3. Avisos y boton deshabilitado en ambos informes.
4. Pruebas de escritorio y movil.

Fase 4, movil:

1. Aviso de biometria con reintento e instrucciones.
2. Definir e implementar impresora termica o fallback de compartir.
3. Pruebas en dispositivo real.

Fase 5, publicacion:

1. Build de frontend y analisis de Flutter.
2. Despliegue con el procedimiento autorizado.
3. Verificacion en vivo de los cuatro avisos.

## 9. Criterios de aceptacion

- El banner de correo aparece en escritorio y movil cuando la cuenta no esta autorizada, y su enlace permite autorizarla sin exponer secretos.
- Al expirar la sesion, el usuario ve un mensaje claro y es redirigido al login; un 401 no se muestra como error generico.
- El boton de PDF esta deshabilitado y junto a un aviso cuando la visita o auditoria no esta finalizada; un fallo de descarga no borra el informe.
- En movil, la biometria no disponible muestra instrucciones y un boton de reintento; nunca se muestra un mensaje tecnico sin salida.
- El aviso de impresora termica solo se muestra si existe una integracion real de impresora termica; en caso contrario, se usa el fallback de compartir y se documenta la limitacion.
- Sin emojis, sin menciones al dominio interno de VIDA y sin cambios en datos de produccion durante las pruebas.

## 10. Riesgos y decisiones pendientes

1. Gmail OAuth depende de una sesion de Django que el login web no crea. Sin el ticket firmado, el enlace del banner llevaria a un login de admin que el usuario no puede usar.
2. "Sesion expirada" no existe hoy. Hay que decidir la vigencia (12 horas, 30 minutos de inactividad u otra) antes de implementar.
3. La impresora termica no esta implementada. El pedido literal requiere una integracion nueva y pruebas de hardware; no basta con un aviso.
4. El backend usa una cabecera de email como identidad. La expiracion en cliente mejora la experiencia, pero no es un control de seguridad.
5. Las notificaciones de correo se envian en segundo plano y hoy no reportan el fallo. Persistir `last_error` es necesario para que el banner no dependa solo de la existencia del token.
