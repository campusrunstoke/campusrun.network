"use client";

import { SYSTEM_FONTS, type Fill, type Layer, type Design } from "@/lib/wallet/design";
import { APPLE_BUTTONS, appleButtonLabel, DEFAULT_TYPE, featuredLinks } from "@/lib/wallet/featured";
import type { DesignSave } from "@/lib/validation";
import type { LinkAction } from "@/lib/wallet/types";

type Fields = DesignSave["fields"];
type LinkRow = DesignSave["links"][number];

/* ---------------------------------- colors ---------------------------------- */

/** Wallet wants "rgb(r, g, b)"; colour pickers want "#rrggbb". */
export function toHex(c: string): string {
  const m = c.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m) return "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("");
  if (/^#[0-9a-f]{3}$/i.test(c)) return "#" + c.slice(1).split("").map((d) => d + d).join("");
  return /^#[0-9a-f]{6}/i.test(c) ? c.slice(0, 7) : "#000000";
}
export const toRgb = (hex: string) => {
  const h = toHex(hex).slice(1);
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
};

/* --------------------------------- primitives -------------------------------- */

export function Panel({ title, hint, children, right }: { title: string; hint?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-snug text-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "h-9 w-full rounded-lg border border-line bg-white px-2.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-ink/40";

export function Text({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} ${mono ? "font-mono text-xs" : ""}`} />;
}

export function Num({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))}
      className={`${inputCls} font-mono text-xs`}
    />
  );
}

export function Color({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-1" />
      <input value={toHex(value)} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && onChange(e.target.value)} className={`${inputCls} font-mono text-xs uppercase`} />
    </div>
  );
}

export function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#003b5c]" />
      <span>
        <span className="block text-sm text-ink">{label}</span>
        {hint && <span className="block text-[11px] leading-snug text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Btn({ children, onClick, kind = "plain", disabled, title }: { children: React.ReactNode; onClick: () => void; kind?: "plain" | "ink" | "gold" | "danger"; disabled?: boolean; title?: string }) {
  const k = {
    plain: "border border-line bg-white text-ink hover:border-ink/30",
    ink: "bg-ink text-white hover:bg-ink-deep",
    gold: "bg-gold font-bold text-ink-deep hover:bg-gold-deep",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  }[kind];
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`h-9 rounded-full px-3.5 text-xs font-semibold transition-colors disabled:opacity-40 ${k}`}>
      {children}
    </button>
  );
}

/* ---------------------------------- layers ---------------------------------- */

const layerName = (l: Layer, fonts: Design["fonts"]) =>
  l.name ||
  (l.type === "text"
    ? `“${l.text.split("\n")[0].slice(0, 24) || "Text"}”`
    : l.type === "glow"
      ? "Glow"
      : "Image") + (l.type === "text" && l.font.startsWith("asset:") ? ` · ${fonts.find((f) => `asset:${f.assetId}` === l.font)?.name ?? ""}` : "");

export function LayerList({
  layers,
  fonts,
  selectedId,
  onSelect,
  onMove,
  onToggle,
  onDelete,
}: {
  layers: Layer[];
  fonts: Design["fonts"];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: 1 | -1) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (layers.length === 0) return <p className="text-xs text-muted">Nothing here yet — add an image, text or glow above.</p>;
  // Top of the list = front-most, like every design tool.
  return (
    <ul className="space-y-1">
      {[...layers].reverse().map((l) => (
        <li
          key={l.id}
          onClick={() => onSelect(l.id)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs ${selectedId === l.id ? "bg-ink text-white" : "text-ink hover:bg-fill"}`}
        >
          <span className="w-4 text-center opacity-70">{l.type === "text" ? "T" : l.type === "glow" ? "◉" : "▣"}</span>
          <span className={`min-w-0 flex-1 truncate ${l.hidden ? "line-through opacity-50" : ""}`}>{layerName(l, fonts)}</span>
          <IconBtn title="Bring forward" onClick={() => onMove(l.id, 1)}>↑</IconBtn>
          <IconBtn title="Send backward" onClick={() => onMove(l.id, -1)}>↓</IconBtn>
          <IconBtn title={l.hidden ? "Show" : "Hide"} onClick={() => onToggle(l.id)}>{l.hidden ? "○" : "●"}</IconBtn>
          <IconBtn title="Delete" onClick={() => onDelete(l.id)}>✕</IconBtn>
        </li>
      ))}
    </ul>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="h-6 w-6 shrink-0 rounded-md text-[11px] opacity-70 hover:bg-black/10 hover:opacity-100"
    >
      {children}
    </button>
  );
}

