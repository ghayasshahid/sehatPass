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
    <header>
      <h1 className="max-w-[16ch] text-[clamp(2rem,4vw,3.4rem)] font-medium tracking-[-0.025em] text-balance">
        {title}
      </h1>
      <p className="mt-4 max-w-[38rem] text-[clamp(1.05rem,1rem+0.3vw,1.2rem)] leading-normal">{meaning}</p>
      {index && spine ? <span className="sr-only">{spine}</span> : null}
    </header>
  );
}
