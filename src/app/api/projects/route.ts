import { NextResponse } from "next/server";
import { internalApiError } from "@/lib/api-errors";
import { createProject, listProjectsWithStats } from "@/lib/projects";
import { createProjectSchema } from "@/lib/validations";

function stripAnonKey<T extends { anonKey?: string }>(project: T) {
  const { anonKey: _anonKey, ...rest } = project;
  return rest;
}

export async function GET() {
  try {
    const projects = await listProjectsWithStats();
    return NextResponse.json(projects.map(stripAnonKey));
  } catch (error) {
    return internalApiError(
      "GET /api/projects",
      "Failed to load projects",
      error,
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const id = await createProject(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return internalApiError(
      "POST /api/projects",
      "Failed to create project",
      error,
    );
  }
}
