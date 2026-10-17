"use client";

import Link from "next/link";
import { useState } from "react";

import { ChapterHeader } from "@/components/chapter-header";
import { Button } from "@/components/ui/button";

const field =
  "min-h-12 w-full rounded-lg border border-border bg-card px-3 text-base outline-none focus-visible:border-primary";

export default function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, email, password }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(body.error || "Could not create the account.");
      setBusy(false);
      return;
    }
    window.location.assign("/");
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="grid gap-5">
      <ChapterHeader
        title="Sign up"
        meaning="Create an account on this device. After you sign in, load the fictional Sana Ahmed records or add a document of your own."
      />
      <label className="grid gap-2 text-sm font-semibold">
        Name
        <input
          className={field}
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          value={displayName}
          data-testid="signup-name"
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Email
        <input
          className={field}
          type="email"
          autoComplete="email"
          required
          value={email}
          data-testid="signup-email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        Password
        <input
          className={field}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          data-testid="signup-password"
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? <p className="text-destructive">{error}</p> : null}
      <Button className="min-h-12 text-base" disabled={busy} data-testid="signup-submit" type="submit">
        Create account
      </Button>
      <p className="text-sm">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
