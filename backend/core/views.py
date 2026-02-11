import json
from datetime import datetime
from typing import Any

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Area, Branch, Client, Dispenser, Incident, Product, User, Visit, VisitMedia


def _serialize_user(user: User) -> dict:
    full_name = user.get_full_name().strip()
    return {
        "id": user.id,
        "full_name": full_name or user.username,
        "email": user.email,
        "role": user.role,
        "role_label": user.get_role_display(),
        "is_active": user.is_active,
        "profile_photo": user.profile_photo.url if user.profile_photo else None,
        "client_ids": list(user.clients.values_list("id", flat=True)),
        "branch_ids": list(user.branches.values_list("id", flat=True)),
        "area_ids": list(user.areas.values_list("id", flat=True)),
    }


def _is_general_admin(request) -> bool:
    current_email = str(request.headers.get("X-Current-User-Email") or "").strip().lower()
    if not current_email:
        return False
    return User.objects.filter(email__iexact=current_email, role=User.Role.GENERAL_ADMIN).exists()


def _get_current_user(request):
    current_email = str(request.headers.get("X-Current-User-Email") or "").strip().lower()
    if not current_email:
        return None
    return User.objects.filter(email__iexact=current_email, is_active=True).first()


def _get_client_scope_ids(request):
    current_user = _get_current_user(request)
    if not current_user or current_user.role not in {
        User.Role.ACCOUNT_ADMIN,
        User.Role.INSPECTOR,
    }:
        return None
    return list(current_user.clients.values_list("id", flat=True))


def _get_branch_scope_ids(request):
    current_user = _get_current_user(request)
    if not current_user or current_user.role != User.Role.BRANCH_ADMIN:
        return None
    return list(current_user.branches.values_list("id", flat=True))



def _extract_user_data(request):
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        data = request.POST.copy()
        if "client_ids" in data and isinstance(data.get("client_ids"), str):
            data.setlist("client_ids", [value for value in data.getlist("client_ids") if value != ""])
        if "branch_ids" in data and isinstance(data.get("branch_ids"), str):
            data.setlist("branch_ids", [value for value in data.getlist("branch_ids") if value != ""])
        if "area_ids" in data and isinstance(data.get("area_ids"), str):
            data.setlist("area_ids", [value for value in data.getlist("area_ids") if value != ""])
        return data, request.FILES

    try:
        return json.loads(request.body or "{}"), request.FILES
    except json.JSONDecodeError:
        return None, None


def _as_id_list(source, key: str):
    if hasattr(source, "getlist"):
        values = source.getlist(key)
        if not values and key in source:
            maybe = source.get(key)
            values = maybe if isinstance(maybe, list) else [maybe]
    else:
        values = source.get(key) if isinstance(source, dict) else None
        if values is None:
            return None
        if not isinstance(values, list):
            values = [values]

    resolved = []
    for value in values:
        if value in (None, ""):
            continue
        try:
            resolved.append(int(value))
        except (TypeError, ValueError):
            continue
    return resolved


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
            "photo": dispenser.model.photo.url if dispenser.model.photo else None,
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
        "status": visit.status,
        "status_label": visit.get_status_display(),
        "started_at": visit.started_at.isoformat() if visit.started_at else None,
        "completed_at": visit.completed_at.isoformat() if visit.completed_at else None,
        "start_latitude": visit.start_latitude,
        "start_longitude": visit.start_longitude,
        "end_latitude": visit.end_latitude,
        "end_longitude": visit.end_longitude,
        "visit_report": visit.visit_report,
    }


def _parse_optional_float(value: Any):
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _normalize_visit_report(value: Any):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return None
    if isinstance(value, dict):
        return value
    return None


