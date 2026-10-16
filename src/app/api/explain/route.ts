import { compareHbA1c } from "@/lib/changes";
import { explainFromConfirmed } from "@/lib/explain";
import { failFrom, ok } from "@/lib/http";
import { draftExplanation } from "@/lib/groq";
import { withSession } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const explanation = await withSession(async (session) => {
      const change = compareHbA1c(session.facts, session.documents);
      const template = explainFromConfirmed(change.points);
      if (!process.env.GROQ_API_KEY) return template;
      try {
        const draft = await draftExplanation(change.points);
        if (!draft) {
          return {
            ...template,
            disclosure:
              "A Groq draft was discarded because it was not grounded in the confirmed HbA1c values, named a future disease, or the request failed. This text is the template. The numerical change was calculated in code. Discuss the change with a doctor.",
          };
        }
        return {
          ready: template.ready,
          english: draft.english,
          urdu: draft.urdu,
          method: "groq" as const,
          disclosure:
            "Groq drafted this wording from confirmed HbA1c values only. It did not calculate the change, and unconfirmed text was not sent as fact.",
        };
      } catch {
        return {
          ...template,
          disclosure:
            "Groq could not be reached. This text is the grounded template. The numerical change was calculated in code.",
        };
      }
    }, false);
    return ok({ explanation });
  } catch (error) {
    return failFrom(error, "Could not draft an explanation.");
  }
}
