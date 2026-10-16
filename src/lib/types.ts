/**
 * Session shape for the prototype store.
 * Tables a Postgres schema could use later: patients, documents, facts,
 * discrepancies, invitations. Invitations store an approved snapshot so the
 * doctor view does not follow later edits.
 */

export type ConfirmationStatus = "proposed" | "confirmed" | "unresolved";

export type DocumentType =
  | "prescription"
  | "lab_report"
  | "prescription_with_lab";

export type FactKind =
  | "document_date"
  | "document_type"
  | "facility"
  | "measurement"
  | "medication"
  | "follow_up";

export type Analyte = "hba1c" | "fasting_glucose";

export interface Account {
  id: string;
  email: string;
  displayName: string;
}

export interface Patient {
  id: string;
  displayName: string;
  fictional: true;
  city: string;
  focus: string;
}

export interface DocumentRecord {
  id: string;
  patientId: string;
  documentDate: string;
  documentType: DocumentType;
  facilityName: string;
  facilityCity: string;
  title: string;
  clinician: string | null;
  extractionMethod: "cached_demo" | "gemini";
  uploadFilename: string | null;
  uploadMime: string | null;
}

export interface Fact {
  id: string;
  documentId: string;
  patientId: string;
  kind: FactKind;
  label: string;
  analyte?: Analyte;
  value?: number;
  unit?: string;
  medicationName?: string;
  doseText?: string;
  frequencyText?: string;
  instructionText?: string;
  textValue?: string;
  status: ConfirmationStatus;
  patientMarkedCurrent: boolean | null;
  sourceQuote: string;
  sourceRef: string;
  correctedFrom?: string;
}

export interface Discrepancy {
  id: string;
  kind: "conflicting_doses" | "follow_up_without_completion";
  status: "unresolved";
  title: string;
  detail: string;
  question: string;
  factIds: string[];
  documentIds: string[];
}

export interface ExtractionMeta {
  method: "cached_demo" | "gemini";
  label: string;
  disclosure: string;
}

export interface SummaryItem {
  id: string;
  text: string;
  sourceLabel: string;
  documentId: string | null;
  status: ConfirmationStatus;
}

export interface VisitSummary {
  patientName: string;
  fictional: true;
  city: string;
  focus: string;
  approvedAt: string | null;
  currentMedications: SummaryItem[];
  currentMedicationsNote: string;
  allergiesNote: string;
  recentLabs: SummaryItem[];
  recentLabsNote: string | null;
  recordedChange: string | null;
  recordedChangeNote: string | null;
  unresolved: SummaryItem[];
  questions: string[];
  withheldProposedCount: number;
}

export interface Invitation {
  token: string;
  url: string;
  createdAt: string;
  expiresAt: string;
  snapshot: VisitSummary;
}

export interface Session {
  version: 1;
  ownerId: string;
  ownerDisplayName: string;
  patient: Patient;
  loaded: boolean;
  extraction: ExtractionMeta | null;
  documents: DocumentRecord[];
  facts: Fact[];
  discrepancies: Discrepancy[];
  invitations: Invitation[];
  updatedAt: string;
}

export interface ChangePoint {
  factId: string;
  documentId: string;
  date: string;
  value: number;
  unit: "%";
  facilityName: string;
  sourceRef: string;
  status: "confirmed";
}

export interface ChangeResult {
  analyte: "hba1c";
  unit: "%";
  ready: boolean;
  reason: string | null;
  points: ChangePoint[];
  withheldProposedCount: number;
  excludedNotes: string[];
  statement: string | null;
  delta: number | null;
}

export interface Explanation {
  ready: boolean;
  english: string;
  urdu: string;
  method: "template" | "groq";
  disclosure: string;
}

export interface InvitationView {
  token: string;
  url: string;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
  qrDataUrl: string;
}

export interface PassportView {
  patient: Patient;
  loaded: boolean;
  extraction: ExtractionMeta | null;
  documents: DocumentRecord[];
  facts: Fact[];
  discrepancies: Discrepancy[];
  invitations: InvitationView[];
  summary: VisitSummary;
  change: ChangeResult;
  providers: {
    gemini: boolean;
    groq: boolean;
  };
}
