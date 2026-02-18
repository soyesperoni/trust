import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");
  const endpoint = new URL(`${backendBaseUrl}/api/visits/`);
  if (month) {
    endpoint.searchParams.set("month", month);
  }

  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const response = await fetch(endpoint.toString(), {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudieron cargar las visitas." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const response = await fetch(`${backendBaseUrl}/api/visits/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Current-User-Email": currentUserEmail },
    body,
  });

  const payload = await response.json().catch(() => null);

  if (response.ok) {
    if (response.status !== 201 || typeof payload?.id !== "number") {
      return NextResponse.json(
        {
          error:
            "No se confirmó la creación de la visita. Intenta nuevamente y verifica en el calendario.",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(payload, { status: response.status });
}
