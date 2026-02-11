import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const requestHeaders = {
    "X-Current-User-Email": currentUserEmail,
    Accept: "application/pdf",
  };

  // Backward compatibility: older backends expose /report and newer ones /report.pdf.
  const candidateUrls = [
    `${backendBaseUrl}/api/visits/${id}/report.pdf`,
    `${backendBaseUrl}/api/visits/${id}/report`,
  ];

  let response: Response | null = null;
  for (const candidateUrl of candidateUrls) {
    const candidateResponse = await fetch(candidateUrl, {
      method: "GET",
      headers: requestHeaders,
    });
    response = candidateResponse;
    if (candidateResponse.ok || candidateResponse.status !== 404) {
      break;
    }
  }

  if (!response) {
    return NextResponse.json(
      { error: "No se pudo generar el informe." },
      { status: 500 },
    );
  }

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ error: "No se pudo generar el informe." }));
    return NextResponse.json(payload, { status: response.status });
  }

  const bytes = await response.arrayBuffer();
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=visita-${id}-informe.pdf`,
    },
  });
}
