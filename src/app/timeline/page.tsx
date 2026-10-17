"use client";

import Link from "next/link";

import { ChapterHeader, chapters } from "@/components/chapter-header";
import { StatusBadge } from "@/components/status-badge";
import { usePassport } from "@/components/passport-provider";
import { Button } from "@/components/ui/button";
import { documentTypeLabel, formatDate } from "@/lib/format";
import { factDisplay } from "@/lib/summary";
import type { DocumentRecord, Fact } from "@/lib/types";

function ConfirmedTimeline({
  documents,
  factsByDocument,
}: {
  documents: DocumentRecord[];
  factsByDocument: Map<string, Fact[]>;
}) {
  const visible = documents
    .map((document) => ({
      document,
      facts: (factsByDocument.get(document.id) ?? []).filter(
        (fact) =>
          fact.status === "confirmed" &&
          (fact.kind === "measurement" || fact.kind === "medication" || fact.kind === "follow_up"),
      ),
    }))
    .filter((item) => item.facts.length > 0);

  if (visible.length === 0) {
    return (
      <div className="chapter-body rounded-2xl border border-dashed border-border bg-card p-5">
        <h2 className="font-heading text-2xl font-semibold">No confirmed records on the timeline</h2>
        <p className="mt-2 leading-7">
          Confirm a report or prescription on Upload and verify. Proposed lines stay off this list.
        </p>
        <Button asChild className="mt-4 min-h-12 px-4 text-base">
          <Link href="/">Go to upload and verify</Link>
        </Button>
      </div>
    );
  }

  return (
    <ol className="chapter-body grid gap-4 border-l border-foreground/25 pl-5">
      {visible.map(({ document, facts }) => (
        <li key={document.id} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-primary">{formatDate(document.documentDate)}</p>
          <h2 className="font-heading text-2xl font-semibold">{document.facilityName}</h2>
          <p className="text-muted-foreground">{documentTypeLabel(document.documentType)}</p>
          <ul className="mt-3 grid gap-3">
            {facts.map((fact) => (
              <li key={fact.id} className="rounded-lg bg-muted px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{fact.label}</p>
                  <StatusBadge status={fact.status} />
                </div>
                <p className="mt-1">{factDisplay(fact)}</p>
                <p className="text-sm text-muted-foreground">{fact.sourceRef}</p>
                <Button asChild variant="outline" className="mt-3 min-h-12 px-4 text-base">
                  <Link href={`/reports/${document.id}?from=/timeline`}>Open original file</Link>
                </Button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export default function TimelinePage() {
  const { passport, loading } = usePassport();

  if (loading) return <p className="text-lg">Loading the timeline…</p>;
  if (!passport) return <p>The passport did not load. Use retry above.</p>;

  const factsByDocument = new Map<string, typeof passport.facts>();
  for (const fact of passport.facts) {
    const rows = factsByDocument.get(fact.documentId);
    if (rows) rows.push(fact);
    else factsByDocument.set(fact.documentId, [fact]);
  }

  return (
    <div className="grid gap-8">
      <ChapterHeader {...chapters[1]} />
      <p className="chapter-body -mt-4 text-sm leading-6 text-muted-foreground">
        Confirmed reports and prescriptions, oldest first, across visits.
      </p>

      {!passport.loaded ? (
        <div className="chapter-body rounded-2xl border border-dashed border-border bg-card p-5">
          <h2 className="font-heading text-2xl font-semibold">No records on the timeline</h2>
          <p className="mt-2 leading-7">
            Load the fictional set on Upload and verify. The timeline stays empty until those documents are in the session.
          </p>
          <Button asChild className="mt-4 min-h-12 px-4 text-base">
            <Link href="/">Go to upload and verify</Link>
          </Button>
        </div>
      ) : (
        <ConfirmedTimeline
          documents={[...passport.documents].sort((a, b) => a.documentDate.localeCompare(b.documentDate))}
          factsByDocument={factsByDocument}
        />
      )}
    </div>
  );
}
