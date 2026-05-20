import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { internalApiError } from "@/lib/api-errors";
import { encryptSecret } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/schema";
import { normalizeSupabaseUrl } from "@/lib/supabase";
import { updateProjectSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updates: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.url !== undefined) {
      updates.url = normalizeSupabaseUrl(parsed.data.url);
    }
    if (parsed.data.anonKey !== undefined) {
      updates.anonKey = encryptSecret(parsed.data.anonKey.trim());
    }
    if (parsed.data.intervalMinutes !== undefined) {
      updates.intervalMinutes = parsed.data.intervalMinutes;
    }
    if (parsed.data.enabled !== undefined) {
      updates.enabled = parsed.data.enabled;
    }

    const db = getDb();
    await db.update(projects).set(updates).where(eq(projects.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalApiError(
      "PATCH /api/projects/[id]",
      "Failed to update project",
      error,
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const db = getDb();
    await db.delete(projects).where(eq(projects.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalApiError(
      "DELETE /api/projects/[id]",
      "Failed to delete project",
      error,
    );
  }
}