export function LayerProps({ layer, fonts, onChange }: { layer: Layer; fonts: Design["fonts"]; onChange: (l: Layer) => void }) {
  const set = <K extends keyof Layer>(k: K, v: Layer[K]) => onChange({ ...layer, [k]: v } as Layer);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="X"><Num value={layer.x} onChange={(v) => set("x", v)} /></Field>
        <Field label="Y"><Num value={layer.y} onChange={(v) => set("y", v)} /></Field>
      </div>

      {layer.type === "image" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <Num value={layer.w} min={1} onChange={(v) => onChange({ ...layer, w: v, h: Math.round((layer.h / layer.w) * v) })} />
          </Field>
          <Field label="Height">
            <Num value={layer.h} min={1} onChange={(v) => onChange({ ...layer, h: v, w: Math.round((layer.w / layer.h) * v) })} />
          </Field>
        </div>
      )}

      {layer.type === "glow" && (
        <>
          <Field label="Size (radius)"><Num value={layer.r} min={4} onChange={(v) => onChange({ ...layer, r: v })} /></Field>
          <Field label="Core colour"><Color value={layer.inner} onChange={(v) => onChange({ ...layer, inner: v })} /></Field>
          <Field label="Halo colour"><Color value={layer.mid} onChange={(v) => onChange({ ...layer, mid: v })} /></Field>
        </>
      )}

      {layer.type === "text" && (
        <>
          <Field label="Text" hint="Press Enter for a new line.">
            <textarea value={layer.text} rows={3} onChange={(e) => onChange({ ...layer, text: e.target.value })} className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-ink/40" />
          </Field>
          <Field label="Font">
            <Select
              value={layer.font}
              onChange={(v) => onChange({ ...layer, font: v })}
              options={[
                ...fonts.map((f) => [`asset:${f.assetId}`, `${f.name} (uploaded)`] as [string, string]),
                ...SYSTEM_FONTS.map((f) => [f, f] as [string, string]),
              ]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Size"><Num value={layer.size} min={4} onChange={(v) => onChange({ ...layer, size: v })} /></Field>
            <Field label="Weight">
              <Select
                value={String(layer.weight)}
                onChange={(v) => onChange({ ...layer, weight: Number(v) })}
                options={[["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"], ["900", "Black"]]}
              />
            </Field>
            <Field label="Line height"><Num value={layer.lineHeight} step={0.05} min={0.5} max={3} onChange={(v) => onChange({ ...layer, lineHeight: v })} /></Field>
            <Field label="Letter spacing"><Num value={layer.letterSpacing} onChange={(v) => onChange({ ...layer, letterSpacing: v })} /></Field>
          </div>
          <Field label="Align">
            <Select value={layer.align} onChange={(v) => onChange({ ...layer, align: v })} options={[["left", "Left"], ["center", "Centre"], ["right", "Right"]]} />
          </Field>
          <Field label="Colour"><Color value={layer.color} onChange={(v) => onChange({ ...layer, color: v })} /></Field>
          <Toggle
            checked={Boolean(layer.glow)}
            onChange={(v) => onChange({ ...layer, glow: v ? { color: layer.color, blur: 30 } : null })}
            label="Neon glow"
          />
          {layer.glow && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Glow colour"><Color value={layer.glow.color} onChange={(v) => onChange({ ...layer, glow: { ...layer.glow!, color: v } })} /></Field>
              <Field label="Glow size"><Num value={layer.glow.blur} min={0} max={200} onChange={(v) => onChange({ ...layer, glow: { ...layer.glow!, blur: v } })} /></Field>
            </div>
          )}
        </>
      )}

      <Field label={`Opacity · ${Math.round(layer.opacity * 100)}%`}>
        <input type="range" min={0} max={1} step={0.01} value={layer.opacity} onChange={(e) => onChange({ ...layer, opacity: Number(e.target.value) })} className="w-full accent-[#003b5c]" />
      </Field>
    </div>
  );
}

