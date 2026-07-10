import type { Submission } from "./db/schema";

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
