import { NextResponse } from "next/server";

import { AuthRequiredError } from "@/lib/auth";

const headers = { "Cache-Control": "no-store" };

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers });
}

export function failFrom(error: unknown, fallback: string) {
  if (error instanceof AuthRequiredError) return fail(error.message, 401);
  return fail(error instanceof Error ? error.message : fallback);
}
