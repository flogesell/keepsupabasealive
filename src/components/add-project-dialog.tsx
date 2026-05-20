"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
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

type Props = {
  onCreated: () => void;
};

const INTERVAL_OPTIONS = [
  { value: "60", label: "Every hour" },
  { value: "180", label: "Every 3 hours" },
  { value: "360", label: "Every 6 hours (recommended)" },
  { value: "720", label: "Every 12 hours" },
  { value: "1440", label: "Daily" },
];

export function AddProjectDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState("360");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);

    try {
      const response = await apiFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          url: form.get("url"),
          anonKey: form.get("anonKey"),
          intervalMinutes: Number(interval),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          hint?: string;
        } | null;
        const detail =
          body?.hint ?? body?.error ?? `HTTP ${response.status}`;
        throw new Error(detail);
      }

      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-[var(--supabase)] text-zinc-950 hover:bg-[var(--supabase)]/90" />}>
        <Plus data-icon="inline-start" />
        Add project
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Supabase project</DialogTitle>
          <DialogDescription>
            Uses your public <strong>anon</strong> key with{" "}
            <code className="text-xs">/auth/v1/health</code> only (required by
            Supabase&apos;s gateway — never touches your database).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" name="name" required placeholder="My side project" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="url">Project URL or reference ID</Label>
            <Input
              id="url"
              name="url"
              required
              placeholder="https://abcdefgh.supabase.co or abcdefgh"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="anonKey">Anon key (public)</Label>
            <Input
              id="anonKey"
              name="anonKey"
              type="password"
              required
              autoComplete="off"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
            <p className="text-xs text-muted-foreground">
              Supabase → Project Settings → API → anon public. Do not use
              service_role.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="interval">Ping interval</Label>
            <Select
              value={interval}
              onValueChange={(value) => value && setInterval(value)}
            >
              <SelectTrigger id="interval">
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
              {loading ? "Adding…" : "Add project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
