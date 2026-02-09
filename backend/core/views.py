from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Area, Branch, Client, Dispenser, Visit


@require_GET
def health(request):
    return JsonResponse({"ok": True, "app": "trust"})


@require_GET
def dashboard(request):
    stats = {
        "clients": Client.objects.count(),
        "branches": Branch.objects.count(),
        "areas": Area.objects.count(),
        "dispensers": Dispenser.objects.count(),
    }
    recent_visits = (
        Visit.objects.select_related("area__branch__client", "inspector")
        .order_by("-visited_at")[:6]
    )
    activity = []
    for visit in recent_visits:
        inspector = "Sin asignar"
        if visit.inspector:
            inspector = visit.inspector.get_full_name() or visit.inspector.username
        activity.append(
            {
                "id": visit.id,
                "client": visit.area.branch.client.name,
                "branch": visit.area.branch.name,
                "type": "Visita",
                "inspector": inspector,
                "status": "Registrado",
                "visited_at": visit.visited_at.isoformat(),
            }
        )
    return JsonResponse({"stats": stats, "activity": activity})
