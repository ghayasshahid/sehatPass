"use client";

import Link from "next/link";
import { useState } from "react";

import { ChapterHeader, chapters } from "@/components/chapter-header";
import { usePassport } from "@/components/passport-provider";
import { StatusBadge } from "@/components/status-badge";
import { SummaryView } from "@/components/summary-view";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

const tap = "min-h-12 px-4 text-base";

export default function DoctorPassPage() {
  const { passport, loading, busy, markCurrent, approve } = usePassport();
  const [accepted, setAccepted] = useState(false);

  if (loading) return <p className="text-lg">Loading DoctorPass…</p>;
  if (!passport) return <p>The passport did not load. Use retry above.</p>;

  const medications = passport.facts.filter((fact) => fact.kind === "medication");
  const latest = passport.invitations[0];

  return (
    <div className="grid gap-8">
      <ChapterHeader {...chapters[3]} />

      {!passport.loaded ? (
        <div className="chapter-body rounded-2xl border border-dashed border-border bg-card p-5">
          <h2 className="font-heading text-2xl font-semibold">Nothing to share yet</h2>
          <p className="mt-2 leading-7">Load and confirm the fictional records before approving a visit summary.</p>
          <Button asChild className={`mt-4 ${tap}`}>
            <Link href="/">Go to upload and verify</Link>
          </Button>
        </div>
      ) : (
        <div className="chapter-body grid gap-6">
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-heading text-2xl font-semibold">Mark current treatment yourself</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Both prescriptions can stay unmarked. SehatPass will not pick a metformin dose.
            </p>
            <ul className="mt-3 grid gap-3">
              {medications.map((fact) => {
                const document = passport.documents.find((item) => item.id === fact.documentId);
                return (
                  <li key={fact.id} className="rounded-xl border border-border p-3">
                    <StatusBadge status={fact.status} />
                    <p className="mt-2 font-semibold">
                      {fact.medicationName} {fact.doseText}, {fact.frequencyText}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {document ? `${document.facilityName} · ${formatDate(document.documentDate)}` : fact.sourceRef}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        className={tap}
                        variant={fact.patientMarkedCurrent ? "default" : "outline"}
                        disabled={busy}
                        onClick={() => void markCurrent(fact.id, true)}
                      >
                        I take this now
                      </Button>
                      <Button
                        className={tap}
                        variant={fact.patientMarkedCurrent === false ? "default" : "outline"}
                        disabled={busy}
                        onClick={() => void markCurrent(fact.id, false)}
                      >
                        Not current
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <SummaryView summary={passport.summary} audience="patient" />

          <section className="rounded-2xl border border-primary/30 bg-card p-4">
            <h2 className="font-heading text-2xl font-semibold">Approve the summary</h2>
            <label className="mt-3 flex items-start gap-3 text-base leading-7">
              <input
                type="checkbox"
                className="mt-1 size-5"
                checked={accepted}
                data-testid="approve-checkbox"
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                I approve sharing this summary. The QR code will contain only a short-lived invitation, not the record.
              </span>
            </label>
            <Button
              className={`mt-4 w-full ${tap}`}
              disabled={!accepted || busy || passport.summary.recentLabs.length + passport.facts.filter((fact) => fact.status === "confirmed").length === 0}
              data-testid="approve-doctor-pass"
              onClick={() => void approve()}
            >
              Approve and create invitation
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">The invitation expires after two hours.</p>
          </section>

          {latest ? (
            <section className="rounded-2xl border border-border bg-card p-4 text-center" data-testid="invitation">
              <h2 className="font-heading text-2xl font-semibold">Invitation</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Scan it from a phone on this Wi-Fi. The code does not contain the medical record. It opens only the summary that was approved.
                {latest.expired ? " This invitation has expired." : ` It expires ${new Date(latest.expiresAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.`}
              </p>
              {/* Data-URL QR generated for this invitation. It encodes only the doctor link. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={latest.qrDataUrl}
                alt="QR invitation. It does not contain the medical record."
                className="mx-auto mt-4 w-56 rounded-lg border border-border bg-white p-2"
                data-testid="qr-invitation"
              />
              <p className="mt-3 text-sm break-all">{latest.url}</p>
              <Button asChild className={`mt-4 w-full ${tap}`}>
                <Link href={`/doctor/${latest.token}`} data-testid="open-doctor-view">
                  Open doctor view
                </Link>
              </Button>
              <p className="mt-3 text-sm text-muted-foreground">
                Later corrections are not added to this invitation.
              </p>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
