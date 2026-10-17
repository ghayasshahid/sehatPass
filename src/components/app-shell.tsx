"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { chapterFor, chapters } from "@/components/chapter-header";
import { usePassport } from "@/components/passport-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { error, reload, user, loading, logout } = usePassport();
  const doctorView = pathname.startsWith("/doctor/");
  const authPage = pathname === "/login" || pathname === "/signup";
  const chapter = chapterFor(pathname);
  const showChapters = !doctorView && !authPage;

  useEffect(() => {
    if (loading) return;
    if (!user && !doctorView && !authPage) router.replace("/login");
    if (user && authPage) router.replace("/");
  }, [authPage, doctorView, loading, router, user]);

  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl lg:grid-cols-[16.5rem_1fr]">
        <aside className="hidden min-h-dvh flex-col bg-muted px-5 py-8 lg:flex">
          <Link href={doctorView ? "/doctor-pass" : "/"} className="block pb-8">
            <span className="block text-xl leading-none font-semibold tracking-tight">SehatPass</span>
            <span className="urdu-compact mt-1 block text-muted-foreground" lang="ur" dir="rtl">
              صحت پاس
            </span>
          </Link>

          {showChapters ? (
            <>
              <p className="mt-8 text-base text-muted-foreground">Signed in</p>
              <p className="mt-1 text-base leading-tight font-semibold">{user?.displayName ?? "Patient"}</p>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">Fictional records, not a real chart.</p>
              <nav className="mt-6 grid" aria-label="Passport chapters">
                {chapters.map((item) => {
                  const active = chapter?.href === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`px-3 py-3 ${active ? "bg-card" : "hover:bg-card/70"}`}
                    >
                      <span className={`block text-base font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">{item.spine}</span>
                    </Link>
                  );
                })}
              </nav>
            </>
          ) : (
            <p className="mt-6 text-base leading-6 font-medium">
              {doctorView
                ? "This page shows only the summary the patient approved."
                : "Your next doctor should know what your last doctor knew."}
            </p>
          )}

          <div className="mt-auto pt-10">
            <p className="text-sm leading-6 text-muted-foreground">
              Organizes records. Does not diagnose or recommend treatment.
            </p>
            <p className="urdu-compact mt-1 text-muted-foreground" lang="ur" dir="rtl">
              یہ ریکارڈ ترتیب دیتا ہے۔ یہ تشخیص یا علاج تجویز نہیں کرتا۔
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Photographs: Pavel Voinov, Caroline Sada, John Maravelakis, Ivan Slade. Unsplash.
            </p>
            {user && showChapters ? (
              <button
                type="button"
                className="mt-6 min-h-12 text-sm font-bold text-primary"
                onClick={() => void logout()}
              >
                Log out
              </button>
            ) : null}
            {doctorView ? (
              <Link
                href="/doctor-pass"
                className="mt-6 inline-flex min-h-12 items-center text-sm font-bold text-primary underline-offset-4 hover:underline"
              >
                Back to the patient DoctorPass
              </Link>
            ) : null}
          </div>
        </aside>

        <div className="flex min-h-dvh flex-col">
          <header className="sticky top-0 z-40 bg-background px-5 py-3 lg:hidden">
            <div className="flex items-start justify-between gap-3">
              <Link href={doctorView ? "/doctor-pass" : "/"}>
                <span className="block text-xl leading-none font-semibold">SehatPass</span>
                <span className="urdu-compact text-muted-foreground" lang="ur" dir="rtl">
                  صحت پاس
                </span>
              </Link>
              <div className="flex flex-col items-end gap-1">
                <p className="text-sm text-muted-foreground">Fictional records</p>
                {user && showChapters ? (
                  <button
                    type="button"
                    className="min-h-11 text-sm font-bold text-primary"
                    onClick={() => void logout()}
                  >
                    Log out
                  </button>
                ) : null}
              </div>
            </div>
            {doctorView ? (
              <Link
                href="/doctor-pass"
                className="mt-2 inline-flex text-sm font-bold text-primary underline-offset-4 hover:underline"
              >
                Back to the patient DoctorPass
              </Link>
            ) : null}
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Organizes records. Does not diagnose or recommend treatment.
            </p>
          </header>

          <main id="main" className={`mx-auto w-full max-w-2xl flex-1 px-5 py-8 ${showChapters ? "pb-28" : "pb-12"} lg:max-w-3xl lg:px-12 lg:py-12 lg:pb-16`}>
            {error && !authPage ? (
              <Alert className="mb-6 border-destructive/30 bg-card" data-testid="passport-error">
                <AlertTitle>Something needs another try</AlertTitle>
                <AlertDescription>
                  <p>{error}</p>
                  <button
                    type="button"
                    className="mt-2 font-bold text-primary underline-offset-4 hover:underline"
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

          {showChapters ? (
            <nav
              className="fixed inset-x-0 bottom-0 z-40 bg-card px-2 py-1 lg:hidden"
              aria-label="Passport chapters"
            >
              <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1">
                {chapters.map((item) => {
                  const active = chapter?.href === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-12 items-center justify-center px-1 text-center text-sm leading-tight font-medium ${
                          active ? "bg-background text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <span>{item.nav}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
