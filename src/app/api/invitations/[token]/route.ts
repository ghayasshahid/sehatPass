import { fail, ok } from "@/lib/http";
import { withSession } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const invitation = await withSession(async (session) => {
    return session.invitations.find((item) => item.token === token) ?? null;
  }, false);

  if (!invitation) {
    return fail("This invitation was not found. No record is shown.", 404);
  }
  if (Date.parse(invitation.expiresAt) <= Date.now()) {
    return fail(
      "This invitation has expired. Ask the patient for a new DoctorPass. No record is shown.",
      410,
    );
  }

  return ok({
    invitation: {
      token: invitation.token,
      url: invitation.url,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      snapshot: invitation.snapshot,
    },
  });
}
