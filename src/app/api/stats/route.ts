import { NextResponse } from "next/server";
import { internalApiError } from "@/lib/api-errors";
import { getChartData } from "@/lib/projects";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hours = Math.min(
    168,
    Math.max(1, Number(searchParams.get("hours") ?? 24)),
  );

  try {
    const chart = await getChartData(hours);
    return NextResponse.json({ chart, hours });
  } catch (error) {
    return internalApiError("GET /api/stats", "Failed to load stats", error);
  }
}
