import { NextRequest, NextResponse } from "next/server";

import { getBackendBaseUrl } from "../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const response = await fetch(`${backendBaseUrl}/api/corrective-actions/${id}/`, {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error ?? "No se pudo cargar la acción correctiva." },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const payload = await request.json().catch(() => ({}));

  const response = await fetch(`${backendBaseUrl}/api/corrective-actions/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Current-User-Email": currentUserEmail,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error ?? "No se pudo actualizar la acción correctiva." },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
