# Trust Mobile (Flutter)

Aplicación móvil Flutter basada en la experiencia móvil del dashboard de Trust.

## Estructura del repositorio
- `backend/`: API Django que se conecta a base de datos.
- `frontend/`: dashboard web (Next.js).
- `flutter/`: aplicación móvil Flutter.

## Conexión con servidor
La app consume la API productiva en:

- Base URL: `https://trust.supplymax.net/api`

Usa el header `X-Current-User-Email` para mantener el mismo esquema de sesión ligero que usa el frontend web.

## Pantallas incluidas
- Login por correo.
- Dashboard con métricas.
- Calendario (placeholder funcional para evolución).
- Historial de visitas.
- Incidencias.

## Ejecución local
> Requiere Flutter SDK instalado.

```bash
cd flutter
flutter pub get
flutter run
```

## Variables clave
En `lib/src/services/api_client.dart` se define:

```dart
static const String baseUrl = 'https://trust.supplymax.net/api';
```

Si necesitas apuntar a otro entorno, cambia esa constante o evoluciona a `--dart-define`.
