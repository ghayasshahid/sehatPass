export const chapters = [
  {
    href: "/",
    index: 1,
    title: "Upload and verify",
    nav: "Verify",
    spine: "Confirm what the papers say",
    meaning:
      "These lines were read from the papers. They stay proposed until you confirm them.",
  },
  {
    href: "/timeline",
    index: 2,
    title: "Timeline",
    nav: "Timeline",
    spine: "The same facts, oldest first",
    meaning: "The same facts, in date order, each one linked back to its report.",
  },
  {
    href: "/change-radar",
    index: 3,
    title: "Change Radar",
    nav: "Change",
    spine: "Confirmed HbA1c, compared",
    meaning:
      "Confirmed HbA1c only: 7.2% on 18 Jan 2026, 8.1% on 14 Apr 2026, 9.0% on 22 Jul 2026. The two metformin doses stay unresolved.",
  },
  {
    href: "/doctor-pass",
    index: 4,
    title: "DoctorPass",
    nav: "Pass",
    spine: "What you hand to the next doctor",
    meaning:
      "This is what you hand to the next doctor. The QR code is a two-hour invitation, not the record.",
  },
] as const;

export function chapterFor(pathname: string) {
  return chapters.find((chapter) =>
    chapter.href === "/" ? pathname === "/" : pathname.startsWith(chapter.href),
  );
}

export function ChapterHeader({
  index,
  spine,
  title,
  meaning,
}: {
  index?: number;
  spine?: string;
  title: string;
  meaning: string;
}) {
  return (
    <header className="chapter-open">
      {index && spine ? (
        <p className="text-sm font-medium text-muted-foreground lg:hidden">
          {index} of 4 · {spine}
        </p>
      ) : null}
      <h1 className="mt-1 text-3xl leading-tight font-semibold tracking-tight text-balance">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-foreground">{meaning}</p>
    </header>
  );
}
