import Link from "next/link";

import { StatusBadge } from "@/components/status-badge";
import { documentTypeLabel, formatDate } from "@/lib/format";
import type { VisitSummary } from "@/lib/types";

function fileHref(documentId: string, invitationToken?: string): string {
  if (invitationToken) {
    return `/doctor/${invitationToken}/files/${documentId}`;
  }
  return `/reports/${documentId}?from=/doctor-pass`;
}

function SourceLink({
  documentId,
  label,
  invitationToken,
}: {
  documentId: string | null;
  label: string;
  invitationToken?: string;
}) {
  if (!documentId) return <p className="text-sm text-muted-foreground">{label}</p>;
  return (
    <Link
      href={fileHref(documentId, invitationToken)}
      className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  );
}

export function SummaryView({
  summary,
  audience,
  invitationToken,
}: {
  summary: VisitSummary;
  audience: "patient" | "doctor";
  invitationToken?: string;
}) {
  const documents = summary.approvedDocuments ?? [];
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
                <SourceLink documentId={item.documentId} label={item.sourceLabel} invitationToken={invitationToken} />
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
              <SourceLink documentId={item.documentId} label={item.sourceLabel} invitationToken={invitationToken} />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-4" data-testid="approved-timeline">
        <h2 className="font-heading text-xl font-semibold">Approved reports and prescriptions</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Date order, across visits. Only confirmed lines are here.
        </p>
        {documents.length === 0 ? (
          <p className="mt-3">No confirmed report or prescription is in this summary yet.</p>
        ) : (
          <ol className="mt-3 grid gap-4">
            {documents.map((document) => (
              <li key={document.id} className="rounded-lg bg-muted px-3 py-3">
                <p className="text-sm font-semibold text-primary">{formatDate(document.documentDate)}</p>
                <p className="font-semibold">{document.facilityName}</p>
                <p className="text-sm text-muted-foreground">{documentTypeLabel(document.documentType)}</p>
                <ul className="mt-2 grid gap-1">
                  {document.lines.map((line) => (
                    <li key={line.id}>
                      {line.label}: {line.text}
                    </li>
                  ))}
                </ul>
                <Link
                  href={fileHref(document.id, invitationToken)}
                  className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Open original file
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4" data-testid="recorded-change">
        <h2 className="font-heading text-xl font-semibold">Recorded change</h2>
        <p className="mt-2 leading-7">{summary.recordedChange ?? summary.recordedChangeNote}</p>
      </section>

      <section className="rounded-md border border-border border-l-2 border-l-destructive bg-card p-4" data-testid="unresolved-list">
        <h2 className="text-xl font-semibold">Unresolved discrepancies</h2>
        {summary.unresolved.length === 0 ? (
          <p className="mt-2">None are recorded in this summary.</p>
        ) : (
          <ul className="mt-3 grid gap-4">
            {summary.unresolved.map((item) => (
              <li key={item.id}>
                <StatusBadge status="unresolved" />
                <p className="mt-2 leading-7">{item.text}</p>
                <SourceLink documentId={item.documentId} label={item.sourceLabel} invitationToken={invitationToken} />
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
