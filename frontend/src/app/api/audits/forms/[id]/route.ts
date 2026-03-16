import { NextRequest, NextResponse } from "next/server";

import { getBackendBaseUrl } from "../../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const contentType = request.headers.get("content-type") ?? "application/json";
  const body = await request.text();

  const response = await fetch(`${backendBaseUrl}/api/audits/forms/${resolvedParams.id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": contentType,
      "X-Current-User-Email": currentUserEmail,
    },
    body,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = { error: "No se pudo actualizar la plantilla de auditoría." };
  }

  return NextResponse.json(payload, { status: response.status });
}
