import type { Lead, Submission, Tap } from "./db/schema";

const COLUMNS: { key: keyof Submission; header: string }[] = [
  { key: "id", header: "id" },
  { key: "createdAt", header: "timestamp" },
  { key: "rating", header: "rating" },
  { key: "email", header: "email" },
  { key: "eventId", header: "event (e)" },
  { key: "brand", header: "brand (b)" },
  { key: "cardNumber", header: "card (c)" },
  { key: "userAgent", header: "user_agent" },
];

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  // Quote if the cell contains a comma, quote, or newline; double interior quotes.
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function submissionsToCsv(rows: Submission[]): string {
  const header = COLUMNS.map((c) => c.header).join(",");
  const lines = rows.map((row) =>
    COLUMNS.map((c) => escapeCell(row[c.key])).join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

const TAP_COLUMNS: { key: keyof Tap; header: string }[] = [
  { key: "id", header: "id" },
  { key: "createdAt", header: "timestamp" },
  { key: "eventId", header: "event (e)" },
  { key: "brand", header: "brand (b)" },
  { key: "cardNumber", header: "card (c)" },
  { key: "userAgent", header: "user_agent" },
];

export function tapsToCsv(rows: Tap[]): string {
  const header = TAP_COLUMNS.map((c) => c.header).join(",");
  const lines = rows.map((row) => TAP_COLUMNS.map((c) => escapeCell(row[c.key])).join(","));
  return [header, ...lines].join("\n") + "\n";
}

const LEAD_COLUMNS: { key: keyof Lead; header: string }[] = [
  { key: "createdAt", header: "received" },
  { key: "company", header: "company" },
  { key: "contactName", header: "contact" },
  { key: "role", header: "role" },
  { key: "email", header: "email" },
  { key: "phone", header: "phone" },
  { key: "website", header: "website" },
  { key: "interests", header: "interested_in" },
  { key: "campuses", header: "campuses" },
  { key: "timeline", header: "timeline" },
  { key: "budget", header: "budget" },
  { key: "message", header: "message" },
  { key: "heardFrom", header: "heard_from" },
  { key: "status", header: "status" },
  { key: "id", header: "id" },
];

export function leadsToCsv(rows: Lead[]): string {
  const header = LEAD_COLUMNS.map((c) => c.header).join(",");
  const lines = rows.map((row) =>
    LEAD_COLUMNS.map((c) => {
      const v = row[c.key];
      // interests is a text[] — flatten so it lands in one spreadsheet cell.
      return escapeCell(Array.isArray(v) ? v.join("; ") : v);
    }).join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}