def _is_truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "si", "sí"}
    return bool(value)


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
    now = timezone.now()
    client_scope_ids = _get_client_scope_ids(request)
    branch_scope_ids = _get_branch_scope_ids(request)

    clients = Client.objects.all()
    branches = Branch.objects.all()
    areas = Area.objects.all()
    dispensers = Dispenser.objects.all()
    products = Product.objects.all()
    visits = Visit.objects.all()
    incidents = Incident.objects.all()

    if client_scope_ids is not None:
        clients = clients.filter(id__in=client_scope_ids)
        branches = branches.filter(client_id__in=client_scope_ids)
        areas = areas.filter(branch__client_id__in=client_scope_ids)
        dispensers = dispensers.filter(area__branch__client_id__in=client_scope_ids)
        products = products.filter(dispenser__area__branch__client_id__in=client_scope_ids)
        visits = visits.filter(area__branch__client_id__in=client_scope_ids)
        incidents = incidents.filter(client_id__in=client_scope_ids)
    if branch_scope_ids is not None:
        branches = branches.filter(id__in=branch_scope_ids)
        areas = areas.filter(branch_id__in=branch_scope_ids)
        dispensers = dispensers.filter(area__branch_id__in=branch_scope_ids)
        products = products.filter(dispenser__area__branch_id__in=branch_scope_ids)
        visits = visits.filter(area__branch_id__in=branch_scope_ids)
        incidents = incidents.filter(branch_id__in=branch_scope_ids)

    stats = {
        "clients": clients.count(),
        "branches": branches.count(),
        "areas": areas.count(),
        "dispensers": dispensers.count(),
        "products": products.count(),
        "visits": visits.count(),
        "pending_visits": visits.filter(visited_at__gt=now).count(),
        "incidents": incidents.count(),
    }
    recent_visits = (
        visits.select_related("area__branch__client", "inspector")
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
        queryset = Client.objects.all()
        client_scope_ids = _get_client_scope_ids(request)
        if client_scope_ids is not None:
            queryset = queryset.filter(id__in=client_scope_ids)
        payload = [_serialize_client(client) for client in queryset]
        return JsonResponse({"results": payload})

    current_user = _get_current_user(request)
    if current_user and current_user.role == User.Role.INSPECTOR:
        return JsonResponse({"error": "No tienes permisos para editar clientes."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
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

    current_user = _get_current_user(request)
    if current_user and current_user.role == User.Role.INSPECTOR:
        return JsonResponse({"error": "No tienes permisos para editar clientes."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
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
    queryset = Branch.objects.select_related("client")
    client_scope_ids = _get_client_scope_ids(request)
    branch_scope_ids = _get_branch_scope_ids(request)
    if client_scope_ids is not None:
        queryset = queryset.filter(client_id__in=client_scope_ids)
    if branch_scope_ids is not None:
        queryset = queryset.filter(id__in=branch_scope_ids)
    payload = [
        _serialize_branch(branch)
        for branch in queryset.all()
    ]
    return JsonResponse({"results": payload})


@require_GET
def areas(request):
    queryset = Area.objects.select_related("branch__client")
    client_scope_ids = _get_client_scope_ids(request)
    branch_scope_ids = _get_branch_scope_ids(request)
    if client_scope_ids is not None:
        queryset = queryset.filter(branch__client_id__in=client_scope_ids)
    if branch_scope_ids is not None:
        queryset = queryset.filter(branch_id__in=branch_scope_ids)
    payload = [
        _serialize_area(area)
        for area in queryset.all()
    ]
    return JsonResponse({"results": payload})


@require_GET
def dispensers(request):
    queryset = Dispenser.objects.select_related("model", "area__branch__client")
    client_scope_ids = _get_client_scope_ids(request)
    branch_scope_ids = _get_branch_scope_ids(request)
    if client_scope_ids is not None:
        queryset = queryset.filter(area__branch__client_id__in=client_scope_ids)
    if branch_scope_ids is not None:
        queryset = queryset.filter(area__branch_id__in=branch_scope_ids)
    payload = [
        _serialize_dispenser(dispenser)
        for dispenser in queryset.all()
    ]
    return JsonResponse({"results": payload})


@require_GET
def products(request):
    queryset = Product.objects.select_related("dispenser__model")
    client_scope_ids = _get_client_scope_ids(request)
    branch_scope_ids = _get_branch_scope_ids(request)
    if client_scope_ids is not None:
        queryset = queryset.filter(dispenser__area__branch__client_id__in=client_scope_ids)
    if branch_scope_ids is not None:
        queryset = queryset.filter(dispenser__area__branch_id__in=branch_scope_ids)
    payload = [
        _serialize_product(product)
        for product in queryset.all()
    ]
    return JsonResponse({"results": payload})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def visits(request):
    current_user = _get_current_user(request)
    if request.method == "POST":
        if not current_user or current_user.role != User.Role.GENERAL_ADMIN:
            return JsonResponse({"error": "Solo el Administrador general puede agendar visitas."}, status=403)

    if request.method == "GET":
        queryset = Visit.objects.select_related(
            "area__branch__client", "inspector", "dispenser"
        )
        client_scope_ids = _get_client_scope_ids(request)
        branch_scope_ids = _get_branch_scope_ids(request)
        if client_scope_ids is not None:
            queryset = queryset.filter(area__branch__client_id__in=client_scope_ids)
        if branch_scope_ids is not None:
            queryset = queryset.filter(area__branch_id__in=branch_scope_ids)

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

    data, files = _extract_user_data(request)
    if data is None:
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
        "status": Visit.Status.SCHEDULED,
    }
    if visited_at:
        create_kwargs["visited_at"] = visited_at

    visit = Visit.objects.create(**create_kwargs)

    return JsonResponse(_serialize_visit(visit), status=201)


@csrf_exempt
@require_http_methods(["PATCH"])
def visit_mobile_flow(request, visit_id: int):
    current_user = _get_current_user(request)
    if not current_user or current_user.role != User.Role.INSPECTOR:
        return JsonResponse({"error": "Solo un inspector puede realizar visitas programadas."}, status=403)

    try:
        visit = Visit.objects.select_related("inspector").get(pk=visit_id)
    except Visit.DoesNotExist:
        return JsonResponse({"error": "Visita no encontrada."}, status=404)

    if visit.inspector_id and visit.inspector_id != current_user.id:
        return JsonResponse({"error": "Esta visita está asignada a otro inspector."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    action = str(data.get("action") or "").strip()

    if action == "start":
        if visit.status != Visit.Status.SCHEDULED:
            return JsonResponse({"error": "Solo puedes iniciar visitas programadas."}, status=400)

        start_latitude = _parse_optional_float(data.get("start_latitude"))
        start_longitude = _parse_optional_float(data.get("start_longitude"))
        if start_latitude is None or start_longitude is None:
            return JsonResponse({"error": "Debes validar tu ubicación para iniciar la visita."}, status=400)

        visit.started_at = timezone.now()
        visit.start_latitude = start_latitude
        visit.start_longitude = start_longitude
        visit.inspector = current_user
        visit.save(update_fields=["started_at", "start_latitude", "start_longitude", "inspector"])
        return JsonResponse(_serialize_visit(visit))

    if action == "complete":
        if visit.status != Visit.Status.SCHEDULED:
            return JsonResponse({"error": "La visita no se puede finalizar en su estado actual."}, status=400)
        if not visit.started_at:
            return JsonResponse({"error": "Debes iniciar la visita antes de finalizarla."}, status=400)

        end_latitude = _parse_optional_float(data.get("end_latitude"))
        end_longitude = _parse_optional_float(data.get("end_longitude"))
        if end_latitude is None or end_longitude is None:
            return JsonResponse({"error": "Debes validar tu ubicación para finalizar la visita."}, status=400)

        report = _normalize_visit_report(data.get("visit_report"))
        if report is None:
            return JsonResponse({"error": "El informe de la visita es inválido."}, status=400)

        if not _is_truthy(report.get("location_verified")):
            return JsonResponse({"error": "Debes confirmar que te encuentras físicamente en el sitio."}, status=400)

        responsible_name = str(report.get("responsible_name") or "").strip()
        responsible_signature = str(report.get("responsible_signature") or "").strip()
        if not responsible_name or not responsible_signature:
            return JsonResponse({"error": "Debes registrar nombre y firma del responsable para finalizar."}, status=400)

        visit.status = Visit.Status.COMPLETED
        visit.completed_at = timezone.now()
        visit.end_latitude = end_latitude
        visit.end_longitude = end_longitude
        report["start_location"] = {
            "latitude": visit.start_latitude,
            "longitude": visit.start_longitude,
        }
        report["end_location"] = {
            "latitude": end_latitude,
            "longitude": end_longitude,
        }
        visit.visit_report = report
        visit.save(update_fields=["status", "completed_at", "end_latitude", "end_longitude", "visit_report"])

        evidence_files = files.getlist("evidence_files") if files else []
        for evidence in evidence_files:
            content_type = str(getattr(evidence, "content_type", "") or "")
            if content_type.startswith("image/"):
                media_type = VisitMedia.MediaType.PHOTO
            elif content_type.startswith("video/"):
                media_type = VisitMedia.MediaType.VIDEO
            else:
                media_type = VisitMedia.MediaType.OTHER
            VisitMedia.objects.create(visit=visit, media_type=media_type, file=evidence)

        return JsonResponse(_serialize_visit(visit))


    return JsonResponse({"error": "Acción no válida."}, status=400)


@require_GET
def incidents(request):
    queryset = Incident.objects.select_related("client", "branch", "area", "dispenser")
    client_scope_ids = _get_client_scope_ids(request)
    branch_scope_ids = _get_branch_scope_ids(request)
    if client_scope_ids is not None:
        queryset = queryset.filter(client_id__in=client_scope_ids)
    if branch_scope_ids is not None:
        queryset = queryset.filter(branch_id__in=branch_scope_ids)
    payload = [
        _serialize_incident(incident)
        for incident in queryset.all()
    ]
    return JsonResponse({"results": payload})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def users(request):
    if request.method == "GET":
        payload = [_serialize_user(user) for user in User.objects.order_by("id")]
        return JsonResponse({"results": payload})

    data, files = _extract_user_data(request)
    if data is None:
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
    profile_photo = files.get("profile_photo") if files else None
    if profile_photo is not None:
        user.profile_photo = profile_photo
        user.save(update_fields=["profile_photo"])

    client_ids = _as_id_list(data, "client_ids")
    branch_ids = _as_id_list(data, "branch_ids")
    area_ids = _as_id_list(data, "area_ids")
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

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    full_name = str(data.get("full_name", "")).strip()
    if full_name:
        name_parts = full_name.split(" ", 1)
        user.first_name = name_parts[0]
        user.last_name = name_parts[1] if len(name_parts) > 1 else ""

    if "email" in data:
        user.email = str(data.get("email") or "").strip()
    current_user = _get_current_user(request)
    if "role" in data and _is_general_admin(request):
        if not current_user or current_user.id != user.id:
            user.role = data.get("role") or user.role
        else:
            return JsonResponse({"error": "No puedes editar tu propio rol."}, status=400)
    if "is_active" in data:
        user.is_active = bool(data.get("is_active"))
    if data.get("password"):
        user.set_password(str(data.get("password")))

    remove_profile_photo = str(data.get("remove_profile_photo") or "").lower() in {"1", "true", "yes"}
    if remove_profile_photo and user.profile_photo:
        user.profile_photo.delete(save=False)
        user.profile_photo = None

    profile_photo = files.get("profile_photo") if files else None
    if profile_photo is not None:
        user.profile_photo = profile_photo

    client_ids = _as_id_list(data, "client_ids") if "client_ids" in data else None
    branch_ids = _as_id_list(data, "branch_ids") if "branch_ids" in data else None
    area_ids = _as_id_list(data, "area_ids") if "area_ids" in data else None

    if client_ids is not None:
        user.clients.set(Client.objects.filter(id__in=client_ids))
    if branch_ids is not None:
        user.branches.set(Branch.objects.filter(id__in=branch_ids))
    if area_ids is not None:
        user.areas.set(Area.objects.filter(id__in=area_ids))

    user.save()
    return JsonResponse(_serialize_user(user))
