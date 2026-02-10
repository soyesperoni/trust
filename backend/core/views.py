import json
from datetime import datetime

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Area, Branch, Client, Dispenser, Incident, Product, User, Visit


def _serialize_user(user: User) -> dict:
    full_name = user.get_full_name().strip()
    return {
        "id": user.id,
        "full_name": full_name or user.username,
        "email": user.email,
        "role": user.role,
        "role_label": user.get_role_display(),
        "is_active": user.is_active,
        "client_ids": list(user.clients.values_list("id", flat=True)),
        "branch_ids": list(user.branches.values_list("id", flat=True)),
        "area_ids": list(user.areas.values_list("id", flat=True)),
    }


def _serialize_client(client: Client) -> dict:
    return {
        "id": client.id,
        "name": client.name,
        "code": client.code,
        "notes": client.notes,
    }


def _serialize_branch(branch: Branch) -> dict:
    return {
        "id": branch.id,
        "name": branch.name,
        "address": branch.address,
        "city": branch.city,
        "client": {
            "id": branch.client_id,
            "name": branch.client.name,
        },
    }


def _serialize_area(area: Area) -> dict:
    return {
        "id": area.id,
        "name": area.name,
        "description": area.description,
        "branch": {
            "id": area.branch_id,
            "name": area.branch.name,
            "client": area.branch.client.name,
        },
    }


def _serialize_dispenser(dispenser: Dispenser) -> dict:
    return {
        "id": dispenser.id,
        "identifier": dispenser.identifier,
        "installed_at": dispenser.installed_at.isoformat()
        if dispenser.installed_at
        else None,
        "model": {
            "id": dispenser.model_id,
            "name": dispenser.model.name,
        },
        "area": {
            "id": dispenser.area_id,
            "name": dispenser.area.name,
            "branch": dispenser.area.branch.name,
        }
        if dispenser.area
        else None,
    }


def _serialize_product(product: Product) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "dispenser": {
            "id": product.dispenser_id,
            "identifier": product.dispenser.identifier,
            "model": product.dispenser.model.name,
        },
    }


def _serialize_visit(visit: Visit) -> dict:
    inspector = "Sin asignar"
    inspector_id = None
    if visit.inspector:
        inspector = visit.inspector.get_full_name() or visit.inspector.username
        inspector_id = visit.inspector_id
    return {
        "id": visit.id,
        "client": visit.area.branch.client.name,
        "client_id": visit.area.branch.client_id,
        "branch": visit.area.branch.name,
        "branch_id": visit.area.branch_id,
        "area": visit.area.name,
        "area_id": visit.area_id,
        "dispenser": visit.dispenser.identifier if visit.dispenser else None,
        "dispenser_id": visit.dispenser_id,
        "inspector": inspector,
        "inspector_id": inspector_id,
        "visited_at": visit.visited_at.isoformat(),
        "notes": visit.notes,
    }


