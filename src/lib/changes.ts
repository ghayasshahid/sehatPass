import { formatDate, formatHbA1c, formatMeasurement, round1 } from "@/lib/format";
import type { ChangePoint, ChangeResult, DocumentRecord, Fact, MatchingTest } from "@/lib/types";

const NEXT_VISIT = "Take this change to the next visit.";

function documentsById(documents: DocumentRecord[]) {
  return new Map(documents.map((document) => [document.id, document]));
}

export function compareHbA1c(
  facts: Fact[],
  documents: DocumentRecord[],
): ChangeResult {
  const byDocument = documentsById(documents);
  const documentDate = (documentId: string) => byDocument.get(documentId)?.documentDate ?? "";
  const facilityName = (documentId: string) =>
    byDocument.get(documentId)?.facilityName ?? "Unknown facility";
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
      `${fact.label} from ${facilityName(fact.documentId)} was not compared because the unit is not %.`,
    );
    return false;
  });

  const sorted = [...compatible].sort((a, b) => {
    const byDate = documentDate(a.documentId).localeCompare(documentDate(b.documentId));
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });

  const points: ChangePoint[] = [];
  const seenDates = new Map<string, number>();
  for (const fact of sorted) {
    const date = documentDate(fact.documentId);
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
        facilityName: facilityName(fact.documentId),
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
      ? `The recorded HbA1c stayed the same at ${formatHbA1c(first.value)}% from ${formatDate(first.date)} to ${formatDate(last.date)} across these reports. ${NEXT_VISIT}`
      : `The recorded HbA1c ${direction} from ${formatHbA1c(first.value)}% (${formatDate(first.date)}) to ${formatHbA1c(last.value)}% (${formatDate(last.date)}) across these reports. ${NEXT_VISIT}`;

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

export function compareMatchingTests(facts: Fact[], documents: DocumentRecord[]): MatchingTest[] {
  const byDocument = documentsById(documents);
  const confirmed = facts.filter(
    (fact) =>
      fact.kind === "measurement" &&
      fact.status === "confirmed" &&
      fact.value !== undefined &&
      Number.isFinite(fact.value) &&
      fact.unit &&
      !(fact.analyte === "hba1c" && fact.unit === "%"),
  );
  const groups = new Map<string, Fact[]>();
  for (const fact of confirmed) {
    const name = (fact.analyte ?? fact.label).toLowerCase().trim();
    const key = `${name}|${fact.unit?.toLowerCase().trim()}`;
    const list = groups.get(key) ?? [];
    list.push(fact);
    groups.set(key, list);
  }

  const series: MatchingTest[] = [];
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => {
      const left = byDocument.get(a.documentId)?.documentDate ?? "";
      const right = byDocument.get(b.documentId)?.documentDate ?? "";
      return left.localeCompare(right) || a.id.localeCompare(b.id);
    });
    const plotted: { date: string; value: number }[] = [];
    const seen = new Map<string, number>();
    for (const fact of sorted) {
      const date = byDocument.get(fact.documentId)?.documentDate ?? "";
      const value = fact.unit === "%" ? round1(fact.value as number) : (fact.value as number);
      const previous = seen.get(date);
      if (previous === undefined) {
        seen.set(date, value);
        plotted.push({ date, value });
        continue;
      }
      if (previous !== value) {
        const index = plotted.findIndex((point) => point.date === date);
        if (index >= 0) plotted.splice(index, 1);
        seen.set(date, Number.NaN);
      }
    }
    const points = plotted.filter((point) => Number.isFinite(seen.get(point.date)));
    if (points.length < 2) continue;
    const first = points[0];
    const last = points[points.length - 1];
    const unit = sorted[0].unit as string;
    const label = sorted[0].label;
    const direction =
      last.value > first.value ? "increased" : last.value < first.value ? "decreased" : "stayed the same";
    const statement =
      direction === "stayed the same"
        ? `The recorded ${label} stayed the same at ${formatMeasurement(first.value, unit)} from ${formatDate(first.date)} to ${formatDate(last.date)}. ${NEXT_VISIT}`
        : `The recorded ${label} ${direction} from ${formatMeasurement(first.value, unit)} (${formatDate(first.date)}) to ${formatMeasurement(last.value, unit)} (${formatDate(last.date)}). ${NEXT_VISIT}`;
    series.push({ label, unit, statement });
  }
  return series;
}
