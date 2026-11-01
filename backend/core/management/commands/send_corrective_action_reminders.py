from django.core.management.base import BaseCommand
from django.utils import timezone

from core.fcm_manager import send_corrective_action_due_reminder
from core.models import CorrectiveAction


class Command(BaseCommand):
    help = (
        "Envía recordatorios de acciones correctivas abiertas o en curso "
        "cuya fecha límite es hoy o ya venció."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Lista las acciones pendientes de recordatorio sin enviar notificaciones.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        today = timezone.localdate()
        pending_actions = list(
            CorrectiveAction.objects.filter(
                due_date__lte=today,
                reminder_sent_at__isnull=True,
            )
            .exclude(status=CorrectiveAction.Status.CLOSED)
            .select_related("responsible", "incident", "audit")
            .order_by("due_date", "id")
        )

        if dry_run:
            for action in pending_actions:
                label = "vencida" if action.due_date < today else "vence hoy"
                self.stdout.write(
                    f"[dry-run] Acción {action.id} {label}: "
                    f"{action.responsible} - {action.due_date}"
                )
            self.stdout.write(
                self.style.WARNING(
                    f"[dry-run] Recordatorios pendientes: {len(pending_actions)}"
                )
            )
            return

        sent_count = 0
        delivered_count = 0
        failed_count = 0

        for action in pending_actions:
            is_overdue = action.due_date < today
            try:
                delivered = send_corrective_action_due_reminder(
                    action,
                    overdue=is_overdue,
                )
            except Exception as exc:
                failed_count += 1
                self.stderr.write(
                    f"Acción {action.id}: error al notificar: {exc}"
                )
                continue

            # La marca se guarda aunque no haya dispositivos registrados para
            # evitar reintentos duplicados en ejecuciones consecutivas.
            CorrectiveAction.objects.filter(
                pk=action.pk,
                reminder_sent_at__isnull=True,
            ).update(reminder_sent_at=timezone.now())
            sent_count += 1
            delivered_count += delivered
            label = "vencida" if is_overdue else "vence hoy"
            self.stdout.write(
                f"Acción {action.id} {label}: recordatorio procesado "
                f"({delivered} dispositivo(s))."
            )

        message = f"Recordatorios enviados: {sent_count}"
        if delivered_count != sent_count:
            message += f" (push entregados: {delivered_count})"
        if failed_count:
            message += f" - errores: {failed_count}"
        self.stdout.write(self.style.SUCCESS(message))
