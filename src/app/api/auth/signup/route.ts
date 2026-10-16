import { AccountConflictError, signUp } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    displayName?: string;
  } | null;
  try {
    const user = await signUp(body ?? {});
    return ok({ user });
  } catch (error) {
    if (error instanceof AccountConflictError) return fail(error.message, 409);
    return fail(error instanceof Error ? error.message : "Could not create the account.");
  }
}
