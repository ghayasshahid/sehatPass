"use client";

import { useState } from "react";

import { ChapterHeader, chapters } from "@/components/chapter-header";
import { FactList } from "@/components/fact-list";
import { usePassport } from "@/components/passport-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BUNDLED_INDEX } from "@/lib/demo-case";

const tap = "min-h-12 px-4 text-base";

export default function VerifyPage() {
  const { passport, loading, busy, loadFictional, reset, confirmAll, uploadFiles } = usePassport();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (loading) {
    return <p className="text-lg">Loading the passport…</p>;
  }
  if (!passport) {
    return <p className="text-lg">The passport did not load. Use retry above.</p>;
  }

  const proposed = passport.facts.filter((fact) => fact.status === "proposed").length;

  async function sendFiles() {
    if (files.length === 0) return;
    setUploadError(null);
    try {
      await uploadFiles(files);
      setFiles([]);
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : "The files were not extracted.");
    }
  }

  return (
    <div className="grid gap-8">
      <ChapterHeader {...chapters[0]} />
      <p className="chapter-body -mt-4 text-sm leading-6 text-muted-foreground">
        Sana Ahmed, fictional, Lahore. Diabetes follow-up across four facilities.
      </p>

      {!passport.loaded ? (
        <section className="chapter-body grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="font-heading text-xl font-semibold">Bundled fictional set</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Nothing is loaded yet. These names are the documents in the demo, not confirmed results.
            </p>
            <ul className="mt-3 grid gap-2">
              {BUNDLED_INDEX.map((item) => (
                <li key={item.id} className="rounded-lg bg-muted px-3 py-3">
                  <span className="block font-semibold">{item.facility}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.date} · {item.document}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              className={`mt-4 w-full ${tap}`}
              disabled={busy}
              data-testid="load-fictional"
              onClick={() => void loadFictional()}
            >
              Load fictional records
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              Loading uses the saved extraction. No API key is required, and no model is called.
            </p>
          </div>

          <VisitFiles
            heading="Or add photos or PDFs"
            files={files}
            gemini={passport.providers.gemini}
            busy={busy}
            uploadError={uploadError}
            onChoose={(chosen) => {
              setFiles(chosen);
              setUploadError(null);
            }}
            onSend={() => void sendFiles()}
          />
        </section>
      ) : (
        <section className="chapter-body grid gap-4">
          {passport.extraction ? (
            <Alert data-testid="extraction-disclosure">
              <AlertTitle>{passport.extraction.label}</AlertTitle>
              <AlertDescription>{passport.extraction.disclosure}</AlertDescription>
            </Alert>
          ) : null}
          <VisitFiles
            heading="Add files from another visit"
            files={files}
            gemini={passport.providers.gemini}
            busy={busy}
            uploadError={uploadError}
            onChoose={(chosen) => {
              setFiles(chosen);
              setUploadError(null);
            }}
            onSend={() => void sendFiles()}
          />
          <FactList documents={passport.documents} facts={passport.facts} />
          {proposed > 0 ? (
            <div className="rounded-2xl border border-border bg-secondary p-4">
              <h2 className="font-heading text-xl font-semibold">Confirm what the documents say</h2>
              <p className="mt-1 text-sm leading-6">
                {proposed} proposed {proposed === 1 ? "field remains" : "fields remain"}. Confirming records the written lines. It does not choose a current metformin dose, and it does not diagnose.
              </p>
              <Button
                className={`mt-3 w-full ${tap}`}
                disabled={busy}
                data-testid="confirm-all"
                onClick={() => void confirmAll()}
              >
                Confirm all proposed facts
              </Button>
            </div>
          ) : (
            <p className="rounded-md border border-border bg-muted px-4 py-3 font-medium">
              Every proposed field in this session is confirmed. You can still correct a line.
            </p>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className={tap}>
                Clear this session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear this demo session?</DialogTitle>
                <DialogDescription>
                  This removes the loaded records and invitations stored for this prototype session.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button className={tap} disabled={busy} onClick={() => void reset()}>
                  Clear session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      )}
    </div>
  );
}

function VisitFiles({
  heading,
  files,
  gemini,
  busy,
  uploadError,
  onChoose,
  onSend,
}: {
  heading: string;
  files: File[];
  gemini: boolean;
  busy: boolean;
  uploadError: string | null;
  onChoose: (files: File[]) => void;
  onSend: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-4">
      <h2 className="font-heading text-xl font-semibold">{heading}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Add every report and prescription from the visit. Photo or PDF, more than one file. The files stay on this device until you explicitly send them.
      </p>
      <label className="mt-3 block">
        <span className="sr-only">Choose photos or PDFs</span>
        <input
          key={files.map((file) => `${file.name}:${file.size}`).join("|") || "empty"}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="block w-full text-sm"
          onChange={(event) => onChoose([...(event.target.files ?? [])])}
        />
      </label>
      {files.length > 0 ? (
        <Alert className="mt-3">
          <AlertTitle>Not sent</AlertTitle>
          <AlertDescription>
            <ul className="grid gap-1">
              {files.map((file) => (
                <li key={`${file.name}:${file.size}`}>
                  {file.name} · {file.type || "unknown type"} · {Math.ceil(file.size / 1024)} KB
                </li>
              ))}
            </ul>
            <p className="mt-2">These files are still on this device.</p>
            <p className="mt-2">
              If you continue with a configured Gemini key, SehatPass would send each file and an extraction instruction to Google Gemini. Other records would not be included. You would still confirm every field.
            </p>
            {gemini ? (
              <Button className={`mt-3 ${tap}`} disabled={busy} onClick={onSend}>
                Send these files to Gemini
              </Button>
            ) : (
              <p className="mt-2 font-medium">
                No GEMINI_API_KEY is set. These files will not be sent. The fictional demo uses the saved extraction.
              </p>
            )}
            {uploadError ? <p className="mt-2 text-destructive">{uploadError}</p> : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
