import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const response = await fetch(`${backendBaseUrl}/api/products/`, {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudieron cargar los productos." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "application/json";
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const response = await fetch(`${backendBaseUrl}/api/products/`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Current-User-Email": currentUserEmail,
    },
    body: await request.text(),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = { error: "Respuesta inválida del servidor al crear el producto." };
  }

  return NextResponse.json(payload, { status: response.status });
}
