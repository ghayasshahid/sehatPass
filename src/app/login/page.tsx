"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const field =
  "min-h-12 w-full rounded-lg border border-border bg-card px-3 text-base outline-none focus-visible:border-primary";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(body.error || "Could not sign in.");
      setBusy(false);
      return;
    }
    window.location.assign("/");
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="grid gap-4 rounded-2xl border border-border bg-card p-5">
      <header>
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Your records</p>
        <h1 className="mt-1 font-heading text-4xl font-semibold">Log in</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          A patient only sees the documents, facts, and DoctorPass invitations saved for their account.
        </p>
      </header>
      <label className="grid gap-2 text-sm font-semibold">
        Email
        <input
          className={field}
          type="email"
          autoComplete="email"
          required
          value={email}
          data-testid="login-email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Password
        <input
          className={field}
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          data-testid="login-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p className="text-destructive">{error}</p> : null}
      <Button className="min-h-12 text-base" disabled={busy} data-testid="login-submit" type="submit">
        Log in
      </Button>
      <p className="text-sm">
        New to SehatPass?{" "}
        <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
