import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { deriveDiscrepancies } from "@/lib/discrepancies";
import { PATIENT } from "@/lib/demo-case";
import { isIsoDate } from "@/lib/format";
import type { Session } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const sessionFile = path.join(dataDir, "session.json");
const uploadDir = path.join(dataDir, "uploads");

let chain: Promise<unknown> = Promise.resolve();

export function emptySession(): Session {
  return {
    version: 1,
    patient: PATIENT,
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

async function readSession(): Promise<Session> {
  try {
    const raw = await readFile(sessionFile, "utf8");
    const parsed = JSON.parse(raw) as Session;
    if (parsed.version !== 1 || !parsed.patient) return emptySession();
    return parsed;
  } catch {
    return emptySession();
  }
}

async function writeSession(session: Session) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(sessionFile, JSON.stringify(session, null, 2));
}

export function withSession<T>(
  fn: (session: Session) => T | Promise<T>,
  write = true,
): Promise<T> {
  const run = chain.then(async () => {
    const session = await readSession();
    const result = await fn(session);
    applyConfirmedMeta(session);
    session.discrepancies = deriveDiscrepancies(session.facts, session.documents);
    if (write) {
      session.updatedAt = new Date().toISOString();
      await writeSession(session);
    }
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function saveUpload(id: string, bytes: Buffer, mime: string) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("Invalid upload id");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, id), bytes);
  await writeFile(path.join(uploadDir, `${id}.mime`), mime);
}

export async function readUpload(
  id: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  try {
    const bytes = await readFile(path.join(uploadDir, id));
    const mime = (await readFile(path.join(uploadDir, `${id}.mime`), "utf8")).trim();
    return { bytes, mime };
  } catch {
    return null;
  }
}
