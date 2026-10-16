import { fail, failFrom, ok } from "@/lib/http";
import { present } from "@/lib/present";
import { withSession } from "@/lib/store";
import { applyPatch, validationIssues, type FactPatch } from "@/lib/validate";
import { factDisplay } from "@/lib/summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | (FactPatch & { action?: string; current?: boolean })
    | null;
  if (!body?.action) return fail("Missing action.");

  try {
    const passport = await withSession(async (session) => {
      const fact = session.facts.find((item) => item.id === id);
      if (!fact) throw new Error("That fact is not in this session.");

      if (body.action === "confirm") {
        const issues = validationIssues(fact);
        if (issues.length) throw new Error(issues.join(" "));
        fact.status = "confirmed";
      } else if (body.action === "correct") {
        const next = applyPatch(fact, body);
        const issues = validationIssues(next);
        if (issues.length) throw new Error(issues.join(" "));
        const previous = factDisplay(fact);
        Object.assign(fact, next, {
          status: "confirmed" as const,
          correctedFrom: previous,
        });
      } else if (body.action === "mark_current") {
        if (fact.kind !== "medication") {
          throw new Error("Only a medication can be marked current.");
        }
        const issues = validationIssues(fact);
        if (issues.length) throw new Error(issues.join(" "));
        fact.status = "confirmed";
        fact.patientMarkedCurrent = Boolean(body.current);
      } else {
        throw new Error("Unknown action.");
      }

      return present(session);
    });
    return ok({ passport });
  } catch (error) {
    return failFrom(error, "Could not update that fact.");
  }
}
