import { clip, isIsoDate } from "@/lib/format";
import type { Fact } from "@/lib/types";

export interface FactPatch {
  value?: number;
  unit?: string;
  doseText?: string;
  frequencyText?: string;
  instructionText?: string;
  textValue?: string;
  medicationName?: string;
}

export function applyPatch(fact: Fact, patch: FactPatch): Fact {
  const next: Fact = { ...fact };
  if (fact.kind === "measurement") {
    if (patch.value !== undefined) next.value = patch.value;
    if (patch.unit !== undefined) next.unit = clip(patch.unit, 40);
  }
  if (fact.kind === "medication") {
    if (patch.doseText !== undefined) next.doseText = clip(patch.doseText, 80);
    if (patch.frequencyText !== undefined) {
      next.frequencyText = clip(patch.frequencyText, 80);
    }
    if (patch.medicationName !== undefined) {
      next.medicationName = clip(patch.medicationName, 80);
      next.label = next.medicationName;
    }
  }
  if (fact.kind === "follow_up" && patch.instructionText !== undefined) {
    next.instructionText = clip(patch.instructionText, 400);
  }
  if (
    (fact.kind === "document_date" ||
      fact.kind === "document_type" ||
      fact.kind === "facility") &&
    patch.textValue !== undefined
  ) {
    next.textValue = clip(patch.textValue, 160);
  }
  return next;
}

export function validationIssues(fact: Fact): string[] {
  const issues: string[] = [];
  if (fact.kind === "document_date") {
    if (!fact.textValue || !isIsoDate(fact.textValue)) {
      issues.push("Document date needs a real calendar date.");
    }
  }
  if (fact.kind === "document_type" && !fact.textValue) {
    issues.push("Document type is empty.");
  }
  if (fact.kind === "facility" && !fact.textValue) {
    issues.push("Facility is empty.");
  }
  if (fact.kind === "measurement") {
    if (fact.value === undefined || !Number.isFinite(fact.value)) {
      issues.push("Measurement needs a number.");
    }
    if (!fact.unit) issues.push("Measurement needs a unit.");
  }
  if (fact.kind === "medication") {
    if (!fact.medicationName) issues.push("Medication name is empty.");
    if (!fact.doseText) issues.push("Dose is empty.");
    if (!fact.frequencyText) issues.push("Frequency is empty.");
  }
  if (fact.kind === "follow_up" && !fact.instructionText) {
    issues.push("Follow-up instruction is empty.");
  }
  return issues;
}