export function BackgroundProps({ fill, onChange }: { fill: Fill; onChange: (f: Fill) => void }) {
  return (
    <div className="space-y-3">
      <Select
        value={fill.type}
        onChange={(t) =>
          onChange(t === "solid" ? { type: "solid", color: fill.type === "solid" ? fill.color : fill.from } : { type: "linear", from: fill.type === "solid" ? fill.color : fill.from, to: "#001142", angle: 180 })
        }
        options={[["solid", "Solid colour"], ["linear", "Gradient"]]}
      />
      {fill.type === "solid" ? (
        <Color value={fill.color} onChange={(v) => onChange({ ...fill, color: v })} />
      ) : (
        <>
          <Field label="From"><Color value={fill.from} onChange={(v) => onChange({ ...fill, from: v })} /></Field>
          <Field label="To"><Color value={fill.to} onChange={(v) => onChange({ ...fill, to: v })} /></Field>
          <Field label="Direction">
            <Select
              value={String(fill.angle)}
              onChange={(v) => onChange({ ...fill, angle: Number(v) })}
              options={[["180", "Top → bottom"], ["0", "Bottom → top"], ["90", "Left → right"], ["270", "Right → left"], ["135", "Diagonal ↘"], ["45", "Diagonal ↗"]]}
            />
          </Field>
        </>
      )}
    </div>
  );
}

/* --------------------------------- wording ---------------------------------- */

