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
    <div className="book-paper min-h-dvh text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="relative z-[1] mx-auto grid min-h-dvh w-full max-w-6xl lg:grid-cols-[17.5rem_1fr]">
        <aside className="book-spine relative hidden min-h-dvh flex-col px-7 py-8 lg:flex">
          <span className="book-fold" aria-hidden="true" />
          <Link href={doctorView ? "/doctor-pass" : "/"} className="block">
            <span className="block font-heading text-3xl leading-none font-semibold tracking-tight">
              SehatPass
            </span>
            <span className="urdu-compact mt-2 block text-muted-foreground">صحت پاس</span>
          </Link>

          {showChapters ? (
            <>
              <p className="mt-10 text-sm font-bold tracking-wide text-primary uppercase">Signed in</p>
              <p className="mt-1 font-heading text-2xl leading-tight font-semibold">
                {user?.displayName ?? "Patient"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Fictional demo. These records are not a real chart.
              </p>
              <nav className="mt-10 grid gap-6" aria-label="Passport chapters">
                {chapters.map((item) => {
                  const active = chapter?.href === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="group grid grid-cols-[1.75rem_1fr] gap-x-2"
                    >
                      <span
                        className={`font-heading text-xl leading-none font-semibold ${
                          active ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {item.index}
                      </span>
                      <span>
                        <span
                          className={`block font-heading text-lg leading-tight font-semibold ${
                            active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">{item.spine}</span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </>
          ) : (
            <p className="mt-10 max-w-[14rem] font-heading text-2xl leading-snug font-semibold">
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
          <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 px-5 py-3 backdrop-blur lg:hidden">
            <div className="flex items-start justify-between gap-3">
              <Link href={doctorView ? "/doctor-pass" : "/"}>
                <span className="block font-heading text-2xl leading-none font-semibold">SehatPass</span>
                <span className="urdu-compact text-muted-foreground">صحت پاس</span>
              </Link>
              <div className="flex flex-col items-end gap-1">
                <p className="text-xs font-bold tracking-wide text-amber-950 uppercase">Fictional demo</p>
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
              className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 py-2 backdrop-blur lg:hidden"
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
                        className={`flex min-h-12 flex-col items-center justify-center rounded-md px-1 text-center text-[0.78rem] leading-tight font-bold ${
                          active ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        <span className="font-heading text-base leading-none">{item.index}</span>
                        <span className="mt-1">{item.nav}</span>
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
