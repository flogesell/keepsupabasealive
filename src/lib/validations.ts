import { z } from "zod";
import { extractProjectRef, InvalidSupabaseUrlError } from "./supabase";

const supabaseUrlSchema = z.string().min(1).superRefine((value, ctx) => {
  try {
    extractProjectRef(value);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message:
        error instanceof InvalidSupabaseUrlError
          ? error.message
          : "Invalid Supabase project URL",
    });
  }
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  url: supabaseUrlSchema,
  anonKey: z.string().min(20, "Anon key is required (Supabase → Settings → API)"),
  intervalMinutes: z.number().int().min(15).max(10080).default(360),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: supabaseUrlSchema.optional(),
  anonKey: z.string().min(20).optional(),
  intervalMinutes: z.number().int().min(15).max(10080).optional(),
  enabled: z.boolean().optional(),
});
