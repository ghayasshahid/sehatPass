import Link from "next/link";

import { ChapterHeader } from "@/components/chapter-header";
import { FictionalReport, isBundledReport } from "@/components/fictional-report";
import { Button } from "@/components/ui/button";
import { appDatabase, findInvitation, invitationUploadOwner } from "@/lib/records-db";
import { readUpload } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function InvitationFilePage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const back = `/doctor/${token}`;
  const invitation = findInvitation(appDatabase(), token);
  const allowed = (invitation?.snapshot.approvedDocuments ?? []).some((document) => document.id === id);
  const expired = invitation ? Date.parse(invitation.expiresAt) <= Date.now() : true;

  if (!invitation || expired || !allowed) {
    return (
      <div className="grid gap-4">
        <ChapterHeader
          title="Original file"
          meaning="This invitation does not include that file, so nothing is shown."
        />
        <Button asChild className="mt-4 min-h-12 w-fit px-4 text-base">
          <Link href={back}>Back</Link>
        </Button>
      </div>
    );
  }

  if (isBundledReport(id)) {
    return (
      <div className="grid gap-4" data-testid="original-report">
        <Button asChild variant="outline" className="min-h-12 w-fit px-4 text-base">
          <Link href={back}>Back</Link>
        </Button>
        <ChapterHeader
          title="Approved source document"
          meaning="This is the paper included in the invitation the patient approved. Later edits are not added here."
        />
        <FictionalReport id={id} />
      </div>
    );
  }

  const userId = invitationUploadOwner(appDatabase(), token, id);
  const upload = userId ? await readUpload(userId, id) : null;
  if (!upload) {
    return (
      <div className="grid gap-4">
        <ChapterHeader
          title="Original file"
          meaning="This invitation does not include that file, so nothing is shown."
        />
        <Button asChild className="mt-4 min-h-12 w-fit px-4 text-base">
          <Link href={back}>Back</Link>
        </Button>
      </div>
    );
  }

  const src = `/api/invitations/${token}/files/${id}`;
  return (
    <div className="grid gap-4" data-testid="original-report">
      <Button asChild variant="outline" className="min-h-12 w-fit px-4 text-base">
        <Link href={back}>Back</Link>
      </Button>
      <ChapterHeader
        title="Approved file"
        meaning="This is the file included in the invitation the patient approved. Later edits are not added here."
      />
      {upload.mime.startsWith("image/") ? (
        // The invitation authorizes this one approved upload.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Approved file" className="w-full rounded-lg border border-border" />
      ) : (
        <iframe title="Approved file" src={src} className="h-[70vh] w-full rounded-lg border border-border bg-white" />
      )}
    </div>
  );
}
