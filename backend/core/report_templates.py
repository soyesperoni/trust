from __future__ import annotations

import base64
from datetime import datetime
from html import escape
from functools import lru_cache
from pathlib import Path
from typing import Any

from reportlab.graphics import renderSVG
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing


@lru_cache(maxsize=1)
def _logo_data_uri() -> str:
    logo_paths = [
        Path(__file__).resolve().parents[2] / "frontend/public/trust_logo_s.png",
        Path(__file__).resolve().parents[2] / "frontend/public/trust_logo_s.svg",
        Path(__file__).resolve().parents[2] / "frontend/public/trust_logo.svg",
    ]
    for path in logo_paths:
        try:
            content = path.read_bytes()
        except OSError:
            continue
        encoded = base64.b64encode(content).decode("ascii")
        mime = "image/png" if path.suffix.lower() == ".png" else "image/svg+xml"
        return f"data:{mime};base64,{encoded}"
    return "https://trust.supplymax.net/trust_logo_s.png"


def _qr_data_uri(url: str) -> str:
    qr_widget = qr.QrCodeWidget(url)
    bounds = qr_widget.getBounds()
    size = 220
    qr_drawing = Drawing(
        size,
        size,
        transform=[
            size / (bounds[2] - bounds[0]),
            0,
            0,
            size / (bounds[3] - bounds[1]),
            0,
            0,
        ],
    )
    qr_drawing.add(qr_widget)
    svg_content = renderSVG.drawToString(qr_drawing).encode("utf-8")
    encoded = base64.b64encode(svg_content).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def _format_datetime(raw: str | None) -> str:
    if not raw:
        return "Sin registro"
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return escape(raw)
    return dt.strftime("%d/%m/%Y %H:%M")


def _base_styles() -> str:
    return """
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: 'Poppins', sans-serif;
        color: #0f172a;
        background: #eef2ff;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 20mm;
        background: #fff;
        page-break-after: always;
      }
      .cover {
        background: linear-gradient(145deg, #0b1a3a, #1d4ed8);
        color: #fff;
        position: relative;
        overflow: hidden;
      }
      .cover::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 55%);
      }
      .brand { font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; opacity: .9; }
      .cover-logo { height: 34px; width: auto; display: block; margin-bottom: 14px; }
      .title { font-size: 44px; line-height: 1.08; margin: 18px 0 8px; font-weight: 800; max-width: 70%; }
      .subtitle { margin: 0; opacity: .88; max-width: 64%; line-height: 1.6; }
      .cover-meta {
        position: absolute;
        left: 20mm;
        right: 20mm;
        bottom: 22mm;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .meta-card { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.24); border-radius: 14px; padding: 10px 12px; }
      .meta-card span { display: block; font-size: 10px; opacity: .82; text-transform: uppercase; letter-spacing: .08em; }
      .meta-card strong { font-size: 15px; font-weight: 600; }
      h2 { font-size: 22px; margin: 0 0 16px; }
      .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
      .kpi { border: 1px solid #dbeafe; border-radius: 12px; padding: 10px; background: #f8fbff; }
      .kpi span { font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: .06em; }
      .kpi strong { display:block; margin-top: 6px; font-size: 18px; }
      .panel { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 14px; }
      .panel h3 { margin: 0 0 10px; font-size: 15px; }
      .list { margin: 0; padding-left: 18px; }
      .list li { margin-bottom: 8px; line-height: 1.5; }
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .small { font-size: 12px; color: #475569; }
      .signature-box { border: 1px dashed #cbd5e1; border-radius: 10px; padding: 10px; background: #f8fafc; }
      .signature-box img { max-width: 100%; max-height: 70px; object-fit: contain; display: block; margin: 0 auto 8px; }
      .signature-placeholder { height: 56px; display: grid; place-items: center; color: #94a3b8; font-size: 12px; }
      .qr-wrap { text-align: center; }
      .qr-wrap img { width: 140px; height: 140px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px; background: #fff; }
      .link { font-size: 11px; color: #2563eb; word-break: break-all; margin-top: 8px; }
    """


