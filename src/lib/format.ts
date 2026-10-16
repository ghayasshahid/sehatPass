const ENGLISH_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const URDU_MONTHS = [
  "جنوری",
  "فروری",
  "مارچ",
  "اپریل",
  "مئی",
  "جون",
  "جولائی",
  "اگست",
  "ستمبر",
  "اکتوبر",
  "نومبر",
  "دسمبر",
];

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatHbA1c(value: number): string {
  return round1(value).toFixed(1);
}

export function formatMeasurement(value: number, unit: string): string {
  if (unit === "%") return `${formatHbA1c(value)}%`;
  if (Number.isInteger(value)) return `${value} ${unit}`;
  return `${round1(value)} ${unit}`;
}

export function formatDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const label = ENGLISH_MONTHS[month - 1];
  if (!label || day < 1 || day > 31) return isoDate;
  return `${day} ${label} ${year}`;
}

export function formatUrduDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const label = URDU_MONTHS[month - 1];
  if (!label) return isoDate;
  return `${day} ${label} ${year}`;
}

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function clip(value: string, max = 400): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function documentTypeLabel(type: string): string {
  switch (type) {
    case "prescription":
      return "Prescription";
    case "lab_report":
      return "Lab report";
    case "prescription_with_lab":
      return "Prescription with attached lab";
    default:
      return type;
  }
}

export function invitationUrl(origin: string, token: string): string {
  return `${origin}/doctor/${token}`;
}

export function safeOrigin(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  try {
    const url = new URL(input);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

export function requestOrigin(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://localhost:4721";
  return `${proto}://${host}`;
}
