"use client";

import {
    Activity,
    Clock,
    ExternalLink,
    Loader2,
    Pause,
    Play,
    Trash2,
    Zap,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { formatLatency, formatRelativeTime } from "@/lib/supabase";
import { apiFetch } from "@/lib/api-client";

export type ProjectWithStats = {
  id: string;
  name: string;
  url: string;
  intervalMinutes: number;
  enabled: boolean;
  latestPing: {
    success: boolean;
    statusCode: number | null;
    latencyMs: number;
    errorMessage: string | null;
    createdAt: string | Date;
  } | null;
  stats24h: { total: number; success: number };
};

type Props = {
  project: ProjectWithStats;
  onChange: () => void;
};

const statusVariant = {
  healthy: "default",
  error: "destructive",
  pending: "secondary",
  paused: "outline",
} as const;

export function ProjectCard({ project, onChange }: Props) {
  const [pinging, setPinging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pingNow() {
    setPinging(true);
    try {
      await apiFetch(`/api/projects/${project.id}/ping`, { method: "POST" });
      onChange();
    } finally {
      setPinging(false);
    }
  }

  async function toggleEnabled() {
    setBusy(true);
    try {
      await apiFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !project.enabled }),
      });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete "${project.name}"?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/projects/${project.id}`, { method: "DELETE" });
      onChange();
    } finally {
      setBusy(false);
    }
  }

  const latest = project.latestPing;
  const status = !project.enabled
    ? "paused"
    : latest?.success
      ? "healthy"
      : latest
        ? "error"
        : "pending";

  const successRate =
    project.stats24h.total > 0
      ? Math.round((project.stats24h.success / project.stats24h.total) * 100)
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate">{project.name}</CardTitle>
          <CardDescription className="mt-1">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 truncate hover:text-[var(--supabase)]"
            >
              {project.url.replace("https://", "")}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </CardDescription>
        </div>
        <Badge variant={statusVariant[status]}>{status}</Badge>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">Last health check</p>
          <p className="mt-0.5 font-medium">
            {latest
              ? formatRelativeTime(new Date(latest.createdAt))
              : "Never"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">24h success</p>
          <p className="mt-0.5 font-medium">
            {successRate !== null ? `${successRate}%` : "—"}
          </p>
        </div>
        {latest?.errorMessage && !latest.success && (
          <p className="col-span-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {latest.errorMessage}
          </p>
        )}
        {latest && (
          <div className="col-span-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              HTTP {latest.statusCode ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              {formatLatency(latest.latencyMs)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              every{" "}
              {project.intervalMinutes >= 60
                ? `${project.intervalMinutes / 60}h`
                : `${project.intervalMinutes}m`}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <EditProjectDialog project={project} onUpdated={onChange} />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={pingNow}
          disabled={pinging || !project.enabled}
        >
          {pinging ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Zap />
          )}
          Ping now
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={toggleEnabled}
          disabled={busy}
        >
          {project.enabled ? <Pause /> : <Play />}
          {project.enabled ? "Pause" : "Resume"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={remove}
          disabled={busy}
        >
          <Trash2 />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
