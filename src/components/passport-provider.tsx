"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Explanation, InvitationView, PassportView } from "@/lib/types";
import type { FactPatch } from "@/lib/validate";

interface PassportContextValue {
  passport: PassportView | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  reload: () => Promise<void>;
  loadFictional: () => Promise<void>;
  reset: () => Promise<void>;
  confirmFact: (id: string) => Promise<void>;
  correctFact: (id: string, patch: FactPatch) => Promise<void>;
  confirmAll: () => Promise<void>;
  markCurrent: (id: string, current: boolean) => Promise<void>;
  explain: () => Promise<Explanation>;
  approve: () => Promise<InvitationView>;
}

const PassportContext = createContext<PassportContextValue | null>(null);

async function readJson(response: Response) {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    passport?: PassportView;
    explanation?: Explanation;
    invitation?: InvitationView;
  };
  if (!response.ok) {
    throw new Error(body.error || "The request failed.");
  }
  return body;
}

export function PassportProvider({ children }: { children: React.ReactNode }) {
  const [passport, setPassport] = useState<PassportView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const response = await fetch("/api/passport", { cache: "no-store" });
    const body = await readJson(response);
    if (body.passport) setPassport(body.passport);
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload()
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "The passport could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const run = useCallback(async <T,>(task: () => Promise<T>) => {
    setBusy(true);
    setError(null);
    try {
      return await task();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Something went wrong.";
      setError(message);
      throw reason;
    } finally {
      setBusy(false);
    }
  }, []);

  const mutate = useCallback(
    async (url: string, init?: RequestInit) => {
      const response = await fetch(url, init);
      const body = await readJson(response);
      if (body.passport) setPassport(body.passport);
      return body;
    },
    [],
  );

  const value = useMemo<PassportContextValue>(
    () => ({
      passport,
      loading,
      busy,
      error,
      reload: () => run(reload),
      loadFictional: () =>
        run(async () => {
          await mutate("/api/passport", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "load" }),
          });
        }),
      reset: () =>
        run(async () => {
          await mutate("/api/passport", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset" }),
          });
        }),
      confirmFact: (id) =>
        run(async () => {
          await mutate(`/api/facts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "confirm" }),
          });
        }),
      correctFact: (id, patch) =>
        run(async () => {
          await mutate(`/api/facts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "correct", ...patch }),
          });
        }),
      confirmAll: () =>
        run(async () => {
          await mutate("/api/facts/confirm-all", { method: "POST" });
        }),
      markCurrent: (id, current) =>
        run(async () => {
          await mutate(`/api/facts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "mark_current", current }),
          });
        }),
      explain: () =>
        run(async () => {
          const body = await mutate("/api/explain", { method: "POST" });
          if (!body.explanation) throw new Error("No explanation was returned.");
          return body.explanation;
        }),
      approve: () =>
        run(async () => {
          const body = await mutate("/api/invitations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin: window.location.origin }),
          });
          if (!body.invitation) throw new Error("No invitation was returned.");
          return body.invitation;
        }),
    }),
    [busy, error, loading, mutate, passport, reload, run],
  );

  return <PassportContext.Provider value={value}>{children}</PassportContext.Provider>;
}

export function usePassport() {
  const value = useContext(PassportContext);
  if (!value) throw new Error("usePassport must be used inside PassportProvider");
  return value;
}
