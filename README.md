# SehatPass

Prototype for a patient-controlled health passport. It turns scattered fictional records into a history the patient can check and hand to the next doctor.

Tagline: Your next doctor should know what your last doctor knew.

This build organizes records. It does not diagnose, prescribe, or recommend treatment, and it does not predict future results.

The demo patient is **Sana Ahmed (fictional)**, an adult in Lahore followed for diabetes. Every document is synthetic.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4721](http://127.0.0.1:4721). The dev server listens on `0.0.0.0:4721`.

No API key is required. Loading the bundled records uses a cached extraction and says so on screen. A language model is not called.

Optional, server-side only:

- `GEMINI_API_KEY` — an uploaded photo or PDF can be sent to Gemini after you confirm the send. Bundled records still use the cache.
- `GROQ_API_KEY` — Groq may draft the Change Radar wording from confirmed HbA1c values only. If the draft is not grounded, the template is shown instead.

Do not commit `.env` files. The session file `data/session.json` and uploads in `data/uploads/` stay on this machine and are gitignored.

## Demo path

1. **Upload and verify.** Load the fictional records. Confirm the proposed fields, or correct one. Open an original report.
2. **Timeline.** Read the same facts in date order, with confirmation status and a path back to the source.
3. **Change Radar.** After HbA1c is confirmed, see the recorded rise from 7.2% (18 Jan 2026) to 9.0% (22 Jul 2026). The metformin doses stay unresolved. Read the Urdu explanation.
4. **DoctorPass.** Leave both doses unmarked unless you truly take one. Approve the summary, then open the doctor view from the invitation. The QR code contains only that short-lived link.

## Checks

```bash
npm test
npm run lint
```

`npm test` checks the HbA1c comparison, the unresolved metformin conflict, the follow-up question, and that the doctor link does not carry the record.
