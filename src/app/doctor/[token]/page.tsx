"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { SummaryView } from "@/components/summary-view";
import { Button } from "@/components/ui/button";
import type { VisitSummary } from "@/lib/types";

export default function DoctorViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [summary, setSummary] = useState<VisitSummary | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/invitations/${token}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          invitation?: { expiresAt: string; snapshot: VisitSummary };
        };
        if (cancelled) return;
        if (!response.ok || !body.invitation) {
          setError(body.error || "This invitation could not be opened. No record is shown.");
          return;
        }
        setSummary(body.invitation.snapshot);
        setExpiresAt(body.invitation.expiresAt);
      })
      .catch(() => {
        if (!cancelled) setError("This invitation could not be opened. No record is shown.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) return <p className="text-lg">Opening the invitation…</p>;

  if (error || !summary) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5" data-testid="doctor-error">
        <h1 className="font-heading text-3xl font-semibold">Doctor view</h1>
        <p className="mt-3 leading-7">{error}</p>
        <Button asChild className="mt-4 min-h-12 px-4 text-base">
          <Link href="/doctor-pass">Return to DoctorPass</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6" data-testid="doctor-view">
      <header>
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Invited clinician</p>
        <h1 className="mt-1 font-heading text-4xl font-semibold">Approved summary</h1>
        <p className="mt-3 leading-7">
          Sana Ahmed is a fictional demo patient. You are seeing only what she approved.
          {expiresAt
            ? ` This invitation expires ${new Date(expiresAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.`
            : ""}
        </p>
      </header>
      <SummaryView summary={summary} audience="doctor" />
      <p className="font-heading text-2xl leading-snug font-semibold">
        The patient changed hospitals. Their medical memory didn&apos;t disappear.
      </p>
      <p className="text-sm text-muted-foreground">
        Prototype copy. This organizes records. It does not diagnose or recommend treatment.
      </p>
    </div>
  );
}
