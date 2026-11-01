# ENTORNO PLATAFORMA: TRUST (PROLAT)

Verificado en vivo el 2026-10-05 mediante comandos de solo lectura desde el workspace /root/trust.
No se modifico codigo, configuracion, datos ni servicios de produccion.

## Informacion General
- Plataforma: Trust - Inspeccion, Supply Chain & Calidad
- Cliente: Prolat
- Dominio de produccion: `https://trust.supplymax.net`
- Servidor remoto SSH: `trust.supplymax.net` (IP: `185.250.36.58`), hostname real `vmi2922633`
- Directorio en servidor remoto: `/opt/trust` (propiedad `deploy:deploy`, modo 755)
- Workspace local en Vida: `/root/trust`
- nginx: `/etc/nginx/sites-enabled/trust.supplymax.net` (server_name `trust.supplymax.net`)

## Arquitectura y Stack Tecnologico
1. **Frontend Dashboard (Web)**:
   - Framework: Next.js 16.1.6 App Router, React 19.2.3, Tailwind CSS 4, TypeScript 5
     (segun `frontend/package.json`; la documentacion previa lo describia como Next 14/React 18).
   - Directorio: `frontend/`. Pantalla principal y login en `frontend/src/app/page.tsx`.
   - Puerto en produccion: **3001** (`trust-frontend.service`), escucha en `*:3001` (next-server).
   - Modulos clave: Dashboard, Inspecciones, Cotizaciones, Proveedores, Despachos y `/soporte`
     (`frontend/src/app/soporte/page.tsx`), con `frontend/src/app/api/support/route.ts` como proxy.
   - `/soporte` exige sesion: sin cookie redirige/renderiza la pantalla de inicio de sesion.
   - REGLA ESTRICTA: no mencionar el dominio interno de VIDA en la interfaz publica ni privada.
     Verificado: `curl -s https://trust.supplymax.net` no contiene ninguna mencion (conteo 0).

2. **Backend (API REST & Administracion)**:
   - Framework: Django 5 + Django REST Framework con Gunicorn.
   - Directorio: `backend/`, aplicacion central `backend/core/` (models.py, views.py, urls.py).
   - Puerto en produccion: **8020** (`trust-backend.service`), escucha en `127.0.0.1:8020` (4 workers gunicorn).
   - Endpoints de soporte:
     * `GET /api/support/tickets/`: listado de tickets
     * `POST /api/support/tickets/`: creacion y sincronizacion de ticket
     * `PATCH /api/support/tickets/<id>/status-update/`: recepcion de estado de resolucion
   - Salud: `curl -s -L https://trust.supplymax.net/api/health` responde `{"ok": true, "app": "trust"}`.
     En local `http://127.0.0.1:8020/api/health` devuelve 301 (redireccion), resuelto con `-L`.

3. **Aplicacion Movil Flutter**:
   - Framework: Flutter / Dart en `flutter/`.
   - Punto de entrada `flutter/lib/main.dart`, pantallas en `flutter/lib/src/screens/`,
     servicios API en `flutter/lib/src/services/`, modelos en `flutter/lib/src/models/`.

## Estado de Servicios Verificado
- `systemctl is-active trust-backend.service trust-frontend.service` -> `active` / `active`.
- `systemctl is-enabled trust-backend.service trust-frontend.service` -> `enabled` / `enabled`.
- `pm2 jlist` -> sin procesos; `docker ps` -> sin contenedores. La plataforma corre solo con systemd.
- nginx enruta `/api/` a `http://127.0.0.1:8020` y el resto a `http://127.0.0.1:3001`.
- No hay sitio en `/var/www`: el sitio vive en `/opt/trust` (este workspace es solo copia de trabajo).

## URL Publica
- `curl -sI https://trust.supplymax.net` -> `HTTP/1.1 200 OK`, `Server: nginx/1.18.0 (Ubuntu)`, `x-nextjs-cache: HIT`.
- Pantalla principal = inicio de sesion (`<title>Trust - Inicio de Sesión</title>`), renderizada por
  `frontend/src/app/page.tsx` (componente cliente con formulario de correo/contrasena).
