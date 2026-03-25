import base64
import json
import textwrap
from functools import lru_cache
from django.db import IntegrityError
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.core import signing
from django.core.signing import BadSignature, SignatureExpired
from django.core.files.storage import default_storage
from django.middleware.csrf import get_token
from django.http import HttpResponse, JsonResponse
from django.http.multipartparser import MultiPartParser, MultiPartParserError
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.utils import ImageReader
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from .models import Area, Audit, AuditForm, AuditMedia, Branch, Client, DeepSeekAPISettings, Dispenser, DispenserModel, DispenserProductAssignment, Incident, IncidentMedia, Nozzle, Product, User, Visit, VisitMedia


try:
    from svglib.svglib import svg2rlg
except Exception:  # pragma: no cover - optional dependency
    svg2rlg = None


REPORT_FONT = "Helvetica"
REPORT_FONT_BOLD = "Helvetica-Bold"
REPORT_FONT_ITALIC = "Helvetica-Oblique"
REPORT_PUBLIC_LINK_SALT = "visit-report-public-link"
REPORT_PUBLIC_LINK_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
REPORT_PAGE_PADDING = 36
REPORT_CARD_RADIUS = 14
REPORT_AUDIT_LOGO_URL = "https://trust.supplymax.net/trust_logo_s.svg"
REPORT_LOGO_PATHS = [
    Path(__file__).resolve().parents[2] / "frontend/public/trust_logo_s.png",
    Path(__file__).resolve().parents[2] / "frontend/public/trust_logo_s.svg",
    Path(__file__).resolve().parents[2] / "frontend/public/trust_logo.svg",
]


@lru_cache(maxsize=1)
def _initialize_report_fonts():
    global REPORT_FONT, REPORT_FONT_BOLD, REPORT_FONT_ITALIC
    font_candidates = [
        (
            "Poppins",
            "Poppins-Bold",
            "Poppins-Italic",
            Path("/usr/share/fonts/truetype/poppins/Poppins-Regular.ttf"),
            Path("/usr/share/fonts/truetype/poppins/Poppins-Bold.ttf"),
            Path("/usr/share/fonts/truetype/poppins/Poppins-Italic.ttf"),
        ),
        (
            "Poppins",
            "Poppins-Bold",
            "Poppins-Italic",
            Path("/usr/share/fonts/poppins/Poppins-Regular.ttf"),
            Path("/usr/share/fonts/poppins/Poppins-Bold.ttf"),
            Path("/usr/share/fonts/poppins/Poppins-Italic.ttf"),
        ),
        ("TrustSans", "TrustSans-Bold", "TrustSans-Italic", Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf")),
        ("TrustSans", "TrustSans-Bold", "TrustSans-Italic", Path("/usr/share/fonts/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"), Path("/usr/share/fonts/dejavu/DejaVuSans-Oblique.ttf")),
    ]
    for regular_name, bold_name, italic_name, regular_path, bold_path, italic_path in font_candidates:
        if not (regular_path.exists() and bold_path.exists() and italic_path.exists()):
            continue
        try:
            pdfmetrics.registerFont(TTFont(regular_name, str(regular_path)))
            pdfmetrics.registerFont(TTFont(bold_name, str(bold_path)))
            pdfmetrics.registerFont(TTFont(italic_name, str(italic_path)))
            REPORT_FONT = regular_name
            REPORT_FONT_BOLD = bold_name
            REPORT_FONT_ITALIC = italic_name
            return
        except Exception:
            continue

def _serialize_user(user: User) -> dict:
    full_name = user.get_full_name().strip()
    return {
        "id": user.id,
        "full_name": full_name or user.username,
        "email": user.email,
        "username": user.username,
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


def _is_general_admin_user(user: User | None) -> bool:
    return bool(user and user.role == User.Role.GENERAL_ADMIN)


def _can_create_dashboard_items(user: User | None) -> bool:
    return _is_general_admin_user(user)


def _can_create_incidents(user: User | None) -> bool:
    return bool(user and user.role in {User.Role.GENERAL_ADMIN, User.Role.BRANCH_ADMIN})


def _can_schedule_visit_from_incident(user: User | None, incident: Incident) -> bool:
    if not user:
        return False
    if user.role == User.Role.GENERAL_ADMIN:
        return True
    if user.role != User.Role.INSPECTOR:
        return False
    return user.clients.filter(pk=incident.client_id).exists()


def _build_access_scope(current_user: User | None) -> dict[str, list[int]] | None:
    if not current_user or current_user.role == User.Role.GENERAL_ADMIN:
        return None

    role_assignments = {
        User.Role.ACCOUNT_ADMIN: {
            "clients": set(current_user.clients.values_list("id", flat=True)),
            "branches": set(),
            "areas": set(),
        },
        User.Role.BRANCH_ADMIN: {
            "clients": set(),
            "branches": set(current_user.branches.values_list("id", flat=True)),
            "areas": set(),
        },
        User.Role.INSPECTOR: {
            "clients": set(current_user.clients.values_list("id", flat=True)),
            "branches": set(current_user.branches.values_list("id", flat=True)),
            "areas": set(current_user.areas.values_list("id", flat=True)),
        },
    }
    assignments = role_assignments.get(current_user.role, {"clients": set(), "branches": set(), "areas": set()})

    clients = set(assignments["clients"])
    branches = set(assignments["branches"])
    areas = set(assignments["areas"])

    if clients:
        branches.update(Branch.objects.filter(client_id__in=clients).values_list("id", flat=True))
    if branches:
        areas.update(Area.objects.filter(branch_id__in=branches).values_list("id", flat=True))

    if areas:
        branches.update(Area.objects.filter(id__in=areas).values_list("branch_id", flat=True))
    if branches:
        clients.update(Branch.objects.filter(id__in=branches).values_list("client_id", flat=True))

    return {
        "client_ids": sorted(clients),
        "branch_ids": sorted(branches),
        "area_ids": sorted(areas),
    }


def _get_access_scope(request):
    return _build_access_scope(_get_current_user(request))


def _filter_queryset_by_scope(queryset, scope, *, client_lookup=None, branch_lookup=None, area_lookup=None):
    if scope is None:
        return queryset

    if area_lookup is not None:
        return queryset.filter(**{f"{area_lookup}__in": scope["area_ids"]})
    if branch_lookup is not None:
        return queryset.filter(**{f"{branch_lookup}__in": scope["branch_ids"]})
    if client_lookup is not None:
        return queryset.filter(**{f"{client_lookup}__in": scope["client_ids"]})
    return queryset.none()



def _extract_user_data(request):
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        data = request.POST.copy()
        files = request.FILES

        if request.method != "POST" and not data and not files:
            try:
                parser = MultiPartParser(
                    request.META,
                    BytesIO(request.body),
                    request.upload_handlers,
                    request.encoding,
                )
                data, files = parser.parse()
                data = data.copy()
            except (MultiPartParserError, ValueError):
                return None, None
        if "client_ids" in data and isinstance(data.get("client_ids"), str):
            data.setlist("client_ids", [value for value in data.getlist("client_ids") if value != ""])
        if "branch_ids" in data and isinstance(data.get("branch_ids"), str):
            data.setlist("branch_ids", [value for value in data.getlist("branch_ids") if value != ""])
        if "area_ids" in data and isinstance(data.get("area_ids"), str):
            data.setlist("area_ids", [value for value in data.getlist("area_ids") if value != ""])
        return data, files

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
    template = area.audit_form_template
    return {
        "id": area.id,
        "name": area.name,
        "description": area.description,
        "branch": {
            "id": area.branch_id,
            "name": area.branch.name,
            "client": area.branch.client.name,
        },
        "audit_form_template_id": area.audit_form_template_id,
        "audit_form_template_name": template.name if template else None,
    }


def _serialize_dispenser(dispenser: Dispenser) -> dict:
    assignment_by_product_id = {
        assignment.product_id: assignment
        for assignment in dispenser.product_assignments.select_related("nozzle").all()
    }
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
        "products": [
            {
                "id": product.id,
                "name": product.name,
                "photo": product.photo.url if product.photo else None,
                "nozzle": {
                    "id": assignment_by_product_id[product.id].nozzle_id,
                    "name": assignment_by_product_id[product.id].nozzle.name,
                }
                if product.id in assignment_by_product_id and assignment_by_product_id[product.id].nozzle
                else None,
            }
            for product in dispenser.products.all()
        ],
        "available_nozzles": [
            {
                "id": nozzle.id,
                "name": nozzle.name,
            }
            for nozzle in dispenser.available_nozzles.all()
        ],
        "is_active": dispenser.is_active,
    }


def _serialize_dispenser_model(model: DispenserModel) -> dict:
    return {
        "id": model.id,
        "name": model.name,
        "manufacturer": model.manufacturer,
        "description": model.description,
        "photo": model.photo.url if model.photo else None,
    }


def _serialize_product(product: Product) -> dict:
    dispensers = [
        {
            "id": dispenser.id,
            "identifier": dispenser.identifier,
            "model": dispenser.model.name,
        }
        for dispenser in product.dispensers.all()
    ]
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "photo": product.photo.url if product.photo else None,
        "dispensers": dispensers,
    }


def _extract_dispenser_product_assignments(data):
    if hasattr(data, "getlist"):
        raw_assignments = data.getlist("product_assignments")
        if not raw_assignments and "product_assignments" in data:
            raw_assignments = [data.get("product_assignments")]
    else:
        raw_assignments = data.get("product_assignments") if isinstance(data, dict) else None

    if raw_assignments is None:
        return None, None

    if isinstance(raw_assignments, str):
        raw_assignments = raw_assignments.strip()
        if not raw_assignments:
            return [], None
        try:
            raw_assignments = json.loads(raw_assignments)
        except json.JSONDecodeError:
            return None, "Formato inválido para product_assignments."
    elif (
        isinstance(raw_assignments, list)
        and len(raw_assignments) == 1
        and isinstance(raw_assignments[0], str)
    ):
        serialized_assignments = raw_assignments[0].strip()
        if not serialized_assignments:
            return [], None
        try:
            raw_assignments = json.loads(serialized_assignments)
        except json.JSONDecodeError:
            return None, "Formato inválido para product_assignments."

    if not isinstance(raw_assignments, list):
        return None, "product_assignments debe ser una lista."

    parsed = []
    seen_product_ids = set()
    for item in raw_assignments:
        if not isinstance(item, dict):
            return None, "Cada asignación debe ser un objeto."
        try:
            product_id = int(item.get("product_id"))
        except (TypeError, ValueError):
            return None, "Cada asignación debe incluir product_id válido."
        nozzle_id = item.get("nozzle_id")
        if nozzle_id in ("", None):
            resolved_nozzle_id = None
        else:
            try:
                resolved_nozzle_id = int(nozzle_id)
            except (TypeError, ValueError):
                return None, "Cada asignación debe incluir nozzle_id válido."
        if product_id in seen_product_ids:
            return None, "No se puede repetir el producto en asignaciones."
        seen_product_ids.add(product_id)
        parsed.append({"product_id": product_id, "nozzle_id": resolved_nozzle_id})

    return parsed, None


def _apply_dispenser_product_assignments(dispenser: Dispenser, assignments_data):
    product_ids = [item["product_id"] for item in assignments_data]
    products = Product.objects.filter(id__in=product_ids)
    products_by_id = {product.id: product for product in products}
    if len(products_by_id) != len(product_ids):
        return JsonResponse({"error": "Uno o más productos seleccionados no existen."}, status=404)

    nozzle_ids = [item["nozzle_id"] for item in assignments_data if item["nozzle_id"] is not None]
    nozzles = Nozzle.objects.filter(id__in=nozzle_ids)
    nozzles_by_id = {nozzle.id: nozzle for nozzle in nozzles}
    if len(nozzles_by_id) != len(set(nozzle_ids)):
        return JsonResponse({"error": "Una o más boquillas seleccionadas no existen."}, status=404)

    allowed_nozzles = set(dispenser.available_nozzles.values_list("id", flat=True))
    for item in assignments_data:
        nozzle_id = item["nozzle_id"]
        if nozzle_id is not None and nozzle_id not in allowed_nozzles:
            return JsonResponse({"error": "La boquilla seleccionada no está asociada al dosificador."}, status=400)

    DispenserProductAssignment.objects.filter(dispenser=dispenser).exclude(
        product_id__in=product_ids
    ).delete()
    for item in assignments_data:
        DispenserProductAssignment.objects.update_or_create(
            dispenser=dispenser,
            product=products_by_id[item["product_id"]],
            defaults={"nozzle": nozzles_by_id.get(item["nozzle_id"])},
        )
    return None


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
        "area_dispensers_count": visit.area.dispensers.count() if visit.area_id else 0,
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
        "media": [
            {
                "id": medium.id,
                "type": medium.media_type,
                "file": medium.file.url if medium.file else None,
            }
            for medium in visit.media.all()
        ],
    }




def _serialize_audit_form(form: AuditForm) -> dict:
    return {
        "id": form.id,
        "name": form.name,
        "schema": form.schema or {},
        "is_active": form.is_active,
        "areas_count": form.areas_using_template.count(),
    }


def _serialize_audit(audit: Audit) -> dict:
    inspector = "Sin asignar"
    inspector_id = None
    if audit.inspector:
        inspector = audit.inspector.get_full_name() or audit.inspector.username
        inspector_id = audit.inspector_id

    form_name = audit.form_name or audit.form.name
    form_schema = audit.form_schema or audit.form.schema or {}

    return {
        "id": audit.id,
        "client": audit.area.branch.client.name,
        "client_id": audit.area.branch.client_id,
        "branch": audit.area.branch.name,
        "branch_id": audit.area.branch_id,
        "area": audit.area.name,
        "area_id": audit.area_id,
        "form_id": audit.form_id,
        "form": form_name,
        "form_name": form_name,
        "form_schema": form_schema,
        "inspector": inspector,
        "inspector_id": inspector_id,
        "audited_at": audit.audited_at.isoformat(),
        "notes": audit.notes,
        "status": audit.status,
        "status_label": audit.get_status_display(),
        "started_at": audit.started_at.isoformat() if audit.started_at else None,
        "completed_at": audit.completed_at.isoformat() if audit.completed_at else None,
        "start_latitude": audit.start_latitude,
        "start_longitude": audit.start_longitude,
        "end_latitude": audit.end_latitude,
        "end_longitude": audit.end_longitude,
        "audit_report": audit.audit_report,
        "media": [
            {
                "id": medium.id,
                "type": medium.media_type,
                "file": medium.file.url if medium.file else None,
            }
            for medium in audit.media.all()
        ],
    }



def _get_deepseek_settings() -> DeepSeekAPISettings | None:
    return DeepSeekAPISettings.objects.order_by("id").first()


