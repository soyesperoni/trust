import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const response = await fetch(
    `${backendBaseUrl}/api/users/${resolvedParams.id}/`,
    {
      cache: "no-store",
    },
  );

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const body = await request.text();
  const response = await fetch(
    `${backendBaseUrl}/api/users/${resolvedParams.id}/`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
