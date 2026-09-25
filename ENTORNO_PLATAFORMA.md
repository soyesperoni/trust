# ENTORNO PLATAFORMA: TRUST (PROLAT)

## Informacion General
- Plataforma: Trust - Inspeccion, Supply Chain & Calidad
- Cliente: Prolat
- Dominio de produccion: `https://trust.supplymax.net`
- Servidor remoto SSH: `trust.supplymax.net` (IP: `185.250.36.58`)
- Directorio en servidor remoto: `/opt/trust`
- Workspace local en Vida: `/root/trust`

## Arquitectura y Stack Tecnologico
1. **Frontend Dashboard (Web)**:
   - Framework: Next.js 14 App Router, React 18, Tailwind CSS, TypeScript.
   - Directorio: `frontend/`
   - Puerto en produccion: **3001** (`trust-frontend.service`)
   - Modulos clave: Dashboard, Inspecciones, Cotizaciones, Proveedores, Despachos y `/soporte` (gestion nativa de tickets con sincronizacion bidireccional).
   - REGLA ESTRICTA: NUNCA mencionar 'vida.dayronesperon.com' en la interfaz publica ni privada de Trust.

2. **Backend (API REST & Administracion)**:
   - Framework: Django 5 + Django REST Framework con Gunicorn.
   - Directorio: `backend/`
   - Puerto en produccion: **8020** (`trust-backend.service`)
   - Aplicacion central: `backend/core/` (models.py, views.py, urls.py).
   - Endpoints de soporte:
     * `GET /api/support/tickets/`: listado de tickets
     * `POST /api/support/tickets/`: creacion y sincronizacion de ticket
     * `PATCH /api/support/tickets/<id>/status-update/`: recepcion de estado de resolucion

3. **Aplicacion Movil Flutter**:
   - Framework: Flutter / Dart.
   - Directorio: `flutter/`
   - Estructura:
     * `flutter/lib/main.dart`: punto de entrada.
     * `flutter/lib/src/screens/`: pantallas de inspecciones en campo, inventario, reportes de calidad y autenticacion.
     * `flutter/lib/src/services/`: clientes de API REST y sincronizacion de datos offline.
     * `flutter/lib/src/models/`: modelos de datos Dart.
     * `flutter/pubspec.yaml`: dependencias y configuracion.

## Comandos Operativos desde este Workspace
- Ejecutar comandos remotos por SSH:
  `./run_remote.sh '<comando>'` o `python3 remote_exec.py '<comando>'`
- Desplegar cambios en produccion:
  `./run_remote.sh 'cd /opt/trust && git pull origin main && npm --prefix frontend run build && systemctl restart trust-backend.service trust-frontend.service'`
- Ver estado de servicios:
  `./run_remote.sh 'systemctl status trust-backend.service trust-frontend.service'`
- Ver logs de servicios:
  `./run_remote.sh 'journalctl -u trust-backend.service -n 50 --no-pager'`
  `./run_remote.sh 'journalctl -u trust-frontend.service -n 50 --no-pager'`
- Verificacion de disponibilidad publica:
  `curl -sI https://trust.supplymax.net`
