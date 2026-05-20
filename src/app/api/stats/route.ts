import { NextResponse } from "next/server";
import { getChartData } from "@/lib/projects";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hours = Math.min(
    168,
    Math.max(1, Number(searchParams.get("hours") ?? 24)),
  );

  const chart = await getChartData(hours);
  return NextResponse.json({ chart, hours });
}