def _serialize_incident(incident: Incident) -> dict:
    return {
        "id": incident.id,
        "client": incident.client.name,
        "branch": incident.branch.name,
        "area": incident.area.name,
        "dispenser": incident.dispenser.identifier,
        "description": incident.description,
        "created_at": incident.created_at.isoformat(),
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
        "products": Product.objects.count(),
        "visits": Visit.objects.count(),
        "incidents": Incident.objects.count(),
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
def clients(request):
    if request.method == "GET":
        payload = [_serialize_client(client) for client in Client.objects.all()]
        return JsonResponse({"results": payload})

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    name = str(data.get("name") or "").strip()
    code = str(data.get("code") or "").strip()
    notes = str(data.get("notes") or "").strip()

    if not name or not code:
        return JsonResponse(
            {"error": "Nombre y código son obligatorios."}, status=400
        )

    if Client.objects.filter(code=code).exists():
        return JsonResponse(
            {"error": "Ya existe un cliente con ese código."}, status=400
        )

    client = Client.objects.create(name=name, code=code, notes=notes)
    return JsonResponse(_serialize_client(client), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def client_detail(request, client_id: int):
    try:
        client = Client.objects.get(pk=client_id)
    except Client.DoesNotExist:
        return JsonResponse({"error": "Cliente no encontrado."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_client(client))

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    if "name" in data:
        client.name = str(data.get("name") or "").strip()
    if "code" in data:
        code = str(data.get("code") or "").strip()
        if not code:
            return JsonResponse({"error": "El código no puede estar vacío."}, status=400)
        if Client.objects.exclude(pk=client.pk).filter(code=code).exists():
            return JsonResponse(
                {"error": "Ya existe un cliente con ese código."}, status=400
            )
        client.code = code
    if "notes" in data:
        client.notes = str(data.get("notes") or "").strip()

    if not client.name:
        return JsonResponse({"error": "El nombre no puede estar vacío."}, status=400)

    client.save()
    return JsonResponse(_serialize_client(client))


@require_GET
def branches(request):
    payload = [
        _serialize_branch(branch)
        for branch in Branch.objects.select_related("client").all()
    ]
    return JsonResponse({"results": payload})


@require_GET
def areas(request):
    payload = [
        _serialize_area(area)
        for area in Area.objects.select_related("branch__client").all()
    ]
    return JsonResponse({"results": payload})


@require_GET
def dispensers(request):
    payload = [
        _serialize_dispenser(dispenser)
        for dispenser in Dispenser.objects.select_related(
            "model", "area__branch__client"
        ).all()
    ]
    return JsonResponse({"results": payload})


@require_GET
def products(request):
    payload = [
        _serialize_product(product)
        for product in Product.objects.select_related(
            "dispenser__model"
        ).all()
    ]
    return JsonResponse({"results": payload})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def visits(request):
    if request.method == "GET":
        queryset = Visit.objects.select_related(
            "area__branch__client", "inspector", "dispenser"
        )

        month = (request.GET.get("month") or "").strip()
        if month:
            try:
                month_date = datetime.strptime(month, "%Y-%m")
                queryset = queryset.filter(
                    visited_at__year=month_date.year,
                    visited_at__month=month_date.month,
                )
            except ValueError:
                return JsonResponse(
                    {"error": "El parámetro month debe tener formato YYYY-MM."},
                    status=400,
                )

        payload = [_serialize_visit(visit) for visit in queryset.all()]
        return JsonResponse({"results": payload})

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    area_id = data.get("area_id")
    if not area_id:
        return JsonResponse({"error": "El área es obligatoria."}, status=400)

    try:
        area = Area.objects.get(pk=int(area_id))
    except (Area.DoesNotExist, ValueError, TypeError):
        return JsonResponse({"error": "Área no válida."}, status=400)

    dispenser = None
    dispenser_id = data.get("dispenser_id")
    if dispenser_id:
        try:
            dispenser = Dispenser.objects.get(pk=int(dispenser_id))
        except (Dispenser.DoesNotExist, ValueError, TypeError):
            return JsonResponse({"error": "Dosificador no válido."}, status=400)

    inspector = None
    inspector_id = data.get("inspector_id")
    if inspector_id:
        try:
            inspector = User.objects.get(pk=int(inspector_id))
        except (User.DoesNotExist, ValueError, TypeError):
            return JsonResponse({"error": "Inspector no válido."}, status=400)

    notes = str(data.get("notes") or "").strip()

    visited_at = None
    visited_at_input = str(data.get("visited_at") or "").strip()
    if visited_at_input:
        try:
            visited_at = datetime.fromisoformat(visited_at_input.replace("Z", "+00:00"))
        except ValueError:
            return JsonResponse(
                {"error": "La fecha/hora de la visita no tiene un formato válido."},
                status=400,
            )

    create_kwargs = {
        "area": area,
        "dispenser": dispenser,
        "inspector": inspector,
        "notes": notes,
    }
    if visited_at:
        create_kwargs["visited_at"] = visited_at

    visit = Visit.objects.create(**create_kwargs)

    return JsonResponse(_serialize_visit(visit), status=201)


@require_GET
def incidents(request):
    payload = [
        _serialize_incident(incident)
        for incident in Incident.objects.select_related(
            "client", "branch", "area", "dispenser"
        ).all()
    ]
    return JsonResponse({"results": payload})


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
    client_ids = data.get("client_ids")
    branch_ids = data.get("branch_ids")
    area_ids = data.get("area_ids")
    if client_ids is not None:
        user.clients.set(Client.objects.filter(id__in=client_ids))
    if branch_ids is not None:
        user.branches.set(Branch.objects.filter(id__in=branch_ids))
    if area_ids is not None:
        user.areas.set(Area.objects.filter(id__in=area_ids))
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

    if "client_ids" in data:
        user.clients.set(Client.objects.filter(id__in=data.get("client_ids") or []))
    if "branch_ids" in data:
        user.branches.set(Branch.objects.filter(id__in=data.get("branch_ids") or []))
    if "area_ids" in data:
        user.areas.set(Area.objects.filter(id__in=data.get("area_ids") or []))

    user.save()
    return JsonResponse(_serialize_user(user))
