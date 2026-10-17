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
        <div className="chapter-body bg-card p-6">
          <h2 className="font-heading text-3xl font-medium">Nothing to share yet</h2>
          <p className="mt-2 leading-7">Load and confirm the fictional records before approving a visit summary.</p>
          <Button asChild className={`mt-4 ${tap}`}>
            <Link href="/">Go to upload and verify</Link>
          </Button>
        </div>
      ) : (
        <div className="chapter-body grid gap-6">
          <section className="bg-card p-6" data-ui>
            <h2 className="font-heading text-3xl font-medium">Mark the dose you take</h2>
            <p className="mt-3 max-w-xl leading-7">
              Both lines can stay blank. SehatPass will not pick a metformin dose.
            </p>
            <table className="mt-8 w-full text-left">
              <tbody>
                {medications.map((fact, index) => {
                  const document = passport.documents.find((item) => item.id === fact.documentId);
                  return (
                    <tr key={fact.id} className={index % 2 === 0 ? "bg-background" : "bg-muted"}>
                      <td className="px-4 py-5 align-top">
                        <StatusBadge status={fact.status} />
                        <p className="mt-2 text-lg font-medium">
                          {fact.medicationName} {fact.doseText}, {fact.frequencyText}
                        </p>
                        <p className="text-base text-muted-foreground">
                          {document ? `${document.facilityName} · ${formatDate(document.documentDate)}` : fact.sourceRef}
                        </p>
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="flex flex-wrap gap-2">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <SummaryView summary={passport.summary} audience="patient" />

          <section className="bg-primary p-6 text-primary-foreground">
            <h2 className="font-heading text-3xl font-medium">Approve the summary</h2>
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
              variant="secondary"
              disabled={!accepted || busy || passport.summary.recentLabs.length + passport.facts.filter((fact) => fact.status === "confirmed").length === 0}
              data-testid="approve-doctor-pass"
              onClick={() => void approve()}
            >
              Approve and create invitation
            </Button>
            <p className="mt-3 text-base">The invitation expires after two hours.</p>
          </section>

          {latest ? (
            <section className="bg-muted p-6" data-testid="invitation">
              <h2 className="font-heading text-3xl font-medium">The invitation</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This code does not contain the medical record. It opens only the summary that was approved.
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
