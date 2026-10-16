"use client";

import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePassport } from "@/components/passport-provider";
import { documentTypeLabel, formatDate, formatMeasurement } from "@/lib/format";
import { factDisplay } from "@/lib/summary";
import type { DocumentRecord, Fact } from "@/lib/types";
import type { FactPatch } from "@/lib/validate";

const tap = "min-h-12 px-4 text-base";

function FactValue({ fact }: { fact: Fact }) {
  if (fact.kind === "measurement" && fact.value !== undefined && fact.unit) {
    return <p className="font-heading text-3xl font-semibold">{formatMeasurement(fact.value, fact.unit)}</p>;
  }
  if (fact.kind === "medication") {
    return (
      <p className="font-heading text-2xl font-semibold">
        {fact.medicationName} {fact.doseText}
        <span className="mt-1 block text-base font-medium text-muted-foreground">{fact.frequencyText}</span>
      </p>
    );
  }
  return <p className="text-lg font-semibold">{factDisplay(fact)}</p>;
}

export function FactList({
  documents,
  facts,
}: {
  documents: DocumentRecord[];
  facts: Fact[];
}) {
  const { busy, confirmFact, correctFact } = usePassport();
  const [editing, setEditing] = useState<Fact | null>(null);
  const [patch, setPatch] = useState<FactPatch>({});

  function openCorrect(fact: Fact) {
    setEditing(fact);
    setPatch({
      value: fact.value,
      unit: fact.unit,
      doseText: fact.doseText,
      frequencyText: fact.frequencyText,
      medicationName: fact.medicationName,
      instructionText: fact.instructionText,
      textValue: fact.textValue,
    });
  }

  async function saveCorrection() {
    if (!editing) return;
    await correctFact(editing.id, patch);
    setEditing(null);
  }

  return (
    <div className="grid gap-5">
      {documents.map((document) => {
        const rows = facts.filter((fact) => fact.documentId === document.id);
        return (
          <article key={document.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">{formatDate(document.documentDate)}</p>
                <h2 className="font-heading text-2xl font-semibold">{document.facilityName}</h2>
                <p className="text-muted-foreground">
                  {documentTypeLabel(document.documentType)}
                  {document.clinician ? ` · ${document.clinician}` : ""}
                </p>
              </div>
              <p className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {document.extractionMethod === "cached_demo" ? "Saved extraction" : "Gemini extraction"}
              </p>
            </div>
            <Button asChild variant="outline" className={`mt-4 ${tap}`}>
              <Link href={`/reports/${document.id}?from=/`} data-testid={`original-${document.id}`}>
                Show original report
              </Link>
            </Button>
            <ul className="mt-4 grid gap-3">
              {rows.map((fact) => (
                <li key={fact.id} className="rounded-xl border border-border p-4" data-testid={`fact-${fact.id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{fact.label}</p>
                    <StatusBadge status={fact.status} />
                  </div>
                  <div className="mt-2">
                    <FactValue fact={fact} />
                  </div>
                  {fact.kind === "medication" ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      A prescription date is not evidence this is still being taken. Confirming records the written line only.
                    </p>
                  ) : null}
                  {fact.kind === "follow_up" ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      An old instruction with no completion record is a question, not a claim that it was missed.
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">Source line. </span>
                    {fact.sourceQuote}
                  </p>
                  <p className="text-sm text-muted-foreground">{fact.sourceRef}</p>
                  {fact.correctedFrom ? (
                    <p className="mt-1 text-sm">Corrected by the patient. Previous text: {fact.correctedFrom}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fact.status !== "confirmed" ? (
                      <Button
                        className={tap}
                        disabled={busy}
                        onClick={() => void confirmFact(fact.id)}
                      >
                        Confirm
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      className={tap}
                      disabled={busy}
                      onClick={() => openCorrect(fact)}
                    >
                      Correct
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        );
      })}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Correct {editing?.label}</DialogTitle>
            <DialogDescription>
              Saving confirms your correction. This still does not choose a current dose or make a diagnosis.
            </DialogDescription>
          </DialogHeader>
          {editing?.kind === "measurement" ? (
            <div className="grid gap-3">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                className="h-12 text-base"
                inputMode="decimal"
                value={patch.value ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  setPatch({ ...patch, value: raw.trim() === "" ? Number.NaN : Number(raw) });
                }}
              />
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                className="h-12 text-base"
                value={patch.unit ?? ""}
                onChange={(event) => setPatch({ ...patch, unit: event.target.value })}
              />
            </div>
          ) : null}
          {editing?.kind === "medication" ? (
            <div className="grid gap-3">
              <Label htmlFor="med">Medicine</Label>
              <Input
                id="med"
                className="h-12 text-base"
                value={patch.medicationName ?? ""}
                onChange={(event) => setPatch({ ...patch, medicationName: event.target.value })}
              />
              <Label htmlFor="dose">Dose</Label>
              <Input
                id="dose"
                className="h-12 text-base"
                value={patch.doseText ?? ""}
                onChange={(event) => setPatch({ ...patch, doseText: event.target.value })}
              />
              <Label htmlFor="frequency">Frequency</Label>
              <Input
                id="frequency"
                className="h-12 text-base"
                value={patch.frequencyText ?? ""}
                onChange={(event) => setPatch({ ...patch, frequencyText: event.target.value })}
              />
            </div>
          ) : null}
          {editing?.kind === "follow_up" ? (
            <div className="grid gap-3">
              <Label htmlFor="instruction">Instruction</Label>
              <Textarea
                id="instruction"
                value={patch.instructionText ?? ""}
                onChange={(event) => setPatch({ ...patch, instructionText: event.target.value })}
              />
            </div>
          ) : null}
          {editing && (editing.kind === "document_date" || editing.kind === "document_type" || editing.kind === "facility") ? (
            <div className="grid gap-3">
              <Label htmlFor="text-value">{editing.label}</Label>
              <Input
                id="text-value"
                className="h-12 text-base"
                type={editing.kind === "document_date" ? "date" : "text"}
                value={patch.textValue ?? ""}
                onChange={(event) => setPatch({ ...patch, textValue: event.target.value })}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button className={tap} disabled={busy} onClick={() => void saveCorrection()}>
              Save correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
