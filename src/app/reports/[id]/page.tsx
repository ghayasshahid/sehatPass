import Link from "next/link";

import { ChapterHeader } from "@/components/chapter-header";
import { FictionalReport, isBundledReport } from "@/components/fictional-report";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { readUpload } from "@/lib/store";

export const dynamic = "force-dynamic";

const allowedFrom = new Set(["/", "/timeline", "/change-radar", "/doctor-pass"]);

function backHref(from: string | undefined): string {
  if (!from) return "/";
  if (allowedFrom.has(from)) return from;
  if (from.startsWith("/doctor/") && /^\/doctor\/[A-Za-z0-9_-]+$/.test(from)) return from;
  return "/";
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const back = backHref(query.from);

  if (isBundledReport(id)) {
    return (
      <div className="grid gap-4" data-testid="original-report">
        <Button asChild variant="outline" className="min-h-12 w-fit px-4 text-base">
          <Link href={back}>Back</Link>
        </Button>
        <ChapterHeader
          title="Fictional source document"
          meaning="This is the paper the facts were read from. It is synthetic, and confirming a field does not change what is printed here."
        />
        <FictionalReport id={id} />
      </div>
    );
  }

  const user = id.startsWith("upload-") ? await getCurrentUser() : null;
  if (id.startsWith("upload-") && !user) {
    return (
      <div className="grid gap-4">
        <ChapterHeader
          title="Sign in to open your file"
          meaning="Uploaded reports stay with the patient who added them. This screen does not show the file."
        />
        <Button asChild className="mt-4 min-h-12 px-4 text-base">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    );
  }
  const upload = user ? await readUpload(user.id, id) : null;
  if (!upload) {
    return (
      <div className="grid gap-4">
        <ChapterHeader
          title="Report not found"
          meaning="No original report is stored for that id. Nothing clinical is being inferred."
        />
        <Button asChild className="mt-4 min-h-12 px-4 text-base">
          <Link href={back}>Back</Link>
        </Button>
      </div>
    );
  }

  const src = `/api/uploads/${id}`;
  return (
    <div className="grid gap-4" data-testid="original-report">
      <Button asChild variant="outline" className="min-h-12 w-fit px-4 text-base">
        <Link href={back}>Back</Link>
      </Button>
      <ChapterHeader
        title="Uploaded file"
        meaning="This is the file that was sent for extraction. It is not confirmed medical information."
      />
      {upload.mime.startsWith("image/") ? (
        // User-supplied demo upload, served from the local session store.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Uploaded report" className="w-full rounded-lg border border-border" />
      ) : (
        <iframe title="Uploaded PDF" src={src} className="h-[70vh] w-full rounded-lg border border-border bg-white" />
      )}
    </div>
  );
}
