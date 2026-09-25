#!/usr/bin/env bash
# Despliega los cambios de Trust en el servidor de produccion trust.supplymax.net
set -euo pipefail

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_EXEC="$BASE/remote_exec.py"

echo "Iniciando despliegue de Trust en trust.supplymax.net..."

# 1. Pull de cambios y compilacion en el servidor remoto
python3 "$REMOTE_EXEC" "cd /opt/trust && sudo -u deploy git pull origin main && sudo -u deploy npm --prefix frontend run build && systemctl restart trust-backend.service trust-frontend.service"

# 2. Verificar estado de servicios
echo "Verificando servicios systemd..."
python3 "$REMOTE_EXEC" "systemctl is-active trust-backend.service trust-frontend.service"

# 3. Verificar respuesta publica HTTP
echo "Verificando respuesta publica HTTPS..."
HTTP_CODE=$(curl -sI -o /dev/null -w "%{http_code}" https://trust.supplymax.net)
echo "HTTPS trust.supplymax.net retorno codigo: $HTTP_CODE"

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
  echo "Despliegue de Trust completado exitosamente."
  exit 0
else
  echo "Error: Codigo HTTP inesperado: $HTTP_CODE"
  exit 1
fi
