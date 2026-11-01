import { NextRequest, NextResponse } from "next/server";

import { getBackendBaseUrl } from "../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

const readJsonSafely = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${backendBaseUrl}/api/corrective-actions/${searchParams ? `?${searchParams}` : ""}`;

  const response = await fetch(targetUrl, {
    cache: "no-store",
    headers: { "X-Current-User-Email": currentUserEmail },
  });

  const data = await readJsonSafely(response);

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error ?? "No se pudieron cargar las acciones correctivas." },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  const backendHeaders: Record<string, string> = {
    "X-Current-User-Email": currentUserEmail,
  };

  let body: BodyInit;

  if (contentType.includes("multipart/form-data")) {
    body = await request.formData();
  } else {
    backendHeaders["Content-Type"] = "application/json";
    body = JSON.stringify(await request.json().catch(() => ({})));
  }

  const response = await fetch(`${backendBaseUrl}/api/corrective-actions/`, {
    method: "POST",
    headers: backendHeaders,
    body,
  });

  const data = await readJsonSafely(response);

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error ?? "No se pudo crear la acción correctiva." },
      { status: response.status },
    );
  }

  return NextResponse.json(data, { status: response.status });
}
