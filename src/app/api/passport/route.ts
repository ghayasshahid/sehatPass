import { createFictionalRecords } from "@/lib/demo-case";
import { fail, ok } from "@/lib/http";
import { present } from "@/lib/present";
import { emptySession, withSession } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const passport = await withSession(async (session) => present(session), false);
  return ok({ passport });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (!body?.action) return fail("Missing action.");

  if (body.action === "reset") {
    const passport = await withSession(async (session) => {
      const empty = emptySession();
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
      session.patient = emptySession().patient;
      session.loaded = true;
      session.documents = fictional.documents;
      session.facts = fictional.facts;
      session.invitations = [];
      session.extraction = fictional.extraction;
      return present(session);
    });
    return ok({ passport });
  }

  return fail("Unknown action.");
}
