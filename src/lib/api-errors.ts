import { NextResponse } from "next/server";
import { getDatabaseFailureHint } from "./db-errors";

export function internalApiError(
  logLabel: string,
  userMessage: string,
  cause: unknown,
  status = 500,
) {
  console.error(logLabel, cause);
  const hint = getDatabaseFailureHint(cause);
  return NextResponse.json(
    { error: userMessage, ...(hint ? { hint } : {}) },
    { status },
  );
}
