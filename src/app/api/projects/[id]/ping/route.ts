import { NextResponse } from "next/server";
import { internalApiError } from "@/lib/api-errors";
import { pingProject } from "@/lib/ping";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = await pingProject(id);

    if (!result) {
      return NextResponse.json(
        { error: "Project not found or disabled" },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return internalApiError(
      "POST /api/projects/[id]/ping",
      "Ping failed",
      error,
    );
  }
}
