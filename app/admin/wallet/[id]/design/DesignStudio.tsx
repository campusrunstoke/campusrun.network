"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ARTBOARDS,
  emptyDesign,
  newId,
  renderArtboard,
  type ArtboardKey,
  type Design,
  type Layer,
} from "@/lib/wallet/design";
import type { DesignSave } from "@/lib/validation";
import ArtboardCanvas from "./ArtboardCanvas";
import PassPreview from "./PassPreview";
import { BackgroundProps, Btn, FieldsPanel, LayerList, LayerProps, LinksPanel, Panel, toHex } from "./panels";

type Fields = DesignSave["fields"];
type LinkRow = DesignSave["links"][number];
type Tab = "artwork" | "wording" | "links" | "test";

const assetUrl = (id: string) => `/api/admin/wallet/assets/${id}`;

/** Read a File as base64, shrinking big photos first so uploads stay small and fast. */
async function prepareUpload(file: File, kind: "image" | "font") {
  let blob: Blob = file;
  let mime = file.type || "application/octet-stream";
  if (kind === "image" && (file.size > 1_500_000 || file.type === "image/heic")) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/webp", 0.92));
    mime = "image/webp";
  }
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { data: btoa(bin), mime };
}

export default function DesignStudio({
  campaignId,
  brand,
  name,
  initialDesign,
  initialFields,
  initialLinks,
  existing,
  hasCards,
}: {
  campaignId: string;
  brand: string;
  name: string;
  initialDesign: Design | null;
  initialFields: Fields;
  initialLinks: LinkRow[];
  existing: { poster: boolean; banner: boolean; logo: boolean };
  hasCards: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("artwork");
  const [board, setBoard] = useState<ArtboardKey>("poster");
  const [design, setDesign] = useState<Design>(() => initialDesign ?? emptyDesign(toHex(initialFields.bgColor)));
  const [fields, setFields] = useState<Fields>(initialFields);
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGuides, setShowGuides] = useState(true);
  const [images, setImages] = useState<Map<string, CanvasImageSource>>(new Map());
  const [fontsVersion, setFontsVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [logoDirty, setLogoDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [test, setTest] = useState<{ url: string; qr: string } | null>(null);
  const [previews, setPreviews] = useState<{ poster: string | null; banner: string | null }>({ poster: null, banner: null });

  /* --------------------------------- history -------------------------------- */
  // Undo keeps snapshots of the design. Rapid edits (typing, sliders) coalesce into one
  // step; a drag is one step from where it started.
  const history = useRef<Design[]>([]);
  const committed = useRef<Design>(design);
  const lastPush = useRef(0);
  const [canUndo, setCanUndo] = useState(false);

  const update = useCallback((next: Design, live = false) => {
    setDesign(next);
    setDirty(true);
    if (live) return;
    const now = Date.now();
    if (now - lastPush.current > 700) {
      history.current = [...history.current.slice(-49), committed.current];
      lastPush.current = now;
      setCanUndo(true);
    }
    committed.current = next;
  }, []);
  const commitDrag = useCallback(() => {
    history.current = [...history.current.slice(-49), committed.current];
    lastPush.current = Date.now();
    committed.current = design;
    setCanUndo(true);
  }, [design]);
  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    committed.current = prev;
    setCanUndo(history.current.length > 0);
    setDesign(prev);
    setDirty(true);
  }, []);

  /* ------------------------------ assets loading ----------------------------- */
  const imageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const k of ["poster", "banner"] as const) for (const l of design[k].layers) if (l.type === "image") ids.add(l.assetId);
    if (design.logoAssetId) ids.add(design.logoAssetId);
    return [...ids];
  }, [design]);

  useEffect(() => {
    for (const id of imageIds) {
      if (images.has(id)) continue;
      const img = new Image();
      img.onload = () => setImages((m) => new Map(m).set(id, img));
      img.src = assetUrl(id);
    }
  }, [imageIds, images]);

  const loadedFonts = useRef(new Set<string>());
  useEffect(() => {
    for (const f of design.fonts) {
      if (loadedFonts.current.has(f.assetId)) continue;
      loadedFonts.current.add(f.assetId);
      new FontFace(`cr-${f.assetId}`, `url(${assetUrl(f.assetId)})`)
        .load()
        .then((ff) => {
          document.fonts.add(ff);
          setFontsVersion((v) => v + 1);
        })
        .catch(() => setMsg({ kind: "err", text: `Couldn't load the font “${f.name}”.` }));
    }
  }, [design.fonts]);

  /* --------------------------- live preview images --------------------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      const out: { poster: string | null; banner: string | null } = { poster: null, banner: null };
      for (const k of ["poster", "banner"] as const) {
        const { w, h } = ARTBOARDS[k];
        const full = document.createElement("canvas");
        full.width = w;
        full.height = h;
        renderArtboard(full.getContext("2d")!, k, design[k], images);
        const small = document.createElement("canvas");
        small.width = 375;
        small.height = Math.round((h / w) * 375);
        small.getContext("2d")!.drawImage(full, 0, 0, small.width, small.height);
        out[k] = small.toDataURL("image/jpeg", 0.8);
      }
      setPreviews(out);
    }, 350);
    return () => clearTimeout(t);
  }, [design, images, fontsVersion]);

  /* -------------------------------- shortcuts -------------------------------- */
  const active = design[board];
  const selected = active.layers.find((l) => l.id === selectedId) ?? null;

  const setLayer = useCallback(
    (layer: Layer, live = false) =>
      update({ ...design, [board]: { ...design[board], layers: design[board].layers.map((l) => (l.id === layer.id ? layer : l)) } }, live),
    [design, board, update],
  );
  const setLayers = (layers: Layer[]) => update({ ...design, [board]: { ...design[board], layers } });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        undo();
        return;
      }
      if (typing || !selected || tab !== "artwork") return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        update({ ...design, [board]: { ...design[board], layers: design[board].layers.filter((l) => l.id !== selected.id) } });
        setSelectedId(null);
      }
      const step = e.shiftKey ? 10 : 2;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d) {
        e.preventDefault();
        setLayer({ ...selected, x: selected.x + d[0], y: selected.y + d[1] });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, design, board, tab, undo, update, setLayer]);

  // Don't lose work by closing the tab.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* --------------------------------- adding ---------------------------------- */
  async function uploadAsset(file: File, kind: "image" | "font") {
    setBusy("Uploading…");
    setMsg(null);
    try {
      const { data, mime } = await prepareUpload(file, kind);
      const res = await fetch(`/api/admin/wallet/campaigns/${campaignId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name: file.name, mime, data }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "upload failed");
      return json.asset as { id: string; name: string };
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Upload failed." });
      return null;
    } finally {
      setBusy(null);
    }
  }

  const pick = (accept: string) =>
    new Promise<File | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });

  async function addImage() {
    const file = await pick("image/png,image/jpeg,image/webp");
    if (!file) return;
    const asset = await uploadAsset(file, "image");
    if (!asset) return;
    const img = new Image();
    img.onload = () => {
      setImages((m) => new Map(m).set(asset.id, img));
      const { w: W, h: H } = ARTBOARDS[board];
      const s = Math.min((W * 0.6) / img.naturalWidth, (H * 0.6) / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
      const layer: Layer = { id: newId(), type: "image", assetId: asset.id, x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h, opacity: 1, name: asset.name };
      update({ ...design, [board]: { ...design[board], layers: [...design[board].layers, layer] } });
      setSelectedId(layer.id);
    };
    img.src = assetUrl(asset.id);
  }

  function addText() {
    const { h: H } = ARTBOARDS[board];
    const font = design.fonts[0] ? `asset:${design.fonts[0].assetId}` : "Helvetica Neue";
    const layer: Layer = {
      id: newId(), type: "text", text: "Your headline", font, size: board === "poster" ? 120 : 80, weight: 700,
      color: "#ffffff", align: "left", x: 90, y: Math.round(H * (board === "poster" ? 0.3 : 0.35)), lineHeight: 1.05, letterSpacing: 0, glow: null, opacity: 1,
    };
    update({ ...design, [board]: { ...design[board], layers: [...design[board].layers, layer] } });
    setSelectedId(layer.id);
  }

  function addGlow() {
    const { w: W, h: H } = ARTBOARDS[board];
    const layer: Layer = { id: newId(), type: "glow", x: Math.round(W * 0.8), y: Math.round(H * 0.2), r: Math.round(Math.min(W, H) * 0.45), inner: "#ffffff", mid: "#73E8FF", opacity: 1 };
    update({ ...design, [board]: { ...design[board], layers: [...design[board].layers, layer] } });
    setSelectedId(layer.id);
  }

  async function uploadLogo() {
    const file = await pick("image/png,image/jpeg,image/webp");
    if (!file) return;
    const asset = await uploadAsset(file, "image");
    if (!asset) return;
    update({ ...design, logoAssetId: asset.id });
    setLogoDirty(true);
  }

  async function uploadFont() {
    const file = await pick(".otf,.ttf,.woff,.woff2");
    if (!file) return;
    const asset = await uploadAsset(file, "font");
    if (!asset) return;
    update({ ...design, fonts: [...design.fonts, { assetId: asset.id, name: file.name.replace(/\.[^.]+$/, "") }] });
  }

  /** Campaigns designed before the designer: turn the current images into layers. */
  async function importCurrent() {
    setBusy("Importing…");
    const next = { ...design };
    for (const k of ["poster", "banner", "logo"] as const) {
      if (!existing[k]) continue;
      const res = await fetch(`/api/admin/wallet/campaigns/${campaignId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromSlot: k }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) continue;
      if (k === "logo") next.logoAssetId = json.asset.id;
      else {
        const { w, h } = ARTBOARDS[k];
        next[k] = { ...next[k], layers: [{ id: newId(), type: "image", assetId: json.asset.id, x: 0, y: 0, w, h, opacity: 1, name: `Current ${k}` }, ...next[k].layers] };
      }
    }
    update(next);
    setBusy(null);
  }

  /* ---------------------------------- save ----------------------------------- */
  async function save() {
    setMsg(null);
    const bad = links.find((l) => !l.destination.trim());
    if (bad) {
      setTab("links");
      setMsg({ kind: "err", text: "Every link needs a destination (or remove the link)." });
      return;
    }
    const missing = imageIds.filter((id) => !images.has(id));
    if (missing.length) {
      setMsg({ kind: "err", text: "Some images are still loading — try again in a second." });
      return;
    }
    setBusy("Saving…");
    try {
      const res = await fetch(`/api/admin/wallet/campaigns/${campaignId}/design`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, fields, links: links.map((l) => ({ ...l, destination: l.destination.trim() })) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "save failed");

      // Export both artboards at full size with the same renderer the editor uses.
      await document.fonts.ready;
      for (const k of ["poster", "banner"] as const) {
        const { w, h } = ARTBOARDS[k];
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        renderArtboard(c.getContext("2d")!, k, design[k], images);
        const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.93));
        const up = await fetch(`/api/admin/wallet/campaigns/${campaignId}/artwork/${k}`, { method: "PUT", body: blob });
        if (!up.ok) throw new Error(`couldn't save the ${k} image`);
      }
      if (logoDirty && design.logoAssetId) {
        const logo = await (await fetch(assetUrl(design.logoAssetId))).blob();
        const up = await fetch(`/api/admin/wallet/campaigns/${campaignId}/artwork/logo`, { method: "PUT", body: logo });
        if (!up.ok) throw new Error("couldn't save the logo");
        setLogoDirty(false);
      }
      setDirty(false);
      setTest(null);
      setMsg({ kind: "ok", text: "Saved. New passes use this design now — test it on your phone." });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setBusy(null);
    }
  }

  async function makeTest() {
    setMsg(null);
    setBusy("Making a test pass…");
    const res = await fetch(`/api/admin/wallet/campaigns/${campaignId}/preview`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setMsg({ kind: "err", text: json.error ?? "Couldn't make a test pass." });
    setTest({ url: json.url, qr: json.qr });
  }

  const logoUrl = design.logoAssetId ? assetUrl(design.logoAssetId) : existing.logo ? `/api/admin/wallet/campaigns/${campaignId}/artwork/logo` : null;
  const { w: BW, h: BH } = ARTBOARDS[board];

  /* --------------------------------- layout ---------------------------------- */
  return (
    <div>
      {/* top bar */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/admin/wallet/${campaignId}`} className="text-xs font-medium text-muted hover:text-ink">← Back to campaign</Link>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.01em] text-ink">Pass designer</h1>
          <p className="text-sm text-muted"><span className="font-semibold text-ink">{brand}</span> · {name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? <span className="text-xs font-medium text-amber-700">Unsaved changes</span> : <span className="text-xs text-muted">All changes saved</span>}
          <Btn onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">↶ Undo</Btn>
          <button onClick={save} disabled={Boolean(busy) || !dirty} className="h-10 rounded-full bg-gold px-5 text-sm font-bold text-ink-deep hover:bg-gold-deep disabled:opacity-40">
            {busy === "Saving…" ? "Saving…" : "Save & publish"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${msg.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {msg.text}
        </div>
      )}
      {busy && busy !== "Saving…" && <div className="mb-4 text-xs text-muted">{busy}</div>}

      {/* steps */}
      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1 [scrollbar-width:none]">
        {([
          ["artwork", "1 · Artwork"],
          ["wording", "2 · Wording & colours"],
          ["links", "3 · Buttons & links"],
          ["test", "4 · Test on my phone"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${tab === k ? "bg-ink text-white" : "text-ink/70 hover:bg-fill hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {tab === "artwork" && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="flex rounded-full border border-line bg-white p-1">
                    {(["poster", "banner"] as const).map((k) => (
                      <button key={k} onClick={() => { setBoard(k); setSelectedId(null); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${board === k ? "bg-ink text-white" : "text-ink/70 hover:text-ink"}`}>
                        {ARTBOARDS[k].label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-muted">{BW}×{BH}px</span>
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-ink">
                    <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} className="accent-[#003b5c]" />
                    Show where Apple puts text
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 pb-3">
                  <Btn kind="ink" onClick={addImage}>+ Image</Btn>
                  <Btn kind="ink" onClick={addText}>+ Text</Btn>
                  <Btn kind="ink" onClick={addGlow}>+ Glow</Btn>
                  {initialDesign === null && (existing.poster || existing.banner) && (
                    <Btn onClick={importCurrent} title="Bring in the artwork this campaign already has">Start from current artwork</Btn>
                  )}
                </div>
                <div className={`mx-auto rounded-2xl bg-[repeating-conic-gradient(#e5e5ea_0%_25%,#f5f5f7_0%_50%)] bg-[length:16px_16px] p-4 ${board === "poster" ? "max-w-[440px]" : ""}`}>
                  <ArtboardCanvas
                    boardKey={board}
                    board={active}
                    images={images}
                    fontsVersion={fontsVersion}
                    selectedId={selectedId}
                    showGuides={showGuides}
                    onSelect={setSelectedId}
                    onChange={(l) => setLayer(l, true)}
                    onCommit={commitDrag}
                  />
                </div>
                <p className="mt-2 text-center text-[11px] text-muted">
                  Drag to move · drag the gold dot to resize · arrow keys nudge · ⌘Z undo · Delete removes
                </p>
              </div>

              <div className="space-y-4">
                <Panel title={selected ? "Selected" : "Background"} hint={selected ? undefined : "Click something on the artwork to edit it."}>
                  {selected ? (
                    <>
                      <LayerProps layer={selected} fonts={design.fonts} onChange={(l) => setLayer(l)} />
                      <div className="mt-3 flex gap-2">
                        <Btn onClick={() => {
                          const copy = { ...selected, id: newId(), x: selected.x + 30, y: selected.y + 30 };
                          setLayers([...active.layers, copy]);
                          setSelectedId(copy.id);
                        }}>Duplicate</Btn>
                        <Btn onClick={() => {
                          const other: ArtboardKey = board === "poster" ? "banner" : "poster";
                          update({ ...design, [other]: { ...design[other], layers: [...design[other].layers, { ...selected, id: newId() }] } });
                          setMsg({ kind: "ok", text: `Copied to the ${ARTBOARDS[other].label} — position it there.` });
                        }}>Copy to {board === "poster" ? "banner" : "poster"}</Btn>
                      </div>
                    </>
                  ) : (
                    <BackgroundProps fill={active.background} onChange={(f) => update({ ...design, [board]: { ...active, background: f } })} />
                  )}
                </Panel>
                <Panel title="Layers" hint="Top of the list sits in front.">
                  <LayerList
                    layers={active.layers}
                    fonts={design.fonts}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onMove={(id, dir) => {
                      const ls = [...active.layers];
                      const i = ls.findIndex((l) => l.id === id), j = i + dir;
                      if (j < 0 || j >= ls.length) return;
                      [ls[i], ls[j]] = [ls[j], ls[i]];
                      setLayers(ls);
                    }}
                    onToggle={(id) => setLayers(active.layers.map((l) => (l.id === id ? { ...l, hidden: !l.hidden } : l)))}
                    onDelete={(id) => { setLayers(active.layers.filter((l) => l.id !== id)); setSelectedId(null); }}
                  />
                </Panel>
                <Panel title="Logo" hint="Top-left of every pass. A transparent PNG works best; we trim and size it for you.">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 flex-1 items-center rounded-lg px-2" style={{ background: toHex(fields.bgColor) }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {logoUrl ? <img src={logoUrl} alt="Logo" className="max-h-9 max-w-full object-contain" /> : <span className="text-xs text-white/70">No logo yet</span>}
                    </div>
                    <Btn onClick={uploadLogo}>{logoUrl ? "Replace" : "Upload"}</Btn>
                  </div>
                </Panel>
                <Panel title="Brand fonts" hint="For text you add to the artwork. Upload the brand's .otf / .ttf / .woff.">
                  {design.fonts.length > 0 && (
                    <ul className="mb-2 space-y-1 text-xs text-ink">
                      {design.fonts.map((f) => (
                        <li key={f.assetId} style={{ fontFamily: `"cr-${f.assetId}"` }} className="text-base">{f.name}</li>
                      ))}
                    </ul>
                  )}
                  <Btn onClick={uploadFont}>+ Upload font</Btn>
                </Panel>
              </div>
            </div>
          )}

          {tab === "wording" && <FieldsPanel fields={fields} brand={brand} onChange={(f) => { setFields(f); setDirty(true); }} />}

          {tab === "links" && <LinksPanel links={links} onChange={(l) => { setLinks(l); setDirty(true); }} />}

          {tab === "test" && (
            <div className="space-y-4">
              <Panel title="Test on your phone" hint="Builds a real Apple Wallet pass from the last saved version. Test passes never count toward results.">
                {dirty && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">You have unsaved changes — save first so the test pass includes them.</p>}
                <Btn kind="ink" onClick={makeTest} disabled={Boolean(busy)}>Make a test pass</Btn>
                {test && (
                  <div className="mt-4 flex flex-wrap items-center gap-5 rounded-xl bg-fill p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={test.qr} alt="QR code for the test pass" className="h-44 w-44 rounded-lg bg-white p-2" />
                    <ol className="min-w-0 flex-1 list-decimal space-y-1.5 pl-4 text-sm text-ink">
                      <li>Point your iPhone camera at the QR and tap the link.</li>
                      <li>Tap <b>Add</b> — check the front, the buttons under it, and the back (tap ⓘ).</li>
                      <li>Tapping links works, but isn&apos;t counted — it&apos;s a test.</li>
                      <li>Delete the test pass from Wallet when you&apos;re done. The link works for 2 hours.</li>
                    </ol>
                  </div>
                )}
              </Panel>
              <Panel title="What happens next" hint={hasCards ? "This campaign already has cards — anyone who taps from now on gets this design." : "Head back to the campaign to create card links once you're happy with the design."}>
                <p className="text-xs leading-relaxed text-muted">
                  Passes already added to someone&apos;s Wallet keep the design they were given — save before cards go out.
                </p>
                <div className="mt-3"><Link href={`/admin/wallet/${campaignId}#cards`} className="text-sm font-semibold text-ink underline underline-offset-4">Go to Cards →</Link></div>
              </Panel>
              <PassPreview wide posterUrl={previews.poster} bannerUrl={previews.banner} logoUrl={logoUrl} brand={brand} fields={fields} links={links} />
            </div>
          )}
        </div>

        {/* always-visible live preview */}
        {tab !== "test" && (
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-line bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-ink">Live preview</div>
              <PassPreview posterUrl={previews.poster} bannerUrl={previews.banner} logoUrl={logoUrl} brand={brand} fields={fields} links={links} />
              <p className="mt-3 text-[11px] leading-relaxed text-muted">A close guide — Apple has the final say on its own text. Check with “Test on my phone”.</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
