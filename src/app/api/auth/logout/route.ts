import { logOut } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    await logOut();
    return ok({ signedOut: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not sign out.");
  }
}
