import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const parseAuthorized = (value: string | undefined) => {
  if (value === undefined || value.trim() === "") return true;
  return !["0", "false", "no", "unauthorized", "pending"].includes(value.trim().toLowerCase());
};

export async function GET() {
  const configured =
    process.env.GMAIL_ACCOUNT_AUTHORIZED ??
    process.env.GMAIL_AUTHORIZED ??
    process.env.NEXT_PUBLIC_GMAIL_ACCOUNT_AUTHORIZED;

  return NextResponse.json({
    authorized: parseAuthorized(configured),
    authorize_url: process.env.GMAIL_AUTHORIZE_URL ?? "/api/gmail/authorize/",
    email: process.env.GMAIL_ACCOUNT_EMAIL ?? "",
    source: configured === undefined ? "default" : "environment",
  });
}
