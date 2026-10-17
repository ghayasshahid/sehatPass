"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ChapterHeader, chapters } from "@/components/chapter-header";
import { Hba1cChart } from "@/components/hba1c-chart";
import { StatusBadge } from "@/components/status-badge";
import { usePassport } from "@/components/passport-provider";
import { Button } from "@/components/ui/button";
import type { Explanation } from "@/lib/types";

export default function ChangeRadarPage() {
  const { passport, loading } = usePassport();
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  const ready = passport?.change.ready ?? false;

  useEffect(() => {
    if (!ready) {
      setExplanation(null);
      return;
    }
    let cancelled = false;
    fetch("/api/explain", { method: "POST" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          explanation?: Explanation;
        };
        if (!response.ok || !body.explanation) {
          throw new Error(body.error || "The explanation could not be prepared.");
        }
        return body.explanation;
      })
      .then((result) => {
        if (!cancelled) setExplanation(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setExplainError(reason instanceof Error ? reason.message : "The explanation could not be prepared.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (loading) return <p className="text-lg">Loading Change Radar…</p>;
  if (!passport) return <p>The passport did not load. Use retry above.</p>;

  return (
    <div className="grid gap-8">
      <ChapterHeader {...chapters[2]} />

      {!passport.loaded ? (
        <div className="chapter-body rounded-2xl border border-dashed border-border bg-card p-5">
          <h2 className="font-heading text-2xl font-semibold">No readings to compare</h2>
          <p className="mt-2 leading-7">Load the fictional records, then confirm the HbA1c lines.</p>
          <Button asChild className="mt-4 min-h-12 px-4 text-base">
            <Link href="/">Go to upload and verify</Link>
          </Button>
        </div>
      ) : (
        <div className="chapter-body grid gap-8">
          <section className="grid gap-3" data-testid="change-statement">
            {passport.change.ready && passport.change.statement ? (
              <>
                <Hba1cChart points={passport.change.points} />
                <p className="text-lg leading-8">{passport.change.statement}</p>
                {passport.change.delta !== null ? (
                  <p className="text-sm text-muted-foreground">
                    Difference between the earliest and latest confirmed reading: {passport.change.delta} percentage points. That figure is arithmetic, not an interpretation.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h2 className="font-heading text-2xl font-semibold">Waiting for confirmed HbA1c</h2>
                <p className="mt-2 leading-7">{passport.change.reason}</p>
              </div>
            )}
            {passport.change.withheldProposedCount > 0 ? (
              <p className="text-sm">
                {passport.change.withheldProposedCount} HbA1c {passport.change.withheldProposedCount === 1 ? "line is" : "lines are"} still proposed and left off the chart.
              </p>
            ) : null}
            {passport.change.excludedNotes.map((note) => (
              <p key={note} className="text-sm text-muted-foreground">
                {note}
              </p>
            ))}
          </section>

          <section className="grid gap-3">
            <h2 className="font-heading text-2xl font-semibold">Uncertainty</h2>
            {passport.discrepancies.length === 0 ? (
              <p>No dose conflict or open follow-up is recorded.</p>
            ) : (
              passport.discrepancies.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-amber-300 bg-amber-50 p-4"
                  data-testid={item.kind === "conflicting_doses" ? "metformin-conflict" : "follow-up-question"}
                >
                  <StatusBadge status="unresolved" />
                  <h3 className="mt-2 font-heading text-xl font-semibold text-amber-950">{item.title}</h3>
                  <p className="mt-2 leading-7 text-amber-950">{item.detail}</p>
                  <p className="mt-2 font-semibold text-amber-950">{item.question}</p>
                </article>
              ))
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4" data-testid="explanation">
            <p className="text-sm font-semibold text-muted-foreground">Meray blood test mein kya change aya hai?</p>
            <h2 className="urdu-compact mt-1 text-foreground" lang="ur" dir="rtl">
              میرے بلڈ ٹیسٹ میں کیا تبدیلی آئی ہے؟
            </h2>
            {explainError ? <p className="mt-3">{explainError}</p> : null}
            {!explanation && passport.change.ready ? <p className="mt-3">Preparing the explanation…</p> : null}
            {explanation ? (
              <div className="mt-4 grid gap-4">
                <p className="leading-7" data-testid="english-explanation">
                  {explanation.english}
                </p>
                <p className="urdu text-foreground" lang="ur" dir="rtl" data-testid="urdu-explanation">
                  {explanation.urdu}
                </p>
                <p className="text-sm text-muted-foreground">{explanation.disclosure}</p>
              </div>
            ) : null}
            {!passport.change.ready ? (
              <p className="mt-3 leading-7">
                The Urdu explanation stays withheld until at least two HbA1c values are confirmed. Unconfirmed numbers are not described as a change.
              </p>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
