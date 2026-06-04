"use client";

import { Activity, Database, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { AddProjectDialog } from "./add-project-dialog";
import { PingChart, type ChartPoint } from "./ping-chart";
import { ProjectCard, type ProjectWithStats } from "./project-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadError(null);
    const [projectsRes, statsRes] = await Promise.all([
      apiFetch("/api/projects"),
      apiFetch(`/api/stats?hours=${hours}`),
    ]);

    const [projectsPayload, statsPayload] = await Promise.all([
      projectsRes.json().catch(() => null),
      statsRes.json().catch(() => null),
    ]);

    const formatFail = (
      res: Response,
      payload: unknown,
      label: string,
    ): string => {
      if (payload && typeof payload === "object") {
        const b = payload as { hint?: string; error?: string };
        return (
          b.hint ??
          b.error ??
          `Could not load ${label} (HTTP ${res.status})`
        );
      }
      return `Could not load ${label} (HTTP ${res.status})`;
    };

    let message: string | null = null;
    if (!projectsRes.ok) {
      message = formatFail(projectsRes, projectsPayload, "projects");
    }
    if (!statsRes.ok) {
      message = message ?? formatFail(statsRes, statsPayload, "stats");
    }
    if (message) setLoadError(message);

    if (projectsRes.ok && Array.isArray(projectsPayload)) {
      setProjects(projectsPayload);
    }
    if (
      statsRes.ok &&
      statsPayload &&
      typeof statsPayload === "object" &&
      statsPayload !== null &&
      "chart" in statsPayload
    ) {
      setChart((statsPayload as { chart: ChartPoint[] }).chart);
    }
  }, [hours]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    setLoading(false);
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await loadData();
      if (!cancelled) setLoading(false);
    }

    init();
    const interval = setInterval(loadData, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadData]);

  const totalPings = projects.reduce((sum, p) => sum + p.stats24h.total, 0);
  const healthyCount = projects.filter((p) => p.latestPing?.success).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Logo size={48} />
            <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              KeepSupabaseAlive
            </h1>
          </div>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Scheduled pings to <code className="text-xs">/auth/v1/token</code>{" "}
            keep free-tier projects from pausing — anon key only, no accounts
            created.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn(refreshing && "animate-spin")} />
            Refresh
          </Button>
          <AddProjectDialog onCreated={refresh} />
        </div>
      </header>

      {loadError && (
        <div
          className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {loadError}
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Projects", value: projects.length, icon: Database },
          { label: "Healthy", value: healthyCount, icon: Activity },
          { label: "Checks (24h)", value: totalPings, icon: RefreshCw },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <stat.icon className="h-4 w-4 text-[var(--supabase)]" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">
                {loading ? "—" : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-10">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Health check activity</CardTitle>
            <CardDescription>
              Successful vs failed pings to the auth token endpoint
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {[24, 72, 168].map((h) => (
              <Button
                key={h}
                type="button"
                size="sm"
                variant={hours === h ? "default" : "secondary"}
                className={cn(
                  hours === h &&
                    "bg-[var(--supabase)] text-zinc-950 hover:bg-[var(--supabase)]/90",
                )}
                onClick={() => setHours(h)}
              >
                {h === 24 ? "24h" : h === 72 ? "3d" : "7d"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <PingChart data={chart} hours={hours} />
        </CardContent>
      </Card>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-heading text-lg font-semibold">Your projects</h2>
          <Separator className="flex-1" />
        </div>
        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Database className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 font-medium">No projects yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your Supabase project URL to start health checks.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onChange={refresh}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
