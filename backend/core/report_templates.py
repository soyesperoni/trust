from __future__ import annotations

from datetime import datetime
from html import escape
from typing import Any
from urllib.parse import quote_plus


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


def build_visit_report_html(visit: dict[str, Any]) -> str:
    report = visit.get("visit_report") if isinstance(visit.get("visit_report"), dict) else {}
    checklist = report.get("checklist") if isinstance(report.get("checklist"), list) else []
    checklist_items = "".join(
        f"<li><strong>{escape(str(item.get('label') or 'Elemento'))}:</strong> {escape(str(item.get('value') or 'Sin respuesta'))}</li>"
        for item in checklist
        if isinstance(item, dict)
    ) or "<li>Sin checklist registrado.</li>"

    comments = escape(str(report.get("comments") or visit.get("notes") or "Sin observaciones."))
    signature_data = str(report.get("responsible_signature") or "").strip()
    signature_html = (
        f"<img src=\"{escape(signature_data)}\" alt=\"Firma del responsable del área\"/>"
        if signature_data.startswith("data:image")
        else "<div class=\"signature-placeholder\">Firma no registrada</div>"
    )
    web_access_url = str(visit.get("public_report_url") or visit.get("web_access_url") or "").strip()
    qr_url = (
        f"https://api.qrserver.com/v1/create-qr-code/?size=220x220&data={quote_plus(web_access_url)}"
        if web_access_url
        else ""
    )
    generated = datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC")

    return f"""<!doctype html>
<html lang=\"es\"><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>
<title>Informe de visita #{visit['id']}</title><style>{_base_styles()}</style></head><body>
<section class=\"page cover\">
  <img class=\"cover-logo\" src=\"https://trust.supplymax.net/trust_logo_s.svg\" alt=\"Logo Trust\"/>
  <div class=\"brand\">Trust · Reportes Corporativos</div>
  <h1 class=\"title\">Informe Ejecutivo de Visita</h1>
  <p class=\"subtitle\">Documento diseñado para renderizarse con Puppeteer y exportarse a PDF con identidad corporativa.</p>
  <div class=\"cover-meta\">
    <div class=\"meta-card\"><span>Cliente</span><strong>{escape(str(visit.get('client') or 'Sin cliente'))}</strong></div>
    <div class=\"meta-card\"><span>Sucursal</span><strong>{escape(str(visit.get('branch') or 'Sin sucursal'))}</strong></div>
    <div class=\"meta-card\"><span>Inspector</span><strong>{escape(str(visit.get('inspector') or 'Sin inspector'))}</strong></div>
    <div class=\"meta-card\"><span>Visita</span><strong>#{visit['id']} · {escape(str(visit.get('status_label') or 'Sin estado'))}</strong></div>
  </div>
</section>
<section class=\"page\">
  <h2>Resumen de visita</h2>
  <div class=\"kpis\">
    <div class=\"kpi\"><span>Fecha programada</span><strong>{_format_datetime(visit.get('visited_at'))}</strong></div>
    <div class=\"kpi\"><span>Inicio</span><strong>{_format_datetime(visit.get('started_at'))}</strong></div>
    <div class=\"kpi\"><span>Finalización</span><strong>{_format_datetime(visit.get('completed_at'))}</strong></div>
    <div class=\"kpi\"><span>Área</span><strong>{escape(str(visit.get('area') or 'Sin área'))}</strong></div>
  </div>
  <div class=\"grid-2\">
    <article class=\"panel\"><h3>Checklist operativo</h3><ul class=\"list\">{checklist_items}</ul></article>
    <article class=\"panel\"><h3>Observaciones y cierre</h3><p>{comments}</p><p class=\"small\">Inspector que realizó la visita: {escape(str(visit.get('inspector') or 'Sin inspector'))}</p><p class=\"small\">Generado: {generated}</p></article>
  </div>
  <div class=\"grid-2\">
    <article class=\"panel\"><h3>Responsable del área</h3><div class=\"signature-box\">{signature_html}<p class=\"small\">Nombre: {escape(str(report.get('responsible_name') or 'No registrado'))}</p></div></article>
    <article class=\"panel\"><h3>Acceso web por QR</h3><div class=\"qr-wrap\">{"<img src=\"" + escape(qr_url) + "\" alt=\"Código QR de acceso web\"/>" if qr_url else "<div class=\"signature-placeholder\">No hay enlace web disponible</div>"}<p class=\"small\">Escanea para abrir el informe web</p>{f"<p class=\"link\">{escape(web_access_url)}</p>" if web_access_url else ""}</div></article>
  </div>
</section>
</body></html>"""


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
