# SehatPass

A patient-controlled health passport. It turns scattered records into a history the patient can check and hand to the next doctor.

Tagline: Your next doctor should know what your last doctor knew.

This app organizes records. It does not diagnose, prescribe, or recommend treatment, and it does not predict a future disease or compare patients.

The one-click demo is **Sana Ahmed (fictional)**, an adult in Lahore followed for diabetes. Every bundled document is synthetic. HbA1c stays 7.2% (18 Jan 2026), 8.1% (14 Apr 2026), and 9.0% (22 Jul 2026). The metformin 500 mg and 1000 mg lines stay unresolved until the patient marks one. SehatPass does not pick a current dose.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4721](http://127.0.0.1:4721). The dev server listens on `0.0.0.0:4721`.

Sign up, then log in. Passwords are hashed with scrypt and are not stored in plain text. Each account sees only its own documents, facts, and DoctorPass invitations.

No API key is required. Loading the fictional records uses the saved extraction and says so on screen. A language model is not called.

## What is saved

Patients, documents, facts (including which lines are still proposed and which the patient confirmed), and DoctorPass invitations are stored in SQLite at `data/sehatpass.sqlite`. A refresh keeps them. Uploaded files stay in `data/uploads/`. That directory and the database are gitignored.

The doctor link stores an approved snapshot on the server. Later edits are not added to an invitation that was already created.

## Optional model hooks

Create `.env.local` on this machine if you have keys. Next.js reads it for the server. Do not commit it.

- `GEMINI_API_KEY` — an uploaded photo or PDF can be sent to Gemini only after the patient agrees. Returned fields stay proposed until the patient confirms them. Other records are not included. If the key is missing, the file is not sent and the fictional demo uses the saved extraction, which is stated on screen.
- `GROQ_API_KEY` — Groq may draft the Change Radar wording from confirmed HbA1c values only. The draft is discarded if it is not grounded in those values or if it names a future disease. The screen then shows the template. If the key is missing, the template is used and the screen says so. Either text tells the patient to discuss the change with a doctor.

## Demo path

1. **Sign up or log in.**
2. **Upload and verify.** Load the fictional records. Confirm the proposed fields, or correct one. Open an original report.
3. **Timeline.** Read the same facts in date order, with confirmation status and a path back to the source.
4. **Change Radar.** After HbA1c is confirmed, see the recorded rise from 7.2% (18 Jan 2026) to 9.0% (22 Jul 2026). The metformin doses stay unresolved. Read the Urdu explanation.
5. **DoctorPass.** Leave both doses unmarked unless you truly take one. Approve the summary, then open the doctor view from the invitation. The QR code contains only that two-hour link, not the medical record.

## Checks

```bash
npm test
npm run lint
```

`npm test` checks the HbA1c comparison, the unresolved metformin conflict, the follow-up question, that the doctor link does not carry the record, that passwords are hashed, and that one patient cannot read another patient's saved facts.
