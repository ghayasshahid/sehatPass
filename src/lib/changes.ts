import { formatDate, formatHbA1c, round1 } from "@/lib/format";
import type { ChangePoint, ChangeResult, DocumentRecord, Fact } from "@/lib/types";

function documentDate(documents: DocumentRecord[], documentId: string): string {
  return documents.find((document) => document.id === documentId)?.documentDate ?? "";
}

function facilityName(documents: DocumentRecord[], documentId: string): string {
  return (
    documents.find((document) => document.id === documentId)?.facilityName ??
    "Unknown facility"
  );
}

export function compareHbA1c(
  facts: Fact[],
  documents: DocumentRecord[],
): ChangeResult {
  const hba1c = facts.filter((fact) => fact.analyte === "hba1c");
  const withheldProposedCount = hba1c.filter(
    (fact) => fact.status === "proposed",
  ).length;
  const excludedNotes: string[] = [];

  const confirmed = hba1c.filter((fact) => fact.status === "confirmed");
  const compatible = confirmed.filter((fact) => {
    if (fact.unit === "%" && fact.value !== undefined && Number.isFinite(fact.value)) {
      return true;
    }
    excludedNotes.push(
      `${fact.label} from ${facilityName(documents, fact.documentId)} was not compared because the unit is not %.`,
    );
    return false;
  });

  const sorted = [...compatible].sort((a, b) => {
    const byDate = documentDate(documents, a.documentId).localeCompare(
      documentDate(documents, b.documentId),
    );
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });

  const points: ChangePoint[] = [];
  const seenDates = new Map<string, number>();
  for (const fact of sorted) {
    const date = documentDate(documents, fact.documentId);
    const value = round1(fact.value as number);
    const previous = seenDates.get(date);
    if (previous === undefined) {
      seenDates.set(date, value);
      points.push({
        factId: fact.id,
        documentId: fact.documentId,
        date,
        value,
        unit: "%",
        facilityName: facilityName(documents, fact.documentId),
        sourceRef: fact.sourceRef,
        status: "confirmed",
      });
      continue;
    }
    if (previous === value) {
      excludedNotes.push(
        `A duplicate HbA1c of ${formatHbA1c(value)}% on ${formatDate(date)} was not plotted twice.`,
      );
      continue;
    }
    excludedNotes.push(
      `Two different confirmed HbA1c values on ${formatDate(date)} were not averaged or plotted.`,
    );
    const index = points.findIndex((point) => point.date === date);
    if (index >= 0) points.splice(index, 1);
    seenDates.set(date, Number.NaN);
  }

  const plotted = points.filter((point) => Number.isFinite(seenDates.get(point.date)));

  if (plotted.length < 2) {
    return {
      analyte: "hba1c",
      unit: "%",
      ready: false,
      reason:
        plotted.length === 1
          ? "One confirmed HbA1c is not enough to describe a change. Confirm another HbA1c in %."
          : "Confirm at least two HbA1c readings in % to see a recorded change.",
      points: plotted,
      withheldProposedCount,
      excludedNotes,
      statement: null,
      delta: null,
    };
  }

  const first = plotted[0];
  const last = plotted[plotted.length - 1];
  const delta = round1(last.value - first.value);
  const direction =
    delta > 0 ? "increased" : delta < 0 ? "decreased" : "stayed the same";
  const statement =
    direction === "stayed the same"
      ? `The recorded HbA1c stayed the same at ${formatHbA1c(first.value)}% from ${formatDate(first.date)} to ${formatDate(last.date)} across these reports. You may want to discuss this with your doctor.`
      : `The recorded HbA1c ${direction} from ${formatHbA1c(first.value)}% (${formatDate(first.date)}) to ${formatHbA1c(last.value)}% (${formatDate(last.date)}) across these reports. You may want to discuss this change with your doctor.`;

  return {
    analyte: "hba1c",
    unit: "%",
    ready: true,
    reason: null,
    points: plotted,
    withheldProposedCount,
    excludedNotes,
    statement,
    delta,
  };
}
