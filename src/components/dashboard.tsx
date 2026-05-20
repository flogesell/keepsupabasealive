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
import { cn } from "@/lib/utils";

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [projectsRes, statsRes] = await Promise.all([
      fetch("/api/projects"),
      fetch(`/api/stats?hours=${hours}`),
    ]);

    if (projectsRes.ok) {
      setProjects(await projectsRes.json());
    }
    if (statsRes.ok) {
      const data = await statsRes.json();
      setChart(data.chart);
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
            Health checks to <code className="text-xs">/auth/v1/health</code>{" "}
            keep free-tier projects from pausing — Auth only, no database
            queries.
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
              Successful vs failed pings to the Auth health endpoint
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
