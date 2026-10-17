"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ChapterHeader } from "@/components/chapter-header";
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
      <div className="grid gap-6" data-testid="doctor-error">
        <ChapterHeader
          title="Doctor view"
          meaning="This invitation could not be opened, so no medical record is shown."
        />
        <p className="chapter-body leading-7">{error}</p>
        <Button asChild className="mt-4 min-h-12 px-4 text-base">
          <Link href="/doctor-pass">Return to DoctorPass</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8" data-testid="doctor-view">
      <ChapterHeader
        title="Approved summary"
        meaning={
          summary.patientName === "Sana Ahmed"
            ? "Sana Ahmed is a fictional demo patient. You are seeing only the reports, prescriptions, and changes she approved for this invitation. Later edits are not added here."
            : `You are seeing only the reports, prescriptions, and changes ${summary.patientName} approved for this invitation. Later edits are not added here.`
        }
      />
      {expiresAt ? (
        <p className="chapter-body -mt-4 text-sm leading-6 text-muted-foreground">
          This invitation expires {new Date(expiresAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.
        </p>
      ) : null}
      <SummaryView summary={summary} audience="doctor" invitationToken={token} />
      <p className="font-heading text-2xl leading-snug font-semibold">
        The patient changed hospitals. Their medical memory didn&apos;t disappear.
      </p>
      <p className="text-sm text-muted-foreground">
        Prototype copy. This organizes records. It does not diagnose or recommend treatment.
      </p>
    </div>
  );
}
