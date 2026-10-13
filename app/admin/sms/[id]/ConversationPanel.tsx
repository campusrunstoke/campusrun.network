"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { smsSegments } from "@/lib/sms";

/**
 * The conversation (each text sent after any reply to the one before), the Live switch
 * for first texts to web sign-ups, and "Send to everyone waiting".
 */
export default function ConversationPanel({
  id,
  initialSteps,
  liveSending,
  waiting,
  sendingReady,
  linkedCampaign,
}: {
  id: string;
  initialSteps: string[];
  liveSending: boolean;
  waiting: number;
  sendingReady: boolean;
  linkedCampaign: boolean;
}) {
  const router = useRouter();
  const [steps, setSteps] = useState<string[]>(initialSteps.length ? initialSteps : [""]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(steps.map((s) => s.trim()).filter(Boolean)) !== JSON.stringify(initialSteps);

  async function patch(body: object, ok: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/sms/programs/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: ok } : { ok: false, text: json.error ?? "Save failed." });
    if (res.ok) router.refresh();
  }

  async function sendWaiting() {
    if (!window.confirm(`Text the first message to up to 150 of the ${waiting} people waiting? Each costs about 1¢.`)) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/sms/programs/${id}/send-waiting`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: json.error ?? "Couldn't send." });
    const r = json.result as Record<string, number>;
    const parts = [
      r.sent && `${r.sent} sent`,
      r.opted_out && `${r.opted_out} skipped (texted STOP)`,
      r.already_started && `${r.already_started} already texted`,
      r.capped && `${r.capped} skipped (daily limit)`,
      r.failed && `${r.failed} failed — check Twilio`,
      r.outside_hours && "stopped: outside 9am–5pm Pacific",
      r.not_live && "stopped: Live is off",
      r.not_configured && "stopped: Twilio isn't connected",
    ].filter(Boolean);
    setMsg({ ok: !r.failed, text: parts.length ? parts.join(" · ") : "Nobody was waiting." });
    router.refresh();
  }

  const input = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ink/40";
  return (
    <section className="mb-6 rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">Conversation</h2>
          <p className="mt-0.5 max-w-2xl text-xs text-muted">
            Text 1 goes out when someone texts the keyword, or ticks the box on the campaign page. Each next text sends
            after any reply. Each sends once per number; STOP ends it immediately; nothing after the last text.
          </p>
        </div>
        <button onClick={() => patch({ steps: steps.map((s) => s.trim()).filter(Boolean) }, "Conversation saved.")} disabled={busy || !dirty} className="h-9 rounded-full bg-gold px-4 text-sm font-bold text-ink-deep hover:bg-gold-deep disabled:opacity-40">
          Save conversation
        </button>
      </div>

      <div className="grid gap-3">
        {steps.map((t, i) => {
          const s = smsSegments(t);
          return (
            <label key={i} className="block">
              <span className="mb-1 flex items-center justify-between text-sm font-semibold text-ink">
                <span>Text {i + 1}{i === 0 ? " — must say who it's from + STOP/HELP" : " — after any reply"}</span>
                {steps.length > 1 && (
                  <button type="button" onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="text-[11px] font-medium text-muted hover:text-red-700">Remove</button>
                )}
              </span>
              <textarea id={`step-${i}`} rows={2} value={t} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? e.target.value : x)))} className={input} />
              <span className={`mt-1 block text-[11px] ${s.segments > 1 || s.unicode ? "text-amber-700" : "text-muted"}`}>
                {s.length} characters · {s.segments} text{s.segments === 1 ? "" : "s"} per send
                {s.unicode && ` · emoji/curly quotes (${s.offenders.join(" ")}) make it cost more`}
              </span>
            </label>
          );
        })}
        {steps.length < 6 && (
          <button type="button" onClick={() => setSteps([...steps, ""])} className="justify-self-start text-xs font-semibold text-ink underline underline-offset-4">
            + Add a text
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <div className={`rounded-xl p-3 ${liveSending ? "bg-emerald-50" : "bg-fill"}`}>
          <div className="text-sm font-semibold text-ink">{liveSending ? "● Live" : "○ Not live"}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {liveSending
              ? "Web sign-ups get Text 1 right away (9am–5pm Pacific; otherwise they wait for the button)."
              : "No first texts go out. Turn on only after Twilio approves the number."}
          </p>
          <button
            onClick={() => {
              if (!liveSending && !window.confirm("Go live? Only do this once Twilio shows the number as verified.")) return;
              patch({ liveSending: !liveSending }, liveSending ? "Live sending off." : "Live — first texts will go out.");
            }}
            disabled={busy || (!liveSending && !sendingReady)}
            className="mt-2 h-9 w-full rounded-full border border-line text-sm font-semibold text-ink hover:border-ink/30 disabled:opacity-40"
            title={!sendingReady ? "Twilio isn't fully connected (Account SID, Auth Token, number)" : undefined}
          >
            {liveSending ? "Turn off" : "Go live"}
          </button>
        </div>
        <div className="rounded-xl bg-fill p-3">
          <div className="text-sm font-semibold text-ink">{waiting} waiting for Text 1</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {linkedCampaign
              ? "People who ticked the box on the campaign page but haven't been texted yet (e.g. signed up before Live)."
              : "Link this program to a wallet campaign to collect web sign-ups."}
          </p>
          <button onClick={sendWaiting} disabled={busy || !liveSending} className="mt-2 h-9 w-full rounded-full bg-ink text-sm font-semibold text-white hover:bg-ink-deep disabled:opacity-40">
            Send to everyone waiting
          </button>
        </div>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </section>
  );
}
