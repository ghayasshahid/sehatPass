import { fail, ok } from "@/lib/http";
import { present } from "@/lib/present";
import { withSession } from "@/lib/store";
import { validationIssues } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const passport = await withSession(async (session) => {
      const problems: string[] = [];
      for (const fact of session.facts) {
        if (fact.status !== "proposed") continue;
        const issues = validationIssues(fact);
        if (issues.length) {
          problems.push(`${fact.label}: ${issues.join(" ")}`);
          continue;
        }
        fact.status = "confirmed";
      }
      if (problems.length) {
        throw new Error(problems.join(" "));
      }
      return present(session);
    });
    return ok({ passport });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not confirm facts.");
  }
}
