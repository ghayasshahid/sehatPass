function Stamp() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <p className="-rotate-12 border-4 border-red-700/60 px-4 py-1 text-center text-4xl font-black tracking-[0.25em] text-red-700/70">
        FICTIONAL
      </p>
    </div>
  );
}

function Paper({
  accent,
  children,
}: {
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <article className="relative overflow-hidden border border-stone-300 bg-[#fffdf8] px-5 py-6 text-stone-900 shadow-md">
      <div className={`h-2 ${accent}`} />
      <Stamp />
      <div className="relative mt-4">{children}</div>
      <p className="relative mt-8 border-t border-stone-300 pt-3 text-xs leading-5 text-stone-600">
        Synthetic document for the SehatPass prototype. Not a real patient, clinician, or laboratory. Do not use for care.
      </p>
    </article>
  );
}

export function FictionalReport({ id }: { id: string }) {
  if (id === "doc-al-noor") {
    return (
      <Paper accent="bg-emerald-800">
        <header>
          <p className="text-xs font-bold tracking-[0.2em] text-emerald-900 uppercase">Al-Noor Clinic · Lahore</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold">Outpatient prescription</h1>
          <p className="text-sm">14 Gulberg III, Lahore · Demo desk, not a real clinic</p>
        </header>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-stone-500">Patient</dt>
            <dd className="font-semibold">Sana Ahmed — fictional demo</dd>
          </div>
          <div>
            <dt className="text-stone-500">Document date</dt>
            <dd className="font-semibold">12 Jan 2026</dd>
          </div>
          <div>
            <dt className="text-stone-500">Document type</dt>
            <dd>Prescription</dd>
          </div>
          <div>
            <dt className="text-stone-500">Clinician</dt>
            <dd>Dr. Hina Qureshi (fictional)</dd>
          </div>
        </dl>
        <div className="mt-6 border border-stone-300 p-4">
          <p className="font-heading text-4xl">Rx</p>
          <p className="mt-3 text-lg font-semibold">Tab. Metformin 500 mg — twice daily</p>
          <p className="mt-4">Follow-up: HbA1c in 3 months</p>
        </div>
        <p className="mt-4 text-sm text-stone-600">
          This prescription is a historical note. It is not proof of current treatment.
        </p>
      </Paper>
    );
  }

  if (id === "doc-lahore-city-lab") {
    return (
      <Paper accent="bg-sky-800">
        <header>
          <p className="text-xs font-bold tracking-[0.2em] text-sky-900 uppercase">Lahore City Lab</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold">Clinical chemistry report</h1>
          <p className="text-sm">88 Mall Road, Lahore · Accession LCL-260118-441 · Fictional laboratory</p>
        </header>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-stone-500">Patient</dt>
            <dd className="font-semibold">Sana Ahmed — fictional demo</dd>
          </div>
          <div>
            <dt className="text-stone-500">Document date</dt>
            <dd className="font-semibold">18 Jan 2026</dd>
          </div>
          <div>
            <dt className="text-stone-500">Document type</dt>
            <dd>Lab report</dd>
          </div>
          <div>
            <dt className="text-stone-500">Facility</dt>
            <dd>Lahore City Lab, Lahore</dd>
          </div>
        </dl>
        <table className="mt-6 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stone-400">
              <th className="py-2">Test</th>
              <th className="py-2">Result</th>
              <th className="py-2">Interval printed by the lab</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-stone-200">
              <td className="py-3 font-semibold">HbA1c</td>
              <td className="py-3 text-lg font-semibold">HbA1c 7.2 %</td>
              <td className="py-3">4.0–5.6 %</td>
            </tr>
            <tr>
              <td className="py-3 font-semibold">Fasting glucose</td>
              <td className="py-3 text-lg font-semibold">Fasting glucose 136 mg/dL</td>
              <td className="py-3">70–99 mg/dL</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs leading-5 text-stone-600">
          The interval is printed on this fictional form. SehatPass does not interpret it and does not diagnose.
        </p>
      </Paper>
    );
  }

  if (id === "doc-medicare") {
    return (
      <Paper accent="bg-rose-900">
        <header>
          <p className="text-xs font-bold tracking-[0.2em] text-rose-950 uppercase">Medicare Diagnostics</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold">HbA1c report</h1>
          <p className="text-sm">21 Johar Town, Lahore · Accession MD-260414-902 · Fictional laboratory</p>
        </header>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-stone-500">Patient</dt>
            <dd className="font-semibold">Sana Ahmed — fictional demo</dd>
          </div>
          <div>
            <dt className="text-stone-500">Document date</dt>
            <dd className="font-semibold">14 Apr 2026</dd>
          </div>
          <div>
            <dt className="text-stone-500">Document type</dt>
            <dd>Lab report</dd>
          </div>
          <div>
            <dt className="text-stone-500">Facility</dt>
            <dd>Medicare Diagnostics, Lahore</dd>
          </div>
        </dl>
        <div className="mt-6 border border-stone-300 p-4">
          <p className="text-sm text-stone-500">Result</p>
          <p className="text-3xl font-semibold">HbA1c 8.1 %</p>
          <p className="mt-2 text-sm">Method note on the form: immunoassay. No diagnosis is printed.</p>
        </div>
      </Paper>
    );
  }

  if (id === "doc-shifa") {
    return (
      <div className="grid gap-4">
        <Paper accent="bg-teal-900">
          <header>
            <p className="text-xs font-bold tracking-[0.2em] text-teal-950 uppercase">Shifa Community Clinic · Lahore</p>
            <h1 className="mt-1 font-heading text-3xl font-semibold">Prescription with attached lab</h1>
            <p className="text-sm">6 Faisal Town, Lahore · Dr. Faraz Malik (fictional)</p>
          </header>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-stone-500">Patient</dt>
              <dd className="font-semibold">Sana Ahmed — fictional demo</dd>
            </div>
            <div>
              <dt className="text-stone-500">Document date</dt>
              <dd className="font-semibold">22 Jul 2026</dd>
            </div>
          </dl>
          <div className="mt-6 border border-stone-300 p-4">
            <p className="font-heading text-4xl">Rx</p>
            <p className="mt-3 text-lg font-semibold">Tab. Metformin 1000 mg — twice daily</p>
            <p className="mt-3 text-sm text-stone-600">
              This line conflicts with the January 500 mg prescription. The form does not say which dose is current.
            </p>
          </div>
        </Paper>
        <Paper accent="bg-teal-700">
          <p className="text-xs font-bold tracking-[0.2em] text-teal-950 uppercase">Attached lab slip · SHF-260722-117</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold">Same-visit HbA1c</h2>
          <p className="mt-4 text-3xl font-semibold">HbA1c 9.0 %</p>
          <p className="mt-2 text-sm">Collected 22 Jul 2026 · Shifa Community Clinic, Lahore</p>
        </Paper>
      </div>
    );
  }

  return null;
}

export function isBundledReport(id: string): boolean {
  return (
    id === "doc-al-noor" ||
    id === "doc-lahore-city-lab" ||
    id === "doc-medicare" ||
    id === "doc-shifa"
  );
}
