import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../lib/backend";

export async function GET(request: NextRequest) {
  const backendBaseUrl = getBackendBaseUrl();
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const response = await fetch(`${backendBaseUrl}/api/dashboard/`, {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
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
