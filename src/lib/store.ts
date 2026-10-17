import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { requireUser } from "@/lib/auth";
import { deriveDiscrepancies } from "@/lib/discrepancies";
import { isIsoDate } from "@/lib/format";
import {
  appDatabase,
  loadPassport,
  savePassport,
  userOwnsDocument,
  type StoredPassport,
} from "@/lib/records-db";
import type { Account, Session } from "@/lib/types";

const uploadDir = path.join(process.cwd(), "data", "uploads");

let chain: Promise<unknown> = Promise.resolve();

export function emptySession(owner: Pick<Account, "id" | "displayName">): Session {
  return {
    version: 1,
    ownerId: owner.id,
    ownerDisplayName: owner.displayName,
    patient: {
      id: `patient-${owner.id}`,
      displayName: owner.displayName,
      fictional: true,
      city: "",
      focus: "Your records",
    },
    loaded: false,
    extraction: null,
    documents: [],
    facts: [],
    discrepancies: [],
    invitations: [],
    updatedAt: new Date().toISOString(),
  };
}

export function applyConfirmedMeta(session: Session) {
  for (const document of session.documents) {
    const date = session.facts.find(
      (fact) =>
        fact.documentId === document.id &&
        fact.kind === "document_date" &&
        fact.status === "confirmed" &&
        fact.textValue &&
        isIsoDate(fact.textValue),
    );
    if (date?.textValue) document.documentDate = date.textValue;
    const facility = session.facts.find(
      (fact) =>
        fact.documentId === document.id &&
        fact.kind === "facility" &&
        fact.status === "confirmed" &&
        fact.textValue,
    );
    if (facility?.textValue) document.facilityName = facility.textValue;
  }
}

function readSession(owner: Account): Session {
  const stored = loadPassport(appDatabase(), owner.id);
  if (!stored) return emptySession(owner);
  return {
    version: 1,
    ownerId: owner.id,
    ownerDisplayName: owner.displayName,
    patient: stored.patient,
    loaded: stored.loaded,
    extraction: stored.extraction,
    documents: stored.documents,
    facts: stored.facts,
    discrepancies: [],
    invitations: stored.invitations,
    updatedAt: stored.updatedAt,
  };
}

function persist(ownerId: string, session: Session) {
  const passport: StoredPassport = {
    patient: session.patient,
    loaded: session.loaded,
    extraction: session.extraction,
    documents: session.documents,
    facts: session.facts,
    invitations: session.invitations,
    updatedAt: session.updatedAt,
  };
  savePassport(appDatabase(), ownerId, passport);
}

export function withSession<T>(
  fn: (session: Session) => T | Promise<T>,
  write = true,
): Promise<T> {
  const run = chain.then(async () => {
    const owner = await requireUser();
    const session = readSession(owner);
    const result = await fn(session);
    applyConfirmedMeta(session);
    session.discrepancies = deriveDiscrepancies(session.facts, session.documents);
    if (write) {
      session.updatedAt = new Date().toISOString();
      persist(owner.id, session);
    }
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function safeSegment(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

export async function saveUpload(userId: string, id: string, bytes: Buffer, mime: string) {
  if (!safeSegment(userId) || !safeSegment(id)) throw new Error("Invalid upload id");
  const dir = path.join(uploadDir, userId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, id), bytes);
  await writeFile(path.join(dir, `${id}.mime`), mime);
}

export async function readUpload(
  userId: string,
  id: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!safeSegment(userId) || !safeSegment(id)) return null;
  if (!userOwnsDocument(appDatabase(), userId, id)) return null;
  try {
    const filePath = path.join(uploadDir, userId, id);
    const [bytes, mime] = await Promise.all([
      readFile(filePath),
      readFile(`${filePath}.mime`, "utf8"),
    ]);
    return { bytes, mime: mime.trim() };
  } catch {
    return null;
  }
}