def _visit_report_styles() -> str:
    return """
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; font-family: 'Poppins', sans-serif; color: #191c1d; background: #f8f9fa; }
      .canvas { width: 100%; max-width: 1100px; margin: 0 auto; }
      .page { padding: 28px 34px; }
      .headline { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 38px; }
      .eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #64748b; }
      .title { font-size: 46px; line-height: 1; margin: 8px 0 0; color: #2E3192; font-weight: 700; }
      .editorial-gradient { background: linear-gradient(135deg, #2E3192 0%, #92B936 100%); }
      .visit-chip { color: #fff; font-size: 12px; letter-spacing: .12em; font-weight: 700; border-radius: 999px; padding: 5px 14px; display: inline-block; }
      .date-text { margin-top: 8px; font-size: 14px; color: #464652; }
      .section { margin-top: 34px; }
      .section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
      .section-head h2 { margin: 0; font-size: 26px; color: #2E3192; font-weight: 600; }
      .section-head .line { height: 1px; background: rgba(119,118,131,.35); flex: 1; }
      .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 24px; }
      .label { font-size: 11px; font-weight: 600; color: #464652; text-transform: uppercase; letter-spacing: .06em; }
      .value { font-size: 18px; font-weight: 600; color: #2E3192; margin-top: 4px; }
      .status-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #92B936; display: inline-block; }
      .status { font-size: 18px; font-weight: 600; color: #92B936; }
      .visit-times { margin-top: 20px; background: #f3f4f5; border-radius: 12px; padding: 16px 18px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px 18px; }
      .divider-x { border-left: 1px solid rgba(119,118,131,.25); padding-left: 18px; }
      .dispenser-card { border-radius: 16px; background: #fff; border: 1px solid #e7e8e9; margin-bottom: 16px; box-shadow: 0 12px 28px rgba(46,49,146,.06); overflow: hidden; }
      .dispenser-accent { width: 6px; background: #2E3192; }
      .dispenser-inner { display: flex; }
      .dispenser-content { flex: 1; padding: 18px; }
      .dispenser-title { margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #2E3192; }
      .kv { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
      .tag { font-size: 12px; color: #464652; text-transform: uppercase; font-weight: 600; }
      .comment-box { background: #edeeef; border-radius: 10px; padding: 10px 12px; margin-top: 10px; font-size: 13px; }
      .photos { margin-top: 12px; display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; }
      .photo { aspect-ratio: 1 / 1; border-radius: 10px; background: #f3f4f5; border: 1px dashed #c7c5d4; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .obs { background: #f3f4f5; border-left: 4px solid #92B936; border-radius: 14px; padding: 16px; font-style: italic; }
      .verify { border: 1px solid rgba(119,118,131,.25); border-radius: 14px; padding: 14px; text-align: center; }
      .verify img { width: 132px; height: 132px; object-fit: contain; border-radius: 8px; border: 1px solid #e1e3e4; background: #fff; padding: 8px; }
      .signature { margin-top: 40px; text-align: right; }
      .sig-line { height: 2px; opacity: .4; }
      .sig-name { margin-top: 14px; font-size: 14px; color: #464652; }
      .footer { margin-top: 28px; border-top: 1px solid rgba(119,118,131,.25); padding-top: 12px; display: flex; justify-content: space-between; gap: 12px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; color: #64748b; }
      @page { margin: 0; size: A4; }
    """


