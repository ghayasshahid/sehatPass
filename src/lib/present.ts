import "server-only";

import QRCode from "qrcode";

import { compareHbA1c } from "@/lib/changes";
import { deriveDiscrepancies } from "@/lib/discrepancies";
import { buildSummary } from "@/lib/summary";
import { applyConfirmedMeta } from "@/lib/store";
import type { PassportView, Session } from "@/lib/types";

export async function present(session: Session): Promise<PassportView> {
  applyConfirmedMeta(session);
  session.discrepancies = deriveDiscrepancies(session.facts, session.documents);
  const change = compareHbA1c(session.facts, session.documents);
  const summary = buildSummary(session, change, null);
  const invitations = await Promise.all(
    session.invitations.map(async (invitation) => ({
      token: invitation.token,
      url: invitation.url,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      expired: Date.parse(invitation.expiresAt) <= Date.now(),
      qrDataUrl: await QRCode.toDataURL(invitation.url, {
        margin: 1,
        width: 320,
        errorCorrectionLevel: "M",
      }),
    })),
  );

  return {
    patient: session.patient,
    loaded: session.loaded,
    extraction: session.extraction,
    documents: [...session.documents].sort((a, b) =>
      a.documentDate.localeCompare(b.documentDate),
    ),
    facts: session.facts,
    discrepancies: session.discrepancies,
    invitations,
    summary,
    change,
    providers: {
      gemini: Boolean(process.env.GEMINI_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
    },
  };
}
