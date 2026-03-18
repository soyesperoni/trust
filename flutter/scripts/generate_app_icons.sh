#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FLUTTER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ICON_PATH="$FLUTTER_DIR/assets/icon/icono_app.png"

if ! command -v flutter >/dev/null 2>&1; then
  echo "❌ Error: Flutter no está instalado o no está en el PATH."
  exit 1
fi

if [[ ! -f "$ICON_PATH" ]]; then
  echo "❌ Error: No se encontró el ícono oficial en: $ICON_PATH"
  exit 1
fi

echo "📦 Entrando al proyecto Flutter: $FLUTTER_DIR"
cd "$FLUTTER_DIR"

echo "🔄 Ejecutando flutter pub get..."
flutter pub get

echo "🎨 Generando íconos de launcher usando assets/icon/icono_app.png..."
flutter pub run flutter_launcher_icons

echo "✅ Íconos generados correctamente para Android e iOS."
