"use client";

import { useState } from "react";

export default function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [e, setE] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");

  function download(filtered: boolean) {
    const params = new URLSearchParams();
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
        className="flex h-9 items-center gap-1.5 rounded-lg border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-3 text-xs font-semibold text-[#FFCC00] transition-colors hover:bg-[#FFCC00]/20"
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
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-white/10 bg-[#0E1420] p-3 shadow-2xl">
            <button
              onClick={() => download(false)}
              className="w-full rounded-lg bg-white/5 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10"
            >
              Download all submissions
            </button>

            <div className="my-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-wider text-[#6B7688]">
                or filter
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <Field label="Drop (e)" placeholder="rotm25" value={e} onChange={setE} />
            <Field label="Brand (b)" placeholder="daps" value={b} onChange={setB} />
            <Field label="Card (c)" placeholder="42" value={c} onChange={setC} />

            <button
              onClick={() => download(true)}
              disabled={!e.trim() && !b.trim() && !c.trim()}
              className="mt-2 w-full rounded-lg bg-[#FFCC00] px-3 py-2 text-sm font-bold text-[#0A1420] transition-colors hover:bg-[#FFD633] disabled:cursor-not-allowed disabled:opacity-40"
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
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-[#6B7688]">{label}</span>
      <input
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-2.5 font-mono text-xs text-white outline-none placeholder:text-[#5A6577] focus:border-[#FFCC00]/50"
      />
    </label>
  );
}
