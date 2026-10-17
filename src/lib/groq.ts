import "server-only";

import { formatDate, formatHbA1c } from "@/lib/format";
import { explanationIsGrounded } from "@/lib/explain";
import type { ChangePoint } from "@/lib/types";

const MODEL = "llama-3.3-70b-versatile";

export async function draftExplanation(points: ChangePoint[]): Promise<{
  english: string;
  urdu: string;
} | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const confirmed = points.map((point) => ({
    analyte: "HbA1c",
    value: formatHbA1c(point.value),
    unit: "%",
    date: formatDate(point.date),
    facility: point.facilityName,
  }));

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Draft a plain-language explanation for a patient. Use only the confirmed HbA1c numbers and dates in the user message. Do not add other numbers, medicines, or doses. Do not diagnose or recommend treatment. Do not name a future disease, predict an illness, give a risk score, or say the person is susceptible to a disease. Do not compare this person with other patients. Say this is not a diagnosis. Tell them to take this change to the next visit and show it to their doctor. The English must include the words next visit. The Urdu must include اگلی and ڈاکٹر. Write english and urdu. Urdu must use Urdu script. Return JSON {\"english\":\"...\",\"urdu\":\"...\"}.",
        },
        {
          role: "user",
          content: JSON.stringify({
            question: "Meray blood test mein kya change aya hai?",
            confirmedHbA1c: confirmed,
          }),
        },
      ],
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { english?: string; urdu?: string };
    if (typeof parsed.english !== "string" || typeof parsed.urdu !== "string") return null;
    if (!explanationIsGrounded(parsed.english, parsed.urdu, points)) return null;
    return { english: parsed.english, urdu: parsed.urdu };
  } catch {
    return null;
  }
}
