import { NextResponse } from "next/server";

const headers = { "Cache-Control": "no-store" };

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers });
}
