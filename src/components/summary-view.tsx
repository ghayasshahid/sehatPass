import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import type { VisitSummary } from "@/lib/types";

function SourceLink({
  documentId,
  label,
}: {
  documentId: string | null;
  label: string;
}) {
  if (!documentId) return <p className="text-sm text-muted-foreground">{label}</p>;
  return (
    <Link
      href={`/reports/${documentId}?from=/doctor-pass`}
      className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  );
}

export function SummaryView({
  summary,
  audience,
}: {
  summary: VisitSummary;
  audience: "patient" | "doctor";
}) {
  return (
    <div className="grid gap-4">
      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Fictional demo</p>
        <h2 className="font-heading text-2xl font-semibold">{summary.patientName}</h2>
        <p className="text-muted-foreground">
          Not a real patient · {summary.city} · {summary.focus}
        </p>
        {audience === "doctor" && summary.approvedAt ? (
          <p className="mt-2 text-sm">
            Approved by the patient. This page shows that copy only.
          </p>
        ) : (
          <p className="mt-2 text-sm">Preview. Sharing happens only after you approve.</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4" data-testid="current-medications">
        <h2 className="font-heading text-xl font-semibold">Current medications</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{summary.currentMedicationsNote}</p>
        {summary.currentMedications.length ? (
          <ul className="mt-3 grid gap-3">
            {summary.currentMedications.map((item) => (
              <li key={item.id}>
                <StatusBadge status={item.status} />
                <p className="mt-1 font-medium">{item.text}</p>
                <SourceLink documentId={item.documentId} label={item.sourceLabel} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-xl font-semibold">Allergies</h2>
        <p className="mt-1">{summary.allergiesNote}</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-xl font-semibold">Recent labs</h2>
        {summary.recentLabsNote ? <p className="mt-1">{summary.recentLabsNote}</p> : null}
        <ul className="mt-3 grid gap-3">
          {summary.recentLabs.map((item) => (
            <li key={item.id}>
              <StatusBadge status={item.status} />
              <p className="mt-1 font-medium">{item.text}</p>
              <SourceLink documentId={item.documentId} label={item.sourceLabel} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-4" data-testid="recorded-change">
        <h2 className="font-heading text-xl font-semibold">Recorded change</h2>
        <p className="mt-2 leading-7">{summary.recordedChange ?? summary.recordedChangeNote}</p>
      </section>

      <section className="rounded-xl border border-amber-300 bg-amber-50 p-4" data-testid="unresolved-list">
        <h2 className="font-heading text-xl font-semibold text-amber-950">Unresolved discrepancies</h2>
        {summary.unresolved.length === 0 ? (
          <p className="mt-2">None are recorded in this summary.</p>
        ) : (
          <ul className="mt-3 grid gap-4">
            {summary.unresolved.map((item) => (
              <li key={item.id}>
                <StatusBadge status="unresolved" />
                <p className="mt-2 leading-7 text-amber-950">{item.text}</p>
                <SourceLink documentId={item.documentId} label={item.sourceLabel} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-xl font-semibold">Questions for the visit</h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5">
          {summary.questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
        {summary.withheldProposedCount > 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {summary.withheldProposedCount} proposed {summary.withheldProposedCount === 1 ? "fact is" : "facts are"} not in this summary.
          </p>
        ) : null}
      </section>
    </div>
  );
}
