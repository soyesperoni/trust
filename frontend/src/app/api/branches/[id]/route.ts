import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const response = await fetch(
    `${backendBaseUrl}/api/branches/${resolvedParams.id}/`,
    {
      cache: "no-store",
      headers: { "X-Current-User-Email": currentUserEmail },
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "No se pudo cargar la sucursal." },
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
  const response = await fetch(
    `${backendBaseUrl}/api/branches/${resolvedParams.id}/`,
    {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "X-Current-User-Email": currentUserEmail,
      },
      body,
    },
  );

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