- Render verificado con Chromium headless (`/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`):
  * Escritorio 1366x768: `https://trust.supplymax.net` -> login correcto (logo Trust by SupplyMax, campos, boton).
  * Movil 390x844: login correcto, layout responsive sin desbordes.
  * `/soporte` en ambos tamanos: sin sesion muestra la pantalla de login (no rompe ni da error).
- `/soporte` responde 200; el contenido exige autenticacion.

## Publicacion
- Script oficial: `scripts/deploy.sh` (usa `remote_exec.py` -> `run_remote.sh` -> SSH `root@trust.supplymax.net`).
  Pasos exactos:
  1. `cd /opt/trust && sudo -u deploy git pull origin main`
  2. `sudo -u deploy npm --prefix frontend run build`
  3. `systemctl restart trust-backend.service trust-frontend.service`
  4. `systemctl is-active` de ambos servicios y `curl -sI https://trust.supplymax.net` (acepta 200/301/302).
- No usa rsync ni `--delete`. No ejecuta `python manage.py migrate` ni `collectstatic`.
- `sync.sh` (raiz del workspace) es un script de la Mac del desarrollador
  (rutas `/Users/<usuario-mac>/...`): commit + push, `git pull` remoto, `npm install`/`npm run build` y
  reinicio de servicios. NO sincroniza de produccion al workspace. No existe `scripts/sync.sh`.
- Commits verificados: produccion `/opt/trust` HEAD = `0e4a09c08babaa87cd92b4fe6d003bda0abf71b2`,
  igual a `origin/main` en GitHub. El usuario `deploy` tiene clave propia y SI puede autenticarse
  contra GitHub (`sudo -u deploy git ls-remote origin -h refs/heads/main` responde el commit).
  El usuario `root` del servidor no tiene clave de GitHub (el `git pull` debe ir como `deploy`).
- Simulacion sin cambios (`rsync -n -av --delete /root/trust/ -> :/opt/trust/`):
  borraria 41000 archivos, entre ellos `backend/db.sqlite3` (base de datos de produccion),
  `backend/media/` (evidencias subidas por el cliente), `backend/.venv/`, `backend/staticfiles/`,
  `frontend/node_modules/` y `frontend/.next/`. PROHIBIDO usar rsync con `--delete` hacia produccion.
- Simulacion de publicacion git (solo lectura): `git ls-remote` como `deploy` confirma que produccion
  esta al dia con `origin/main`; no hay cambios pendientes que aplicar.
- `bash scripts/deploy.sh --dry-run` NO esta soportado: el script no parsea argumentos (no hay bloque
  `getopts` ni comprobacion de `$1`) y ejecutaria el despliegue real (git pull + next build + restart).
  Para simular sin cambios usar unicamente la simulacion rsync `-n` de arriba, que es de solo lectura.
- Re-verificacion 2026-10-05 (solo lectura): `python3 remote_exec.py` responde hostname `vmi2922633`,
  `ls -ld /opt/trust` -> `deploy deploy 755`, ambos servicios `active`, backend
  `{"ok": true, "app": "trust"}` y `curl -sI https://trust.supplymax.net` -> `HTTP/1.1 200 OK`.
- Dry-run rsync de control (mismo comando, `--exclude node_modules --exclude .git`): 14673 entradas
  `deleting`, de las cuales 12795 en `backend/.venv`, 1209 en `frontend/.next`, 105 en `backend/media`
  y `backend/db.sqlite3`. Confirma que ese rsync destruiria produccion si se quitara `-n`.

## Compilacion
- El workspace local NO tiene `frontend/node_modules` (0 entradas): no se ejecuto `npm run build`
  ni `npx tsc --noEmit` para no instalar dependencias en una revision de solo lectura.
- Produccion si tiene dependencias: `/opt/trust/frontend/node_modules` (361 entradas) con
  node v20.20.0 y npm 10.8.2, por lo que el build debe validarse/ejecutarse en el servidor.

