import logging

import firebase_admin
from firebase_admin import credentials, messaging

from .models import FirebaseConfig

logger = logging.getLogger(__name__)


def _get_firebase_app():
    if firebase_admin._apps:
        return next(iter(firebase_admin._apps.values()))

    config = FirebaseConfig.objects.filter(esta_activo=True).first()
    if not config or not config.archivo_json:
        return None

    cred = credentials.Certificate(config.archivo_json.path)
    return firebase_admin.initialize_app(cred)


def _send_to_tokens(tokens: list[str], title: str, body: str, data: dict[str, str] | None = None) -> int:
    app = _get_firebase_app()
    if not app:
        logger.warning("Firebase no está configurado o activo.")
        return 0

    if not tokens:
        return 0

    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        tokens=tokens,
    )
    response = messaging.send_each_for_multicast(message, app=app)
    logger.info("Notificaciones FCM enviadas: %s", response.success_count)
    return response.success_count


def send_push_notification(user, title: str, body: str, data: dict[str, str] | None = None) -> int:
    tokens = list(user.fcm_devices.values_list("registration_id", flat=True))
    return _send_to_tokens(tokens, title=title, body=body, data=data)


def send_push_notification_to_devices(devices, title: str, body: str, data: dict[str, str] | None = None) -> int:
    tokens = list(devices.values_list("registration_id", flat=True).distinct())
    return _send_to_tokens(tokens, title=title, body=body, data=data)


def send_corrective_action_assignment_notification(action) -> int:
    due_date = action.due_date.strftime("%d/%m/%Y") if action.due_date else "sin fecha"
    summary = (action.description or "").strip()
    if len(summary) > 120:
        summary = f"{summary[:117]}..."
    return send_push_notification(
        action.responsible,
        title="Nueva acción correctiva asignada",
        body=f"{summary} - vence {due_date}",
        data={
            "event": "corrective_action_assigned",
            "action_id": str(action.id),
            "origin_type": action.origin_type,
        },
    )


def send_corrective_action_due_reminder(action, *, overdue: bool = False) -> int:
    due_date = action.due_date.strftime("%d/%m/%Y") if action.due_date else "sin fecha"
    summary = (action.description or "").strip()
    if len(summary) > 120:
        summary = f"{summary[:117]}..."
    event = "corrective_action_overdue" if overdue else "corrective_action_due"
    title = "Acción correctiva vencida" if overdue else "Acción correctiva vence hoy"
    return send_push_notification(
        action.responsible,
        title=title,
        body=f"{summary} - fecha límite {due_date}",
        data={
            "event": event,
            "action_id": str(action.id),
            "origin_type": action.origin_type,
        },
    )