def build_visit_report_html(visit: dict[str, Any]) -> str:
    report = visit.get("visit_report") if isinstance(visit.get("visit_report"), dict) else {}
    comments = escape(str(report.get("comments") or visit.get("notes") or "Sin observaciones."))
    responsible_name = escape(str(report.get("responsible_name") or "No registrado"))
    inspector_name = escape(str(visit.get("inspector") or "Sin inspector"))
    visit_status = escape(str(visit.get("status_label") or "Sin estado"))

    visited_at = _format_datetime(visit.get("visited_at"))
    started_at = _format_datetime(visit.get("started_at"))
    completed_at = _format_datetime(visit.get("completed_at"))
    generated = datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC")
    logo_uri = _logo_data_uri()
    signature_data = str(report.get("responsible_signature") or "").strip()
    signature_html = (
        f'<img src="{escape(signature_data)}" alt="Firma del responsable del área" style="max-width:220px;max-height:60px;display:block;margin-left:auto;"/>'
        if signature_data.startswith("data:image")
        else ""
    )

    web_access_url = str(visit.get("public_report_url") or visit.get("web_access_url") or "").strip()
    qr_url = _qr_data_uri(web_access_url) if web_access_url else ""

    dispenser_reports = visit.get("dispenser_reports") if isinstance(visit.get("dispenser_reports"), list) else []
    cards: list[str] = []
    for index, raw in enumerate(dispenser_reports, start=1):
        if not isinstance(raw, dict):
            continue
        dispenser_id = escape(str(raw.get("dispenser_id") or index))
        identifier = escape(str(raw.get("identifier") or f"DOS{int(index):03d}"))
        model = escape(str(raw.get("model") or "No especificado"))
        nozzle = escape(str(raw.get("nozzle") or "Sin boquilla"))
        product = escape(str(raw.get("product") or "Producto no especificado"))
        comment = escape(str(raw.get("comment") or "Sin comentario registrado."))
        photos = raw.get("photos") if isinstance(raw.get("photos"), list) else []

        photo_slots = []
        for photo in photos[:4]:
            src = str(photo).strip()
            if src:
                photo_slots.append(f'<div class="photo"><img alt="Evidencia del dosificador {identifier}" src="{escape(src)}"/></div>')
        while len(photo_slots) < 2:
            photo_slots.append('<div class="photo"><span style="font-size:12px;color:#777683">Sin imagen</span></div>')

        accent = "#2E3192" if index % 2 else "#92B936"
        cards.append(
            f'''<article class="dispenser-card"><div class="dispenser-inner"><div class="dispenser-accent" style="background:{accent};"></div><div class="dispenser-content"><h3 class="dispenser-title">{identifier}</h3><div class="kv"><div><div class="tag">Modelo</div><div>{model}</div></div><div><div class="tag">Boquilla</div><div>{nozzle}</div></div><div style="grid-column:1 / -1;"><div class="tag">Producto asociado</div><div>{product}</div></div></div><div class="comment-box"><strong>Comentarios por dosificador:</strong> {comment}</div><div class="photos">{''.join(photo_slots)}</div><div style="display:none">Dispenser ID: {dispenser_id}</div></div></div></article>'''
        )

    if not cards:
        cards.append('<article class="dispenser-card"><div class="dispenser-inner"><div class="dispenser-accent"></div><div class="dispenser-content">No hay dosificadores con detalle registrado para esta visita.</div></div></article>')

    media = visit.get("media") if isinstance(visit.get("media"), list) else []
    media_photos = [item for item in media if isinstance(item, dict) and str(item.get("type") or "").lower() == "photo"]
    general_photo_slots: list[str] = []
    for item in media_photos[:4]:
        file_ref = str(item.get("file") or "").strip()
        if file_ref:
            general_photo_slots.append(f'<div class="photo" style="aspect-ratio:16 / 9;"><img alt="Evidencia general" src="{escape(file_ref)}"/></div>')
    while len(general_photo_slots) < 4:
        general_photo_slots.append('<div class="photo" style="aspect-ratio:16 / 9;"><span style="font-size:12px;color:#777683">Sin evidencia</span></div>')

    qr_html = f'<img alt="Código QR de acceso web" src="{escape(qr_url)}"/>' if qr_url else '<div class="photo" style="width:132px;height:132px;margin:0 auto;">N/A</div>'

    return f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Informe de visita #{visit['id']} | SUPPLYMAX</title><style>{_visit_report_styles()}</style></head><body>
  <main class="canvas page">
    <header class="headline">
      <div>
        <img src="{logo_uri}" alt="Logo Trust" style="height:30px;width:auto;display:block;margin-bottom:10px;"/>
        <div class="eyebrow">SUPPLYMAX Technical Services</div>
        <h1 class="title">Informe de visita técnica</h1>
      </div>
      <div style="text-align:right;">
        <div class="visit-chip editorial-gradient">VISITA #{visit['id']}</div>
        <div class="date-text">{visited_at}</div>
      </div>
    </header>

    <section class="section">
      <div class="section-head"><h2>Datos generales</h2><div class="line"></div></div>
      <div class="grid-3">
        <div><div class="label">Cliente</div><div class="value">{escape(str(visit.get('client') or 'Sin cliente'))}</div></div>
        <div><div class="label">Sucursal</div><div class="value">{escape(str(visit.get('branch') or 'Sin sucursal'))}</div></div>
        <div><div class="label">Área</div><div class="value">{escape(str(visit.get('area') or 'Sin área'))}</div></div>
        <div><div class="label">Inspector</div><div class="value">{inspector_name}</div></div>
        <div><div class="label">Estado de visita</div><div class="status-row"><span class="dot"></span><span class="status">{visit_status}</span></div></div>
        <div><div class="label">Responsable del área</div><div class="value">{responsible_name}</div></div>
      </div>
      <div class="visit-times">
        <div><div class="tag">Fecha de visita</div><div>{visited_at}</div></div>
        <div class="divider-x"><div class="tag">Inicio de visita</div><div>{started_at}</div></div>
        <div class="divider-x"><div class="tag">Finalización</div><div>{completed_at}</div></div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Detalle por dosificador</h2><div class="line"></div></div>
      {''.join(cards)}
    </section>

    <section class="section">
      <div class="section-head"><h2>Evidencia fotográfica general</h2><div class="line"></div></div>
      <div class="photos">{''.join(general_photo_slots)}</div>
    </section>

    <section class="section" style="display:grid;grid-template-columns:2fr 1fr;gap:20px;align-items:start;">
      <div>
        <div class="section-head"><h2>Observaciones generales</h2><div class="line"></div></div>
        <div class="obs">"{comments}"<p style="margin-top:10px;font-style:normal;font-size:12px;color:#475569;">Inspector que realizó la visita: {inspector_name}</p><p style="margin-top:4px;font-style:normal;font-size:12px;color:#475569;">Generado: {generated}</p></div>
      </div>
      <div class="verify">{qr_html}<p class="tag" style="margin-top:10px;">Acceso web verificado</p><p style="font-size:11px;color:#64748b;">Escanee para ver el reporte interactivo</p></div>
    </section>

    <section class="signature">
      <div class="sig-line editorial-gradient"></div>
      <p style="font-size:22px;font-weight:700;color:#2E3192;margin:12px 0 0;">Firma del responsable</p>
      {signature_html}
      <p class="sig-name">{responsible_name}</p>
    </section>

    <footer class="footer">
      <div><strong>Trust by SUPPLYMAX de Panamá</strong><br/>&copy; 2026 SUPPLYMAX Technical Services.</div>
      <div style="text-align:right;">Documento confidencial generado el {generated}.<br/>Cumplimiento técnico bajo normativa ISO-9001:2015.</div>
    </footer>
  </main>
