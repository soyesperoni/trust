import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.text();
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";

  const response = await fetch(`${backendBaseUrl}/api/incidents/${id}/schedule-visit/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Current-User-Email": currentUserEmail,
    },
    body,
  });

  const payload = await response.json().catch(() => null);
  return NextResponse.json(payload, { status: response.status });
}
