import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const response = await fetch(`${backendBaseUrl}/api/dispensers/`, {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudieron cargar los dosificadores." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "application/json";
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const body = await request.text();

  const response = await fetch(`${backendBaseUrl}/api/dispensers/`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Current-User-Email": currentUserEmail,
    },
    body,
  });

  const payload = await response.json().catch(() => null);

  if (response.ok) {
    if (response.status !== 201 || typeof payload?.id !== "number") {
      return NextResponse.json(
        {
          error:
            "No se confirmó la creación del dosificador. Intenta nuevamente y verifica en el listado.",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(payload, { status: response.status });
}
