import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

export async function POST(request: NextRequest) {
  const response = await fetch(`${backendBaseUrl}/api/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
