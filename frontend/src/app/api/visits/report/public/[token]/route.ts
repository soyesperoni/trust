import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

type Params = {
  params: Promise<{ token: string }>;
};

export async function GET(_: Request, { params }: Params) {
  const { token } = await params;

  const response = await fetch(`${backendBaseUrl}/api/visits/report/public/${token}/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(() => ({ error: "No se pudo cargar el informe público." }));
    return NextResponse.json(payload, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