</body></html>'''


def build_audit_report_html(audit: dict[str, Any]) -> str:
    report = audit.get("audit_report") if isinstance(audit.get("audit_report"), dict) else {}
    ai = report.get("ai_analysis") if isinstance(report.get("ai_analysis"), dict) else {}
    answers = report.get("answers") if isinstance(report.get("answers"), list) else []

    answers_html = "".join(
        f"<li><strong>{escape(str(item.get('label') or 'Pregunta'))}</strong><br/><span>{escape(str(item.get('value') or 'Sin respuesta'))}</span></li>"
        for item in answers[:18]
        if isinstance(item, dict)
    ) or "<li>No hay respuestas registradas.</li>"

    recommendations = ai.get("recommendations") if isinstance(ai.get("recommendations"), list) else []
    rec_html = "".join(f"<li>{escape(str(item))}</li>" for item in recommendations[:8]) or "<li>Sin recomendaciones automáticas.</li>"

    score = ai.get("score") if isinstance(ai.get("score"), (int, float)) else report.get("score")
    score_text = f"{int(score)}%" if isinstance(score, (int, float)) else "Sin score"
    generated = datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC")

    return f"""<!doctype html>
<html lang=\"es\"><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>
<title>Informe de auditoría #{audit['id']}</title><style>{_base_styles()}</style></head><body>
<section class=\"page cover\">
  <div class=\"brand\">Trust · Auditoría Estratégica</div>
  <h1 class=\"title\">Informe Ejecutivo de Auditoría</h1>
  <p class=\"subtitle\">Plantilla HTML corporativa para exportación PDF con Puppeteer, incluyendo portada y bloques ejecutivos.</p>
  <div class=\"cover-meta\">
    <div class=\"meta-card\"><span>Cliente</span><strong>{escape(str(audit.get('client') or 'Sin cliente'))}</strong></div>
    <div class=\"meta-card\"><span>Sucursal</span><strong>{escape(str(audit.get('branch') or 'Sin sucursal'))}</strong></div>
    <div class=\"meta-card\"><span>Área</span><strong>{escape(str(audit.get('area') or 'Sin área'))}</strong></div>
    <div class=\"meta-card\"><span>Puntaje global</span><strong>{score_text}</strong></div>
  </div>
</section>
<section class=\"page\">
  <h2>Hallazgos y trazabilidad</h2>
  <div class=\"kpis\">
    <div class=\"kpi\"><span>Auditoría</span><strong>#{audit['id']}</strong></div>
    <div class=\"kpi\"><span>Programada</span><strong>{_format_datetime(audit.get('audited_at'))}</strong></div>
    <div class=\"kpi\"><span>Inicio</span><strong>{_format_datetime(audit.get('started_at'))}</strong></div>
    <div class=\"kpi\"><span>Cierre</span><strong>{_format_datetime(audit.get('completed_at'))}</strong></div>
  </div>
  <div class=\"grid-2\">
    <article class=\"panel\"><h3>Respuestas registradas</h3><ul class=\"list\">{answers_html}</ul></article>
    <article class=\"panel\"><h3>Resumen y recomendaciones</h3><p>{escape(str(ai.get('executive_summary') or 'Sin resumen ejecutivo.'))}</p><ul class=\"list\">{rec_html}</ul><p class=\"small\">Generado: {generated}</p></article>
  </div>
</section>
</body></html>"""
