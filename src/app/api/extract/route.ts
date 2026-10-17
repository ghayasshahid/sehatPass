import { requireUser } from "@/lib/auth";
import { extractWithGemini } from "@/lib/gemini";
import { fail, failFrom, ok } from "@/lib/http";
import { present } from "@/lib/present";
import { saveUpload, withSession } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  let owner;
  try {
    owner = await requireUser();
  } catch (error) {
    return failFrom(error, "Sign in to add a document.");
  }

  if (!process.env.GEMINI_API_KEY) {
    return fail(
      "No GEMINI_API_KEY is set. This file was not sent. Use the saved extraction for the fictional demo.",
      400,
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const confirmSend = form?.get("confirmSend");
  if (!(file instanceof File)) return fail("Choose a photo or PDF first.");

  const preview = {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    bytes: file.size,
    wouldSend:
      "The file bytes and an extraction instruction would be sent to Google Gemini. Other records in this passport would not be included. Nothing has been sent yet.",
  };

  if (confirmSend !== "true") {
    return ok({ preview, sent: false });
  }
  if (!ALLOWED.has(file.type)) {
    return fail("Use a JPEG, PNG, WebP, or PDF.");
  }
  if (file.size > MAX_BYTES) {
    return fail("That file is larger than 4 MB.");
  }

  try {
    const [bytes, previewSession] = await Promise.all([
      file.arrayBuffer().then((buffer) => Buffer.from(buffer)),
      withSession(async (session) => session, false),
    ]);
    const extracted = await extractWithGemini({
      filename: file.name,
      mimeType: file.type,
      base64: bytes.toString("base64"),
      patientId: previewSession.patient.id,
    });
    await saveUpload(owner.id, extracted.document.id, bytes, file.type);
    const passport = await withSession(async (session) => {
      session.loaded = true;
      session.documents.push(extracted.document);
      session.facts.push(...extracted.facts);
      session.extraction = {
        method: "gemini",
        label: "Gemini extraction",
        disclosure:
          "These fields were proposed by Gemini from the file you agreed to send. They are not confirmed. A valid structure is not proof the facts are correct.",
      };
      return present(session);
    });
    return ok({ passport, sent: true });
  } catch (error) {
    return failFrom(error, "Extraction failed. Nothing new was confirmed.");
  }
}