export function FieldsPanel({ fields, onChange, brand }: { fields: Fields; onChange: (f: Fields) => void; brand: string }) {
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => onChange({ ...fields, [k]: v });
  const str = (v: string | null) => v ?? "";
  return (
    <div className="space-y-4">
      <Panel title="Pass style" hint="Which layouts the pass carries. Every iPhone gets a working pass either way.">
        <div className="space-y-2.5">
          <Toggle
            checked={fields.passStyle === "poster"}
            onChange={(v) => set("passStyle", v ? "poster" : "coupon")}
            label="iOS 27 poster, with the banner as backup (recommended)"
            hint="Full-bleed artwork and up to two front buttons on iOS 27. Older iPhones automatically get the banner version."
          />
        </div>
      </Panel>

      <Panel title="Wording" hint="Apple draws this text in its own font, in fixed positions — style the artwork, not these.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Small label (above the big text)"><Text value={str(fields.offerLabel)} onChange={(v) => set("offerLabel", v)} placeholder="DAPS ENERGY" /></Field>
          <Field label="Big text" hint="Keep it short — about 25 characters fits one line."><Text value={str(fields.offerValue)} onChange={(v) => set("offerValue", v)} placeholder="Freshen. Energize. Focus." /></Field>
          <Field label="Footer label"><Text value={str(fields.secondaryLabel)} onChange={(v) => set("secondaryLabel", v)} placeholder="FREE DAPS" /></Field>
          <Field label="Footer text"><Text value={str(fields.secondaryValue)} onChange={(v) => set("secondaryValue", v)} placeholder="Claim yours today" /></Field>
          <Field label="Top-right text" hint={`Leave empty to show “${brand}”.`}><Text value={str(fields.headerText)} onChange={(v) => set("headerText", v)} placeholder={brand} /></Field>
          <Field label="Text alignment">
            <Select value={fields.textAlign} onChange={(v) => set("textAlign", v)} options={[["left", "Left"], ["center", "Centre"], ["right", "Right"]]} />
          </Field>
        </div>
        <div className="mt-3 space-y-2.5">
          <Toggle checked={fields.hideHeaderText} onChange={(v) => set("hideHeaderText", v)} label="Hide the top-right text" hint="Turn on when the logo already says the brand name." />
        </div>
        <div className="mt-3">
          <Field label="Terms / fine print (back of the pass)">
            <textarea value={str(fields.terms)} rows={3} onChange={(e) => set("terms", e.target.value)} className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-sm text-ink outline-none focus:border-ink/40" placeholder="No purchase necessary. While supplies last." />
          </Field>
        </div>
      </Panel>

      <Panel title="Colours" hint="Text colours apply to Apple's wording. Background shows on the older-iPhone layout and around the art.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Text"><Color value={fields.fgColor} onChange={(v) => set("fgColor", toRgb(v))} /></Field>
          <Field label="Small labels"><Color value={fields.labelColor} onChange={(v) => set("labelColor", toRgb(v))} /></Field>
          <Field label="Background"><Color value={fields.bgColor} onChange={(v) => set("bgColor", toRgb(v))} /></Field>
        </div>
        <div className="mt-3 space-y-2.5">
          <Toggle
            checked={!fields.suppressHeaderDarkening}
            onChange={(v) => set("suppressHeaderDarkening", !v)}
            label="Let iOS shade the top of the poster"
            hint="iOS adds a dark fade behind the logo on posters. Turn off for bright artwork that already reads well."
          />
          <Toggle
            checked={fields.showBarcode}
            onChange={(v) => set("showBarcode", v)}
            label="Show a barcode for in-store redemption"
            hint="Cashiers scan it to mark the coupon used. Leave off for giveaways and free samples."
          />
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------- links ----------------------------------- */

const ACTION_NAMES: Record<LinkAction, string> = {
  website: "Website",
  shop: "Shop / claim page",
  map: "Where to buy (map)",
  video: "Video",
  giveaway: "Giveaway (text to enter)",
};
const PLACEHOLDER: Record<LinkAction, string> = {
  website: "https://brand.com",
  shop: "https://brand.com/pages/free-sample",
  map: "https://maps.google.com/?q=…",
  video: "https://youtube.com/…",
  giveaway: "sms:+18005551234&body=KEYWORD",
};

export function LinksPanel({ links, onChange }: { links: LinkRow[]; onChange: (l: LinkRow[]) => void }) {
  const used = new Set(links.map((l) => l.action));
  const free = (Object.keys(ACTION_NAMES) as LinkAction[]).filter((a) => !used.has(a));
  const front = featuredLinks(links.map((l) => ({ ...l, featuredType: l.featuredType === "auto" ? null : l.featuredType })));
  const frontIdx = (a: string) => front.findIndex((f) => f.link.action === a);
  const set = (i: number, patch: Partial<LinkRow>) => onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <Panel
      title="Buttons & links"
      hint="Every link is counted by Campus Run, then forwards instantly. All links appear on the back of the pass and the web version; on iOS 27 up to two also become buttons under the pass."
    >
      <div className="space-y-3">
        {links.length === 0 && <p className="text-sm text-muted">No links yet.</p>}
        {links.map((l, i) => {
          const fi = frontIdx(l.action);
          const autoType = DEFAULT_TYPE[l.action as LinkAction];
          return (
            <div key={l.action} className="rounded-xl border border-line p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">{ACTION_NAMES[l.action as LinkAction]}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${fi >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-fill text-muted"}`}>
                  {fi >= 0 ? `Front button ${fi + 1} · “${appleButtonLabel(front[fi].type) ?? front[fi].type}”` : "Back of pass only"}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Where it goes"><Text value={l.destination} onChange={(v) => set(i, { destination: v })} placeholder={PLACEHOLDER[l.action as LinkAction]} mono /></Field>
                <Field label="Name on the back / web page"><Text value={l.label ?? ""} onChange={(v) => set(i, { label: v })} placeholder="Claim free Daps" /></Field>
                <Field label="iOS 27 front button" hint="Apple writes the button words from this list.">
                  <Select
                    value={l.featuredType}
                    onChange={(v) => set(i, { featuredType: v })}
                    options={[
                      ["auto", `Automatic${appleButtonLabel(autoType) ? ` (“${appleButtonLabel(autoType)}”)` : ""}`],
                      ...(Object.entries(APPLE_BUTTONS) as [LinkRow["featuredType"], string][]).map(([k, v]) => [k, `“${v}”`] as [LinkRow["featuredType"], string]),
                      ["none", "Not on the front"],
                    ]}
                  />
                </Field>
                <div className="flex items-end justify-end">
                  <Btn kind="danger" onClick={() => onChange(links.filter((_, j) => j !== i))}>Remove link</Btn>
                </div>
              </div>
              {l.action === "giveaway" && (
                <p className="mt-2 text-[11px] text-muted">Adds the carrier-required texting disclosure to the pass automatically.</p>
              )}
            </div>
          );
        })}
        {free.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted">Add a link:</span>
            {free.map((a) => (
              <Btn key={a} onClick={() => onChange([...links, { action: a, label: null, destination: "", featuredType: "auto" }])}>
                + {ACTION_NAMES[a]}
              </Btn>
            ))}
          </div>
        )}
        {links.length > 2 && front.length === 2 && (
          <p className="text-[11px] text-muted">Apple allows two front buttons. Priority when more qualify: giveaway → map → website → shop → video.</p>
        )}
      </div>
    </Panel>
  );
}
