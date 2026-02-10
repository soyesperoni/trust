import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

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

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
