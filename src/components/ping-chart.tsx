"use client";

import { BarChart3 } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { formatLatency } from "@/lib/supabase";

export type ChartPoint = {
  time: string;
  success: number;
  failed: number;
  avgLatency: number;
};

const chartConfig = {
  success: {
    label: "Successful",
    color: "var(--chart-1)",
  },
  failed: {
    label: "Failed",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function toBucketKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:00`;
}

/** Fill missing hours so the chart has a continuous timeline. */
export function fillChartGaps(data: ChartPoint[], hours: number): ChartPoint[] {
  const map = new Map(data.map((row) => [row.time, row]));
  const end = new Date();
  end.setMinutes(0, 0, 0);

  const buckets: ChartPoint[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const bucketDate = new Date(end);
    bucketDate.setHours(bucketDate.getHours() - i);
    const key = toBucketKey(bucketDate);
    buckets.push(
      map.get(key) ?? {
        time: key,
        success: 0,
        failed: 0,
        avgLatency: 0,
      },
    );
  }
  return buckets;
}

function parseBucketDate(value: string): Date {
  return new Date(value.replace(" ", "T") + ":00");
}

function ChartSummary({ data }: { data: ChartPoint[] }) {
  const totalSuccess = data.reduce((s, r) => s + r.success, 0);
  const totalFailed = data.reduce((s, r) => s + r.failed, 0);
  const total = totalSuccess + totalFailed;
  // Weighted average: weight each bucket's avg by its success count to avoid
  // treating a bucket with 1 ping the same as one with 20.
  const avgLatency =
    totalSuccess > 0
      ? Math.round(
          data.reduce((s, r) => s + r.avgLatency * r.success, 0) / totalSuccess,
        )
      : 0;

  return (
    <div className="mb-4 grid grid-cols-3 gap-3 sm:gap-4">
      {[
        { label: "Total checks", value: total.toLocaleString() },
        {
          label: "Success rate",
          value: total > 0
            ? (totalSuccess / total).toLocaleString(undefined, { style: "percent", maximumFractionDigits: 0 })
            : "—",
        },
        {
          label: "Avg latency",
          value: avgLatency > 0 ? formatLatency(avgLatency) : "—",
        },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5"
        >
          <p className="text-xs text-muted-foreground">{stat.label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PingChart({
  data,
  hours = 24,
}: {
  data: ChartPoint[];
  hours?: number;
}) {
  const filled = useMemo(() => fillChartGaps(data, hours), [data, hours]);
  const hasActivity = filled.some((r) => r.success > 0 || r.failed > 0);

  // One Intl.DateTimeFormat per hours-range — avoids recreating it for every tick label.
  const bucketFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, hours <= 24
        ? { hour: "2-digit", minute: "2-digit" }
        : { month: "short", day: "numeric", hour: "2-digit" }),
    [hours],
  );

  const formatTick = useCallback(
    (value: string) => bucketFormatter.format(parseBucketDate(value)),
    [bucketFormatter],
  );

  const summaryData = useMemo(
    () => filled.filter((r) => r.success > 0 || r.failed > 0),
    [filled],
  );

  if (!hasActivity) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No activity yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Health checks will appear here once your first ping runs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <ChartSummary data={summaryData} />
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[300px] w-full"
      >
        <BarChart
          data={filled}
          margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
          barGap={2}
          barCategoryGap="18%"
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="4 4"
            className="stroke-border/50"
          />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={hours <= 24 ? 24 : 40}
            tickFormatter={formatTick}
            className="text-[11px] fill-muted-foreground"
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={36}
            className="text-[11px] fill-muted-foreground"
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.35 }}
            content={
              <ChartTooltipContent
                labelFormatter={(label) =>
                  typeof label === "string" ? formatTick(label) : label
                }
                formatter={(value, name, item) => {
                  const row = item.payload as ChartPoint;
                  const lines = [
                    `${Number(value ?? 0)} ${name === "success" ? "successful" : "failed"}`,
                  ];
                  if (row.avgLatency > 0 && name === "success") {
                    lines.push(`Avg ${formatLatency(row.avgLatency)}`);
                  }
                  return lines.join(" · ");
                }}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="success"
            fill="var(--color-success)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="failed"
            fill="var(--color-failed)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
