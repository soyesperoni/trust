import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

export async function GET(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  try {
    const response = await fetch(`${backendBaseUrl}/api/support/tickets/`, {
      cache: "no-store",
      headers: { "X-Current-User-Email": currentUserEmail },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "No se pudieron cargar los tickets de soporte." },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Error de conexión con el servicio de soporte." },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const body = await request.json().catch(() => ({}));

  try {
    const response = await fetch(`${backendBaseUrl}/api/support/tickets/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Current-User-Email": currentUserEmail,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error ?? "No se pudo registrar la petición de soporte." },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Error de comunicación al crear el ticket de soporte." },
      { status: 502 },
    );
  }
}
