"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { usePassport } from "@/components/passport-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const tabs = [
  { href: "/", label: "Verify", full: "Upload and verify" },
  { href: "/timeline", label: "Timeline", full: "Timeline" },
  { href: "/change-radar", label: "Radar", full: "Change Radar" },
  { href: "/doctor-pass", label: "Pass", full: "DoctorPass" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { error, reload, user, loading, logout } = usePassport();
  const doctorView = pathname.startsWith("/doctor/");
  const authPage = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    if (loading) return;
    if (!user && !doctorView && !authPage) router.replace("/login");
    if (user && authPage) router.replace("/");
  }, [authPage, doctorView, loading, router, user]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary font-heading text-sm font-semibold text-primary-foreground">
              SP
            </span>
            <span>
              <span className="block font-heading text-lg leading-none font-semibold">SehatPass</span>
              <span className="urdu-compact mt-1 block text-muted-foreground">صحت پاس</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {user && !doctorView && !authPage ? (
              <button
                type="button"
                className="min-h-12 rounded-lg px-2 text-sm font-semibold text-primary"
                onClick={() => void logout()}
              >
                Log out
              </button>
            ) : null}
            <p className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold tracking-wide text-amber-950 uppercase">
              {doctorView ? "Doctor view · fictional" : "Fictional demo"}
            </p>
          </div>
        </div>
        {doctorView ? (
          <div className="mx-auto flex max-w-3xl px-4 pb-3">
            <Link href="/doctor-pass" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Back to the patient DoctorPass
            </Link>
          </div>
        ) : null}
        {!doctorView && !authPage ? (
          <nav className="mx-auto grid max-w-3xl grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4">
            {tabs.map((tab) => {
              const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex min-h-12 items-center justify-center rounded-lg px-2 text-center text-sm font-semibold ${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="sm:hidden">{tab.label}</span>
                  <span className="hidden sm:inline">{tab.full}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center">
          <p className="text-sm font-medium text-amber-950">
            SehatPass organizes records. It does not diagnose or recommend treatment.
          </p>
          <p className="urdu-compact text-amber-950" lang="ur" dir="rtl">
            یہ ریکارڈ ترتیب دیتا ہے۔ یہ تشخیص یا علاج تجویز نہیں کرتا۔
          </p>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-6 pb-10">
        {error && !authPage ? (
          <Alert className="mb-4 border-destructive/30 bg-card" data-testid="passport-error">
            <AlertTitle>Something needs another try</AlertTitle>
            <AlertDescription>
              <p>{error}</p>
              <button
                type="button"
                className="mt-2 font-semibold text-primary underline-offset-4 hover:underline"
                onClick={() => void reload()}
              >
                Retry
              </button>
            </AlertDescription>
          </Alert>
        ) : null}
        {doctorView || authPage || (!loading && user) ? (
          children
        ) : (
          <p className="text-lg">{loading ? "Loading your passport…" : "Sign in to see your records."}</p>
        )}
      </main>
    </div>
  );
}
