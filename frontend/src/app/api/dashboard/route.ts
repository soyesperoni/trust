import { NextResponse } from "next/server";

export async function GET() {
  const backendBaseUrl =
    process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";
  const response = await fetch(`${backendBaseUrl}/api/dashboard/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudo cargar el dashboard." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
