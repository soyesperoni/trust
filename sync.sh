#!/bin/bash
set -e

# Configuración
SSH_KEY="/Users/dayronesperon/.ssh/id_ed25519_b2b"
REMOTE_USER="deploy"
REMOTE_ROOT="root"
REMOTE_HOST="trust.supplymax.net"
PROJECT_DIR="/opt/trust"

# Colores para salida
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin Color

echo -e "${BLUE}=== Iniciando proceso de sincronización y despliegue ===${NC}"

# Verificar que estemos en el directorio correcto
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Este script debe ejecutarse desde la raíz del repositorio git (/Users/dayronesperon/StudioProjects/trust).${NC}"
    exit 1
fi

# Paso 1: Verificar cambios locales
echo -e "\n${BLUE}[1/4] Verificando cambios locales...${NC}"
git status --short

if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Se detectaron cambios locales sin confirmar.${NC}"
    read -p "¿Deseas confirmar (commit) estos cambios ahora? (s/n): " answer
    if [[ "$answer" =~ ^[Ss]$ ]]; then
        read -p "Introduce el mensaje del commit: " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="Sincronización automática de cambios"
        fi
        git add -A
        git commit -m "$commit_msg"
        echo -e "${GREEN}Cambios confirmados localmente.${NC}"
    else
        echo -e "${YELLOW}Continuando sin confirmar. Nota: los cambios locales no confirmados NO se desplegarán.${NC}"
    fi
else
    echo -e "${GREEN}No hay cambios locales pendientes.${NC}"
fi

# Paso 2: Subir cambios a GitHub
echo -e "\n${BLUE}[2/4] Enviando cambios a GitHub...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH"
echo -e "${GREEN}¡GitHub actualizado con éxito!${NC}"

# Paso 3: Traer cambios locales (en caso de que haya actualizaciones externas)
echo -e "\n${BLUE}[3/4] Sincronizando repositorio local...${NC}"
git pull origin "$CURRENT_BRANCH"
echo -e "${GREEN}Repositorio local actualizado.${NC}"

# Paso 4: Despliegue en el VPS vía SSH
echo -e "\n${BLUE}[4/4] Conectando al VPS para realizar el despliegue...${NC}"

# Ejecutar comandos en el VPS como el usuario deploy
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" bash -s << EOF
  set -e
  cd $PROJECT_DIR
  
  echo "--- VPS: Obteniendo estado actual del repositorio..."
  OLD_REV=\$(git rev-parse HEAD)
  
  echo "--- VPS: Realizando git pull..."
  git pull origin $CURRENT_BRANCH
  NEW_REV=\$(git rev-parse HEAD)
  
  if [ "\$OLD_REV" = "\$NEW_REV" ]; then
      echo "--- VPS: No hay nuevos commits en el servidor. Verificando estado general..."
  fi
  
  # Detectar qué carpetas han cambiado
  BACKEND_CHANGED=\$(git diff --name-only \$OLD_REV \$NEW_REV | grep '^backend/' || true)
  FRONTEND_CHANGED=\$(git diff --name-only \$OLD_REV \$NEW_REV | grep '^frontend/' || true)
  REQ_CHANGED=\$(git diff --name-only \$OLD_REV \$NEW_REV | grep '^backend/requirements.txt' || true)
  PKG_CHANGED=\$(git diff --name-only \$OLD_REV \$NEW_REV | grep '^frontend/package.json' || true)
  
  RESTART_BACKEND=0
  RESTART_FRONTEND=0
  
  # Si el backend cambió (o si es el primer despliegue/verificación forzada)
  if [ -n "\$BACKEND_CHANGED" ] || [ "\$OLD_REV" = "\$NEW_REV" ]; then
      echo "--- VPS: Cambios detectados en backend (Django)."
      cd backend
      
      if [ -n "\$REQ_CHANGED" ]; then
          echo "--- VPS: Instalando dependencias de Python (requirements.txt)..."
          .venv/bin/pip install -r requirements.txt
      fi
      
      echo "--- VPS: Ejecutando migraciones de base de datos..."
      .venv/bin/python manage.py migrate
      
      echo "--- VPS: Recopilando archivos estáticos..."
      .venv/bin/python manage.py collectstatic --noinput
      
      RESTART_BACKEND=1
      cd ..
  fi
  
  # Si el frontend cambió
  if [ -n "\$FRONTEND_CHANGED" ] || [ "\$OLD_REV" = "\$NEW_REV" ]; then
      echo "--- VPS: Cambios detectados en frontend (Next.js)."
      cd frontend
      
      if [ -n "\$PKG_CHANGED" ]; then
          echo "--- VPS: Instalando dependencias de Node.js (package.json)..."
          npm install
      fi
      
      echo "--- VPS: Compilando frontend (build)..."
      npm run build
      
      RESTART_FRONTEND=1
      cd ..
  fi
  
  # Escribir banderas a archivo temporal para el script local
  echo "RESTART_BACKEND=\$RESTART_BACKEND" > /tmp/deploy_flags
  echo "RESTART_FRONTEND=\$RESTART_FRONTEND" >> /tmp/deploy_flags
EOF

# Obtener banderas de reinicio del servidor remoto
scp -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST:/tmp/deploy_flags" /tmp/deploy_flags_local > /dev/null
source /tmp/deploy_flags_local
rm /tmp/deploy_flags_local

# Reiniciar servicios usando el usuario root
if [ "$RESTART_BACKEND" = "1" ]; then
    echo -e "${YELLOW}Reiniciando servicio de Django (trust-backend.service)...${NC}"
    ssh -i "$SSH_KEY" "$REMOTE_ROOT@$REMOTE_HOST" "systemctl restart trust-backend.service"
    echo -e "${GREEN}Django reiniciado con éxito en el servidor.${NC}"
fi

if [ "$RESTART_FRONTEND" = "1" ]; then
    echo -e "${YELLOW}Reiniciando Next.js (trust-frontend.service)...${NC}"
    ssh -i "$SSH_KEY" "$REMOTE_ROOT@$REMOTE_HOST" "systemctl restart trust-frontend.service"
    echo -e "${GREEN}Next.js reiniciado con éxito en el servidor.${NC}"
fi

echo -e "\n${GREEN}=== ¡Sincronización y despliegue completados con éxito! ===${NC}"
