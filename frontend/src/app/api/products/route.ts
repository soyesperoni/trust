import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

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

  if (response.ok) {
    const maybePayload = payload as { id?: unknown };
    if (response.status !== 201 || typeof maybePayload.id !== "number") {
      return NextResponse.json(
        {
          error:
            "No se confirmó la creación del producto. Intenta nuevamente y verifica en el listado.",
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(payload, { status: response.status });
}
