import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compareHbA1c } from "@/lib/changes";
import { createFictionalRecords } from "@/lib/demo-case";
import { deriveDiscrepancies } from "@/lib/discrepancies";
import { explainFromConfirmed, explanationIsGrounded } from "@/lib/explain";
import { invitationUrl } from "@/lib/format";
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
      "The recorded HbA1c increased from 7.2% (18 Jan 2026) to 9.0% (22 Jul 2026) across these reports. You may want to discuss this change with your doctor.",
    );
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
    assert.match(explanation.urdu, /7\.2%/);
    assert.match(explanation.urdu, /9\.0%/);
    assert.match(explanation.urdu, /ڈاکٹر/);
    assert.doesNotMatch(explanation.urdu, /500|1000|میٹفارمن/);
    assert.equal(
      explanationIsGrounded(explanation.english, explanation.urdu, change.points),
      true,
    );
  });

  it("puts only an invitation in the doctor link", () => {
    const token = "abc123XYZ";
    const url = invitationUrl("http://127.0.0.1:4721", token);
    assert.equal(url, "http://127.0.0.1:4721/doctor/abc123XYZ");
    assert.doesNotMatch(url, /7\.2|metformin|hba1c/i);
  });
});
