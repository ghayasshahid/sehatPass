import { compareHbA1c } from "@/lib/changes";
import { documentTypeLabel, formatDate, formatMeasurement } from "@/lib/format";
import type {
  ApprovedDocument,
  ChangeResult,
  DocumentRecord,
  Fact,
  Session,
  SummaryItem,
  VisitSummary,
} from "@/lib/types";

function sourceLabel(document: DocumentRecord | undefined): string {
  if (!document) return "Source document";
  return `${document.facilityName} · ${formatDate(document.documentDate)} · ${documentTypeLabel(document.documentType)}`;
}

function findDocument(documents: DocumentRecord[], id: string) {
  return documents.find((document) => document.id === id);
}

export function buildSummary(
  session: Pick<Session, "patient" | "documents" | "facts" | "discrepancies">,
  change: ChangeResult = compareHbA1c(session.facts, session.documents),
  approvedAt: string | null = null,
): VisitSummary {
  const { documents, facts, discrepancies, patient } = session;
  const confirmed = facts.filter((fact) => fact.status === "confirmed");

  const currentMedications: SummaryItem[] = confirmed
    .filter((fact) => fact.kind === "medication" && fact.patientMarkedCurrent === true)
    .map((fact) => ({
      id: fact.id,
      text: `${fact.medicationName} ${fact.doseText} ${fact.frequencyText}, marked current by the patient`,
      sourceLabel: sourceLabel(findDocument(documents, fact.documentId)),
      documentId: fact.documentId,
      status: "confirmed" as const,
    }));

  const labs = confirmed
    .filter((fact) => fact.kind === "measurement" && fact.value !== undefined && fact.unit)
    .map((fact) => ({ fact, document: findDocument(documents, fact.documentId) }))
    .sort((a, b) => (b.document?.documentDate ?? "").localeCompare(a.document?.documentDate ?? ""));

  const recentLabs: SummaryItem[] = labs.map(({ fact, document }) => ({
    id: fact.id,
    text: `${fact.label} ${formatMeasurement(fact.value as number, fact.unit as string)} on ${document ? formatDate(document.documentDate) : "unknown date"}`,
    sourceLabel: sourceLabel(document),
    documentId: fact.documentId,
    status: "confirmed" as const,
  }));

  const unresolved: SummaryItem[] = discrepancies.map((item) => ({
    id: item.id,
    text: `${item.detail} ${item.question}`,
    sourceLabel: item.documentIds
      .map((id) => sourceLabel(findDocument(documents, id)))
      .join(" · "),
    documentId: item.documentIds[0] ?? null,
    status: "unresolved" as const,
  }));

  const questions = [
    ...discrepancies.map((item) => item.question),
  ];
  if (change.ready && change.statement) {
    questions.push(
      "May we discuss the recorded HbA1c change? SehatPass is not offering a diagnosis.",
    );
  }

  const withheldProposedCount = facts.filter((fact) => fact.status === "proposed").length;
  const approvedDocuments = approvedFromConfirmed(documents, confirmed);

  return {
    patientName: patient.displayName,
    fictional: true,
    city: patient.city,
    focus: patient.focus,
    approvedAt,
    currentMedications,
    currentMedicationsNote:
      currentMedications.length === 0
        ? "No medication is marked as current. SehatPass does not choose a dose from conflicting prescriptions."
        : "Included only because the patient marked these as current. This is not a dose selected by SehatPass.",
    allergiesNote: "No allergies are documented in these records.",
    recentLabs,
    recentLabsNote:
      recentLabs.length === 0 ? "No confirmed lab results yet." : null,
    recordedChange: change.statement,
    recordedChangeNote: change.ready
      ? null
      : change.reason,
    unresolved,
    questions,
    withheldProposedCount,
    approvedDocuments,
  };
}

const LINE_ORDER = ["document_date", "document_type", "facility", "measurement", "medication", "follow_up"];

function approvedFromConfirmed(documents: DocumentRecord[], confirmed: Fact[]): ApprovedDocument[] {
  return [...documents]
    .sort((a, b) => a.documentDate.localeCompare(b.documentDate) || a.id.localeCompare(b.id))
    .map((document) => {
      const lines = confirmed
        .filter((fact) => fact.documentId === document.id)
        .sort(
          (a, b) =>
            LINE_ORDER.indexOf(a.kind) - LINE_ORDER.indexOf(b.kind) || a.id.localeCompare(b.id),
        )
        .map((fact) => ({
          id: fact.id,
          label: fact.label,
          text: factDisplay(fact),
        }));
      return {
        id: document.id,
        documentDate: document.documentDate,
        facilityName: document.facilityName,
        documentType: document.documentType,
        lines,
      };
    })
    .filter((document) => document.lines.length > 0);
}

export function factDisplay(fact: Fact): string {
  if (fact.kind === "measurement" && fact.value !== undefined && fact.unit) {
    return formatMeasurement(fact.value, fact.unit);
  }
  if (fact.kind === "medication") {
    return `${fact.medicationName} ${fact.doseText}, ${fact.frequencyText}`;
  }
  if (fact.kind === "follow_up") return fact.instructionText ?? "";
  return fact.textValue ?? "";
}
