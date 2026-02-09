import { NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function GET() {
  const response = await fetch(`${backendBaseUrl}/api/clients/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudieron cargar los clientes." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
