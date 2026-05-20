import { NextResponse } from "next/server";
import { isCronAllowed } from "@/lib/env";
import { runDuePings } from "@/lib/ping";

export async function POST(request: Request) {
  if (!isCronAllowed()) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET is required in production. Set it in your environment variables.",
      },
      { status: 503 },
    );
  }

  const secret = process.env.CRON_SECRET!.trim();
  const auth = request.headers.get("authorization");

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await runDuePings();
  return NextResponse.json({ ok: true, pinged: count });
}
