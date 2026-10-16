import { createFictionalRecords, PATIENT } from "@/lib/demo-case";
import { fail, failFrom, ok } from "@/lib/http";
import { present } from "@/lib/present";
import { emptySession, withSession } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const passport = await withSession(async (session) => present(session), false);
    return ok({ passport });
  } catch (error) {
    return failFrom(error, "The passport could not be loaded.");
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (!body?.action) return fail("Missing action.");

  try {
    if (body.action === "reset") {
      const passport = await withSession(async (session) => {
        const empty = emptySession({
          id: session.ownerId,
          displayName: session.ownerDisplayName,
        });
        session.loaded = false;
        session.documents = [];
        session.facts = [];
        session.invitations = [];
        session.extraction = null;
        session.patient = empty.patient;
        session.discrepancies = [];
        return present(session);
      });
      return ok({ passport });
    }

    if (body.action === "load") {
      const passport = await withSession(async (session) => {
        const fictional = createFictionalRecords();
        session.patient = { ...PATIENT };
        session.loaded = true;
        session.documents = fictional.documents;
        session.facts = fictional.facts;
        session.invitations = [];
        session.extraction = fictional.extraction;
        return present(session);
      });
      return ok({ passport });
    }
  } catch (error) {
    return failFrom(error, "The passport could not be updated.");
  }

  return fail("Unknown action.");
}
