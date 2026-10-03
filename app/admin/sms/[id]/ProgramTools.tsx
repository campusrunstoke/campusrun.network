"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { smsSegments } from "@/lib/sms";

type Replies = {
  replyEntry: string;
  replyAnswer: string;
  replyWrongKeyword: string;
  replyHelp: string;
  replyClosed: string;
};

const REPLY_META: { key: keyof Replies; title: string; when: string }[] = [
  { key: "replyEntry", title: "Entry confirmation", when: "Sent once, the moment someone texts the keyword. Carries the question." },
  { key: "replyAnswer", title: "Thanks for answering", when: "Sent once, after their first reply. Then we go quiet." },
  { key: "replyWrongKeyword", title: "Wrong word", when: "Someone new texts anything other than the keyword. At most once a day per number." },
  { key: "replyHelp", title: "HELP reply", when: "Carriers require an answer to HELP. Point to an inbox someone reads." },
  { key: "replyClosed", title: "Giveaway ended", when: "Keyword texted after you close entries. Once per number." },
];

export default function ProgramTools({
  id,
  open,
  keyword,
  question,
  replies: initial,
}: {
  id: string;
  open: boolean;
  keyword: string;
  question: string | null;
  replies: Replies;
}) {
  const router = useRouter();
  const [replies, setReplies] = useState(initial);
  const [q, setQ] = useState(question ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [winner, setWinner] = useState<{ phone: string; enteredAt: string; answer: string | null; of: number } | null>(null);
  const [sim, setSim] = useState({ tester: 1, body: keyword });
  const [thread, setThread] = useState<{ from: "them" | "us"; text: string; note?: string }[]>([]);
  const dirty = JSON.stringify(replies) !== JSON.stringify(initial) || q !== (question ?? "");

  async function patch(body: object, ok: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/sms/programs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: ok } : { ok: false, text: json.error ?? "Save failed." });
    if (res.ok) router.refresh();
  }

  async function draw() {
    if (!window.confirm("Draw a winner now? Every entry has an equal chance. The result isn't saved — write it down.")) return;
    const res = await fetch(`/api/admin/sms/programs/${id}/winner`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg({ ok: false, text: json.error ?? "Couldn't draw." });
    setWinner({ ...json.winner, of: json.of });
  }

  async function simulate() {
    if (!sim.body.trim()) return;
    const res = await fetch("/api/admin/sms/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sim) });
    const json = await res.json().catch(() => ({}));
    const note = json.reply ? undefined : `no reply (${String(json.kind ?? "error").replace(/_/g, " ")})`;
    setThread((t) => [...t, { from: "them", text: sim.body }, ...(json.reply ? [{ from: "us" as const, text: json.reply }] : [{ from: "us" as const, text: "", note }])]);
    setSim((s) => ({ ...s, body: "" }));
    router.refresh();
  }

  async function clearTests() {
    const res = await fetch("/api/admin/sms/simulate", { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setThread([]);
    setMsg({ ok: true, text: `Cleared ${json.removed ?? 0} test entr${json.removed === 1 ? "y" : "ies"}.` });
    router.refresh();
  }

  const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink/40";

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{msg.text}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">Entries</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {open ? "Open — texting the keyword enters people." : "Closed — the keyword gets the “ended” reply; no new entries."}
          </p>
          <button
            onClick={() => {
              if (open && !window.confirm("Close entries? Anyone who texts the keyword from now on gets the “giveaway ended” reply.")) return;
              patch({ open: !open }, open ? "Entries closed." : "Entries open.");
            }}
            disabled={busy}
            className={`mt-3 h-9 w-full rounded-full text-sm font-semibold disabled:opacity-50 ${open ? "border border-line text-ink hover:border-ink/30" : "bg-ink text-white hover:bg-ink-deep"}`}
          >
            {open ? "Close entries" : "Open entries"}
          </button>
        </section>

        <section className="rounded-2xl border border-line bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-ink">Pick a winner</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">A fair random draw across every entry. Answering the question doesn&apos;t change anyone&apos;s odds.</p>
          <button onClick={draw} className="mt-3 h-9 rounded-full bg-gold px-4 text-sm font-bold text-ink-deep hover:bg-gold-deep">Draw a winner</button>
          {winner && (
            <div className="mt-3 rounded-xl bg-fill p-3 text-sm text-ink">
              <div className="font-mono text-base font-bold">{winner.phone}</div>
              <div className="text-xs text-muted">
                Entered {new Date(winner.enteredAt).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} · drawn from {winner.of} entr{winner.of === 1 ? "y" : "ies"}
                {winner.answer ? ` · answered “${winner.answer}”` : ""}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* replies */}
      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">What we text back</h2>
            <p className="mt-0.5 text-xs text-muted">Exact wording, sent as written. Changes apply to the next text that comes in.</p>
          </div>
          <button
            onClick={() => patch({ ...replies, question: q.trim() || null }, "Replies saved.")}
            disabled={busy || !dirty}
            className="h-9 rounded-full bg-gold px-4 text-sm font-bold text-ink-deep hover:bg-gold-deep disabled:opacity-40"
          >
            Save replies
          </button>
        </div>
        <label className="mb-4 block">
          <span className="mb-1 block text-[11px] font-semibold text-muted">Bonus question (for the CSV column — put the wording itself in the entry confirmation)</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} className={input} />
        </label>
        <div className="grid gap-4 lg:grid-cols-2">
          {REPLY_META.map(({ key, title, when }) => {
            const s = smsSegments(replies[key]);
            return (
              <label key={key} className="block">
                <span className="block text-sm font-semibold text-ink">{title}</span>
                <span className="mb-1.5 block text-[11px] text-muted">{when}</span>
                <textarea rows={3} value={replies[key]} onChange={(e) => setReplies((r) => ({ ...r, [key]: e.target.value }))} className={input} />
                <span className={`mt-1 block text-[11px] ${s.segments > 1 || s.unicode ? "text-amber-700" : "text-muted"}`}>
                  {s.length} characters · {s.segments} text{s.segments === 1 ? "" : "s"} per send
                  {s.unicode && ` · special characters (${s.offenders.join(" ")}) shrink each text to 70 characters — swap curly quotes/emoji for plain ones`}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* simulator */}
      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">Text simulator</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-muted">
              Pretend to be a student. Runs the exact same rules as a real text and shows what we&apos;d reply — no Twilio, no cost.
              Uses fake (310) 555-01xx numbers; clear them when you&apos;re done so they don&apos;t count.
            </p>
          </div>
          <button onClick={clearTests} className="h-9 rounded-full border border-line px-4 text-xs font-semibold text-ink hover:border-ink/30">Clear test texts</button>
        </div>
        <div className="max-w-md rounded-2xl bg-fill p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted">
            Texting from test phone #
            <input type="number" min={0} max={99} value={sim.tester} onChange={(e) => setSim((s) => ({ ...s, tester: Math.max(0, Math.min(99, Number(e.target.value))) }))} className="h-7 w-14 rounded-md border border-line bg-white px-2 font-mono text-xs text-ink" />
            <span>(each # is a different person)</span>
          </div>
          <div className="mb-3 max-h-72 space-y-1.5 overflow-y-auto">
            {thread.length === 0 && <p className="py-4 text-center text-xs text-muted">Send “{keyword}” to start.</p>}
            {thread.map((m, i) =>
              m.note ? (
                <p key={i} className="text-center text-[11px] italic text-muted">{m.note}</p>
              ) : (
                <div key={i} className={`flex ${m.from === "them" ? "justify-end" : "justify-start"}`}>
                  <span className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${m.from === "them" ? "bg-[#0a84ff] text-white" : "bg-white text-ink"}`}>{m.text}</span>
                </div>
              ),
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); simulate(); }} className="flex gap-2">
            <input value={sim.body} onChange={(e) => setSim((s) => ({ ...s, body: e.target.value }))} placeholder="Type a text…" className={input} />
            <button type="submit" className="h-10 shrink-0 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-deep">Send</button>
          </form>
        </div>
      </section>
    </div>
  );
}
