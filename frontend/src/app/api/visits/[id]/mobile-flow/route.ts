import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const contentType = request.headers.get("content-type") ?? "application/json";
  const body = await request.arrayBuffer();

  const response = await fetch(`${backendBaseUrl}/api/visits/${id}/mobile-flow/`, {
    method: "PATCH",
    headers: {
      "Content-Type": contentType,
      "X-Current-User-Email": currentUserEmail,
    },
    body,
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
