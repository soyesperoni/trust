import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.text();
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const response = await fetch(`${backendBaseUrl}/api/visits/${id}/mobile-flow/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Current-User-Email": currentUserEmail,
    },
    body,
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
