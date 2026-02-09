import { NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const response = await fetch(`${backendBaseUrl}/api/users/${params.id}/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudo cargar el usuario." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.text();
  const response = await fetch(`${backendBaseUrl}/api/users/${params.id}/`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
