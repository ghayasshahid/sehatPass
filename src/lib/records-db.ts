import { mkdirSync } from "fs";
import path from "path";
import { DatabaseSync, type SqlValue } from "node:sqlite";

import type {
  Account,
  DocumentRecord,
  DocumentType,
  ExtractionMeta,
  Fact,
  FactKind,
  Invitation,
  Patient,
  VisitSummary,
} from "@/lib/types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  fictional INTEGER NOT NULL,
  city TEXT NOT NULL,
  focus TEXT NOT NULL,
  loaded INTEGER NOT NULL DEFAULT 0,
  extraction_method TEXT,
  extraction_label TEXT,
  extraction_disclosure TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  document_date TEXT NOT NULL,
  document_type TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  facility_city TEXT NOT NULL,
  title TEXT NOT NULL,
  clinician TEXT,
  extraction_method TEXT NOT NULL,
  upload_filename TEXT,
  upload_mime TEXT,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS facts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  analyte TEXT,
  value REAL,
  unit TEXT,
  medication_name TEXT,
  dose_text TEXT,
  frequency_text TEXT,
  instruction_text TEXT,
  text_value TEXT,
  status TEXT NOT NULL,
  patient_marked_current INTEGER,
  source_quote TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  corrected_from TEXT,
  PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS invitations (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  snapshot_json TEXT NOT NULL
);
`;

export interface StoredPassport {
  patient: Patient;
  loaded: boolean;
  extraction: ExtractionMeta | null;
  documents: DocumentRecord[];
  facts: Fact[];
  invitations: Invitation[];
  updatedAt: string;
}

const globalDb = globalThis as { __sehatpassDb?: DatabaseSync };

export function openDatabase(filename: string): DatabaseSync {
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(SCHEMA);
  return database;
}

export function appDatabase(): DatabaseSync {
  if (!globalDb.__sehatpassDb) {
    const dir = path.join(process.cwd(), "data");
    mkdirSync(dir, { recursive: true });
    globalDb.__sehatpassDb = openDatabase(path.join(dir, "sehatpass.sqlite"));
  }
  return globalDb.__sehatpassDb;
}

export function insertUser(
  database: DatabaseSync,
  user: Account & { passwordHash: string; createdAt: string },
): void {
  database
    .prepare(
      `INSERT INTO users (id, email, password_hash, display_name, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(user.id, user.email, user.passwordHash, user.displayName, user.createdAt);
  database
    .prepare(
      `INSERT INTO patients (
         user_id, id, display_name, fictional, city, focus, loaded, updated_at
       ) VALUES (?, ?, ?, 1, '', 'Your records', 0, ?)`,
    )
    .run(user.id, `patient-${user.id}`, user.displayName, user.createdAt);
}

export function findUserByEmail(database: DatabaseSync, email: string): (Account & { passwordHash: string }) | null {
  const row = database
    .prepare(
      `SELECT id, email, password_hash, display_name FROM users WHERE email = ?`,
    )
    .get(email);
  if (!row) return null;
  return {
    id: text(row.id),
    email: text(row.email),
    displayName: text(row.display_name),
    passwordHash: text(row.password_hash),
  };
}

export function findUserById(database: DatabaseSync, id: string): Account | null {
  const row = database
    .prepare(`SELECT id, email, display_name FROM users WHERE id = ?`)
    .get(id);
  if (!row) return null;
  return { id: text(row.id), email: text(row.email), displayName: text(row.display_name) };
}

