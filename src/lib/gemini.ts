import "server-only";

import { randomBytes } from "crypto";

import { clip } from "@/lib/format";
import type { DocumentRecord, DocumentType, Fact } from "@/lib/types";

const MODEL = "gemini-3.8-flash";

interface GeminiFact {
  kind?: string;
  label?: string;
  analyte?: string;
  value?: number | string;
  unit?: string;
  medicationName?: string;
  doseText?: string;
  frequencyText?: string;
  instructionText?: string;
  sourceQuote?: string;
}

interface GeminiPayload {
  documentDate?: string | null;
  documentType?: string | null;
  facilityName?: string | null;
  facts?: GeminiFact[];
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

export async function extractWithGemini(input: {
  filename: string;
  mimeType: string;
  base64: string;
  patientId: string;
}): Promise<{ document: DocumentRecord; facts: Fact[] }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Extract proposed fields from this single medical document. Return JSON only:
{"documentDate":"YYYY-MM-DD or null","documentType":"prescription"|"lab_report"|"prescription_with_lab"|"other","facilityName":"string or null","facts":[{"kind":"measurement","label":"string","analyte":"hba1c"|"fasting_glucose"|"other","value":0,"unit":"string","sourceQuote":"string"}|{"kind":"medication","medicationName":"string","doseText":"string","frequencyText":"string","sourceQuote":"string"}|{"kind":"follow_up","instructionText":"string","sourceQuote":"string"}]}
Do not diagnose. Do not choose a current dose. Do not invent values that are not printed. If unsure, omit the fact.`,
              },
              {
                inlineData: {
                  mimeType: input.mimeType,
                  data: input.base64,
                },
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini did not return an extraction (${await geminiError(response)}). Nothing was confirmed.`);
  }

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  };
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join("") ?? "";
  if (!text.trim()) {
    const reason = payload.candidates?.[0]?.finishReason ?? "no text";
    throw new Error(`Gemini returned no extraction (${reason}). Nothing was confirmed.`);
  }
  let parsed: GeminiPayload;
  try {
    parsed = JSON.parse(stripFences(text)) as GeminiPayload;
  } catch {
    throw new Error("Gemini returned text that was not usable JSON. Nothing was confirmed.");
  }

  const id = `upload-${randomBytes(6).toString("hex")}`;
  const documentType = normalizeType(parsed.documentType);
  const facility = clip(parsed.facilityName || "Facility not read", 160);
  const date =
    parsed.documentDate && /^\d{4}-\d{2}-\d{2}$/.test(parsed.documentDate)
      ? parsed.documentDate
      : new Date().toISOString().slice(0, 10);

  const document: DocumentRecord = {
    id,
    patientId: input.patientId,
    documentDate: date,
    documentType,
    facilityName: facility,
    facilityCity: "",
    title: input.filename,
    clinician: null,
    extractionMethod: "gemini",
    uploadFilename: input.filename,
    uploadMime: input.mimeType,
  };

  const sourceRef = `${facility}, uploaded file ${input.filename}`;
  const facts: Fact[] = [
    {
      id: `${id}-date`,
      documentId: id,
      patientId: input.patientId,
      kind: "document_date",
      label: "Document date",
      textValue: date,
      status: "proposed",
      patientMarkedCurrent: null,
      sourceQuote: `Document date: ${date}`,
      sourceRef,
    },
    {
      id: `${id}-type`,
      documentId: id,
      patientId: input.patientId,
      kind: "document_type",
      label: "Document type",
      textValue: documentTypeLabel(documentType),
      status: "proposed",
      patientMarkedCurrent: null,
      sourceQuote: `Document type: ${documentType}`,
      sourceRef,
    },
    {
      id: `${id}-facility`,
      documentId: id,
      patientId: input.patientId,
      kind: "facility",
      label: "Facility",
      textValue: facility,
      status: "proposed",
      patientMarkedCurrent: null,
      sourceQuote: facility,
      sourceRef,
    },
  ];

  for (const [index, item] of (parsed.facts ?? []).entries()) {
    const fact = mapFact(item, id, input.patientId, index, sourceRef);
    if (fact) facts.push(fact);
  }

  return { document, facts };
}

async function geminiError(response: Response): Promise<string> {
  const raw = await response.text();
  let message = `HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; status?: string } };
    if (parsed.error?.status) message += ` ${parsed.error.status}`;
    if (parsed.error?.message) message += `: ${parsed.error.message}`;
  } catch {
    if (raw.trim()) message += `: ${raw.trim()}`;
  }
  return message.replace(/key=[^&\s]+/gi, "key=redacted").slice(0, 320);
}

function documentTypeLabel(type: DocumentType): string {
  if (type === "prescription") return "Prescription";
  if (type === "lab_report") return "Lab report";
  return "Prescription with attached lab";
}

function normalizeType(value: string | null | undefined): DocumentType {
  if (value === "prescription" || value === "lab_report" || value === "prescription_with_lab") {
    return value;
  }
  return "lab_report";
}

function mapFact(
  item: GeminiFact,
  documentId: string,
  patientId: string,
  index: number,
  sourceRef: string,
): Fact | null {
  const sourceQuote = clip(item.sourceQuote || "Extracted line", 400);
  const numericValue = typeof item.value === "number" ? item.value : Number(item.value);
  if (item.kind === "measurement" && Number.isFinite(numericValue) && item.unit) {
    const analyte =
      item.analyte === "hba1c" || item.analyte === "fasting_glucose"
        ? item.analyte
        : undefined;
    return {
      id: `${documentId}-fact-${index}`,
      documentId,
      patientId,
      kind: "measurement",
      label: clip(item.label || "Measurement", 80),
      analyte,
      value: numericValue,
      unit: clip(item.unit, 40),
      status: "proposed",
      patientMarkedCurrent: null,
      sourceQuote,
      sourceRef,
    };
  }
  if (item.kind === "medication" && item.medicationName && item.doseText) {
    return {
      id: `${documentId}-fact-${index}`,
      documentId,
      patientId,
      kind: "medication",
      label: clip(item.medicationName, 80),
      medicationName: clip(item.medicationName, 80),
      doseText: clip(item.doseText, 80),
      frequencyText: clip(item.frequencyText || "frequency not read", 80),
      status: "proposed",
      patientMarkedCurrent: null,
      sourceQuote,
      sourceRef,
    };
  }
  if (item.kind === "follow_up" && item.instructionText) {
    return {
      id: `${documentId}-fact-${index}`,
      documentId,
      patientId,
      kind: "follow_up",
      label: "Follow-up",
      instructionText: clip(item.instructionText, 400),
      status: "proposed",
      patientMarkedCurrent: null,
      sourceQuote,
      sourceRef,
    };
  }
  return null;
}
