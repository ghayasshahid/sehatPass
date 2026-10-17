import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compareHbA1c, compareMatchingTests } from "@/lib/changes";
import { createFictionalRecords, PATIENT } from "@/lib/demo-case";
import { deriveDiscrepancies } from "@/lib/discrepancies";
import { explainFromConfirmed, explanationIsGrounded } from "@/lib/explain";
import { invitationUrl, originForPhone } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import {
  findInvitation,
  insertUser,
  invitationUploadOwner,
  loadPassport,
  openDatabase,
  savePassport,
} from "@/lib/records-db";
import { buildSummary } from "@/lib/summary";
import type { Fact } from "@/lib/types";

function confirmedFacts(facts: Fact[]): Fact[] {
  return facts.map((fact) => ({ ...fact, status: "confirmed" as const }));
}

describe("fictional HbA1c change", () => {
  const { documents, facts } = createFictionalRecords();

  it("does not describe a change from proposed values", () => {
    const change = compareHbA1c(facts, documents);
    assert.equal(change.ready, false);
    assert.equal(change.statement, null);
  });

  it("states the recorded rise after confirmation", () => {
    const change = compareHbA1c(confirmedFacts(facts), documents);
    assert.equal(change.ready, true);
    assert.deepEqual(
      change.points.map((point) => point.value),
      [7.2, 8.1, 9.0],
    );
    assert.equal(change.delta, 1.8);
    assert.equal(
      change.statement,
      "The recorded HbA1c increased from 7.2% (18 Jan 2026) to 9.0% (22 Jul 2026) across these reports. Take this change to the next visit.",
    );
  });

  it("compares another confirmed test across visits and leaves a single reading alone", () => {
    const confirmed = confirmedFacts(facts);
    assert.equal(compareMatchingTests(confirmed, documents).length, 0);
    const later = confirmed.map((fact) =>
      fact.id === "fact-lcl-glucose"
        ? { ...fact, id: "fact-later-glucose", documentId: "doc-shifa", value: 160 }
        : fact,
    );
    later.push(confirmed.find((fact) => fact.id === "fact-lcl-glucose") as Fact);
    const series = compareMatchingTests(later, documents);
    assert.equal(series.length, 1);
    assert.match(series[0].statement, /136 mg\/dL/);
    assert.match(series[0].statement, /160 mg\/dL/);
    assert.match(series[0].statement, /next visit/);
    assert.doesNotMatch(series[0].statement, /disease|diagnos/i);
  });

  it("leaves a different unit off the series", () => {
    const altered = confirmedFacts(facts).map((fact) =>
      fact.id === "fact-medicare-hba1c" ? { ...fact, unit: "mmol/mol" } : fact,
    );
    const change = compareHbA1c(altered, documents);
    assert.equal(change.points.length, 2);
    assert.ok(change.excludedNotes.some((note) => note.includes("not %")));
  });
});

