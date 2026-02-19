import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const response = await fetch(`${backendBaseUrl}/api/dispensers/${resolvedParams.id}/`, {
    method: "DELETE",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const payload = await response.json().catch(() => ({ error: "No se pudo eliminar el dosificador." }));
  return NextResponse.json(payload, { status: response.status });
}
