import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const response = await fetch(`${backendBaseUrl}/api/areas/${resolvedParams.id}/`, {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudo cargar el área." },
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
  const contentType = request.headers.get("content-type") ?? "application/json";
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const response = await fetch(`${backendBaseUrl}/api/areas/${resolvedParams.id}/`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "X-Current-User-Email": currentUserEmail,
    },
    body,
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const response = await fetch(`${backendBaseUrl}/api/areas/${resolvedParams.id}/`, {
    method: "DELETE",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = { ok: response.ok };
  }

  return NextResponse.json(payload, { status: response.status });
}
