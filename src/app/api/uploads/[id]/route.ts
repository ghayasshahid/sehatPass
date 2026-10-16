import { fail } from "@/lib/http";
import { readUpload } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const upload = await readUpload(id);
  if (!upload) return fail("That file is not in this demo session.", 404);
  return new Response(new Uint8Array(upload.bytes), {
    headers: {
      "Content-Type": upload.mime,
      "Cache-Control": "no-store",
      "Content-Disposition": "inline",
    },
  });
}
