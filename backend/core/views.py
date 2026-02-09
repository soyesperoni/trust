import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Area, Branch, Client, Dispenser, User, Visit


def _serialize_user(user: User) -> dict:
    full_name = user.get_full_name().strip()
    return {
        "id": user.id,
        "full_name": full_name or user.username,
        "email": user.email,
        "role": user.role,
        "role_label": user.get_role_display(),
        "is_active": user.is_active,
    }


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


@csrf_exempt
@require_http_methods(["GET", "POST"])
def users(request):
    if request.method == "GET":
        payload = [_serialize_user(user) for user in User.objects.order_by("id")]
        return JsonResponse({"results": payload})

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    full_name = str(data.get("full_name", "")).strip()
    email = str(data.get("email", "")).strip()
    password = str(data.get("password", "")).strip()
    role = data.get("role") or User.Role.INSPECTOR

    if not email or not password:
        return JsonResponse(
            {"error": "Email y contraseña son obligatorios."}, status=400
        )

    name_parts = full_name.split(" ", 1) if full_name else []
    first_name = name_parts[0] if name_parts else ""
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    username = str(data.get("username") or email)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role,
        is_active=bool(data.get("is_active", True)),
    )
    return JsonResponse(_serialize_user(user), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def user_detail(request, user_id: int):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "Usuario no encontrado."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_user(user))

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    full_name = str(data.get("full_name", "")).strip()
    if full_name:
        name_parts = full_name.split(" ", 1)
        user.first_name = name_parts[0]
        user.last_name = name_parts[1] if len(name_parts) > 1 else ""

    if "email" in data:
        user.email = str(data.get("email") or "").strip()
    if "role" in data:
        user.role = data.get("role") or user.role
    if "is_active" in data:
        user.is_active = bool(data.get("is_active"))
    if data.get("password"):
        user.set_password(str(data.get("password")))

    user.save()
    return JsonResponse(_serialize_user(user))
