import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../lib/backend";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const backendBaseUrl = getBackendBaseUrl();

const readJsonSafely = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

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

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "application/json";
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const body = await request.arrayBuffer();

  const response = await fetch(`${backendBaseUrl}/api/users/`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Current-User-Email": currentUserEmail,
    },
    body,
  });

  const payload = await readJsonSafely(response);

  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error ?? "No se pudo crear el usuario." },
      { status: response.status },
    );
  }

  if (response.status !== 201 || typeof payload?.id !== "number") {
    return NextResponse.json(
      {
        error:
          "No se confirmó la creación del usuario. Intenta nuevamente y verifica en el listado.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json(payload, { status: response.status });
}
