import { documentTypeLabel, formatDate } from "@/lib/format";
import type { Discrepancy, DocumentRecord, Fact } from "@/lib/types";

function doseKey(fact: Fact): string {
  return `${fact.doseText ?? ""} ${fact.frequencyText ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function medKey(fact: Fact): string {
  return (fact.medicationName ?? fact.label).toLowerCase().trim();
}

function documentFor(documents: DocumentRecord[], id: string): DocumentRecord | undefined {
  return documents.find((document) => document.id === id);
}

function statusWord(fact: Fact): string {
  return fact.status === "confirmed"
    ? "confirmed line"
    : "proposed line, not yet confirmed";
}

export function deriveDiscrepancies(
  facts: Fact[],
  documents: DocumentRecord[],
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];
  const medications = facts.filter((fact) => fact.kind === "medication");
  const groups = new Map<string, Fact[]>();
  for (const fact of medications) {
    const key = medKey(fact);
    const list = groups.get(key) ?? [];
    list.push(fact);
    groups.set(key, list);
  }

  for (const [name, group] of groups) {
    const distinct = new Map<string, Fact[]>();
    for (const fact of group) {
      const key = doseKey(fact);
      const list = distinct.get(key) ?? [];
      list.push(fact);
      distinct.set(key, list);
    }
    if (distinct.size < 2) continue;
    const lines = [...distinct.values()].map((items) => {
      const fact = items[0];
      const document = documentFor(documents, fact.documentId);
      const when = document ? formatDate(document.documentDate) : "unknown date";
      const where = document?.facilityName ?? "unknown facility";
      const marked = items.some((item) => item.patientMarkedCurrent)
        ? " A patient mark of current treatment is not a choice by SehatPass."
        : "";
      return `${fact.doseText} ${fact.frequencyText} (${where}, ${when}; ${statusWord(fact)}).${marked}`;
    });
    const displayName = group[0].medicationName ?? name;
    discrepancies.push({
      id: `disc-dose-${name.replace(/[^a-z0-9]+/g, "-")}`,
      kind: "conflicting_doses",
      status: "unresolved",
      title: `Unresolved: ${displayName} dose`,
      detail: `Two documents list different ${displayName.toLowerCase()} doses: ${lines.join(" ")} SehatPass cannot determine current treatment from these records alone. Ask the patient or the prescribing clinician to confirm.`,
      question: `Which ${displayName.toLowerCase()} dose, if either, is current treatment?`,
      factIds: group.map((fact) => fact.id),
      documentIds: [...new Set(group.map((fact) => fact.documentId))],
    });
  }

  for (const fact of facts.filter((item) => item.kind === "follow_up")) {
    const document = documentFor(documents, fact.documentId);
    const when = document ? formatDate(document.documentDate) : "the document date";
    const where = document?.facilityName ?? "the facility";
    const type = document
      ? documentTypeLabel(document.documentType).toLowerCase()
      : "document";
    discrepancies.push({
      id: `disc-followup-${fact.id}`,
      kind: "follow_up_without_completion",
      status: "unresolved",
      title: "Unresolved: follow-up with no completion record",
      detail: `The ${when} ${type} from ${where} says “${fact.instructionText}”. There is no completion record for that instruction. This is a question, not a claim that it was missed. ${statusWord(fact)}.`,
      question: "Did this follow-up happen?",
      factIds: [fact.id],
      documentIds: [fact.documentId],
    });
  }

  return discrepancies;
}
