"use client";

import Link from "next/link";

import { ChapterHeader, chapters } from "@/components/chapter-header";
import { StatusBadge } from "@/components/status-badge";
import { usePassport } from "@/components/passport-provider";
import { Button } from "@/components/ui/button";
import { documentTypeLabel, formatDate } from "@/lib/format";
import { factDisplay } from "@/lib/summary";

export default function TimelinePage() {
  const { passport, loading } = usePassport();

  if (loading) return <p className="text-lg">Loading the timeline…</p>;
  if (!passport) return <p>The passport did not load. Use retry above.</p>;

  return (
    <div className="grid gap-8">
      <ChapterHeader {...chapters[1]} />
      <p className="chapter-body -mt-4 text-sm leading-6 text-muted-foreground">
        A confirmed line is one you accepted. A proposed line is still waiting.
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
        <ol className="chapter-body grid gap-4 border-l border-foreground/25 pl-5">
          {passport.documents.map((document) => {
            const facts = passport.facts.filter(
              (fact) =>
                fact.documentId === document.id &&
                (fact.kind === "measurement" || fact.kind === "medication" || fact.kind === "follow_up"),
            );
            const confirmed = facts.filter((fact) => fact.status === "confirmed").length;
            return (
              <li key={document.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-primary">{formatDate(document.documentDate)}</p>
                <h2 className="font-heading text-2xl font-semibold">{document.facilityName}</h2>
                <p className="text-muted-foreground">{documentTypeLabel(document.documentType)}</p>
                <p className="mt-2 text-sm font-medium">
                  {confirmed} of {facts.length} lines confirmed
                </p>
                <ul className="mt-3 grid gap-3">
                  {facts.map((fact) => (
                      <li key={fact.id} className="rounded-lg bg-muted px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{fact.label}</p>
                          <StatusBadge status={fact.status} />
                        </div>
                        <p className="mt-1">{fact.status === "confirmed" ? factDisplay(fact) : "Not confirmed yet"}</p>
                        <p className="text-sm text-muted-foreground">{fact.sourceRef}</p>
                      </li>
                    ))}
                </ul>
                <Button asChild variant="outline" className="mt-3 min-h-12 px-4 text-base">
                  <Link href={`/reports/${document.id}?from=/timeline`}>Show original report</Link>
                </Button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
