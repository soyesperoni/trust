import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const response = await fetch(`${backendBaseUrl}/api/incidents/${id}/`, {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error ?? "No se pudo cargar la incidencia." },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}
