import base64
import json
import textwrap
from django.db import IntegrityError
from datetime import datetime
from io import BytesIO
from typing import Any
from urllib.parse import urlencode
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

from .models import Area, Branch, Client, Dispenser, DispenserModel, Incident, IncidentMedia, Product, User, Visit, VisitMedia


REPORT_FONT = "Helvetica"
REPORT_FONT_BOLD = "Helvetica-Bold"
REPORT_FONT_ITALIC = "Helvetica-Oblique"
REPORT_PUBLIC_LINK_SALT = "visit-report-public-link"
REPORT_PUBLIC_LINK_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
REPORT_PAGE_PADDING = 36
REPORT_CARD_RADIUS = 14

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


def _is_general_admin_user(user: User | None) -> bool:
    return bool(user and user.role == User.Role.GENERAL_ADMIN)


def _can_create_dashboard_items(user: User | None) -> bool:
    return _is_general_admin_user(user)


def _can_create_incidents(user: User | None) -> bool:
    return bool(user and user.role in {User.Role.GENERAL_ADMIN, User.Role.BRANCH_ADMIN})


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
        "products": [
            {
                "id": product.id,
                "name": product.name,
                "photo": product.photo.url if product.photo else None,
            }
            for product in dispenser.products.all()
        ],
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
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "photo": product.photo.url if product.photo else None,
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
    pdf.setFillColor(colors.HexColor("#f8fafc"))
    pdf.rect(0, 0, page_width, page_height, fill=1, stroke=0)


def _draw_card(pdf: canvas.Canvas, x: float, y: float, width: float, height: float):
    pdf.setFillColor(colors.white)
    pdf.setStrokeColor(colors.HexColor("#e2e8f0"))
    pdf.setLineWidth(1)
    pdf.roundRect(x, y, width, height, REPORT_CARD_RADIUS, fill=1, stroke=1)


def _draw_report_header(pdf: canvas.Canvas, visit: Visit, generated_at: datetime):
    page_width, page_height = LETTER
    _draw_page_background(pdf)

    header_x = REPORT_PAGE_PADDING
    header_y = page_height - 110

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


def _fetch_static_map(start_lat: float, start_lon: float, end_lat: float, end_lon: float, width: int, height: int):
    center_lat = (start_lat + end_lat) / 2
    center_lon = (start_lon + end_lon) / 2
    distance = max(abs(start_lat - end_lat), abs(start_lon - end_lon))
    zoom = 18
    if distance > 0.005:
        zoom = 16
    if distance > 0.015:
        zoom = 14
    params = urlencode(
        {
            "center": f"{center_lat:.6f},{center_lon:.6f}",
            "zoom": zoom,
            "size": f"{width}x{height}",
            "markers": f"{start_lat:.6f},{start_lon:.6f},lightgreen1|{end_lat:.6f},{end_lon:.6f},red",
            "maptype": "mapnik",
        }
    )
    request = Request(
        f"https://staticmap.openstreetmap.de/staticmap.php?{params}",
        headers={"User-Agent": "trust-report-generator/1.0"},
    )
    with urlopen(request, timeout=8) as response:
        return response.read()


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
@require_http_methods(["GET", "PUT"])
def client_detail(request, client_id: int):
    scope = _get_access_scope(request)
    queryset = _filter_queryset_by_scope(Client.objects.all(), scope, client_lookup="id")
    client = queryset.filter(pk=client_id).first()
    if client is None:
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
@require_http_methods(["GET", "PUT"])
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
        queryset = Area.objects.select_related("branch__client")
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

    area = Area.objects.create(branch=branch, name=name, description=description)
    return JsonResponse(_serialize_area(area), status=201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def area_detail(request, area_id: int):
    scope = _get_access_scope(request)
    queryset = _filter_queryset_by_scope(
        Area.objects.select_related("branch__client"),
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
        )

        if notes:
            # Campo reservado para compatibilidad de payload sin persistencia actual en el modelo.
            _ = notes

        return JsonResponse(_serialize_dispenser(dispenser), status=201)

    queryset = Dispenser.objects.select_related("model", "area__branch__client").prefetch_related("products")
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
@require_http_methods(["GET", "POST"])
def products(request):
    scope = _get_access_scope(request)
    if request.method == "GET":
        queryset = Product.objects.select_related("dispenser__model")
        queryset = _filter_queryset_by_scope(queryset, scope, area_lookup="dispenser__area_id")
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

    try:
        dispenser_id = int(data.get("dispenser_id") or 0)
    except (TypeError, ValueError):
        return JsonResponse({"error": "Dosificador inválido."}, status=400)

    if not name or not dispenser_id:
        return JsonResponse({"error": "Dosificador y nombre son obligatorios."}, status=400)

    dispenser = _filter_queryset_by_scope(
        Dispenser.objects.select_related("model", "area__branch__client"),
        scope,
        area_lookup="area_id",
    ).filter(pk=dispenser_id).first()
    if dispenser is None:
        return JsonResponse({"error": "Dosificador no encontrado."}, status=404)

    if Product.objects.filter(dispenser=dispenser, name=name).exists():
        return JsonResponse(
            {"error": "Ya existe un producto con ese nombre para el dosificador seleccionado."},
            status=400,
        )

    if Product.objects.filter(dispenser=dispenser).count() >= 4:
        return JsonResponse(
            {"error": "Cada dosificador puede tener máximo 4 productos."},
            status=400,
        )

    product = Product.objects.create(dispenser=dispenser, name=name, description=description)
    return JsonResponse(_serialize_product(product), status=201)


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
    if current_user.role == User.Role.INSPECTOR:
        return JsonResponse({"error": "No tienes permisos para programar visitas desde incidencias."}, status=403)

    data, _ = _extract_user_data(request)
    if data is None:
        return JsonResponse({"error": "Formato JSON inválido."}, status=400)

    incident = Incident.objects.select_related("area", "dispenser").filter(pk=incident_id).first()
    if incident is None:
        return JsonResponse({"error": "No se encontró la incidencia."}, status=404)

    scope = _build_access_scope(current_user)
    if scope is not None and incident.area_id not in scope["area_ids"]:
        return JsonResponse({"error": "No tienes permiso sobre esta incidencia."}, status=403)

    inspector = None
    inspector_id = data.get("inspector_id")
    if inspector_id:
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
