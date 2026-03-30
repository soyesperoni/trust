import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

export async function GET() {
  const response = await fetch(`${backendBaseUrl}/api/nozzles/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudieron cargar las boquillas." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
