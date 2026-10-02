"use client";

import { useState } from "react";

type DataType = "ratings" | "taps";

export default function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DataType>("ratings");
  const [e, setE] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");

  function download(filtered: boolean) {
    const params = new URLSearchParams();
    if (type === "taps") params.set("type", "taps");
    if (filtered) {
      if (e.trim()) params.set("e", e.trim());
      if (b.trim()) params.set("b", b.trim());
      if (c.trim()) params.set("c", c.trim());
    }
    const qs = params.toString();
    window.location.href = `/api/export${qs ? `?${qs}` : ""}`;
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-gold/70 bg-gold/15 px-3 text-xs font-semibold text-ink transition-colors hover:bg-gold/30"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        CSV
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-white p-3 shadow-2xl">
            {/* ratings vs taps */}
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-line bg-white p-1">
              {(["ratings", "taps"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-md py-1 text-xs font-semibold capitalize transition-colors ${
                    type === t ? "bg-gold text-ink-deep" : "text-muted hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={() => download(false)}
              className="w-full rounded-lg bg-white px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-line"
            >
              Download all {type}
            </button>

            <div className="my-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-fill" />
              <span className="text-[10px] uppercase tracking-wider text-muted">or filter</span>
              <span className="h-px flex-1 bg-fill" />
            </div>

            <Field label="Drop (e)" placeholder="rotm25" value={e} onChange={setE} />
            <Field label="Brand (b)" placeholder="daps" value={b} onChange={setB} />
            <Field label="Card (c)" placeholder="42" value={c} onChange={setC} />

            <button
              onClick={() => download(true)}
              disabled={!e.trim() && !b.trim() && !c.trim()}
              className="mt-2 w-full rounded-lg bg-gold px-3 py-2 text-sm font-bold text-ink-deep transition-colors hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download filtered
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <input
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-line bg-white px-2.5 font-mono text-xs text-ink outline-none placeholder:text-muted/70 focus:border-ink/40"
      />
    </label>
  );
}
