"use client";

import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { INTERVAL_OPTIONS } from "@/lib/project-intervals";
import type { ProjectWithStats } from "./project-card";

type Props = {
  project: ProjectWithStats;
  onUpdated: () => void;
};

export function EditProjectDialog({ project, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState(String(project.intervalMinutes));

  useEffect(() => {
    if (open) {
      setInterval(String(project.intervalMinutes));
      setError(null);
    }
  }, [open, project.intervalMinutes]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const anonKey = String(form.get("anonKey") ?? "").trim();

    const body: Record<string, unknown> = {
      name: form.get("name"),
      url: form.get("url"),
      intervalMinutes: Number(interval),
    };
    if (anonKey.length >= 20) {
      body.anonKey = anonKey;
    }

    try {
      const response = await apiFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          hint?: string;
        } | null;
        throw new Error(
          payload?.hint ?? payload?.error ?? `HTTP ${response.status}`,
        );
      }

      setOpen(false);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="secondary" size="sm">
            <Pencil />
            Edit
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update name, URL, or ping interval. Leave the anon key blank to keep
            the current key.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`edit-name-${project.id}`}>Project name</Label>
            <Input
              id={`edit-name-${project.id}`}
              name="name"
              required
              defaultValue={project.name}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`edit-url-${project.id}`}>Project URL or reference ID</Label>
            <Input
              id={`edit-url-${project.id}`}
              name="url"
              required
              defaultValue={project.url}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`edit-anonKey-${project.id}`}>Anon key (optional)</Label>
            <Input
              id={`edit-anonKey-${project.id}`}
              name="anonKey"
              type="password"
              autoComplete="off"
              placeholder="Leave blank to keep current key"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`edit-interval-${project.id}`}>Ping interval</Label>
            <Select
              value={interval}
              onValueChange={(value) => value && setInterval(value)}
            >
              <SelectTrigger id={`edit-interval-${project.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[var(--supabase)] text-zinc-950 hover:bg-[var(--supabase)]/90"
            >
              {loading ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
