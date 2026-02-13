import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const response = await fetch(`${backendBaseUrl}/api/incidents/`, {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudieron cargar las incidencias." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const contentType = request.headers.get("content-type") ?? "";

  const backendHeaders: Record<string, string> = {
    "X-Current-User-Email": currentUserEmail,
  };

  let body: BodyInit;

  if (contentType.includes("multipart/form-data")) {
    body = await request.formData();
  } else {
    backendHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(await request.json().catch(() => ({})));
  }

  const response = await fetch(`${backendBaseUrl}/api/incidents/`, {
    method: "POST",
    headers: backendHeaders,
    body,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error ?? "No se pudo registrar la incidencia." },
      { status: response.status },
    );
  }

  return NextResponse.json(data, { status: response.status });
}
