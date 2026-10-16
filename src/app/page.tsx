"use client";

import { useState } from "react";

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
  const { passport, loading, busy, loadFictional, reset, confirmAll } = usePassport();
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (loading) {
    return <p className="text-lg">Loading the passport…</p>;
  }
  if (!passport) {
    return <p className="text-lg">The passport did not load. Use retry above.</p>;
  }

  const proposed = passport.facts.filter((fact) => fact.status === "proposed").length;

  async function sendFile() {
    if (!file) return;
    setUploadError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("confirmSend", "true");
    const response = await fetch("/api/extract", { method: "POST", body: form });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setUploadError(body.error || "The file was not extracted.");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Medical memory</p>
        <h1 className="mt-1 font-heading text-4xl leading-tight font-semibold">Upload and verify</h1>
        <p className="mt-3 text-lg leading-8">
          Your next doctor should know what your last doctor knew.
        </p>
        <p className="mt-2 leading-7 text-muted-foreground">
          Sana Ahmed (fictional demo), an adult in Lahore, is here for diabetes follow-up. Four paper records from four facilities were never on one chart. This prototype connects them. It does not predict future results.
        </p>
      </header>

      {!passport.loaded ? (
        <section className="grid gap-4">
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
              Loading uses disclosed cached extraction. No API key is required, and no model is called.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-card p-4">
            <h2 className="font-heading text-xl font-semibold">Or add a photo or PDF</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              A paper report can be photographed. The file stays on this device until you explicitly send it.
            </p>
            <label className="mt-3 block">
              <span className="sr-only">Choose a photo or PDF</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="block w-full text-sm"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setUploadError(null);
                }}
              />
            </label>
            {file ? (
              <Alert className="mt-3">
                <AlertTitle>Not sent</AlertTitle>
                <AlertDescription>
                  <p>
                    {file.name} · {file.type || "unknown type"} · {Math.ceil(file.size / 1024)} KB. This file is still on this device.
                  </p>
                  <p className="mt-2">
                    If you continue with a configured Gemini key, SehatPass would send this file and an extraction instruction to Google Gemini. Other records would not be included. You would still confirm every field.
                  </p>
                  {passport.providers.gemini ? (
                    <Button className={`mt-3 ${tap}`} disabled={busy} onClick={() => void sendFile()}>
                      Send this file to Gemini
                    </Button>
                  ) : (
                    <p className="mt-2 font-medium">
                      No GEMINI_API_KEY is set on the server. This file will not be sent. Load the fictional set for the demo.
                    </p>
                  )}
                  {uploadError ? <p className="mt-2 text-destructive">{uploadError}</p> : null}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="grid gap-4">
          {passport.extraction ? (
            <Alert data-testid="extraction-disclosure">
              <AlertTitle>{passport.extraction.label}</AlertTitle>
              <AlertDescription>{passport.extraction.disclosure}</AlertDescription>
            </Alert>
          ) : null}
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
            <p className="rounded-xl bg-teal-50 px-4 py-3 font-medium text-teal-950">
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