## Comandos Operativos desde este Workspace
- Ejecutar comandos remotos por SSH: `./run_remote.sh '<comando>'` o `python3 remote_exec.py '<comando>'`
  (clave dedicada `.ssh/id_trust`; alternativa por contrasena via `.trust_pass` + `askpass.sh`).
- Desplegar: `bash scripts/deploy.sh`
- Estado de servicios: `./run_remote.sh 'systemctl status trust-backend.service trust-frontend.service'`
- Logs: `./run_remote.sh 'journalctl -u trust-frontend.service -n 50 --no-pager'`
- Disponibilidad publica: `curl -sI https://trust.supplymax.net`

## Estado tras la correccion del despliegue (2026-10-05 12:50 UTC)

- Causa del fallo: dos despliegues simultaneos. El segundo `next build` abortaba con
  "Unable to acquire lock at /opt/trust/frontend/.next/lock, is another instance of next build running?".
- Correccion en `scripts/deploy.sh` (commit `b919cbe`): el trabajo remoto corre bajo
  `flock -w 900 /var/lock/trust-deploy.lock` (un segundo despliegue espera en lugar de fallar) y se
  elimina el lock huerfano de `.next/lock` solo si no hay ningun proceso `node` con `next build` vivo.
  El script ademas verifica servicios, salud interna y URL publica con reintentos.
- Redepliegue real `bash scripts/deploy.sh` -> build Next.js 16.1.6 correcto (TypeScript sin errores,
  51 rutas), servicios `active`, `backend /api/health -> 200`, `frontend / -> 200`,
  `HTTPS trust.supplymax.net -> 200`, exit 0.
- Workspace sincronizado: HEAD local = `origin/main` = `b919cbe` (antes `3863292`, 4 commits atras).
- Alias SSH reparado: `github-trust` -> `github.com` con `/root/.ssh/id_ed25519` en `/root/.ssh/config`.
- Migraciones: `core` 0021 aplicada en produccion; `manage.py check` sin incidencias.
- Render verificado con Chrome for Testing headless (1366x768 y 390x844) sobre la URL publica:
  `frontend/src/app/page.tsx` con el titulo de `frontend/src/app/layout.tsx` muestra
  "Bienvenido de nuevo", "Correo electronico", "Contrasena" e "Iniciar Sesion" en ambas vistas, sin
  desbordes y sin menciones del dominio interno de VIDA.
  Binario usado: `/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`.

## Bloqueos y observaciones vigentes

1. La clave del workspace (`/root/.ssh/id_ed25519`) es una deploy key de solo lectura: `git fetch/pull`
   funciona, `git push` responde "Permission denied to deploy key". Para publicar un commit hay que
   empujarlo desde el servidor (`sudo -u deploy git push origin main` en `/opt/trust`) o habilitar una
   clave con permiso de escritura en el workspace.
2. No hay verificacion de tipos local: `frontend/node_modules` no existe en el workspace, asi que el
   build solo se valida en el servidor (el deploy aborta antes de reiniciar servicios si falla). Accion
   sugerida: instalar dependencias en el workspace para validar antes de publicar.
3. `scripts/deploy.sh` no aplica `python manage.py migrate` ni `collectstatic`. Hoy la migracion 0021 ya
   esta aplicada, pero un cambio futuro de modelos quedaria sin aplicar en produccion. Entorno virtual:
   `/opt/trust/backend/.venv/bin/python` con `manage.py` en `/opt/trust/backend/`.
4. Riesgo de destruccion por rsync: `rsync --delete` del workspace a `/opt/trust` borraria
   `backend/db.sqlite3`, `backend/media/` (evidencias reales del cliente), `.venv`, `staticfiles`,
   `node_modules` y `.next`. El deploy correcto es git-based; rsync con `--delete` queda prohibido.
5. El deploy reinicia ambos servicios a la vez y no tiene rollback automatico: una falla de build aborta
   antes del restart, pero no restaura automaticamente la version anterior.
6. El lock `.next/lock` de Next.js no se libera solo si el proceso muere; el script limpia locks
   huerfanos, pero tras un `kill -9` durante el build conviene volver a ejecutar `bash scripts/deploy.sh`.
