"use client";

import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "now";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function RateLimitedView({ retryAfter }: { retryAfter: number }) {
  const [remaining, setRemaining] = useState(retryAfter);

  useEffect(() => {
    setRemaining(retryAfter);
    if (retryAfter <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [retryAfter]);

  const locked = remaining > 0;

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/90 shadow-xl">
      <CardHeader className="items-center text-center">
        <Logo size={48} className="mb-2 justify-center" />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <CardTitle className="font-heading text-xl">Too many failed attempts</CardTitle>
        <CardDescription>
          Login is temporarily locked to protect your dashboard. Wait a few minutes,
          then try again with the correct credentials.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {locked ? (
          <p className="text-sm text-muted-foreground">
            Try again in{" "}
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {formatCountdown(remaining)}
            </span>
          </p>
        ) : (
          <p className="text-sm text-[var(--supabase)]">
            You can sign in again now.
          </p>
        )}
        <Button
          type="button"
          className="w-full bg-[var(--supabase)] text-zinc-950 hover:bg-[var(--supabase)]/90"
          disabled={locked}
          onClick={() => window.location.assign("/")}
        >
          {locked ? "Please wait…" : "Back to dashboard"}
        </Button>
        <p className="text-xs text-muted-foreground">
          If this keeps happening, check your username and password in Coolify
          (`DASHBOARD_USER` / `DASHBOARD_PASSWORD`).
        </p>
      </CardContent>
    </Card>
  );
}
