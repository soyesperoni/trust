import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../lib/backend";
import { renderPdfFromHtml } from "../../../../lib/pdf";

const backendBaseUrl = getBackendBaseUrl();

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

async function fetchBackendReport(
  urls: string[],
  headers: HeadersInit,
): Promise<Response | null> {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
      });
      if (response.ok || response.status !== 404) {
        return response;
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const requestHeaders = {
    "X-Current-User-Email": currentUserEmail,
    Accept: "text/html,application/pdf",
  };

  const puppeteerUrls = [
    `${backendBaseUrl}/api/audits/${id}/report-puppeteer`,
    `${backendBaseUrl}/api/audits/${id}/report-puppeteer.pdf`,
  ];

  const fallbackPdfUrls = [
    `${backendBaseUrl}/api/audits/${id}/report`,
    `${backendBaseUrl}/api/audits/${id}/report/`,
    `${backendBaseUrl}/api/audits/${id}/report.pdf`,
  ];

  const puppeteerResponse = await fetchBackendReport(puppeteerUrls, requestHeaders);

  if (puppeteerResponse?.ok) {
    const contentType = puppeteerResponse.headers.get("content-type") ?? "";

    if (contentType.includes("application/pdf")) {
      const bytes = await puppeteerResponse.arrayBuffer();
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=auditoria-${id}-informe.pdf`,
        },
      });
    }

    const html = await puppeteerResponse.text();
    const pdf = await renderPdfFromHtml({ html });

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=auditoria-${id}-informe.pdf`,
      },
    });
  }

  if (puppeteerResponse && !puppeteerResponse.ok && puppeteerResponse.status !== 404) {
    const payload = await puppeteerResponse
      .json()
      .catch(() => ({ error: "No se pudo generar el informe con Puppeteer." }));
    return NextResponse.json(payload, { status: puppeteerResponse.status });
  }

  const fallbackResponse = await fetchBackendReport(fallbackPdfUrls, {
    ...requestHeaders,
    Accept: "application/pdf",
  });

  if (!fallbackResponse) {
    return NextResponse.json(
      { error: "No se pudo generar el informe con el nuevo motor PDF." },
      { status: 500 },
    );
  }

  if (!fallbackResponse.ok) {
    const payload = await fallbackResponse
      .json()
      .catch(() => ({ error: "No se pudo generar el informe con el nuevo motor PDF." }));
    return NextResponse.json(payload, { status: fallbackResponse.status });
  }

  const bytes = await fallbackResponse.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=auditoria-${id}-informe.pdf`,
    },
  });
}
