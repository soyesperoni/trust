import { NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function GET() {
  const response = await fetch(`${backendBaseUrl}/api/users/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudieron cargar los usuarios." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.text();
  const response = await fetch(`${backendBaseUrl}/api/users/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
