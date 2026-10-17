import { fail } from "@/lib/http";
import { appDatabase, invitationUploadOwner } from "@/lib/records-db";
import { readUpload } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await context.params;
  const userId = invitationUploadOwner(appDatabase(), token, id);
  if (!userId) {
    return fail("This invitation does not include that file. No record is shown.", 404);
  }
  const upload = await readUpload(userId, id);
  if (!upload) return fail("That original file is not in the approved invitation.", 404);
  return new Response(new Uint8Array(upload.bytes), {
    headers: {
      "Content-Type": upload.mime,
      "Cache-Control": "no-store",
      "Content-Disposition": "inline",
    },
  });
}
