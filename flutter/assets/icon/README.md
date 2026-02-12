# Icono de la app (fuente)

Este proyecto usa un icono con la palabra **`trust`** en **Poppins Bold** color negro sobre fondo amarillo (`#F9DF00`).

## Importante
Por compatibilidad del flujo de revisión, **no se versionan cambios binarios** de iconos en este repositorio.

## Cómo regenerar el icono localmente
1. Generar el PNG fuente (1024x1024):
   ```bash
   cd flutter
   python tools/generate_app_icon.py
   ```
2. Generar los iconos de plataforma desde `assets/icon/app_icon.png`:
   ```bash
   flutter pub get
   flutter pub run flutter_launcher_icons
   ```

El script descarga `Poppins-Bold.ttf` en `assets/icon/` si no existe.
