import { randomBytes } from "crypto";

import { compareHbA1c } from "@/lib/changes";
import { deriveDiscrepancies } from "@/lib/discrepancies";
import { invitationUrl, requestOrigin, safeOrigin } from "@/lib/format";
import { phoneOrigin } from "@/lib/lan";
import { failFrom, ok } from "@/lib/http";
import { present } from "@/lib/present";
import { buildSummary } from "@/lib/summary";
import { applyConfirmedMeta, withSession } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { origin?: string } | null;
  const origin = phoneOrigin(safeOrigin(body?.origin, requestOrigin(request)));

  try {
    const result = await withSession(async (session) => {
      if (!session.loaded) {
        throw new Error("Load records before creating an invitation.");
      }
      const confirmed = session.facts.some((fact) => fact.status === "confirmed");
      if (!confirmed) {
        throw new Error("Confirm at least one fact before sharing.");
      }
      const token = randomBytes(9).toString("base64url");
      const createdAt = new Date();
      applyConfirmedMeta(session);
      session.discrepancies = deriveDiscrepancies(session.facts, session.documents);
      const change = compareHbA1c(session.facts, session.documents);
      const snapshot = buildSummary(session, change, createdAt.toISOString());
      const invitation = {
        token,
        url: invitationUrl(origin, token),
        createdAt: createdAt.toISOString(),
        expiresAt: new Date(createdAt.getTime() + TWO_HOURS_MS).toISOString(),
        snapshot,
      };
      session.invitations.unshift(invitation);
      const passport = await present(session);
      const view = passport.invitations.find((item) => item.token === token);
      return { passport, invitation: view };
    });
    return ok(result);
  } catch (error) {
    return failFrom(error, "Could not create an invitation.");
  }
}
