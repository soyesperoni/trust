import { NextRequest, NextResponse } from "next/server";

import { getBackendBaseUrl } from "../../../../lib/backend";

const backendBaseUrl = getBackendBaseUrl();

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const currentUserEmail = request.headers.get("x-current-user-email") ?? "";
  const incomingForm = await request.formData();
  const outgoingForm = new FormData();

  const evidence = incomingForm.get("closure_evidence");
  if (evidence instanceof Blob) {
    const filename = evidence instanceof File ? evidence.name : "closure-evidence.jpg";
    outgoingForm.append("closure_evidence", evidence, filename);
  }

  const statusValue = incomingForm.get("status");
  if (typeof statusValue === "string" && statusValue) {
    outgoingForm.append("status", statusValue);
  }

  const response = await fetch(
    `${backendBaseUrl}/api/corrective-actions/${id}/closure-evidence/`,
    {
      method: "POST",
      headers: { "X-Current-User-Email": currentUserEmail },
      body: outgoingForm,
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: data?.error ?? "No se pudo guardar la evidencia de cierre." },
      { status: response.status },
    );
  }

  return NextResponse.json(data, { status: response.status });
}
