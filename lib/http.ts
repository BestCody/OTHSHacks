import { NextResponse } from "next/server";

export function jsonError(error: unknown, fallback = "Something went wrong.") {
  const status = typeof error === "object" && error && "status" in error
    ? Number((error as { status?: number }).status ?? 500)
    : 500;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: status >= 500 ? fallback : message }, { status });
}