def _extract_audit_answers(report: dict) -> list[dict[str, str]]:
    normalized = []
    for answer in report.get("answers") or []:
        if not isinstance(answer, dict):
            continue
        normalized.append({
            "pregunta": str(answer.get("label") or "").strip(),
            "respuesta": str(answer.get("value") or "").strip(),
            "tipo": str(answer.get("response_type") or "").strip(),
            "question_weight": answer.get("question_weight"),
            "response_scores": answer.get("response_scores"),
        })
    return normalized


def _build_audit_prompt_context(audit: Audit, report: dict) -> dict:
    schema = ((report.get("form") or {}).get("schema") or {}) if isinstance(report.get("form"), dict) else {}
    if not schema and getattr(audit, "form", None):
        schema = audit.form.schema if isinstance(getattr(audit.form, "schema", None), dict) else {}

    questions = schema.get("questions") if isinstance(schema.get("questions"), list) else []
    question_catalog = []
    for item in questions:
        if not isinstance(item, dict):
            continue
        response_scores = item.get("response_scores") if isinstance(item.get("response_scores"), dict) else {}
        question_catalog.append({
            "pregunta": str(item.get("label") or "").strip(),
            "tipo_respuesta": str(item.get("response_type") or "").strip(),
            "ponderacion": item.get("question_weight"),
            "porcentajes_respuesta": {
                "si": response_scores.get("yes"),
                "no": response_scores.get("no"),
                "no_aplica": response_scores.get("not_applicable"),
            },
        })

    return {
        "plantilla_nombre": audit.form_name or getattr(audit.form, "name", ""),
        "cliente": audit.area.branch.client.name,
        "sucursal": audit.area.branch.name,
        "area": audit.area.name,
        "preguntas": question_catalog,
        "respuestas": _extract_audit_answers(report),
    }


def _fallback_audit_ai_analysis(report: dict) -> dict:
    answers = _extract_audit_answers(report)
    if not answers:
        return {
            "score": 0,
            "executive_summary": "No se registraron respuestas de auditoría para analizar.",
            "recommendations": ["Completar todas las preguntas obligatorias en la próxima auditoría."],
            "provider": "fallback",
        }

    positive = {"si", "sí", "ok", "cumple", "conforme", "aprobado"}
    negative = {"no", "incumple", "falla", "no cumple", "no conforme", "rechazado"}
    schema_questions = ((report.get("form") or {}).get("schema") or {}).get("questions") or []
    question_map = {
        str(item.get("label") or "").strip().lower(): item
        for item in schema_questions
        if isinstance(item, dict)
    }

    configured_weights = []
    for item in answers:
        question = question_map.get(item["pregunta"].lower(), {})
        raw_weight = question.get("question_weight")
        if raw_weight in (None, ""):
            raw_weight = item.get("question_weight")
        try:
            parsed_weight = float(raw_weight)
        except (TypeError, ValueError):
            continue
        if parsed_weight > 0:
            configured_weights.append(parsed_weight)

    dynamic_default_weight = (100 / len(answers)) if answers and not configured_weights else 0

    score_pool = 0.0
    for item in answers:
        value = item["respuesta"].lower()
        question = question_map.get(item["pregunta"].lower(), {})

        raw_weight = question.get("question_weight")
        if raw_weight in (None, ""):
            raw_weight = item.get("question_weight")
        try:
            question_weight = float(raw_weight)
        except (TypeError, ValueError):
            question_weight = dynamic_default_weight

        if question_weight <= 0:
            question_weight = dynamic_default_weight

        response_scores = question.get("response_scores") if isinstance(question.get("response_scores"), dict) else {}
        if not response_scores and isinstance(item.get("response_scores"), dict):
            response_scores = item.get("response_scores")

        yes_score = response_scores.get("yes", 100)
        no_score = response_scores.get("no", 0)
        not_applicable_score = response_scores.get("not_applicable", 100)

        if any(token in value for token in positive):
            ratio = float(yes_score) / 100
        elif value in {"no aplica", "n/a", "na"}:
            ratio = float(not_applicable_score) / 100
        elif any(token in value for token in negative):
            ratio = float(no_score) / 100
        else:
            ratio = 0.5

        score_pool += question_weight * ratio

    score = round(max(0, min(100, score_pool)))
    if score >= 80:
        rating = "alto cumplimiento"
    elif score >= 60:
        rating = "cumplimiento medio"
    else:
        rating = "cumplimiento crítico"

    business_impact = "Riesgo alto para la operación y experiencia del cliente." if score < 60 else (
        "Riesgo moderado con impacto controlable mediante acciones correctivas puntuales." if score < 80 else "Riesgo bajo y operación estable en el área auditada."
    )

    question_insights = []
    identified_strengths = []
    identified_risks = []
    identified_recommendations = []
    identified_next_steps = []
    for item in answers:
        response = item["respuesta"]
        response_lower = response.lower()
        if any(token in response_lower for token in positive):
            contextual_response = "La respuesta indica cumplimiento del control y refleja una práctica operativa estable."
            if item['pregunta']:
                identified_strengths.append(f"Cumplimiento en: {item['pregunta']}.")
        elif any(token in response_lower for token in negative):
            contextual_response = "La respuesta refleja una brecha en el control evaluado que requiere corrección prioritaria."
            if item['pregunta']:
                identified_risks.append(f"Brecha detectada en: {item['pregunta']}.")
                identified_recommendations.append(f"Corregir el control asociado a '{item['pregunta']}' y registrar evidencia de cierre.")
                identified_next_steps.append(f"Asignar responsable y fecha compromiso para resolver '{item['pregunta']}'.")
        else:
            contextual_response = "La respuesta es parcial o ambigua; se necesita mayor precisión para entender el estado real del control."

        question_insights.append({
            "question": item["pregunta"] or "Pregunta sin descripción",
            "answer": response or "Sin respuesta",
            "contextual_response": contextual_response,
        })

    if identified_risks:
        primary_risks = " ".join(identified_risks[:3])
        risk_impact_summary = (
            "Las brechas detectadas pueden afectar directamente la continuidad operativa del área, "
            "incrementar la probabilidad de incumplimientos y elevar la exposición a incidentes de servicio "
            "si no se corrigen dentro de una ventana de control definida."
        )
    else:
        primary_risks = "No se evidenciaron brechas críticas en las respuestas analizadas."
        risk_impact_summary = (
            "El foco debe mantenerse en sostener la disciplina operativa para evitar deterioro de controles "
            "y prevenir desviaciones futuras."
        )

    area_name = str(((report.get("form") or {}).get("area") or "Área auditada")).strip() or "Área auditada"

    top_risk_lines = []
    for risk in identified_risks[:3]:
        risk_question = risk.replace("Brecha detectada en:", "").strip().rstrip(".")
        if not risk_question:
            continue
        top_risk_lines.append(
            f"- ❌ {risk_question}."
        )
    if not top_risk_lines:
        top_risk_lines.append("- ✅ No se identificaron brechas críticas en los controles evaluados.")

    return {
        "score": score,
        "executive_summary": (
            "📊 Informe Ejecutivo de Auditoría\n"
            f"Área: {area_name}\n\n"
            "Generado por: Trust AI\n"
            "Tipo: Preliminar\n"
            f"Nivel de cumplimiento: {score}%\n\n"
            "🔎 Resumen Ejecutivo\n\n"
            f"La auditoría realizada al área de {area_name.lower()} evidencia un {rating} "
            f"({score}%) sobre un total de {len(answers)} puntos evaluados.\n\n"
            "No obstante, se identificaron brechas que requieren atención prioritaria para evitar impactos "
            "en la calidad del servicio, cumplimiento normativo y continuidad operativa.\n\n"
            "⚠️ Hallazgos Relevantes\n\n"
            f"{chr(10).join(top_risk_lines)}\n\n"
            "📉 Evaluación de Riesgos\n\n"
            f"{risk_impact_summary}\n\n"
            "🎯 Recomendaciones Estratégicas\n\n"
            "- ✔️ Implementar acciones correctivas inmediatas para cada brecha detectada.\n"
            "- ✔️ Definir responsables, plazos y evidencia objetiva de cierre.\n"
            "- ✔️ Ejecutar seguimiento de verificación para asegurar sostenibilidad de los controles.\n\n"
            "📈 Conclusión\n\n"
            f"{primary_risks} La implementación disciplinada del plan de acción permitirá elevar el nivel de "
            "cumplimiento y fortalecer el desempeño del área auditada."
        ),
        "recommendations": identified_recommendations[:6] or ["Priorizar hallazgos con mayor impacto operativo y de cumplimiento."],
        "next_steps": identified_next_steps[:6] or ["Definir responsables, fechas y evidencias de cierre para cada hallazgo."],
        "strengths": identified_strengths[:6] or ["Se registró información suficiente para estimar el nivel de cumplimiento general."],
        "risks": identified_risks[:6] or ["Existen oportunidades de mejora en controles con respuestas ambiguas o incompletas."],
        "business_impact": business_impact,
        "context_notes": "Puntaje estimado a partir del sentido semántico básico de las respuestas.",
        "question_insights": question_insights,
        "provider": "fallback",
    }


def _generate_deepseek_audit_analysis(audit: Audit, report: dict) -> dict:
    settings = _get_deepseek_settings()
    if settings is None or not settings.is_enabled or not settings.api_key:
        return _fallback_audit_ai_analysis(report)

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": "Eres un auditor senior. Evalúa respuestas de auditoría y responde JSON válido.",
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "rol": "Eres un analista senior de auditorías operativas y de cumplimiento.",
                        "instrucciones": "Devuelve SOLO JSON válido con claves: score(0-100), executive_summary(string), recommendations(array), next_steps(array), strengths(array), risks(array), business_impact(string), context_notes(string) y question_insights(array). El executive_summary debe ser un informe ejecutivo integral EN TEXTO COMPLETO (mínimo un párrafo claro y profesional), alineado a normas internacionales de auditoría y buenas prácticas de gestión de riesgos. Debe ser amplio y explicar explícitamente qué riesgos/brechas fueron detectados y cómo pueden afectar al área auditada en operación, cumplimiento y continuidad. No dejes campos vacíos. Si no tienes un porcentaje explícito en alguna respuesta, estima el impacto con criterio técnico y evita devolver score=0 por ausencia de porcentajes. Fortalezas, riesgos, recomendaciones y siguientes pasos deben ser específicos de esta auditoría (no genéricos), accionables y NO repetir el mismo contenido entre listas. question_insights debe incluir TODAS las preguntas y para cada una: question, answer y contextual_response (explicación breve enfocada en el contexto de la pregunta).",
                        "contexto_auditoria": _build_audit_prompt_context(audit, report),
                        "comentarios": str(report.get("comments") or "").strip(),
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    req = Request(
        "https://api.deepseek.com/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.api_key}",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=45) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, json.JSONDecodeError):
        return _fallback_audit_ai_analysis(report)

    try:
        content = body["choices"][0]["message"]["content"]
        parsed = json.loads(content) if isinstance(content, str) else content
        fallback_analysis = _fallback_audit_ai_analysis(report)
        fallback_score = fallback_analysis.get("score", 0)
        score_source = parsed.get("score")
        if score_source in (None, ""):
            score_source = fallback_score
        score = int(float(score_source))
        score = max(0, min(100, score))
        recommendations = parsed.get("recommendations")
        if not isinstance(recommendations, list):
            recommendations = []
        recommendations = [str(item).strip() for item in recommendations if str(item).strip()]
        next_steps = parsed.get("next_steps")
        if not isinstance(next_steps, list):
            next_steps = []
        next_steps = [str(item).strip() for item in next_steps if str(item).strip()]
        strengths = parsed.get("strengths")
        if not isinstance(strengths, list):
            strengths = []
        strengths = [str(item).strip() for item in strengths if str(item).strip()]
        risks = parsed.get("risks")
        if not isinstance(risks, list):
            risks = []
        risks = [str(item).strip() for item in risks if str(item).strip()]

        recommendations_lower = {item.lower() for item in recommendations}
        next_steps = [item for item in next_steps if item.lower() not in recommendations_lower]
        question_insights = parsed.get("question_insights")
        normalized_insights = []
        if isinstance(question_insights, list):
            for item in question_insights:
                if not isinstance(item, dict):
                    continue
                normalized_insights.append({
                    "question": str(item.get("question") or "").strip(),
                    "answer": str(item.get("answer") or "").strip(),
                    "contextual_response": str(item.get("contextual_response") or "").strip(),
                })
            normalized_insights = [
                item
                for item in normalized_insights
                if item["question"] or item["answer"] or item["contextual_response"]
            ]

        source_answers = _extract_audit_answers(report)
        indexed_insights = {
            (item.get("question") or "").strip().lower(): item
            for item in normalized_insights
            if (item.get("question") or "").strip()
        }
        completed_insights = []
        for answer in source_answers:
            question = (answer.get("pregunta") or "").strip() or "Pregunta sin descripción"
            response = (answer.get("respuesta") or "").strip() or "Sin respuesta"
            existing = indexed_insights.get(question.lower())
            completed_insights.append({
                "question": question,
                "answer": existing.get("answer") or response if isinstance(existing, dict) else response,
                "contextual_response": (
                    existing.get("contextual_response")
                    if isinstance(existing, dict) and existing.get("contextual_response")
                    else "Respuesta analizada con contexto de la pregunta auditada."
                ),
            })

        if completed_insights:
            normalized_insights = completed_insights

        executive_summary = str(parsed.get("executive_summary") or "").strip()
        if not executive_summary:
            executive_summary = str(fallback_analysis.get("executive_summary") or "").strip()

        if not recommendations:
            recommendations = list(fallback_analysis.get("recommendations") or [])
        if not next_steps:
            next_steps = list(fallback_analysis.get("next_steps") or [])
        if not strengths:
            strengths = list(fallback_analysis.get("strengths") or [])
        if not risks:
            risks = list(fallback_analysis.get("risks") or [])

        return {
            "score": score,
            "executive_summary": executive_summary,
            "recommendations": recommendations,
            "next_steps": next_steps,
            "strengths": strengths,
            "risks": risks,
            "business_impact": str(parsed.get("business_impact") or fallback_analysis.get("business_impact") or "").strip(),
            "context_notes": str(parsed.get("context_notes") or fallback_analysis.get("context_notes") or "").strip(),
            "question_insights": normalized_insights,
            "provider": "deepseek",
            "model": "deepseek-chat",
        }
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return _fallback_audit_ai_analysis(report)

def _serialize_notification(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item["id"],
        "title": item["title"],
        "message": item["message"],
        "created_at": item["created_at"].isoformat(),
        "type": item["type"],
        "unread": bool(item.get("unread", False)),
    }


