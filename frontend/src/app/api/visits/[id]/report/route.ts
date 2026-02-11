import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const response = await fetch(`${backendBaseUrl}/api/visits/${id}/report.pdf`, {
    method: "GET",
    headers: {
      "X-Current-User-Email": currentUserEmail,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "No se pudo generar el informe." }));
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
