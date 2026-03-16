import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

export async function GET(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const response = await fetch(`${backendBaseUrl}/api/audits/forms/`, {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = { error: "No se pudieron cargar las plantillas de auditoría." };
  }

  return NextResponse.json(payload, { status: response.status });
}

export async function POST(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const contentType = request.headers.get("content-type") ?? "application/json";
  const body = await request.text();

  const response = await fetch(`${backendBaseUrl}/api/audits/forms/`, {
    method: "POST",
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
    payload = { error: "No se pudo crear la plantilla de auditoría." };
  }

  return NextResponse.json(payload, { status: response.status });
}