def _draw_page_background(pdf: canvas.Canvas):
    page_width, page_height = LETTER
    pdf.setFillColor(colors.HexColor("#f3f6fb"))
    pdf.rect(0, 0, page_width, page_height, fill=1, stroke=0)


def _draw_card(pdf: canvas.Canvas, x: float, y: float, width: float, height: float):
    pdf.setFillColor(colors.white)
    pdf.setStrokeColor(colors.HexColor("#d7e2ef"))
    pdf.setLineWidth(1)
    pdf.roundRect(x, y, width, height, REPORT_CARD_RADIUS, fill=1, stroke=1)


def _draw_report_header(pdf: canvas.Canvas, visit: Visit, generated_at: datetime):
    page_width, page_height = LETTER
    _draw_page_background(pdf)

    header_x = REPORT_PAGE_PADDING
    header_y = page_height - 110

    if not _draw_report_logo(pdf, header_x, header_y + 34, 120, 34):
        pdf.setFillColor(colors.HexColor("#facc15"))
        pdf.setFont(REPORT_FONT_BOLD, 19)
        pdf.drawString(header_x, header_y + 48, "trust")

    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont(REPORT_FONT_BOLD, 24)
    pdf.drawString(header_x, header_y + 16, "Comprobante de Visita")

    pdf.setFillColor(colors.HexColor("#64748b"))
    pdf.setFont(REPORT_FONT, 10)
    pdf.drawString(header_x, header_y - 2, f"Generado: {generated_at.strftime('%d/%m/%Y %H:%M')}")

    chip_x = page_width - 282
    chip_y = header_y + 8
    chip_w = 194
    chip_h = 34
    pdf.setFillColor(colors.HexColor("#e2e8f0"))
    pdf.roundRect(chip_x, chip_y, chip_w, chip_h, 10, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont(REPORT_FONT_BOLD, 11)
    pdf.drawCentredString(chip_x + chip_w / 2, chip_y + 12, f"Visita #{visit.id} · {visit.get_status_display()}")

def _draw_report_qr(pdf: canvas.Canvas, public_url: str | None, y_start: float):
    if not public_url:
        return y_start

    card_x = REPORT_PAGE_PADDING
    card_h = 140
    card_y = y_start - card_h
    _draw_card(pdf, card_x, card_y, 540, card_h)

    qr_code = qr.QrCodeWidget(public_url)
    bounds = qr_code.getBounds()
    qr_size = 84
    qr_drawing = Drawing(
        qr_size,
        qr_size,
        transform=[qr_size / (bounds[2] - bounds[0]), 0, 0, qr_size / (bounds[3] - bounds[1]), 0, 0],
    )
    qr_drawing.add(qr_code)

    qr_x = card_x + (540 - qr_size) / 2
    qr_y = card_y + 38
    renderPDF.draw(qr_drawing, pdf, qr_x, qr_y)

    pdf.setFillColor(colors.HexColor("#64748b"))
    pdf.setFont(REPORT_FONT, 9)
    pdf.drawCentredString(card_x + 270, card_y + 20, "Escanea para abrir el informe web")

    return card_y - 18

def _draw_wrapped_text(pdf: canvas.Canvas, text: str, x: float, y: float, width: float, line_height: float = 14):
    if not text:
        return y
    max_chars = max(18, int(width / 5.4))
    lines = textwrap.wrap(text, width=max_chars)
    current_y = y
    for line in lines:
        pdf.drawString(x, current_y, line)
        current_y -= line_height
    return current_y


@lru_cache(maxsize=1)
def _get_audit_logo() -> ImageReader | Drawing | None:
    for path in REPORT_LOGO_PATHS:
        if not path.exists():
            continue
        try:
            raw = path.read_bytes()
            if svg2rlg and b"<svg" in raw[:500].lower():
                drawing = svg2rlg(BytesIO(raw))
                if drawing:
                    return drawing
            return ImageReader(BytesIO(raw))
        except Exception:
            continue

    try:
        request = Request(REPORT_AUDIT_LOGO_URL, headers={"User-Agent": "trust-report-generator/1.0"})
        with urlopen(request, timeout=8) as response:
            raw = response.read()
            if svg2rlg and b"<svg" in raw[:500].lower():
                drawing = svg2rlg(BytesIO(raw))
                if drawing:
                    return drawing
            return ImageReader(BytesIO(raw))
    except Exception:
        return None


def _draw_report_logo(pdf: canvas.Canvas, x: float, y: float, width: float, height: float) -> bool:
    logo = _get_audit_logo()
    if not logo:
        return False

    try:
        if isinstance(logo, Drawing):
            logo_width = max(float(getattr(logo, "width", width)), 1.0)
            logo_height = max(float(getattr(logo, "height", height)), 1.0)
            scale = min(width / logo_width, height / logo_height)
            draw_width = logo_width * scale
            draw_height = logo_height * scale
            pdf.saveState()
            pdf.translate(x + ((width - draw_width) / 2), y + ((height - draw_height) / 2))
            pdf.scale(scale, scale)
            renderPDF.draw(logo, pdf, 0, 0)
            pdf.restoreState()
            return True

        pdf.drawImage(logo, x, y, width=width, height=height, preserveAspectRatio=True, mask="auto", anchor="sw")
        return True
    except Exception:
        return False


def _split_text_to_lines(pdf: canvas.Canvas, text: str, width: float) -> list[str]:
    lines: list[str] = []
    for paragraph in str(text or "").splitlines() or [""]:
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current_line = words[0]
        for word in words[1:]:
            candidate = f"{current_line} {word}"
            if pdf.stringWidth(candidate, REPORT_FONT, 10) <= width:
                current_line = candidate
            else:
                lines.append(current_line)
                current_line = word
        lines.append(current_line)
    return lines


def _draw_justified_lines(pdf: canvas.Canvas, lines: list[str], x: float, y: float, width: float, line_height: float = 14):
    current_y = y
    for index, line in enumerate(lines):
        words = line.split()
        is_last_line = index == len(lines) - 1
        if len(words) <= 1 or is_last_line:
            pdf.drawString(x, current_y, line)
        else:
            words_width = sum(pdf.stringWidth(word, REPORT_FONT, 10) for word in words)
            spaces = len(words) - 1
            if spaces <= 0:
                pdf.drawString(x, current_y, line)
            else:
                extra_space = max(width - words_width, 0)
                gap = extra_space / spaces
                cursor = x
                for word in words[:-1]:
                    pdf.drawString(cursor, current_y, word)
                    cursor += pdf.stringWidth(word, REPORT_FONT, 10) + gap
                pdf.drawString(cursor, current_y, words[-1])
        current_y -= line_height
    return current_y


def _fetch_static_map(start_lat: float, start_lon: float, end_lat: float, end_lon: float, width: int, height: int):
    center_lat = (start_lat + end_lat) / 2
    center_lon = (start_lon + end_lon) / 2
    distance = max(abs(start_lat - end_lat), abs(start_lon - end_lon))
    zoom = 18
    if distance > 0.005:
        zoom = 16
    if distance > 0.015:
        zoom = 14
    yandex_width = min(max(int(width), 200), 650)
    yandex_height = min(max(int(height), 120), 450)
    primary_url = (
        "https://static-maps.yandex.ru/1.x/?"
        f"lang=es_ES&ll={center_lon:.6f},{center_lat:.6f}&size={yandex_width},{yandex_height}&z={zoom}&l=map"
        f"&pt={start_lon:.6f},{start_lat:.6f},pm2gnm~{end_lon:.6f},{end_lat:.6f},pm2rdm"
    )
    params = urlencode(
        {
            "center": f"{center_lat:.6f},{center_lon:.6f}",
            "zoom": zoom,
            "size": f"{min(width, 1000)}x{min(height, 700)}",
            "markers": f"{start_lat:.6f},{start_lon:.6f},lightgreen1|{end_lat:.6f},{end_lon:.6f},red",
            "maptype": "mapnik",
        }
    )
    fallback_osm_url = f"https://staticmap.openstreetmap.de/staticmap.php?{params}"
    requests = [
        Request(fallback_osm_url, headers={"User-Agent": "trust-report-generator/1.0"}),
        Request(primary_url, headers={"User-Agent": "trust-report-generator/1.0"}),
    ]
    for request in requests:
        try:
            with urlopen(request, timeout=8) as response:
                payload = response.read()
                if payload:
                    return payload
        except (URLError, TimeoutError):
            continue
    raise URLError("No se pudo descargar el mapa estático.")


def _build_public_report_token(visit: Visit) -> str:
    return signing.dumps({"visit_id": visit.id}, salt=REPORT_PUBLIC_LINK_SALT)


def _build_public_report_url(request, visit: Visit) -> str:
    token = _build_public_report_token(visit)
    path = f"/visits/report/public/{token}"
    return request.build_absolute_uri(path)


def _get_visit_from_public_token(token: str) -> Visit | None:
    try:
        payload = signing.loads(
            token,
            salt=REPORT_PUBLIC_LINK_SALT,
            max_age=REPORT_PUBLIC_LINK_MAX_AGE_SECONDS,
        )
        visit_id = int(payload.get("visit_id"))
    except (BadSignature, SignatureExpired, TypeError, ValueError):
        return None

    try:
        visit = Visit.objects.select_related(
            "area__branch__client", "inspector", "dispenser"
        ).prefetch_related("media").get(pk=visit_id)
    except Visit.DoesNotExist:
        return None

    if visit.status != Visit.Status.COMPLETED:
        return None

    return visit


def _draw_summary_grid(pdf: canvas.Canvas, visit: Visit, y_start: float):
    card_x = REPORT_PAGE_PADDING
    card_y = y_start - 122
    card_w = 540
    card_h = 110
    _draw_card(pdf, card_x, card_y, card_w, card_h)

    report = _get_visit_report_data(visit)
    items = [
        ("Cliente", visit.area.branch.client.name),
        ("Sucursal", visit.area.branch.name),
        ("Área", visit.area.name),
        ("Dosificador", visit.dispenser.identifier if visit.dispenser else "N/A"),
    ]

    col_w = 124
    x = card_x + 18
    for label, value in items:
        pdf.setFont(REPORT_FONT_BOLD, 8)
        pdf.setFillColor(colors.HexColor("#64748b"))
        pdf.drawString(x, card_y + 84, label.upper())
        pdf.setFont(REPORT_FONT_BOLD, 12)
        pdf.setFillColor(colors.HexColor("#0f172a"))
        pdf.drawString(x, card_y + 62, str(value)[:22])
        x += col_w

    inspector_name = visit.inspector.get_full_name() if visit.inspector else "Sin inspector"
    checklist = report.get("checklist") if isinstance(report.get("checklist"), list) else []
    ok_count = sum(1 for item in checklist if str(item.get("status") or "").lower() == "ok")

    pdf.setFont(REPORT_FONT_BOLD, 8)
    pdf.setFillColor(colors.HexColor("#64748b"))
    pdf.drawString(card_x + 18, card_y + 36, "INSPECTOR")
    pdf.setFont(REPORT_FONT, 10)
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.drawString(card_x + 18, card_y + 18, inspector_name[:52])

    badge_x = card_x + 360
    badge_y = card_y + 14
    badge_w = 160
    badge_h = 30
    pdf.setFillColor(colors.HexColor("#dcfce7"))
    pdf.roundRect(badge_x, badge_y, badge_w, badge_h, 8, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#166534"))
    pdf.setFont(REPORT_FONT_BOLD, 10)
    pdf.drawCentredString(badge_x + badge_w / 2, badge_y + 11, f"OK: {ok_count}/{len(checklist)}")

    return card_y - 18


def _draw_location_map(pdf: canvas.Canvas, visit: Visit, y_start: int):
    map_x = REPORT_PAGE_PADDING
    map_y = y_start - 236
    map_width, map_height = 540, 218

    _draw_card(pdf, map_x, map_y, map_width, map_height)

    start_lat = visit.start_latitude
    start_lon = visit.start_longitude
    end_lat = visit.end_latitude
    end_lon = visit.end_longitude

    inner_x = map_x + 8
    inner_y = map_y + 8
    inner_w = map_width - 16
    inner_h = map_height - 16

    if None in (start_lat, start_lon, end_lat, end_lon):
        pdf.setFillColor(colors.HexColor("#e2e8f0"))
        pdf.roundRect(inner_x, inner_y, inner_w, inner_h, 10, fill=1, stroke=0)
        pdf.setFillColor(colors.HexColor("#64748b"))
        pdf.setFont(REPORT_FONT, 11)
        pdf.drawString(inner_x + 16, inner_y + (inner_h / 2), "No hay coordenadas suficientes para generar el mapa.")
        return map_y - 18

    try:
        map_image = _fetch_static_map(start_lat, start_lon, end_lat, end_lon, 1100, 500)
        image = ImageReader(BytesIO(map_image))
        pdf.drawImage(image, inner_x, inner_y, width=inner_w, height=inner_h, mask="auto")
    except Exception:
        pdf.setFillColor(colors.HexColor("#cbd5e1"))
        pdf.roundRect(inner_x, inner_y, inner_w, inner_h, 10, fill=1, stroke=0)

    legend_x = inner_x + 12
    legend_y = inner_y + inner_h - 32
    pdf.setFillColor(colors.white)
    pdf.roundRect(legend_x, legend_y, 242, 22, 6, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont(REPORT_FONT, 8)
    pdf.drawString(legend_x + 10, legend_y + 8, f"Inicio {start_lat:.5f}, {start_lon:.5f} · Final {end_lat:.5f}, {end_lon:.5f}")

    return map_y - 18


def _draw_report_images(pdf: canvas.Canvas, visit: Visit, y_start: int):
    images = [item for item in visit.media.all() if item.media_type == VisitMedia.MediaType.PHOTO][:4]
    if not images:
        return y_start

    section_h = 262
    section_x = REPORT_PAGE_PADDING
    section_y = y_start - section_h
    _draw_card(pdf, section_x, section_y, 540, section_h)

    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont(REPORT_FONT_BOLD, 12)
    pdf.drawString(section_x + 16, section_y + section_h - 24, "Evidencias fotográficas")

    x = section_x + 16
    y = section_y + section_h - 42
    width = 248
    height = 96

    for index, item in enumerate(images):
        if index and index % 2 == 0:
            x = section_x + 16
            y -= 108

        pdf.setFillColor(colors.HexColor("#f1f5f9"))
        pdf.roundRect(x, y - height, width, height, 8, fill=1, stroke=0)

        try:
            image_data = item.file.read() if hasattr(item.file, "read") else default_storage.open(item.file.name, "rb").read()
            image = ImageReader(BytesIO(image_data))
            pdf.drawImage(
                image,
                x + 1,
                y - height + 1,
                width=width - 2,
                height=height - 2,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception:
            pdf.setFillColor(colors.HexColor("#cbd5e1"))
            pdf.roundRect(x + 1, y - height + 1, width - 2, height - 2, 8, fill=1, stroke=0)

        x += 260

    return section_y - 18


def _draw_observations(pdf: canvas.Canvas, visit: Visit, y_start: float):
    report = _get_visit_report_data(visit)
    comments = str(report.get("comments") or visit.notes or "Sin observaciones.")[:800]

    card_x = REPORT_PAGE_PADDING
    card_h = 108
    card_y = y_start - card_h
    _draw_card(pdf, card_x, card_y, 540, card_h)

    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont(REPORT_FONT_BOLD, 12)
    pdf.drawString(card_x + 16, card_y + card_h - 24, "Observaciones")

    pdf.setFillColor(colors.HexColor("#334155"))
    pdf.setFont(REPORT_FONT, 10)
    _draw_wrapped_text(pdf, comments, card_x + 16, card_y + card_h - 44, 504, line_height=13)

    return card_y - 18


def _draw_signoff(pdf: canvas.Canvas, visit: Visit, y_start: float):
    report = _get_visit_report_data(visit)
    responsible_name = str(report.get("responsible_name") or "No registrado")
    signature_data = str(report.get("responsible_signature") or "")

    card_x = REPORT_PAGE_PADDING
    card_h = 140
    card_y = y_start - card_h
    _draw_card(pdf, card_x, card_y, 540, card_h)

    line_y = card_y + 42
    line_x_start = card_x + 110
    line_x_end = card_x + 430
    line_center_x = (line_x_start + line_x_end) / 2
    pdf.setStrokeColor(colors.HexColor("#0f172a"))
    pdf.setLineWidth(1)
    pdf.line(line_x_start, line_y, line_x_end, line_y)

    if signature_data.startswith("data:image") and "," in signature_data:
        try:
            encoded = signature_data.split(",", 1)[1]
            image = ImageReader(BytesIO(base64.b64decode(encoded)))
            signature_width = 220
            signature_height = 52
            pdf.drawImage(
                image,
                line_center_x - (signature_width / 2),
                line_y + 4,
                width=signature_width,
                height=signature_height,
                mask="auto",
                preserveAspectRatio=True,
                anchor="c",
            )
        except Exception:
            pass

    pdf.setFillColor(colors.HexColor("#64748b"))
    pdf.setFont(REPORT_FONT_BOLD, 10)
    pdf.drawCentredString(line_center_x, line_y - 16, "REPRESENTANTE DE ÁREA")

    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont(REPORT_FONT_BOLD, 12)
    pdf.drawCentredString(line_center_x, card_y + 14, responsible_name[:70])

    return card_y - 18


def _draw_report_footer(pdf: canvas.Canvas, generated_at: datetime):
    page_width, _ = LETTER
    footer_y = 20
    pdf.setFillColor(colors.HexColor("#64748b"))
    pdf.setFont(REPORT_FONT, 8)
    footer_text = f"informe generado por trust by Supplymax de Panamá {generated_at.strftime('%d/%m/%Y %H:%M')}"
    pdf.drawCentredString(page_width / 2, footer_y, footer_text)


def _build_visit_pdf(visit: Visit, public_report_url: str | None = None) -> bytes:
    _initialize_report_fonts()
    output = BytesIO()
    pdf = canvas.Canvas(output, pagesize=LETTER)
    generated_at = timezone.localtime()

    _draw_report_header(pdf, visit, generated_at)
    y = 676
    y = _draw_summary_grid(pdf, visit, y)
    y = _draw_observations(pdf, visit, y)
    y = _draw_report_qr(pdf, public_report_url, y)
    _draw_signoff(pdf, visit, y)

    _draw_report_footer(pdf, generated_at)
    pdf.showPage()

    _draw_page_background(pdf)
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont(REPORT_FONT_BOLD, 18)
    pdf.drawString(REPORT_PAGE_PADDING, 742, "Anexos de visita")
    pdf.setFillColor(colors.HexColor("#64748b"))
    pdf.setFont(REPORT_FONT, 10)
    pdf.drawString(REPORT_PAGE_PADDING, 726, f"Visita #{visit.id} · Evidencia geolocalizada y fotográfica")
    y = 700
    y = _draw_location_map(pdf, visit, y)
    _draw_report_images(pdf, visit, y)
    _draw_report_footer(pdf, generated_at)
    pdf.showPage()

    pdf.save()
    output.seek(0)
    return output.getvalue()


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


def _get_visit_report_data(visit: Visit) -> dict:
    report = _normalize_visit_report(visit.visit_report)
    return report if report is not None else {}


def _is_truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "si", "sí"}
    return bool(value)


def _validate_template_schema(schema: Any) -> tuple[dict[str, Any] | None, str | None]:
    if isinstance(schema, str):
        try:
            schema = json.loads(schema)
        except json.JSONDecodeError:
            return None, "El esquema de la plantilla no tiene formato JSON válido."

    if schema is None:
        schema = {}
    if not isinstance(schema, dict):
        return None, "El esquema de la plantilla debe ser un objeto JSON."

    questions = schema.get("questions", [])
    if not isinstance(questions, list):
        return None, "Las preguntas de la plantilla deben enviarse como una lista."

    allowed_types = {"yes_no", "number", "text"}
    total_questions = len(questions)
    default_question_weight = (100 / total_questions) if total_questions > 0 else 0
    total_weight = 0.0

    for index, question in enumerate(questions, start=1):
        if not isinstance(question, dict):
            return None, f"La pregunta #{index} no tiene formato válido."

        label = str(question.get("label") or "").strip()
        if not label:
            return None, f"La pregunta #{index} debe incluir un enunciado."

        response_type = str(question.get("response_type") or "").strip().lower()
        if response_type not in allowed_types:
            return None, f"La pregunta #{index} tiene un tipo de respuesta inválido."

        raw_question_weight = question.get("question_weight")
        if raw_question_weight in (None, ""):
            question_weight = default_question_weight
        else:
            try:
                question_weight = float(raw_question_weight)
            except (TypeError, ValueError):
                return None, f"La pregunta #{index} debe incluir un porcentaje ponderado válido."

        if question_weight < 0 or question_weight > 100:
            return None, f"La pregunta #{index} debe tener un porcentaje ponderado entre 0 y 100."

        question["question_weight"] = round(question_weight, 2)
        total_weight += question_weight

        if response_type == "yes_no":
            options = question.get("options")
            if options is None:
                question["options"] = ["Sí", "No", "No aplica"]
            elif not isinstance(options, list) or len(options) < 2:
                return None, f"La pregunta #{index} debe incluir al menos 2 respuestas posibles."

            response_scores = question.get("response_scores")
            if response_scores is None:
                response_scores = {"yes": 100, "no": 0, "not_applicable": 0}
            elif not isinstance(response_scores, dict):
                return None, f"La pregunta #{index} debe incluir porcentajes válidos para Sí/No/No aplica."

            normalized_scores: dict[str, float] = {}
            for key in ("yes", "no", "not_applicable"):
                raw_score = response_scores.get(key, 0)
                try:
                    parsed_score = float(raw_score)
                except (TypeError, ValueError):
                    return None, f"La pregunta #{index} tiene un valor inválido para '{key}'."
                if parsed_score < 0 or parsed_score > 100:
                    return None, f"La pregunta #{index} tiene un porcentaje fuera de rango para '{key}'."
                normalized_scores[key] = round(parsed_score, 2)

            question["response_scores"] = normalized_scores

        question["requires_image_evidence"] = _is_truthy(question.get("requires_image_evidence"))
        question["required"] = _is_truthy(question.get("required", True))

    if total_weight > 100.0001:
        return None, "La suma de porcentajes ponderados de la plantilla no puede superar el 100%."

    schema["questions"] = questions
    return schema, None


def _serialize_incident(incident: Incident) -> dict:
    return {
        "id": incident.id,
        "client_id": incident.client_id,
        "client": incident.client.name,
        "branch_id": incident.branch_id,
        "branch": incident.branch.name,
        "area_id": incident.area_id,
        "area": incident.area.name,
        "dispenser_id": incident.dispenser_id,
        "dispenser": incident.dispenser.identifier,
        "description": incident.description,
        "created_at": incident.created_at.isoformat(),
        "media": [
            {
                "id": medium.id,
                "type": medium.media_type,
                "file": medium.file.url if medium.file else None,
            }
            for medium in incident.media.all()
        ],
    }


@require_GET
def health(request):
    return JsonResponse({"ok": True, "app": "trust"})


@ensure_csrf_cookie
@require_GET
def csrf_token(request):
    return JsonResponse({"csrf_token": get_token(request)})


@require_GET
def dashboard(request):
    now = timezone.now()
    scope = _get_access_scope(request)

    clients = Client.objects.all()
    branches = Branch.objects.all()
    areas = Area.objects.all()
    dispensers = Dispenser.objects.all()
    products = Product.objects.all()
    visits = Visit.objects.all()
    incidents = Incident.objects.all()

    clients = _filter_queryset_by_scope(clients, scope, client_lookup="id")
    branches = _filter_queryset_by_scope(branches, scope, branch_lookup="id")
    areas = _filter_queryset_by_scope(areas, scope, area_lookup="id")
    dispensers = _filter_queryset_by_scope(dispensers, scope, area_lookup="area_id")
    products = _filter_queryset_by_scope(products, scope, area_lookup="dispenser__area_id")
    visits = _filter_queryset_by_scope(visits, scope, area_lookup="area_id")
    incidents = _filter_queryset_by_scope(incidents, scope, area_lookup="area_id")

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
        scope = _get_access_scope(request)
        queryset = _filter_queryset_by_scope(queryset, scope, client_lookup="id")
        payload = [_serialize_client(client) for client in queryset]
        return JsonResponse({"results": payload})

    current_user = _get_current_user(request)
    if current_user and not _can_create_dashboard_items(current_user):
        return JsonResponse({"error": "Solo el administrador general puede crear clientes."}, status=403)

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

    if current_user and current_user.role != User.Role.GENERAL_ADMIN:
        current_user.clients.add(client)

    return JsonResponse(_serialize_client(client), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def client_detail(request, client_id: int):
    scope = _get_access_scope(request)
    queryset = _filter_queryset_by_scope(Client.objects.all(), scope, client_lookup="id")
    client = queryset.filter(pk=client_id).first()
    if client is None:
        return JsonResponse({"error": "Cliente no encontrado."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_client(client))

    current_user = _get_current_user(request)
    if request.method == "DELETE":
        if not _is_general_admin_user(current_user):
            return JsonResponse({"error": "Solo el administrador general puede eliminar clientes."}, status=403)
        client.delete()
        return JsonResponse({}, status=204)

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


@csrf_exempt
@require_http_methods(["GET", "POST"])
def branches(request):
    scope = _get_access_scope(request)
    if request.method == "GET":
        queryset = Branch.objects.select_related("client")
        queryset = _filter_queryset_by_scope(queryset, scope, branch_lookup="id")
        payload = [
            _serialize_branch(branch)
            for branch in queryset.all()
        ]
        return JsonResponse({"results": payload})

    current_user = _get_current_user(request)
    if not _can_create_dashboard_items(current_user):
        return JsonResponse({"error": "Solo el administrador general puede crear sucursales."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    name = str(data.get("name") or "").strip()
    address = str(data.get("address") or "").strip()
    city = str(data.get("city") or "").strip()

    try:
        client_id = int(data.get("client_id") or 0)
    except (TypeError, ValueError):
        return JsonResponse({"error": "Cliente inválido."}, status=400)

    if not name or not client_id:
        return JsonResponse({"error": "Cliente y nombre son obligatorios."}, status=400)

    client = _filter_queryset_by_scope(Client.objects.all(), scope, client_lookup="id").filter(pk=client_id).first()
    if client is None:
        return JsonResponse({"error": "Cliente no encontrado."}, status=404)

    if Branch.objects.filter(client=client, name=name).exists():
        return JsonResponse(
            {"error": "Ya existe una sucursal con ese nombre para el cliente seleccionado."},
            status=400,
        )

    branch = Branch.objects.create(client=client, name=name, address=address, city=city)
    return JsonResponse(_serialize_branch(branch), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def branch_detail(request, branch_id: int):
    scope = _get_access_scope(request)
    queryset = _filter_queryset_by_scope(
        Branch.objects.select_related("client"),
        scope,
        branch_lookup="id",
    )
    branch = queryset.filter(pk=branch_id).first()
    if branch is None:
        return JsonResponse({"error": "Sucursal no encontrada."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_branch(branch))

    current_user = _get_current_user(request)
    if request.method == "DELETE":
        if not _is_general_admin_user(current_user):
            return JsonResponse({"error": "Solo el administrador general puede eliminar sucursales."}, status=403)
        branch.delete()
        return JsonResponse({}, status=204)

    if current_user and current_user.role == User.Role.INSPECTOR:
        return JsonResponse({"error": "No tienes permisos para editar sucursales."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    if "client_id" in data:
        try:
            client_id = int(data.get("client_id") or 0)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Cliente inválido."}, status=400)

        new_client = _filter_queryset_by_scope(Client.objects.all(), scope, client_lookup="id").filter(pk=client_id).first()
        if new_client is None:
            return JsonResponse({"error": "Cliente no encontrado."}, status=404)
        branch.client = new_client

    if "name" in data:
        branch.name = str(data.get("name") or "").strip()
    if "address" in data:
        branch.address = str(data.get("address") or "").strip()
    if "city" in data:
        branch.city = str(data.get("city") or "").strip()

    if not branch.name:
        return JsonResponse({"error": "El nombre no puede estar vacío."}, status=400)

    duplicate = Branch.objects.exclude(pk=branch.pk).filter(client=branch.client, name=branch.name).exists()
    if duplicate:
        return JsonResponse({"error": "Ya existe una sucursal con ese nombre para el cliente seleccionado."}, status=400)

    branch.save()
    return JsonResponse(_serialize_branch(branch))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def areas(request):
    scope = _get_access_scope(request)
    if request.method == "GET":
        queryset = Area.objects.select_related("branch__client", "audit_form_template")
        queryset = _filter_queryset_by_scope(queryset, scope, area_lookup="id")
        payload = [
            _serialize_area(area)
            for area in queryset.all()
        ]
        return JsonResponse({"results": payload})

    current_user = _get_current_user(request)
    if not _can_create_dashboard_items(current_user):
        return JsonResponse({"error": "Solo el administrador general puede crear áreas."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    name = str(data.get("name") or "").strip()
    description = str(data.get("description") or "").strip()

    try:
        branch_id = int(data.get("branch_id") or 0)
    except (TypeError, ValueError):
        return JsonResponse({"error": "Sucursal inválida."}, status=400)

    if not name or not branch_id:
        return JsonResponse({"error": "Sucursal y nombre son obligatorios."}, status=400)

    branch = _filter_queryset_by_scope(
        Branch.objects.select_related("client"),
        scope,
        branch_lookup="id",
    ).filter(pk=branch_id).first()
    if branch is None:
        return JsonResponse({"error": "Sucursal no encontrada."}, status=404)

    if Area.objects.filter(branch=branch, name=name).exists():
        return JsonResponse(
            {"error": "Ya existe un área con ese nombre para la sucursal seleccionada."},
            status=400,
        )

    audit_form_template = None
    template_id = data.get("audit_form_template_id")
    if template_id not in (None, ""):
        try:
            resolved_template_id = int(template_id)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Plantilla de auditoría inválida."}, status=400)
        audit_form_template = AuditForm.objects.filter(pk=resolved_template_id, is_active=True).first()
        if audit_form_template is None:
            return JsonResponse({"error": "Plantilla de auditoría no encontrada."}, status=404)

    area = Area.objects.create(
        branch=branch,
        name=name,
        description=description,
        audit_form_template=audit_form_template,
    )
    return JsonResponse(_serialize_area(area), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def area_detail(request, area_id: int):
    scope = _get_access_scope(request)
    queryset = _filter_queryset_by_scope(
        Area.objects.select_related("branch__client", "audit_form_template"),
        scope,
        area_lookup="id",
    )
    area = queryset.filter(pk=area_id).first()
    if area is None:
        return JsonResponse({"error": "Área no encontrada."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_area(area))

    current_user = _get_current_user(request)
    if current_user and current_user.role == User.Role.INSPECTOR:
        return JsonResponse({"error": "No tienes permisos para modificar áreas."}, status=403)

    if request.method == "DELETE":
        area.delete()
        return JsonResponse({"ok": True})

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    if "branch_id" in data:
        try:
            branch_id = int(data.get("branch_id") or 0)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Sucursal inválida."}, status=400)

        branch = _filter_queryset_by_scope(
            Branch.objects.select_related("client"),
            scope,
            branch_lookup="id",
        ).filter(pk=branch_id).first()
        if branch is None:
            return JsonResponse({"error": "Sucursal no encontrada."}, status=404)
        area.branch = branch

    if "name" in data:
        area.name = str(data.get("name") or "").strip()
    if "description" in data:
        area.description = str(data.get("description") or "").strip()

    if "audit_form_template_id" in data:
        template_id = data.get("audit_form_template_id")
        if template_id in (None, ""):
            area.audit_form_template = None
        else:
            try:
                resolved_template_id = int(template_id)
            except (TypeError, ValueError):
                return JsonResponse({"error": "Plantilla de auditoría inválida."}, status=400)
            audit_form_template = AuditForm.objects.filter(pk=resolved_template_id, is_active=True).first()
            if audit_form_template is None:
                return JsonResponse({"error": "Plantilla de auditoría no encontrada."}, status=404)
            area.audit_form_template = audit_form_template

    if not area.name:
        return JsonResponse({"error": "El nombre no puede estar vacío."}, status=400)

    duplicate = Area.objects.exclude(pk=area.pk).filter(branch=area.branch, name=area.name).exists()
    if duplicate:
        return JsonResponse(
            {"error": "Ya existe un área con ese nombre para la sucursal seleccionada."},
            status=400,
        )

    area.save()
    return JsonResponse(_serialize_area(area))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def dispensers(request):
    scope = _get_access_scope(request)
    if request.method == "POST":
        current_user = _get_current_user(request)
        if not _can_create_dashboard_items(current_user):
            return JsonResponse({"error": "Solo el administrador general puede crear dosificadores."}, status=403)

        data, files = _extract_user_data(request)
        if data is None:
            return JsonResponse({"error": "Formato JSON inválido."}, status=400)

        identifier = str(data.get("identifier") or "").strip()
        notes = str(data.get("notes") or "").strip()

        try:
            model_id = int(data.get("model_id") or 0)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Modelo inválido."}, status=400)

        area_id = data.get("area_id")
        area = None
        if area_id not in (None, ""):
            try:
                resolved_area_id = int(area_id)
            except (TypeError, ValueError):
                return JsonResponse({"error": "Área inválida."}, status=400)
            area = _filter_queryset_by_scope(
                Area.objects.select_related("branch__client"),
                scope,
                area_lookup="id",
            ).filter(pk=resolved_area_id).first()
            if area is None:
                return JsonResponse({"error": "Área no encontrada."}, status=404)

        if not identifier or not model_id:
            return JsonResponse({"error": "Modelo e identificador son obligatorios."}, status=400)

        model = DispenserModel.objects.filter(pk=model_id).first()
        if model is None:
            return JsonResponse({"error": "Modelo no encontrado."}, status=404)

        if Dispenser.objects.filter(model=model, identifier=identifier).exists():
            return JsonResponse(
                {"error": "Ya existe un dosificador con ese identificador para el modelo seleccionado."},
                status=400,
            )

        dispenser = Dispenser.objects.create(
            model=model,
            identifier=identifier,
            area=area,
            is_active=_is_truthy(data.get("is_active", True)),
        )
        assignments_data, assignments_error = _extract_dispenser_product_assignments(data)
        if assignments_error:
            return JsonResponse({"error": assignments_error}, status=400)
        if assignments_data is not None:
            apply_error = _apply_dispenser_product_assignments(dispenser, assignments_data)
            if apply_error:
                dispenser.delete()
                return apply_error
        else:
            product_ids = _as_id_list(data, "product_ids")
            if product_ids is not None:
                products = Product.objects.filter(id__in=product_ids)
                if products.count() != len(set(product_ids)):
                    dispenser.delete()
                    return JsonResponse({"error": "Uno o más productos seleccionados no existen."}, status=404)
                dispenser.products.set(products)

        if notes:
            # Campo reservado para compatibilidad de payload sin persistencia actual en el modelo.
            _ = notes

        return JsonResponse(_serialize_dispenser(dispenser), status=201)

    queryset = Dispenser.objects.select_related("model", "area__branch__client").prefetch_related(
        "products",
        "product_assignments__nozzle",
    )
    queryset = _filter_queryset_by_scope(queryset, scope, area_lookup="area_id")
    payload = [
        _serialize_dispenser(dispenser)
        for dispenser in queryset.all()
    ]
    return JsonResponse({"results": payload})


@require_GET
def dispenser_models(request):
    queryset = DispenserModel.objects.all()
    payload = [_serialize_dispenser_model(model) for model in queryset]
    return JsonResponse({"results": payload})


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def dispenser_detail(request, dispenser_id: int):
    scope = _get_access_scope(request)
    queryset = Dispenser.objects.select_related("model", "area__branch__client").prefetch_related(
        "products",
        "product_assignments__nozzle",
    )
    queryset = _filter_queryset_by_scope(queryset, scope, area_lookup="area_id")
    dispenser = queryset.filter(pk=dispenser_id).first()
    if dispenser is None:
        return JsonResponse({"error": "Dosificador no encontrado."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_dispenser(dispenser))

    current_user = _get_current_user(request)
    if not _is_general_admin_user(current_user):
        return JsonResponse({"error": "Solo el administrador general puede modificar dosificadores."}, status=403)

    if request.method == "DELETE":
        dispenser.delete()
        return JsonResponse({}, status=204)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    if "identifier" in data:
        dispenser.identifier = str(data.get("identifier") or "").strip()

    if "model_id" in data:
        try:
            model_id = int(data.get("model_id") or 0)
        except (TypeError, ValueError):
            return JsonResponse({"error": "Modelo inválido."}, status=400)
        model = DispenserModel.objects.filter(pk=model_id).first()
        if model is None:
            return JsonResponse({"error": "Modelo no encontrado."}, status=404)
        dispenser.model = model

    if "area_id" in data:
        area_id = data.get("area_id")
        if area_id in (None, ""):
            dispenser.area = None
        else:
            try:
                resolved_area_id = int(area_id)
            except (TypeError, ValueError):
                return JsonResponse({"error": "Área inválida."}, status=400)
            area = _filter_queryset_by_scope(
                Area.objects.select_related("branch__client"),
                scope,
                area_lookup="id",
            ).filter(pk=resolved_area_id).first()
            if area is None:
                return JsonResponse({"error": "Área no encontrada."}, status=404)
            dispenser.area = area

    assignments_data, assignments_error = _extract_dispenser_product_assignments(data)
    if assignments_error:
        return JsonResponse({"error": assignments_error}, status=400)
    if assignments_data is not None:
        apply_error = _apply_dispenser_product_assignments(dispenser, assignments_data)
        if apply_error:
            return apply_error
    elif "product_ids" in data:
        product_ids = _as_id_list(data, "product_ids") or []
        products = Product.objects.filter(id__in=product_ids)
        if products.count() != len(set(product_ids)):
            return JsonResponse({"error": "Uno o más productos seleccionados no existen."}, status=404)
        dispenser.products.set(products)

    if "is_active" in data:
        dispenser.is_active = _is_truthy(data.get("is_active"))

    if not dispenser.identifier:
        return JsonResponse({"error": "El identificador no puede estar vacío."}, status=400)

    if Dispenser.objects.exclude(pk=dispenser.pk).filter(model=dispenser.model, identifier=dispenser.identifier).exists():
        return JsonResponse({"error": "Ya existe un dosificador con ese identificador para el modelo seleccionado."}, status=400)

    dispenser.save()
    return JsonResponse(_serialize_dispenser(dispenser))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def products(request):
    if request.method == "GET":
        queryset = Product.objects.prefetch_related("dispensers__model")
        payload = [
            _serialize_product(product)
            for product in queryset.all()
        ]
        return JsonResponse({"results": payload})

    current_user = _get_current_user(request)
    if not _can_create_dashboard_items(current_user):
        return JsonResponse({"error": "Solo el administrador general puede crear productos."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    name = str(data.get("name") or "").strip()
    description = str(data.get("description") or "").strip()

    if not name:
        return JsonResponse({"error": "El nombre es obligatorio."}, status=400)

    product = Product.objects.create(name=name, description=description)
    return JsonResponse(_serialize_product(product), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def product_detail(request, product_id: int):
    queryset = Product.objects.prefetch_related("dispensers__model", "dispensers__area__branch__client")
    product = queryset.filter(pk=product_id).first()
    if product is None:
        return JsonResponse({"error": "Producto no encontrado."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_product(product))

    current_user = _get_current_user(request)
    if not _is_general_admin_user(current_user):
        return JsonResponse({"error": "Solo el administrador general puede modificar productos."}, status=403)

    if request.method == "DELETE":
        product.delete()
        return JsonResponse({}, status=204)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    if "name" in data:
        product.name = str(data.get("name") or "").strip()
    if "description" in data:
        product.description = str(data.get("description") or "").strip()

    if not product.name:
        return JsonResponse({"error": "El nombre no puede estar vacío."}, status=400)

    product.save()
    return JsonResponse(_serialize_product(product))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def visits(request):
    current_user = _get_current_user(request)
    if request.method == "POST":
        if not current_user:
            return JsonResponse({"error": "No se pudo identificar tu sesión de usuario."}, status=401)
        if not _can_create_dashboard_items(current_user):
            return JsonResponse({"error": "Solo el administrador general puede agendar visitas."}, status=403)

    if request.method == "GET":
        queryset = Visit.objects.select_related(
            "area__branch__client", "inspector", "dispenser"
        )
        scope = _get_access_scope(request)
        queryset = _filter_queryset_by_scope(queryset, scope, area_lookup="area_id")

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

    scope = _build_access_scope(current_user)
    if scope is not None and area.id not in scope["area_ids"]:
        return JsonResponse({"error": "No tienes permiso para agendar visitas en esta área."}, status=403)

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

    scope = _build_access_scope(current_user)

    try:
        visit = Visit.objects.select_related("inspector").get(pk=visit_id)
    except Visit.DoesNotExist:
        return JsonResponse({"error": "Visita no encontrada."}, status=404)

    if scope is not None and visit.area_id not in scope["area_ids"]:
        return JsonResponse({"error": "No tienes permiso para realizar esta visita."}, status=403)

    if visit.inspector_id and visit.inspector_id != current_user.id:
        return JsonResponse({"error": "Esta visita está asignada a otro inspector."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    action = str(data.get("action") or "").strip().lower()
    if action in {"iniciar", "inicio"}:
        action = "start"
    elif action in {"finalizar", "finish", "finalize", "complete_visit"}:
        action = "complete"

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

        evidence_files = []
        if files:
            evidence_files = files.getlist("evidence_files") or files.getlist("evidence")

        for evidence in evidence_files:
            content_type = str(getattr(evidence, "content_type", "") or "").lower()
            filename = str(getattr(evidence, "name", "") or "").lower()
            if content_type.startswith("image/") or filename.endswith((".jpg", ".jpeg", ".png", ".webp", ".heic")):
                media_type = VisitMedia.MediaType.PHOTO
            elif content_type.startswith("video/") or filename.endswith((".mp4", ".mov", ".avi", ".mkv", ".webm")):
                media_type = VisitMedia.MediaType.VIDEO
            else:
                media_type = VisitMedia.MediaType.OTHER
            VisitMedia.objects.create(visit=visit, media_type=media_type, file=evidence)

        return JsonResponse(_serialize_visit(visit))


    return JsonResponse({"error": "Acción no válida."}, status=400)




@csrf_exempt
@require_http_methods(["GET", "POST"])
def audit_forms(request):
    current_user = _get_current_user(request)

    if request.method == "GET":
        queryset = AuditForm.objects.all()
        return JsonResponse({"results": [_serialize_audit_form(form) for form in queryset.all()]})

    if not current_user or not _is_general_admin_user(current_user):
        return JsonResponse({"error": "Solo el administrador general puede crear plantillas de auditoría."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    name = str(data.get("name") or "").strip()
    if not name:
        return JsonResponse({"error": "El nombre de la plantilla es obligatorio."}, status=400)

    schema, schema_error = _validate_template_schema(data.get("schema"))
    if schema_error:
        return JsonResponse({"error": schema_error}, status=400)

    is_active = _is_truthy(data.get("is_active", True))

    form = AuditForm.objects.create(name=name, schema=schema, is_active=is_active)
    return JsonResponse(_serialize_audit_form(form), status=201)




@csrf_exempt
@require_http_methods(["GET", "PATCH", "DELETE"])
def audit_form_detail(request, form_id: int):
    form = AuditForm.objects.filter(pk=form_id).first()
    if form is None:
        return JsonResponse({"error": "Plantilla no encontrada."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_audit_form(form))

    current_user = _get_current_user(request)
    if not current_user or not _is_general_admin_user(current_user):
        return JsonResponse({"error": "Solo el administrador general puede modificar plantillas."}, status=403)

    if request.method == "DELETE":
        form.delete()
        return JsonResponse({"ok": True})

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    if "name" in data:
        name = str(data.get("name") or "").strip()
        if not name:
            return JsonResponse({"error": "El nombre de la plantilla es obligatorio."}, status=400)
        form.name = name

    if "is_active" in data:
        form.is_active = _is_truthy(data.get("is_active"))

    if "schema" in data:
        schema, schema_error = _validate_template_schema(data.get("schema"))
        if schema_error:
            return JsonResponse({"error": schema_error}, status=400)
        form.schema = schema

    form.save()
    return JsonResponse(_serialize_audit_form(form))


@csrf_exempt
@require_http_methods(["GET", "POST"])
def audits(request):
    current_user = _get_current_user(request)
    if request.method == "POST":
        if not current_user:
            return JsonResponse({"error": "No se pudo identificar tu sesión de usuario."}, status=401)
        if not (_is_general_admin_user(current_user) or current_user.role == User.Role.INSPECTOR):
            return JsonResponse({"error": "Solo el administrador general o un inspector pueden agendar auditorías."}, status=403)

    if request.method == "GET":
        queryset = Audit.objects.select_related("area__branch__client", "inspector", "form")
        scope = _get_access_scope(request)
        queryset = _filter_queryset_by_scope(queryset, scope, area_lookup="area_id")

        month = (request.GET.get("month") or "").strip()
        if month:
            try:
                month_date = datetime.strptime(month, "%Y-%m")
                queryset = queryset.filter(
                    audited_at__year=month_date.year,
                    audited_at__month=month_date.month,
                )
            except ValueError:
                return JsonResponse({"error": "El parámetro month debe tener formato YYYY-MM."}, status=400)

        return JsonResponse({"results": [_serialize_audit(audit) for audit in queryset.all()]})

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    try:
        area_id = int(data.get("area_id") or 0)
    except (TypeError, ValueError):
        return JsonResponse({"error": "Área inválida."}, status=400)

    area = Area.objects.select_related("branch__client").filter(pk=area_id).first()
    if area is None:
        return JsonResponse({"error": "Área no válida."}, status=400)

    scope = _build_access_scope(current_user)
    if scope is not None and area.id not in scope["area_ids"]:
        return JsonResponse({"error": "No tienes permiso para agendar auditorías en esta área."}, status=403)

    form = area.audit_form_template
    if form is None or not form.is_active:
        return JsonResponse(
            {"error": "El área seleccionada no tiene una plantilla de auditoría activa."},
            status=400,
        )

    inspector = None
    inspector_id = data.get("inspector_id")
    if inspector_id:
        try:
            inspector = User.objects.filter(role=User.Role.INSPECTOR).get(pk=int(inspector_id))
        except (User.DoesNotExist, ValueError, TypeError):
            return JsonResponse({"error": "Inspector no válido."}, status=400)

    notes = str(data.get("notes") or "").strip()
    audited_at = None
    audited_at_input = str(data.get("audited_at") or "").strip()
    if audited_at_input:
        try:
            audited_at = datetime.fromisoformat(audited_at_input.replace("Z", "+00:00"))
        except ValueError:
            return JsonResponse({"error": "La fecha/hora de la auditoría no tiene un formato válido."}, status=400)

    create_kwargs = {
        "area": area,
        "form": form,
        "form_name": form.name,
        "form_schema": form.schema or {},
        "inspector": inspector,
        "notes": notes,
        "status": Audit.Status.SCHEDULED,
    }
    if audited_at:
        create_kwargs["audited_at"] = audited_at

    audit = Audit.objects.create(**create_kwargs)
    return JsonResponse(_serialize_audit(audit), status=201)


@csrf_exempt
@require_http_methods(["PATCH"])
def audit_mobile_flow(request, audit_id: int):
    current_user = _get_current_user(request)
    if not current_user or current_user.role != User.Role.INSPECTOR:
        return JsonResponse({"error": "Solo un inspector puede realizar auditorías programadas."}, status=403)

    scope = _build_access_scope(current_user)

    try:
        audit = Audit.objects.select_related("inspector", "form").get(pk=audit_id)
    except Audit.DoesNotExist:
        return JsonResponse({"error": "Auditoría no encontrada."}, status=404)

    if scope is not None and audit.area_id not in scope["area_ids"]:
        return JsonResponse({"error": "No tienes permiso para realizar esta auditoría."}, status=403)

    if audit.inspector_id and audit.inspector_id != current_user.id:
        return JsonResponse({"error": "Esta auditoría está asignada a otro inspector."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    action = str(data.get("action") or "").strip().lower()
    if action in {"iniciar", "inicio"}:
        action = "start"
    elif action in {"finalizar", "finish", "finalize", "complete_audit"}:
        action = "complete"

    if action == "start":
        if audit.status != Audit.Status.SCHEDULED:
            return JsonResponse({"error": "Solo puedes iniciar auditorías programadas."}, status=400)

        start_latitude = _parse_optional_float(data.get("start_latitude"))
        start_longitude = _parse_optional_float(data.get("start_longitude"))
        if start_latitude is None or start_longitude is None:
            return JsonResponse({"error": "Debes validar tu ubicación para iniciar la auditoría."}, status=400)

        audit.started_at = timezone.now()
        audit.start_latitude = start_latitude
        audit.start_longitude = start_longitude
        audit.inspector = current_user
        audit.save(update_fields=["started_at", "start_latitude", "start_longitude", "inspector"])
        return JsonResponse(_serialize_audit(audit))

    if action == "complete":
        if audit.status != Audit.Status.SCHEDULED:
            return JsonResponse({"error": "La auditoría no se puede finalizar en su estado actual."}, status=400)
        if not audit.started_at:
            return JsonResponse({"error": "Debes iniciar la auditoría antes de finalizarla."}, status=400)

        end_latitude = _parse_optional_float(data.get("end_latitude"))
        end_longitude = _parse_optional_float(data.get("end_longitude"))
        if end_latitude is None or end_longitude is None:
            return JsonResponse({"error": "Debes validar tu ubicación para finalizar la auditoría."}, status=400)

        report = _normalize_visit_report(data.get("audit_report"))
        if report is None:
            return JsonResponse({"error": "El informe de la auditoría es inválido."}, status=400)

        if not _is_truthy(report.get("location_verified")):
            return JsonResponse({"error": "Debes confirmar que te encuentras físicamente en el sitio."}, status=400)

        audit.status = Audit.Status.COMPLETED
        audit.completed_at = timezone.now()
        audit.end_latitude = end_latitude
        audit.end_longitude = end_longitude
        report["form"] = {
            "id": audit.form_id,
            "name": audit.form_name or audit.form.name,
            "schema": audit.form_schema or audit.form.schema or {},
            "area_id": audit.area_id,
            "area": audit.area.name,
            "branch_id": audit.area.branch_id,
            "branch": audit.area.branch.name,
            "client_id": audit.area.branch.client_id,
            "client": audit.area.branch.client.name,
            "is_active": audit.form.is_active,
        }
        report["start_location"] = {"latitude": audit.start_latitude, "longitude": audit.start_longitude}
        report["end_location"] = {"latitude": end_latitude, "longitude": end_longitude}
        report["ai_analysis"] = _generate_deepseek_audit_analysis(audit, report)
        report["score"] = report["ai_analysis"].get("score")
        report["summary"] = {
            "score": report["ai_analysis"].get("score"),
            "executive_summary": report["ai_analysis"].get("executive_summary"),
        }
        audit.audit_report = report
        audit.save(update_fields=["status", "completed_at", "end_latitude", "end_longitude", "audit_report"])

        evidence_files = []
        if files:
            evidence_files = files.getlist("evidence_files") or files.getlist("evidence")

        for evidence in evidence_files:
            content_type = str(getattr(evidence, "content_type", "") or "").lower()
            filename = str(getattr(evidence, "name", "") or "").lower()
            if content_type.startswith("image/") or filename.endswith((".jpg", ".jpeg", ".png", ".webp", ".heic")):
                media_type = AuditMedia.MediaType.PHOTO
            elif content_type.startswith("video/") or filename.endswith((".mp4", ".mov", ".avi", ".mkv", ".webm")):
                media_type = AuditMedia.MediaType.VIDEO
            else:
                media_type = AuditMedia.MediaType.OTHER
            AuditMedia.objects.create(audit=audit, media_type=media_type, file=evidence)

        return JsonResponse(_serialize_audit(audit))

    return JsonResponse({"error": "Acción no válida."}, status=400)




def _build_audit_pdf(audit: Audit) -> bytes:
    _initialize_report_fonts()
    output = BytesIO()
    pdf = canvas.Canvas(output, pagesize=LETTER)
    width, height = LETTER
    generated_at = timezone.localtime()

    report = audit.audit_report or {}
    ai_analysis = report.get("ai_analysis") if isinstance(report.get("ai_analysis"), dict) else {}
    answers = report.get("answers") if isinstance(report.get("answers"), list) else []
    brand_green = colors.HexColor("#86BC25")
    brand_blue = colors.HexColor("#2E3192")
    brand_text = colors.HexColor("#12233D")

    def _header(title: str, subtitle: str):
        _draw_page_background(pdf)
        if not _draw_report_logo(pdf, 40, height - 70, 150, 42):
            pdf.setFillColor(brand_green)
            pdf.circle(54, height - 52, 12, fill=1, stroke=0)
            pdf.setFont(REPORT_FONT_BOLD, 16)
            pdf.drawString(74, height - 58, "trust")
        pdf.setFillColor(brand_text)
        pdf.setFont(REPORT_FONT_BOLD, 20)
        pdf.drawString(40, height - 98, title)
        pdf.setFillColor(colors.HexColor("#64748b"))
        pdf.setFont(REPORT_FONT, 10)
        pdf.drawString(40, height - 113, subtitle)
        pdf.setFillColor(brand_text)

    pdf.setTitle(f"informe-auditoria-{audit.id}")
    score = ai_analysis.get("score")
    risk_count = len([item for item in (ai_analysis.get("risks") or []) if str(item).strip()])
    strength_count = len([item for item in (ai_analysis.get("strengths") or []) if str(item).strip()])
    answered_count = len([item for item in answers if isinstance(item, dict)])
    total_questions = len(((report.get("form") or {}).get("schema") or {}).get("questions") or [])
    completion_pct = int((answered_count / total_questions) * 100) if total_questions else 0
    score_value = max(0, min(100, int(round(score)))) if isinstance(score, (int, float)) else 0
    _header(
        "Informe Ejecutivo de Auditoría",
        f"Auditoría #{audit.id} · Generado: {generated_at.strftime('%d/%m/%Y %H:%M')}",
    )
    score_label = f"{round(score, 1)}%" if isinstance(score, (int, float)) else "No disponible"
    inspector_name = audit.inspector.get_full_name() if audit.inspector else "Sin asignar"

    # Paleta alineada al diseño solicitado.
    c_primary = colors.HexColor("#15157d")
    c_primary_container = colors.HexColor("#2e3192")
    c_secondary = colors.HexColor("#426900")
    c_secondary_container = colors.HexColor("#b8f568")
    c_surface_low = colors.HexColor("#f3f4f5")
    c_surface_white = colors.HexColor("#ffffff")
    c_outline = colors.HexColor("#777683")
    c_outline_variant = colors.HexColor("#c7c5d4")
    c_on_surface = colors.HexColor("#191c1d")
    c_on_surface_variant = colors.HexColor("#464652")
    c_error_container = colors.HexColor("#ffdad6")
    c_error = colors.HexColor("#ba1a1a")

    # Hero: metadata + puntuación global.
    meta_chip_x, meta_chip_y = 56, height - 146
    pdf.setFillColor(colors.HexColor("#e1e0ff"))
    pdf.roundRect(meta_chip_x, meta_chip_y, 96, 20, 5, fill=1, stroke=0)
    pdf.setFillColor(colors.HexColor("#04006d"))
    pdf.setFont(REPORT_FONT_BOLD, 8)
    pdf.drawString(meta_chip_x + 8, meta_chip_y + 7, f"AUDITORÍA #{audit.id}")
    pdf.setFillColor(c_outline)
    pdf.setFont(REPORT_FONT_BOLD, 9)
    pdf.drawString(meta_chip_x + 108, meta_chip_y + 7, generated_at.strftime("%d/%m/%Y"))

    pdf.setFillColor(c_on_surface)
    pdf.setFont(REPORT_FONT_BOLD, 28)
    pdf.drawString(56, height - 190, "Informe Ejecutivo de Auditoría")

    info_items = [
        ("CLIENTE", audit.area.branch.client.name),
        ("SUCURSAL", audit.area.branch.name),
        ("ÁREA", audit.area.name),
        ("INSPECTOR", inspector_name or (audit.inspector.username if audit.inspector else "Sin asignar")),
    ]
    info_x = 56
    info_y = height - 230
    for index, (label, value) in enumerate(info_items):
        if index:
            sep_x = info_x - 12
            pdf.setStrokeColor(colors.Color(c_outline_variant.red, c_outline_variant.green, c_outline_variant.blue, alpha=0.35))
            pdf.setLineWidth(1)
            pdf.line(sep_x, info_y + 5, sep_x, info_y + 34)
        pdf.setFillColor(c_outline)
        pdf.setFont(REPORT_FONT_BOLD, 7.5)
        pdf.drawString(info_x, info_y + 28, label)
        pdf.setFillColor(c_primary if label == "SUCURSAL" else c_on_surface)
        pdf.setFont(REPORT_FONT_BOLD, 12)
        pdf.drawString(info_x, info_y + 14, str(value)[:22])
        info_x += 128

    score_card_x, score_card_y, score_card_w, score_card_h = 422, height - 260, 162, 140
    pdf.setFillColor(c_surface_white)
    pdf.roundRect(score_card_x, score_card_y, score_card_w, score_card_h, 10, fill=1, stroke=0)
    pdf.setFillColor(colors.Color(c_secondary_container.red, c_secondary_container.green, c_secondary_container.blue, alpha=0.15))
    pdf.circle(score_card_x + score_card_w - 8, score_card_y + score_card_h + 8, 28, fill=1, stroke=0)
    pdf.setFillColor(c_outline)
    pdf.setFont(REPORT_FONT_BOLD, 8)
    pdf.drawString(score_card_x + 12, score_card_y + score_card_h - 20, "PUNTAJE GLOBAL")
    pdf.setFillColor(c_primary)
    pdf.setFont(REPORT_FONT_BOLD, 40)
    pdf.drawString(score_card_x + 12, score_card_y + 62, str(score_value))
    pdf.setFillColor(c_on_surface_variant)
    pdf.setFont(REPORT_FONT_BOLD, 15)
    pdf.drawString(score_card_x + 84, score_card_y + 72, "%")
    bar_x, bar_y, bar_w, bar_h = score_card_x + 12, score_card_y + 40, score_card_w - 24, 6
    pdf.setFillColor(colors.HexColor("#e1e3e4"))
    pdf.roundRect(bar_x, bar_y, bar_w, bar_h, 3, fill=1, stroke=0)
    pdf.setFillColor(c_primary_container)
    pdf.roundRect(bar_x, bar_y, (bar_w * score_value) / 100, bar_h, 3, fill=1, stroke=0)
    pdf.setFillColor(c_outline)
    pdf.setFont(REPORT_FONT_BOLD, 6.8)
    pdf.drawString(bar_x, bar_y - 10, "0%")
    pdf.drawCentredString(bar_x + (bar_w / 2), bar_y - 10, "REFERENCIA: 85%")
    pdf.drawRightString(bar_x + bar_w, bar_y - 10, "100%")

    # Resumen + bloque visual de evidencia.
    summary = str(ai_analysis.get("executive_summary") or "Sin resumen ejecutivo.")
    summary_x, summary_y, summary_w, summary_h = 40, height - 488, 358, 214
    pdf.setFillColor(c_surface_white)
    pdf.roundRect(summary_x, summary_y, summary_w, summary_h, 10, fill=1, stroke=0)
    pdf.setStrokeColor(colors.Color(c_outline_variant.red, c_outline_variant.green, c_outline_variant.blue, alpha=0.2))
    pdf.roundRect(summary_x, summary_y, summary_w, summary_h, 10, fill=0, stroke=1)
    pdf.setFillColor(c_secondary)
    pdf.roundRect(summary_x + 14, summary_y + summary_h - 38, 4, 22, 2, fill=1, stroke=0)
    pdf.setFillColor(c_on_surface)
    pdf.setFont(REPORT_FONT_BOLD, 15)
    pdf.drawString(summary_x + 24, summary_y + summary_h - 30, "Resumen Ejecutivo")
    pdf.setFillColor(c_on_surface_variant)
    pdf.setFont(REPORT_FONT, 9.7)
    summary_lines = _split_text_to_lines(pdf, summary, summary_w - 32)
    _draw_justified_lines(pdf, summary_lines[:14], summary_x + 16, summary_y + summary_h - 52, summary_w - 32, line_height=12.3)

    evidence_x, evidence_y, evidence_w, evidence_h = 410, height - 488, 174, 214
    pdf.setFillColor(colors.HexColor("#d5dce2"))
    pdf.roundRect(evidence_x, evidence_y, evidence_w, evidence_h, 10, fill=1, stroke=0)
    pdf.setFillColor(colors.Color(c_surface_white.red, c_surface_white.green, c_surface_white.blue, alpha=0.78))
    pdf.roundRect(evidence_x + 10, evidence_y + 10, evidence_w - 20, 42, 8, fill=1, stroke=0)
    pdf.setFillColor(c_primary)
    pdf.setFont(REPORT_FONT_BOLD, 7.4)
    pdf.drawString(evidence_x + 18, evidence_y + 40, "EVIDENCIA CAPTURADA")
    pdf.setFillColor(c_on_surface)
    pdf.setFont(REPORT_FONT, 8)
    pdf.drawString(evidence_x + 18, evidence_y + 26, "Visualización del área principal")

    # Tarjetas de métricas.
    cards = [
        ("Preguntas", str(total_questions or 0), c_surface_low, c_primary),
        ("Respondidas", str(answered_count), c_surface_low, c_secondary),
        ("Finalización", f"{completion_pct}%", c_surface_low, c_primary),
        ("Riesgos Identificados", str(risk_count), c_error_container, c_error),
        ("Fortalezas Clave", str(strength_count), c_secondary_container, c_secondary),
        ("Puntaje Consistencia IA", score_label, c_primary_container, c_surface_white),
    ]
    card_w, card_h = 172, 62
    start_x, start_y = 40, height - 568
    for idx, (label, value, bg, value_color) in enumerate(cards):
        row = idx // 3
        col = idx % 3
        x = start_x + (col * (card_w + 12))
        y = start_y - (row * (card_h + 10))
        pdf.setFillColor(bg)
        pdf.roundRect(x, y, card_w, card_h, 9, fill=1, stroke=0)
        pdf.setFillColor(c_outline if idx != 3 else colors.HexColor("#93000a"))
        pdf.setFont(REPORT_FONT_BOLD, 7)
        pdf.drawString(x + 12, y + 45, label.upper()[:28])
        pdf.setFillColor(value_color)
        pdf.setFont(REPORT_FONT_BOLD, 16)
        pdf.drawString(x + 12, y + 20, str(value)[:20])

    # Análisis de puntos críticos.
    analysis_x, analysis_y, analysis_w, analysis_h = 40, 50, width - 80, 145
    pdf.setFillColor(c_surface_white)
    pdf.roundRect(analysis_x, analysis_y, analysis_w, analysis_h, 10, fill=1, stroke=0)
    pdf.setStrokeColor(colors.Color(c_outline_variant.red, c_outline_variant.green, c_outline_variant.blue, alpha=0.2))
    pdf.roundRect(analysis_x, analysis_y, analysis_w, analysis_h, 10, fill=0, stroke=1)
    pdf.setFillColor(c_on_surface)
    pdf.setFont(REPORT_FONT_BOLD, 12)
    pdf.drawString(analysis_x + 14, analysis_y + analysis_h - 20, "Análisis de Puntos Críticos")
    pdf.setFillColor(c_outline)
    pdf.setFont(REPORT_FONT, 8)
    pdf.drawString(analysis_x + 14, analysis_y + analysis_h - 33, "Desglose por categoría y métricas de desempeño")

    categories = [
        ("Saneamiento e Higiene", 95, c_secondary),
        ("Capacitación del Personal", 88, c_secondary),
        ("Mantenimiento de Equipos", 75, colors.HexColor("#e39c26")),
    ]
    current_y = analysis_y + analysis_h - 52
    for label, value, fill in categories:
        pdf.setFillColor(c_on_surface)
        pdf.setFont(REPORT_FONT_BOLD, 8.5)
        pdf.drawString(analysis_x + 14, current_y, label)
        pdf.setFillColor(fill)
        pdf.drawRightString(analysis_x + 256, current_y, f"{value}%")
        track_x, track_y = analysis_x + 14, current_y - 9
        pdf.setFillColor(colors.HexColor("#e7e8e9"))
        pdf.roundRect(track_x, track_y, 242, 4, 2, fill=1, stroke=0)
        pdf.setFillColor(fill)
        pdf.roundRect(track_x, track_y, (242 * value) / 100, 4, 2, fill=1, stroke=0)
        current_y -= 24

    risk_bars = [20, 45, 30, 65, 90, 55, 15]
    chart_x, chart_y = analysis_x + 296, analysis_y + 20
    bar_w = 24
    for idx, bar_value in enumerate(risk_bars):
        fill_alpha = 0.12 + (idx * 0.11)
        pdf.setFillColor(colors.Color(c_primary_container.red, c_primary_container.green, c_primary_container.blue, alpha=min(fill_alpha, 0.95)))
        x = chart_x + (idx * (bar_w + 6))
        pdf.roundRect(x, chart_y, bar_w, (90 * bar_value) / 100, 3, fill=1, stroke=0)
    pdf.setFillColor(c_outline)
    pdf.setFont(REPORT_FONT_BOLD, 6.5)
    for idx, day in enumerate(["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"]):
        pdf.drawCentredString(chart_x + (idx * (bar_w + 6)) + (bar_w / 2), chart_y - 9, day)

    _draw_report_footer(pdf, generated_at)
    pdf.showPage()

    _header("Anexos de campo y conformidad", f"Auditoría #{audit.id} · Evidencia geolocalizada y multimedia")

    recommendations = ai_analysis.get("recommendations") if isinstance(ai_analysis.get("recommendations"), list) else []
    next_steps = ai_analysis.get("next_steps") if isinstance(ai_analysis.get("next_steps"), list) else []
    actions = [f"• {str(item)}" for item in (recommendations[:5] + next_steps[:5]) if str(item).strip()]

    actions_top = height - 120
    actions_h = 160
    _draw_card(pdf, 40, actions_top - actions_h, 540, actions_h)
    pdf.setFillColor(brand_text)
    pdf.setFont(REPORT_FONT_BOLD, 12)
    pdf.drawString(56, actions_top - 24, "Acciones Prioritarias")
    pdf.setFillColor(colors.HexColor("#1e3a8a"))
    pdf.setFont(REPORT_FONT_BOLD, 9)
    pdf.drawString(56, actions_top - 40, "ENFOQUE INMEDIATO")
    pdf.setFillColor(colors.HexColor("#334155"))
    pdf.setFont(REPORT_FONT, 9.6)
    actions_text = "\n".join(actions) if actions else "• No se registraron recomendaciones accionables."
    action_lines = []
    for paragraph in actions_text.splitlines():
        wrapped = _split_text_to_lines(pdf, paragraph, 500)
        action_lines.extend(wrapped if wrapped else [""])
    max_action_lines = 8
    first_page_lines = action_lines[:max_action_lines]
    remaining_action_lines = action_lines[max_action_lines:]
    _draw_wrapped_text(pdf, "\n".join(first_page_lines), 56, actions_top - 54, 500, line_height=12.2)

    while remaining_action_lines:
        _draw_report_footer(pdf, generated_at)
        pdf.showPage()
        _header("Anexos de campo y conformidad", f"Auditoría #{audit.id} · Continuación de acciones prioritarias")
        _draw_card(pdf, 40, actions_top - actions_h, 540, actions_h)
        pdf.setFillColor(brand_text)
        pdf.setFont(REPORT_FONT_BOLD, 12)
        pdf.drawString(56, actions_top - 24, "Acciones Prioritarias (continuación)")
        chunk = remaining_action_lines[:max_action_lines]
        remaining_action_lines = remaining_action_lines[max_action_lines:]
        _draw_wrapped_text(pdf, "\n".join(chunk), 56, actions_top - 54, 500, line_height=12.2)

    _draw_report_footer(pdf, generated_at)
    pdf.showPage()
    _header("Anexos de campo y conformidad", f"Auditoría #{audit.id} · Evidencia geolocalizada y multimedia")

    photos = [item for item in audit.media.all() if item.media_type == AuditMedia.MediaType.PHOTO][:4]
    photo_section_y = height - 120
    _draw_card(pdf, 40, photo_section_y - 320, 540, 320)
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont(REPORT_FONT_BOLD, 12)
    pdf.drawString(56, photo_section_y - 24, "Evidencia multimedia")
    if photos:
        x = 56
        y = photo_section_y - 42
        photo_w = 140
        photo_h = 180
        for index, item in enumerate(photos):
            if index and index % 2 == 0:
                x = 56
                y -= (photo_h + 14)
            pdf.setFillColor(colors.HexColor("#f1f5f9"))
            pdf.rect(x, y - photo_h, photo_w, photo_h, fill=1, stroke=0)
            try:
                image_data = item.file.read() if hasattr(item.file, "read") else default_storage.open(item.file.name, "rb").read()
                image = ImageReader(BytesIO(image_data))
                pdf.drawImage(
                    image,
                    x + 1,
                    y - photo_h + 1,
                    width=photo_w - 2,
                    height=photo_h - 2,
                    preserveAspectRatio=True,
                    mask="auto",
                    anchor="c",
                )
            except Exception:
                pdf.setFillColor(colors.HexColor("#cbd5e1"))
                pdf.rect(x + 1, y - photo_h + 1, photo_w - 2, photo_h - 2, fill=1, stroke=0)
            x += 260
    else:
        pdf.setFillColor(colors.HexColor("#64748b"))
        pdf.setFont(REPORT_FONT, 10)
        pdf.drawString(56, photo_section_y - 48, "No se registraron fotografías de evidencia.")

    videos = [item for item in audit.media.all() if item.media_type == AuditMedia.MediaType.VIDEO][:5]
    base_y = photo_section_y - 258
    pdf.setFillColor(colors.HexColor("#334155"))
    pdf.setFont(REPORT_FONT_BOLD, 10)
    pdf.drawString(56, base_y, "Evidencia en video:")
    pdf.setFont(REPORT_FONT, 9)
    if videos:
        for index, item in enumerate(videos, start=1):
            file_name = str(getattr(item.file, "name", "video")).split("/")[-1]
            pdf.drawString(56, base_y - (index * 13), f"{index}. {file_name[:78]}")
    else:
        pdf.drawString(56, base_y - 13, "Sin videos registrados.")

    responsible_name = str(report.get("responsible_name") or "No registrado")
    signature_data = str(report.get("responsible_signature") or "")
    _draw_card(pdf, 40, 50, 540, 104)
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont(REPORT_FONT_BOLD, 11)
    pdf.drawString(56, 140, "Firma de conformidad")
    pdf.setStrokeColor(colors.HexColor("#0f172a"))
    pdf.line(180, 90, 448, 90)
    if signature_data.startswith("data:image") and "," in signature_data:
        try:
            encoded = signature_data.split(",", 1)[1]
            image = ImageReader(BytesIO(base64.b64decode(encoded)))
            pdf.drawImage(image, 208, 96, width=210, height=40, mask="auto", preserveAspectRatio=True)
        except Exception:
            pass
    pdf.setFont(REPORT_FONT_BOLD, 10)
    pdf.setFillColor(colors.HexColor("#334155"))
    pdf.drawString(186, 76, "REPRESENTANTE DEL ÁREA")
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont(REPORT_FONT_BOLD, 12)
    pdf.drawString(186, 60, responsible_name[:58])

    _draw_report_footer(pdf, generated_at)
    pdf.showPage()

    _header("Anexo técnico de respuestas", f"Auditoría #{audit.id} · Registro completo del formulario")
    _draw_card(pdf, 40, height - 192, width - 80, 60)
    pdf.setFillColor(colors.HexColor("#1e3a8a"))
    pdf.setFont(REPORT_FONT_BOLD, 10)
    pdf.drawString(56, height - 156, "Trazabilidad técnica")
    pdf.setFillColor(colors.HexColor("#334155"))
    pdf.setFont(REPORT_FONT, 9.5)
    pdf.drawString(56, height - 170, "Bloques de riesgo, fortalezas y respuestas capturadas durante la auditoría.")
    y = height - 214

    def write_block(title: str, items: list[str], current_y: float) -> float:
        if not items:
            return current_y
        if current_y < 120:
            _draw_report_footer(pdf, generated_at)
            pdf.showPage()
            _header("Anexo técnico de respuestas", f"Auditoría #{audit.id} · Continuación")
            current_y = height - 132
        pdf.setFont(REPORT_FONT_BOLD, 12)
        pdf.setFillColor(colors.HexColor("#0f172a"))
        pdf.drawString(56, current_y, title)
        current_y -= 18
        pdf.setFont(REPORT_FONT, 10)
        pdf.setFillColor(colors.HexColor("#334155"))
        for entry in items:
            for row in textwrap.wrap(entry, width=96):
                if current_y < 70:
                    _draw_report_footer(pdf, generated_at)
                    pdf.showPage()
                    _header("Anexo técnico de respuestas", f"Auditoría #{audit.id} · Continuación")
                    current_y = height - 132
                    pdf.setFont(REPORT_FONT, 10)
                    pdf.setFillColor(colors.HexColor("#334155"))
                pdf.drawString(60, current_y, row)
                current_y -= 13
            current_y -= 6
        return current_y

    y = write_block("Riesgos identificados", [f"• {str(item)}" for item in (ai_analysis.get("risks") or [])[:8]], y)
    y = write_block("Fortalezas observadas", [f"• {str(item)}" for item in (ai_analysis.get("strengths") or [])[:8]], y)

    inspector_name = audit.inspector.get_full_name() if audit.inspector else "Sin asignar"
    y = write_block(
        "Datos de trazabilidad",
        [
            f"Cliente: {audit.area.branch.client.name}",
            f"Sucursal: {audit.area.branch.name}",
            f"Área: {audit.area.name}",
            f"Inspector: {inspector_name or (audit.inspector.username if audit.inspector else 'Sin asignar')}",
            f"Fecha programada: {timezone.localtime(audit.audited_at).strftime('%d/%m/%Y %H:%M')}",
            f"Completada: {timezone.localtime(audit.completed_at).strftime('%d/%m/%Y %H:%M') if audit.completed_at else 'No registrada'}",
            f"Responsable: {responsible_name}",
        ],
        y,
    )

    if answers:
        if y < 110:
            _draw_report_footer(pdf, generated_at)
            pdf.showPage()
            _header("Anexo técnico de respuestas", f"Auditoría #{audit.id} · Registro detallado")
            y = height - 132
        pdf.setFont(REPORT_FONT_BOLD, 12)
        pdf.setFillColor(colors.HexColor("#0f172a"))
        pdf.drawString(56, y, "Respuestas registradas")
        y -= 18
        pdf.setFont(REPORT_FONT, 10)
        pdf.setFillColor(colors.HexColor("#334155"))
        for index, answer in enumerate(answers, start=1):
            if not isinstance(answer, dict):
                continue
            label = str(answer.get("label") or f"Pregunta {index}")
            value = str(answer.get("value") or "Sin respuesta")
            for row in textwrap.wrap(f"{index}. {label}", width=95):
                if y < 70:
                    _draw_report_footer(pdf, generated_at)
                    pdf.showPage()
                    _header("Anexo técnico de respuestas", f"Auditoría #{audit.id} · Registro detallado")
                    y = height - 132
                    pdf.setFont(REPORT_FONT, 10)
                    pdf.setFillColor(colors.HexColor("#334155"))
                pdf.drawString(60, y, row)
                y -= 14
            for row in textwrap.wrap(f"Respuesta: {value}", width=92):
                if y < 70:
                    _draw_report_footer(pdf, generated_at)
                    pdf.showPage()
                    _header("Anexo técnico de respuestas", f"Auditoría #{audit.id} · Registro detallado")
                    y = height - 132
                    pdf.setFont(REPORT_FONT, 10)
                    pdf.setFillColor(colors.HexColor("#334155"))
                pdf.drawString(72, y, row)
                y -= 14
            y -= 6

    _draw_report_footer(pdf, generated_at)
    pdf.save()
    return output.getvalue()


@require_GET
def audit_report_pdf(request, audit_id: int):
    current_user = _get_current_user(request)
    if not current_user:
        return JsonResponse({"error": "Usuario no autenticado."}, status=401)

    scope = _build_access_scope(current_user)

    queryset = Audit.objects.select_related(
        "area__branch__client", "inspector", "form"
    ).prefetch_related("media")
    queryset = _filter_queryset_by_scope(queryset, scope, area_lookup="area_id")
    audit = queryset.filter(pk=audit_id).first()
    if audit is None:
        return JsonResponse({"error": "Auditoría no encontrada."}, status=404)

    if audit.status != Audit.Status.COMPLETED:
        return JsonResponse({"error": "Solo puedes descargar informe de auditorías finalizadas."}, status=400)

    pdf_content = _build_audit_pdf(audit)
    response = HttpResponse(pdf_content, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="auditoria-{audit.id}-informe.pdf"'
    return response


@require_GET
def visit_report_pdf(request, visit_id: int):
    current_user = _get_current_user(request)
    if not current_user:
        return JsonResponse({"error": "Usuario no autenticado."}, status=401)

    scope = _build_access_scope(current_user)

    queryset = Visit.objects.select_related(
        "area__branch__client", "inspector", "dispenser"
    ).prefetch_related("media")
    queryset = _filter_queryset_by_scope(queryset, scope, area_lookup="area_id")
    visit = queryset.filter(pk=visit_id).first()
    if visit is None:
        return JsonResponse({"error": "Visita no encontrada."}, status=404)

    if visit.status != Visit.Status.COMPLETED:
        return JsonResponse({"error": "Solo puedes descargar informe de visitas finalizadas."}, status=400)

    public_report_url = _build_public_report_url(request, visit)
    pdf_content = _build_visit_pdf(visit, public_report_url=public_report_url)
    response = HttpResponse(pdf_content, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="visita-{visit.id}-informe.pdf"'
    return response


@require_GET
def visit_report_public_pdf(request, token: str):
    visit = _get_visit_from_public_token(token)
    if visit is None:
        return JsonResponse({"error": "El enlace público del informe es inválido o expiró."}, status=404)

    pdf_content = _build_visit_pdf(visit, public_report_url=None)
    response = HttpResponse(pdf_content, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="visita-{visit.id}-informe.pdf"'
    return response


@require_GET
def visit_report_public_detail(request, token: str):
    visit = _get_visit_from_public_token(token)
    if visit is None:
        return JsonResponse({"error": "El enlace público del informe es inválido o expiró."}, status=404)
    return JsonResponse(_serialize_visit(visit))


@require_GET
def notifications(request):
    current_user = _get_current_user(request)
    if not current_user:
        return JsonResponse({"error": "Usuario no autenticado."}, status=401)

    scope = _build_access_scope(current_user)

    visits_queryset = Visit.objects.select_related("area__branch__client", "inspector")
    if current_user.role == User.Role.INSPECTOR:
        visits_queryset = visits_queryset.filter(inspector_id=current_user.id)
    else:
        visits_queryset = _filter_queryset_by_scope(visits_queryset, scope, area_lookup="area_id")

    incidents_queryset = Incident.objects.select_related("client", "branch", "area", "dispenser")
    incidents_queryset = _filter_queryset_by_scope(incidents_queryset, scope, area_lookup="area_id")

    items: list[dict[str, Any]] = []

    for visit in visits_queryset.order_by("-visited_at")[:30]:
        branch_name = visit.area.branch.name if visit.area_id else "sucursal"
        status_label = visit.get_status_display().lower()
        items.append({
            "id": f"visit-{visit.id}",
            "title": "Visita programada" if visit.status == Visit.Status.SCHEDULED else "Visita finalizada",
            "message": f"{branch_name}: visita {status_label} para {visit.visited_at:%d/%m/%Y %H:%M}.",
            "created_at": visit.visited_at,
            "type": "visit",
            "unread": False,
        })

    for incident in incidents_queryset.order_by("-created_at")[:30]:
        items.append({
            "id": f"incident-{incident.id}",
            "title": "Nueva incidencia",
            "message": f"{incident.branch.name} · {incident.dispenser.identifier}: {incident.description}",
            "created_at": incident.created_at,
            "type": "incident",
            "unread": False,
        })

    items.sort(key=lambda item: item["created_at"], reverse=True)
    payload = [_serialize_notification(item) for item in items[:50]]
    return JsonResponse({"results": payload})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def incidents(request):
    current_user = _get_current_user(request)

    if request.method == "GET":
        queryset = Incident.objects.select_related("client", "branch", "area", "dispenser")
        scope = _get_access_scope(request)
        queryset = _filter_queryset_by_scope(queryset, scope, area_lookup="area_id")
        payload = [
            _serialize_incident(incident)
            for incident in queryset.all()
        ]
        return JsonResponse({"results": payload})

    if not _can_create_incidents(current_user):
        return JsonResponse({"error": "Solo el administrador general y el administrador de sucursal pueden registrar incidencias."}, status=403)

    data, files = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    try:
        client_id = int(data.get("client_id") or 0)
        branch_id = int(data.get("branch_id") or 0)
        area_id = int(data.get("area_id") or 0)
        dispenser_id = int(data.get("dispenser_id") or 0)
    except (TypeError, ValueError):
        return JsonResponse({"error": "IDs inválidos para registrar la incidencia."}, status=400)

    description = str(data.get("description") or "").strip()
    if not description:
        return JsonResponse({"error": "La descripción es obligatoria."}, status=400)

    try:
        client = Client.objects.get(pk=client_id)
        branch = Branch.objects.select_related("client").get(pk=branch_id)
        area = Area.objects.select_related("branch").get(pk=area_id)
        dispenser = Dispenser.objects.select_related("area").get(pk=dispenser_id)
    except (Client.DoesNotExist, Branch.DoesNotExist, Area.DoesNotExist, Dispenser.DoesNotExist):
        return JsonResponse({"error": "No se encontraron datos válidos para la incidencia."}, status=400)

    if branch.client_id != client.id or area.branch_id != branch.id or dispenser.area_id != area.id:
        return JsonResponse({"error": "La ubicación seleccionada no es consistente."}, status=400)

    scope = _build_access_scope(current_user)
    if scope is not None and area.id not in scope["area_ids"]:
            return JsonResponse({"error": "No tienes permiso sobre la sucursal seleccionada."}, status=403)

    incident = Incident.objects.create(
        client=client,
        branch=branch,
        area=area,
        dispenser=dispenser,
        description=description,
    )

    evidence_files = files.getlist("evidence_files") if files else []
    for evidence in evidence_files:
        content_type = str(getattr(evidence, "content_type", "") or "").lower()
        media_type = (
            IncidentMedia.MediaType.VIDEO
            if content_type.startswith("video/")
            else IncidentMedia.MediaType.PHOTO
        )
        IncidentMedia.objects.create(
            incident=incident,
            media_type=media_type,
            file=evidence,
        )

    return JsonResponse(_serialize_incident(incident), status=201)


@require_GET
def incident_detail(request, incident_id: int):
    queryset = Incident.objects.select_related("client", "branch", "area", "dispenser")
    scope = _get_access_scope(request)
    queryset = _filter_queryset_by_scope(queryset, scope, area_lookup="area_id")

    incident = queryset.filter(pk=incident_id).first()
    if incident is None:
        return JsonResponse({"error": "No se encontró la incidencia."}, status=404)

    return JsonResponse(_serialize_incident(incident))


@csrf_exempt
@require_http_methods(["POST"])
def incident_schedule_visit(request, incident_id: int):
    current_user = _get_current_user(request)
    if not current_user:
        return JsonResponse({"error": "No se pudo identificar tu sesión de usuario."}, status=401)

    data, _ = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    incident = Incident.objects.select_related("client", "area", "dispenser").filter(pk=incident_id).first()
    if incident is None:
        return JsonResponse({"error": "No se encontró la incidencia."}, status=404)

    if not _can_schedule_visit_from_incident(current_user, incident):
        return JsonResponse(
            {"error": "Solo el administrador general o el inspector asignado al cliente pueden programar visitas desde incidencias."},
            status=403,
        )

    scope = _build_access_scope(current_user)
    if scope is not None and incident.area_id not in scope["area_ids"]:
        return JsonResponse({"error": "No tienes permiso sobre esta incidencia."}, status=403)

    inspector = None
    inspector_id = data.get("inspector_id")
    if current_user.role == User.Role.INSPECTOR:
        inspector = current_user
    elif inspector_id:
        try:
            inspector = User.objects.get(pk=int(inspector_id), role=User.Role.INSPECTOR)
        except (User.DoesNotExist, TypeError, ValueError):
            return JsonResponse({"error": "Inspector no válido."}, status=400)

    visited_at_raw = str(data.get("visited_at") or "").strip()
    if not visited_at_raw:
        return JsonResponse({"error": "La fecha/hora de la visita es obligatoria."}, status=400)

    try:
        visited_at = datetime.fromisoformat(visited_at_raw.replace("Z", "+00:00"))
    except ValueError:
        return JsonResponse({"error": "La fecha/hora de la visita no tiene un formato válido."}, status=400)

    notes = str(data.get("notes") or "").strip()

    visit = Visit.objects.create(
        area=incident.area,
        dispenser=incident.dispenser,
        inspector=inspector,
        visited_at=visited_at,
        notes=f"[INCIDENCIA #{incident.id}] {notes}".strip(),
        status=Visit.Status.SCHEDULED,
    )

    incident.delete()

    return JsonResponse(_serialize_visit(visit), status=201)


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    email = str(data.get("email") or "").strip().lower()
    password = str(data.get("password") or "")
    if not email or not password:
        return JsonResponse({"error": "Email y contraseña son obligatorios."}, status=400)

    user = User.objects.filter(email__iexact=email).first()
    if user is None or not user.check_password(password):
        return JsonResponse({"error": "Credenciales inválidas."}, status=401)
    if not user.is_active:
        return JsonResponse({"error": "El usuario está inactivo."}, status=403)

    return JsonResponse({"user": _serialize_user(user)})


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

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"error": "Ya existe un usuario con ese email."}, status=400)
    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({"error": "Ya existe un usuario con ese nombre de usuario."}, status=400)

    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            is_active=bool(data.get("is_active", True)),
        )
    except IntegrityError:
        return JsonResponse(
            {"error": "No se pudo crear el usuario. Verifica que el email y usuario sean únicos."},
            status=400,
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
@require_http_methods(["GET", "PUT", "DELETE"])
def user_detail(request, user_id: int):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "Usuario no encontrado."}, status=404)

    if request.method == "GET":
        return JsonResponse(_serialize_user(user))

    if request.method == "DELETE":
        current_user = _get_current_user(request)
        if current_user and current_user.id == user.id:
            return JsonResponse({"error": "No puedes eliminar tu propio usuario."}, status=400)

        if user.profile_photo:
            user.profile_photo.delete(save=False)
        user.delete()
        return HttpResponse(status=204)

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
    if "username" in data:
        username = str(data.get("username") or "").strip()
        if not username:
            return JsonResponse({"error": "El nombre de usuario es obligatorio."}, status=400)
        if User.objects.exclude(pk=user.pk).filter(username__iexact=username).exists():
            return JsonResponse({"error": "Ya existe un usuario con ese nombre de usuario."}, status=400)
        user.username = username
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