describe("uncertainty", () => {
  const { documents, facts } = createFictionalRecords();

  it("keeps the metformin conflict unresolved and asks about follow-up", () => {
    const discrepancies = deriveDiscrepancies(confirmedFacts(facts), documents);
    const dose = discrepancies.find((item) => item.kind === "conflicting_doses");
    const followUp = discrepancies.find(
      (item) => item.kind === "follow_up_without_completion",
    );
    assert.ok(dose);
    assert.equal(dose?.status, "unresolved");
    assert.match(dose?.detail ?? "", /500 mg/);
    assert.match(dose?.detail ?? "", /1000 mg/);
    assert.match(dose?.detail ?? "", /cannot determine current treatment/);
    assert.ok(followUp);
    assert.match(followUp?.question ?? "", /Did this follow-up happen/);
    assert.match(followUp?.detail ?? "", /not a claim that it was missed/);
  });

  it("does not put a dose in current medications unless the patient marks it", () => {
    const confirmed = confirmedFacts(facts);
    const summary = buildSummary(
      {
        patient: {
          id: "patient-sana-ahmed",
          displayName: "Sana Ahmed",
          fictional: true,
          city: "Lahore",
          focus: "Diabetes follow-up",
        },
        documents,
        facts: confirmed,
        discrepancies: deriveDiscrepancies(confirmed, documents),
      },
      compareHbA1c(confirmed, documents),
    );
    assert.equal(summary.currentMedications.length, 0);
    assert.match(summary.currentMedicationsNote, /does not choose a dose/);
    assert.match(summary.allergiesNote, /No allergies/);
    assert.equal(summary.recentLabs.length, 4);
    assert.equal(summary.approvedDocuments.length, 4);
    assert.deepEqual(
      summary.approvedDocuments.map((document) => document.id),
      ["doc-al-noor", "doc-lahore-city-lab", "doc-medicare", "doc-shifa"],
    );
    const shared = JSON.stringify(summary.approvedDocuments);
    assert.match(shared, /7\.2%/);
    assert.match(shared, /8\.1%/);
    assert.match(shared, /9\.0%/);
    assert.match(shared, /500 mg/);
    assert.match(shared, /1000 mg/);

    const hidden = confirmed.map((fact) =>
      fact.id === "fact-shifa-hba1c" ? { ...fact, status: "proposed" as const } : fact,
    );
    const partial = buildSummary(
      {
        patient: {
          id: "patient-sana-ahmed",
          displayName: "Sana Ahmed",
          fictional: true,
          city: "Lahore",
          focus: "Diabetes follow-up",
        },
        documents,
        facts: hidden,
        discrepancies: deriveDiscrepancies(hidden, documents),
      },
      compareHbA1c(hidden, documents),
    );
    assert.equal(
      partial.approvedDocuments.some((document) =>
        document.lines.some((line) => line.text.includes("9.0")),
      ),
      false,
    );

    const marked = confirmed.map((fact) =>
      fact.id === "fact-al-noor-metformin"
        ? { ...fact, patientMarkedCurrent: true }
        : fact,
    );
    const withMark = buildSummary(
      {
        patient: {
          id: "patient-sana-ahmed",
          displayName: "Sana Ahmed",
          fictional: true,
          city: "Lahore",
          focus: "Diabetes follow-up",
        },
        documents,
        facts: marked,
        discrepancies: deriveDiscrepancies(marked, documents),
      },
      compareHbA1c(marked, documents),
    );
    assert.equal(withMark.currentMedications.length, 1);
    assert.match(withMark.currentMedications[0].text, /500 mg/);
    assert.match(withMark.currentMedications[0].text, /marked current by the patient/);
  });
});

describe("explanation and invitation", () => {
  it("answers in Urdu from confirmed values only", () => {
    const { documents, facts } = createFictionalRecords();
    const change = compareHbA1c(confirmedFacts(facts), documents);
    const explanation = explainFromConfirmed(change.points);
    assert.equal(explanation.ready, true);
    assert.match(explanation.english, /7\.2%/);
    assert.match(explanation.english, /8\.1%/);
    assert.match(explanation.english, /9\.0%/);
    assert.match(explanation.english, /not a diagnosis/);
    assert.match(explanation.english, /next visit/);
    assert.match(explanation.urdu, /اگلی/);
    assert.match(explanation.urdu, /7\.2%/);
    assert.match(explanation.urdu, /9\.0%/);
    assert.match(explanation.urdu, /ڈاکٹر/);
    assert.doesNotMatch(explanation.urdu, /500|1000|میٹفارمن/);
    assert.equal(
      explanationIsGrounded(explanation.english, explanation.urdu, change.points),
      true,
    );
    const namesAFutureDisease = `${explanation.english} You are susceptible to a future disease.`;
    assert.equal(
      explanationIsGrounded(namesAFutureDisease, explanation.urdu, change.points),
      false,
    );
  });

  it("puts only an invitation in the doctor link", () => {
    const token = "abc123XYZ";
    const url = invitationUrl("http://127.0.0.1:4721", token);
    assert.equal(url, "http://127.0.0.1:4721/doctor/abc123XYZ");
    assert.doesNotMatch(url, /7\.2|metformin|hba1c/i);
    const phone = originForPhone("http://127.0.0.1:4721", "192.168.1.20");
    assert.equal(phone, "http://192.168.1.20:4721");
    assert.equal(originForPhone("http://localhost:4721", "10.0.0.8"), "http://10.0.0.8:4721");
    assert.equal(originForPhone("https://sehat.example", "192.168.1.20"), "https://sehat.example");
    assert.equal(originForPhone("http://127.0.0.1:4721", null), "http://127.0.0.1:4721");
    assert.doesNotMatch(`${phone}/doctor/abc123XYZ`, /7\.2|metformin|hba1c/i);
  });
});

