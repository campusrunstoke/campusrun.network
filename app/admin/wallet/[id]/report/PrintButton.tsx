"use client";

/** Opens the browser's print dialog — "Save as PDF" there gives a file to send the brand. */
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-deep"
    >
      Print / save as PDF
    </button>
  );
}
