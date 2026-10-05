#!/usr/bin/env bash
# Despliega los cambios de Trust en el servidor de produccion trust.supplymax.net
#
# Dos despliegues simultaneos hacen que el segundo `next build` aborte con
# "Unable to acquire lock at .next/lock". Por eso el trabajo remoto se ejecuta
# bajo flock (el segundo espera) y se limpia el lock huerfano solo cuando no hay
# ningun `next build` vivo.
set -euo pipefail

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_EXEC="$BASE/remote_exec.py"

echo "Iniciando despliegue de Trust en trust.supplymax.net..."

REMOTE_CMD=$(cat <<'REMOTE'
set -euo pipefail
cd /opt/trust

# 1. Un solo despliegue a la vez: el segundo espera en lugar de fallar.
exec 9>/var/lock/trust-deploy.lock
flock -w 900 9

# 2. Limpia el lock huerfano de next build solo si no hay un build vivo.
#    Se inspeccionan unicamente procesos llamados "node" para no confundir el
#    lock con el propio shell que ejecuta este comando.
build_alive=0
for p in $(pgrep -x node || true); do
  if tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -q 'next build'; then
    build_alive=1
  fi
done
if [ -e frontend/.next/lock ] && [ "$build_alive" -eq 0 ]; then
  echo "Limpiando lock huerfano de next build"
  rm -f frontend/.next/lock
fi

echo "Commit antes del pull: $(sudo -u deploy git rev-parse --short HEAD)"
sudo -u deploy git pull origin main
sudo -u deploy npm --prefix frontend run build
systemctl restart trust-backend.service trust-frontend.service
echo "Commit desplegado: $(sudo -u deploy git rev-parse --short HEAD)"
REMOTE
)

python3 "$REMOTE_EXEC" "$REMOTE_CMD"

# 3. Verificar estado de servicios
echo "Verificando servicios systemd..."
python3 "$REMOTE_EXEC" "systemctl is-active trust-backend.service trust-frontend.service"

# 4. Verificar salud interna
echo "Verificando salud interna..."
python3 "$REMOTE_EXEC" "curl -s -L -o /dev/null -w 'backend /api/health -> %{http_code}\n' http://127.0.0.1:8020/api/health; curl -s -o /dev/null -w 'frontend / -> %{http_code}\n' http://127.0.0.1:3001/"

# 5. Verificar respuesta publica HTTPS, tolerando el arranque del frontend
echo "Verificando respuesta publica HTTPS..."
HTTP_CODE="000"
for _ in $(seq 1 30); do
  HTTP_CODE=$(curl -sI -o /dev/null -w "%{http_code}" https://trust.supplymax.net || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    break
  fi
  sleep 2
done
echo "HTTPS trust.supplymax.net retorno codigo: $HTTP_CODE"

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
  echo "Despliegue de Trust completado exitosamente."
  exit 0
else
  echo "Error: Codigo HTTP inesperado: $HTTP_CODE"
  exit 1
fi