describe("accounts and saved records", () => {
  it("stores a password hash instead of the password", async () => {
    const password = "correct horse battery";
    const hash = await hashPassword(password);
    assert.equal(hash.includes(password), false);
    assert.match(hash, /^scrypt\$/);
    assert.equal(await verifyPassword(password, hash), true);
    assert.equal(await verifyPassword("wrong-password", hash), false);
  });

  it("keeps one patient's confirmed facts and invitation away from another patient", () => {
    const database = openDatabase(":memory:");
    const createdAt = "2026-10-17T00:00:00.000Z";
    insertUser(database, {
      id: "user-a",
      email: "a@example.com",
      displayName: "A",
      passwordHash: "hash-a",
      createdAt,
    });
    insertUser(database, {
      id: "user-b",
      email: "b@example.com",
      displayName: "B",
      passwordHash: "hash-b",
      createdAt,
    });

    const { documents, facts } = createFictionalRecords();
    const confirmed = confirmedFacts(facts);
    const change = compareHbA1c(confirmed, documents);
    const snapshot = buildSummary(
      {
        patient: PATIENT,
        documents,
        facts: confirmed,
        discrepancies: deriveDiscrepancies(confirmed, documents),
      },
      change,
      createdAt,
    );
    const token = "inviteToken1";
    savePassport(database, "user-a", {
      patient: PATIENT,
      loaded: true,
      extraction: null,
      documents,
      facts: confirmed,
      invitations: [
        {
          token,
          url: invitationUrl("http://127.0.0.1:4721", token),
          createdAt,
          expiresAt: "2026-10-18T00:00:00.000Z",
          snapshot,
        },
      ],
      updatedAt: createdAt,
    });

    const other = confirmed.find((fact) => fact.id === "fact-lcl-hba1c");
    assert.ok(other);
    savePassport(database, "user-b", {
      patient: {
        id: "patient-user-b",
        displayName: "B",
        fictional: true,
        city: "",
        focus: "Your records",
      },
      loaded: true,
      extraction: null,
      documents: [],
      facts: [{ ...other, value: 4.4, patientId: "patient-user-b" }],
      invitations: [],
      updatedAt: createdAt,
    });

    const savedA = loadPassport(database, "user-a");
    const savedB = loadPassport(database, "user-b");
    assert.ok(savedA);
    assert.ok(savedB);
    assert.deepEqual(
      savedA.facts
        .filter((fact) => fact.analyte === "hba1c")
        .map((fact) => fact.value ?? 0)
        .sort((left, right) => left - right),
      [7.2, 8.1, 9.0],
    );
    assert.deepEqual(
      savedA.facts
        .filter((fact) => fact.kind === "medication")
        .map((fact) => fact.doseText)
        .sort(),
      ["1000 mg", "500 mg"],
    );
    assert.equal(
      savedA.facts.some((fact) => fact.patientMarkedCurrent === true),
      false,
    );
    assert.equal(savedA.facts.find((fact) => fact.id === "fact-lcl-hba1c")?.value, 7.2);
    assert.equal(savedB.facts.length, 1);
    assert.equal(savedB.facts[0]?.value, 4.4);
    assert.equal(savedB.invitations.length, 0);
    assert.equal(savedA.invitations[0]?.url, "http://127.0.0.1:4721/doctor/inviteToken1");
    assert.doesNotMatch(savedA.invitations[0]?.url ?? "", /7\.2|metformin|hba1c/i);
    const invitation = findInvitation(database, token);
    assert.equal(invitation?.snapshot.patientName, "Sana Ahmed");
    assert.equal(invitationUploadOwner(database, token, "doc-lahore-city-lab"), "user-a");
    assert.equal(invitationUploadOwner(database, token, "not-in-the-invitation"), null);
    assert.equal(JSON.stringify(invitation).includes("user-b"), false);
    database.close();
  });
});