export function insertAuthSession(
  database: DatabaseSync,
  input: { tokenHash: string; userId: string; expiresAt: string },
): void {
  database
    .prepare(
      `INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
    )
    .run(input.tokenHash, input.userId, input.expiresAt);
}

export function findUserIdByTokenHash(
  database: DatabaseSync,
  tokenHash: string,
  nowIso: string,
): string | null {
  const row = database
    .prepare(
      `SELECT user_id, expires_at FROM auth_sessions WHERE token_hash = ?`,
    )
    .get(tokenHash);
  if (!row) return null;
  if (text(row.expires_at) <= nowIso) {
    database.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).run(tokenHash);
    return null;
  }
  return text(row.user_id);
}

export function deleteAuthSession(database: DatabaseSync, tokenHash: string): void {
  database.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).run(tokenHash);
}

export function loadPassport(database: DatabaseSync, userId: string): StoredPassport | null {
  const patient = database
    .prepare(
      `SELECT id, display_name, city, focus, loaded, extraction_method, extraction_label,
              extraction_disclosure, updated_at
       FROM patients WHERE user_id = ?`,
    )
    .get(userId);
  if (!patient) return null;

  const documents = database
    .prepare(
      `SELECT id, patient_id, document_date, document_type, facility_name, facility_city,
              title, clinician, extraction_method, upload_filename, upload_mime
       FROM documents WHERE user_id = ?`,
    )
    .all(userId)
    .map(documentFromRow);

  const facts = database
    .prepare(
      `SELECT id, document_id, patient_id, kind, label, analyte, value, unit, medication_name,
              dose_text, frequency_text, instruction_text, text_value, status,
              patient_marked_current, source_quote, source_ref, corrected_from
       FROM facts WHERE user_id = ?`,
    )
    .all(userId)
    .map(factFromRow);

  const invitations = database
    .prepare(
      `SELECT token, url, created_at, expires_at, snapshot_json
       FROM invitations WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId)
    .map(invitationFromRow);

  const method = patient.extraction_method;
  const extraction: ExtractionMeta | null =
    method === "cached_demo" || method === "gemini"
      ? {
          method,
          label: text(patient.extraction_label),
          disclosure: text(patient.extraction_disclosure),
        }
      : null;

  return {
    patient: {
      id: text(patient.id),
      displayName: text(patient.display_name),
      fictional: true,
      city: text(patient.city),
      focus: text(patient.focus),
    },
    loaded: patient.loaded === 1,
    extraction,
    documents,
    facts,
    invitations,
    updatedAt: text(patient.updated_at),
  };
}

