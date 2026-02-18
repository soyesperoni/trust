import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

type CreateClientPayload = {
  id?: number;
  name?: string;
  code?: string;
  notes?: string;
  error?: string;
};

export async function GET(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const response = await fetch(`${backendBaseUrl}/api/clients/`, {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
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

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "application/json";
  const currentUserEmail = request.headers.get("x-current-user-email")?.trim().toLowerCase() ?? "";

  if (!currentUserEmail) {
    return NextResponse.json(
      { error: "No se pudo identificar tu sesión. Cierra sesión y vuelve a ingresar." },
      { status: 401 },
    );
  }

  const body = await request.text();
  const response = await fetch(`${backendBaseUrl}/api/clients/`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Current-User-Email": currentUserEmail,
    },
    body,
  });

  let payload: CreateClientPayload;
  try {
    payload = (await response.json()) as CreateClientPayload;
  } catch {
    payload = { error: "Respuesta inválida del servidor al crear el cliente." };
  }

  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status });
  }

  if (response.status !== 201 || typeof payload.id !== "number") {
    return NextResponse.json(
      {
        error:
          "No se confirmó la creación del cliente. Intenta nuevamente y verifica en el listado.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json(payload, { status: response.status });
}
