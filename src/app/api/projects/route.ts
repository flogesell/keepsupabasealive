import { NextResponse } from "next/server";
import { createProject, listProjectsWithStats } from "@/lib/projects";
import { createProjectSchema } from "@/lib/validations";

function stripAnonKey<T extends { anonKey?: string }>(project: T) {
  const { anonKey: _anonKey, ...rest } = project;
  return rest;
}

export async function GET() {
  const projects = await listProjectsWithStats();
  return NextResponse.json(projects.map(stripAnonKey));
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
    console.error("POST /api/projects", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