export function savePassport(
  database: DatabaseSync,
  userId: string,
  passport: StoredPassport,
): void {
  for (const invitation of passport.invitations) {
    assertInvitationUrl(invitation.url);
  }

  database.exec("BEGIN");
  try {
    database.prepare(`DELETE FROM invitations WHERE user_id = ?`).run(userId);
    database.prepare(`DELETE FROM facts WHERE user_id = ?`).run(userId);
    database.prepare(`DELETE FROM documents WHERE user_id = ?`).run(userId);
    database
      .prepare(
        `INSERT INTO patients (
           user_id, id, display_name, fictional, city, focus, loaded,
           extraction_method, extraction_label, extraction_disclosure, updated_at
         ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           id = excluded.id,
           display_name = excluded.display_name,
           fictional = excluded.fictional,
           city = excluded.city,
           focus = excluded.focus,
           loaded = excluded.loaded,
           extraction_method = excluded.extraction_method,
           extraction_label = excluded.extraction_label,
           extraction_disclosure = excluded.extraction_disclosure,
           updated_at = excluded.updated_at`,
      )
      .run(
        userId,
        passport.patient.id,
        passport.patient.displayName,
        passport.patient.city,
        passport.patient.focus,
        passport.loaded ? 1 : 0,
        passport.extraction?.method ?? null,
        passport.extraction?.label ?? null,
        passport.extraction?.disclosure ?? null,
        passport.updatedAt,
      );

    const insertDocument = database.prepare(
      `INSERT INTO documents (
         user_id, id, patient_id, document_date, document_type, facility_name, facility_city,
         title, clinician, extraction_method, upload_filename, upload_mime
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const document of passport.documents) {
      insertDocument.run(
        userId,
        document.id,
        document.patientId,
        document.documentDate,
        document.documentType,
        document.facilityName,
        document.facilityCity,
        document.title,
        document.clinician,
        document.extractionMethod,
        document.uploadFilename,
        document.uploadMime,
      );
    }

    const insertFact = database.prepare(
      `INSERT INTO facts (
         user_id, id, document_id, patient_id, kind, label, analyte, value, unit,
         medication_name, dose_text, frequency_text, instruction_text, text_value, status,
         patient_marked_current, source_quote, source_ref, corrected_from
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const fact of passport.facts) {
      insertFact.run(
        userId,
        fact.id,
        fact.documentId,
        fact.patientId,
        fact.kind,
        fact.label,
        fact.analyte ?? null,
        fact.value ?? null,
        fact.unit ?? null,
        fact.medicationName ?? null,
        fact.doseText ?? null,
        fact.frequencyText ?? null,
        fact.instructionText ?? null,
        fact.textValue ?? null,
        fact.status,
        fact.patientMarkedCurrent === null ? null : fact.patientMarkedCurrent ? 1 : 0,
        fact.sourceQuote,
        fact.sourceRef,
        fact.correctedFrom ?? null,
      );
    }

    const insertInvitation = database.prepare(
      `INSERT INTO invitations (token, user_id, url, created_at, expires_at, snapshot_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const invitation of passport.invitations) {
      insertInvitation.run(
        invitation.token,
        userId,
        invitation.url,
        invitation.createdAt,
        invitation.expiresAt,
        JSON.stringify(invitation.snapshot),
      );
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function findInvitation(
  database: DatabaseSync,
  token: string,
): Invitation | null {
  const row = database
    .prepare(
      `SELECT token, url, created_at, expires_at, snapshot_json FROM invitations WHERE token = ?`,
    )
    .get(token);
  if (!row) return null;
  return invitationFromRow(row);
}

export function userOwnsDocument(
  database: DatabaseSync,
  userId: string,
  documentId: string,
): boolean {
  const row = database
    .prepare(`SELECT id FROM documents WHERE user_id = ? AND id = ?`)
    .get(userId, documentId);
  return Boolean(row);
}

function assertInvitationUrl(url: string): void {
  if (!/^https?:\/\/[^/]+\/doctor\/[A-Za-z0-9_-]+$/.test(url)) {
    throw new Error("The invitation link must be a doctor token URL.");
  }
  if (/hba1c|metformin|mg\/dl|7\.2|8\.1|9\.0/i.test(url)) {
    throw new Error("The invitation link must not contain the medical record.");
  }
}

function documentFromRow(row: Record<string, SqlValue>): DocumentRecord {
  const documentType = text(row.document_type);
  const method = text(row.extraction_method);
  return {
    id: text(row.id),
    patientId: text(row.patient_id),
    documentDate: text(row.document_date),
    documentType: isDocumentType(documentType) ? documentType : "lab_report",
    facilityName: text(row.facility_name),
    facilityCity: text(row.facility_city),
    title: text(row.title),
    clinician: row.clinician === null ? null : text(row.clinician),
    extractionMethod: method === "gemini" ? "gemini" : "cached_demo",
    uploadFilename: row.upload_filename === null ? null : text(row.upload_filename),
    uploadMime: row.upload_mime === null ? null : text(row.upload_mime),
  };
}

function factFromRow(row: Record<string, SqlValue>): Fact {
  const kind = text(row.kind);
  const status = text(row.status);
  const fact: Fact = {
    id: text(row.id),
    documentId: text(row.document_id),
    patientId: text(row.patient_id),
    kind: isFactKind(kind) ? kind : "measurement",
    label: text(row.label),
    status: status === "confirmed" || status === "unresolved" ? status : "proposed",
    patientMarkedCurrent:
      row.patient_marked_current === null || row.patient_marked_current === undefined
        ? null
        : row.patient_marked_current === 1,
    sourceQuote: text(row.source_quote),
    sourceRef: text(row.source_ref),
  };
  if (row.analyte === "hba1c" || row.analyte === "fasting_glucose") fact.analyte = row.analyte;
  if (typeof row.value === "number") fact.value = row.value;
  if (typeof row.unit === "string") fact.unit = row.unit;
  if (typeof row.medication_name === "string") fact.medicationName = row.medication_name;
  if (typeof row.dose_text === "string") fact.doseText = row.dose_text;
  if (typeof row.frequency_text === "string") fact.frequencyText = row.frequency_text;
  if (typeof row.instruction_text === "string") fact.instructionText = row.instruction_text;
  if (typeof row.text_value === "string") fact.textValue = row.text_value;
  if (typeof row.corrected_from === "string") fact.correctedFrom = row.corrected_from;
  return fact;
}

function invitationFromRow(row: Record<string, SqlValue>): Invitation {
  const snapshot = JSON.parse(text(row.snapshot_json)) as VisitSummary;
  return {
    token: text(row.token),
    url: text(row.url),
    createdAt: text(row.created_at),
    expiresAt: text(row.expires_at),
    snapshot,
  };
}

function text(value: SqlValue | undefined): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return "";
}

function isDocumentType(value: string): value is DocumentType {
  return value === "prescription" || value === "lab_report" || value === "prescription_with_lab";
}

function isFactKind(value: string): value is FactKind {
  return (
    value === "document_date" ||
    value === "document_type" ||
    value === "facility" ||
    value === "measurement" ||
    value === "medication" ||
    value === "follow_up"
  );
}
