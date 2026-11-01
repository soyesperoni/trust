from django.core.management.base import BaseCommand
from django.utils import timezone

from core.fcm_manager import send_corrective_action_due_reminder
from core.models import CorrectiveAction


class Command(BaseCommand):
    help = "Envía recordatorios de acciones correctivas que vencen hoy o están vencidas."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Muestra las acciones que recibirían recordatorio sin enviar notificaciones.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        today = timezone.localdate()
        active_statuses = [
            CorrectiveAction.Status.OPEN,
            CorrectiveAction.Status.IN_PROGRESS,
        ]
        base_queryset = CorrectiveAction.objects.filter(
            status__in=active_statuses,
            reminder_sent_at__isnull=True,
        ).select_related("responsible", "incident", "audit")

        due_today = base_queryset.filter(due_date=today)
        overdue = base_queryset.filter(due_date__lt=today)

        sent_count = 0
        for action in list(due_today) + list(overdue):
            is_overdue = action.due_date < today
            label = "vencida" if is_overdue else "vence hoy"
            if dry_run:
                self.stdout.write(
                    f"[dry-run] Acción {action.id} {label}: {action.responsible} - {action.due_date}"
                )
                continue
            try:
                sent = send_corrective_action_due_reminder(action, overdue=is_overdue)
            except Exception as exc:
                self.stderr.write(f"Acción {action.id}: error al notificar: {exc}")
                continue
            if sent:
                CorrectiveAction.objects.filter(pk=action.id).update(reminder_sent_at=timezone.now())
                sent_count += 1

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"Recordatorios enviados: {sent_count}"))
