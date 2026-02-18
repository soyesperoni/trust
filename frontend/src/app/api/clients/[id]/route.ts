import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const response = await fetch(
    `${backendBaseUrl}/api/clients/${resolvedParams.id}/`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudo cargar el cliente." },
      { status: response.status },
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const body = await request.text();
  const response = await fetch(
    `${backendBaseUrl}/api/clients/${resolvedParams.id}/`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
