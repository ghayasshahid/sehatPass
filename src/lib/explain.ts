import { formatDate, formatHbA1c, formatUrduDate } from "@/lib/format";
import type { ChangePoint, Explanation } from "@/lib/types";

const TEMPLATE_DISCLOSURE =
  "No GROQ_API_KEY is set. This explanation is a grounded template filled only with confirmed HbA1c values and dates. A language model was not called, and the numerical change was calculated in code. It does not name a future disease. Discuss the change with a doctor.";

const FUTURE_DISEASE =
  /susceptible|will develop|future disease|\bat risk\b|prognosis|\bpredict(?:ed|s|ing)?\b|complication|other patients|risk score|خطرے میں|مستقبل کی بیماری|بیماری ہو گی|دوسرے مریض/i;

function englishList(points: ChangePoint[]): string {
  const parts = points.map(
    (point) =>
      `${formatHbA1c(point.value)}% on ${formatDate(point.date)} (${point.facilityName})`,
  );
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function urduList(points: ChangePoint[]): string {
  const parts = points.map(
    (point) =>
      `${formatUrduDate(point.date)} کو ${formatHbA1c(point.value)}%`,
  );
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} اور ${parts[1]}`;
  return `${parts.slice(0, -1).join("، ")}، اور ${parts[parts.length - 1]}`;
}

export function explainFromConfirmed(
  points: ChangePoint[],
  disclosure = TEMPLATE_DISCLOSURE,
): Explanation {
  if (points.length < 2) {
    return {
      ready: false,
      english:
        "An explanation waits until at least two HbA1c readings are confirmed. Unconfirmed numbers are not described as a change.",
      urdu: "جب تک کم از کم دو HbA1c ریڈنگز تصدیق شدہ نہ ہوں، تبدیلی نہیں بتائی جاتی۔",
      method: "template",
      disclosure,
    };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const rose = last.value > first.value;
  const fell = last.value < first.value;
  const englishDirection = rose
    ? `increased from ${formatHbA1c(first.value)}% to ${formatHbA1c(last.value)}%`
    : fell
      ? `decreased from ${formatHbA1c(first.value)}% to ${formatHbA1c(last.value)}%`
      : `stayed at ${formatHbA1c(first.value)}%`;
  const urduDirection = rose
    ? `${formatHbA1c(first.value)}% سے بڑھ کر ${formatHbA1c(last.value)}% ہو گیا`
    : fell
      ? `${formatHbA1c(first.value)}% سے کم ہو کر ${formatHbA1c(last.value)}% ہو گیا`
      : `${formatHbA1c(first.value)}% پر برقرار رہا`;

  return {
    ready: true,
    english: `Across the confirmed reports, HbA1c was ${englishList(points)}. The recorded HbA1c ${englishDirection}. This is not a diagnosis and not a treatment recommendation. Take this change to the next visit and show it to your doctor.`,
    urdu: `آپ کی تصدیق شدہ رپورٹس میں HbA1c ${urduList(points)} تھا۔ ان رپورٹس میں HbA1c ${urduDirection}۔ یہ تشخیص نہیں ہے، اور یہ علاج کی تجویز نہیں ہے۔ اس تبدیلی کو اگلی ملاقات پر اپنے ڈاکٹر کو دکھائیں۔`,
    method: "template",
    disclosure,
  };
}

export function explanationIsGrounded(
  english: string,
  urdu: string,
  points: ChangePoint[],
): boolean {
  if (FUTURE_DISEASE.test(english) || FUTURE_DISEASE.test(urdu)) return false;
  if (!english.includes("doctor")) return false;
  if (!/next visit/i.test(english)) return false;
  if (!urdu.includes("اگلی")) return false;
  if (!urdu.includes("ڈاکٹر")) return false;
  if (!/not a diagnosis/i.test(english)) return false;
  if (!urdu.includes("تشخیص نہیں")) return false;
  if (/metformin|prescribe|you should take|500|1000/i.test(english)) return false;
  if (/میٹفارمن|500|1000/.test(urdu)) return false;
  for (const point of points) {
    const printed = formatHbA1c(point.value);
    if (!english.includes(printed) || !urdu.includes(printed)) return false;
    if (!english.includes(formatDate(point.date))) return false;
  }
  return true;
}
