"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ARTBOARDS,
  SAFE_ZONES,
  layerBounds,
  renderArtboard,
  type Artboard,
  type ArtboardKey,
  type Bounds,
  type Layer,
} from "@/lib/wallet/design";

type Drag =
  | { mode: "move"; id: string; startX: number; startY: number; orig: Layer }
  | { mode: "resize"; id: string; startX: number; startY: number; orig: Layer; bounds: Bounds };

const SNAP = 14; // artboard px

/**
 * The editable artboard. Drawn by the same renderArtboard used for export, so the
 * screen is the shipped image. Drag a layer to move it; drag its corner to resize.
 * Centres snap to the artboard's middle lines.
 */
export default function ArtboardCanvas({
  boardKey,
  board,
  images,
  fontsVersion,
  selectedId,
  showGuides,
  apple,
  onSelect,
  onChange,
  onCommit,
}: {
  boardKey: ArtboardKey;
  board: Artboard;
  images: Map<string, CanvasImageSource>;
  fontsVersion: number;
  selectedId: string | null;
  showGuides: boolean;
  apple: AppleText;
  onSelect: (id: string | null) => void;
  onChange: (layer: Layer) => void; // live, during a drag
  onCommit: () => void; // drag finished — one undo step
}) {
  const { w: W, h: H } = ARTBOARDS[boardKey];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snapLines, setSnapLines] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const drag = useRef<Drag | null>(null);

  // Redraw on any change.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) renderArtboard(ctx, boardKey, board, images);
  }, [boardKey, board, images, fontsVersion]);

  // Hit boxes, measured on a scratch canvas with the same fonts the renderer uses.
  const [measure] = useState(() => (typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d")));
  const bounds = useMemo(() => {
    void fontsVersion; // re-measure once uploaded fonts finish loading
    return new Map<string, Bounds>(measure ? board.layers.map((l) => [l.id, layerBounds(measure, l)]) : []);
  }, [measure, board, fontsVersion]);

  // Screen px → artboard px.
  const toBoard = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  function hit(p: { x: number; y: number }) {
    for (let i = board.layers.length - 1; i >= 0; i--) {
      const l = board.layers[i];
      const b = bounds.get(l.id);
      if (!l.hidden && b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return l;
    }
    return null;
  }

  function onPointerDown(e: React.PointerEvent) {
    const p = toBoard(e);
    const l = hit(p);
    onSelect(l?.id ?? null);
    if (!l) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { mode: "move", id: l.id, startX: p.x, startY: p.y, orig: l };
  }

  function onHandleDown(e: React.PointerEvent, l: Layer) {
    e.stopPropagation();
    const b = bounds.get(l.id);
    if (!b) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toBoard(e);
    drag.current = { mode: "resize", id: l.id, startX: p.x, startY: p.y, orig: l, bounds: b };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = toBoard(e);
    const dx = p.x - d.startX;
    const dy = p.y - d.startY;
    const o = d.orig;

    if (d.mode === "move") {
      let x = o.x + dx;
      let y = o.y + dy;
      // Snap the layer's centre to the artboard's centre lines.
      const b = bounds.get(o.id);
      let v = false, hz = false;
      if (b) {
        const offX = b.x - o.x, offY = b.y - o.y;
        const cx = x + offX + b.w / 2, cy = y + offY + b.h / 2;
        if (Math.abs(cx - W / 2) < SNAP) { x += W / 2 - cx; v = true; }
        if (Math.abs(cy - H / 2) < SNAP) { y += H / 2 - cy; hz = true; }
      }
      setSnapLines({ v, h: hz });
      onChange({ ...o, x: Math.round(x), y: Math.round(y) });
      return;
    }

    // Resize from the bottom-right corner, keeping proportions.
    const b = d.bounds;
    const scale = Math.max(0.05, (b.w + dx) / b.w);
    if (o.type === "image") onChange({ ...o, w: Math.round(o.w * scale), h: Math.round(o.h * scale) });
    else if (o.type === "glow") onChange({ ...o, r: Math.max(4, Math.round(o.r * Math.max(0.05, (b.w + dx) / b.w))) });
    else onChange({ ...o, size: Math.max(4, Math.round(o.size * scale)) });
  }

  function onPointerUp() {
    if (drag.current) onCommit();
    drag.current = null;
    setSnapLines({ v: false, h: false });
  }

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const sel = selectedId ? board.layers.find((l) => l.id === selectedId) : null;
  const selB = sel ? bounds.get(sel.id) : null;

  return (
    <div className="relative w-full select-none" style={{ aspectRatio: `${W} / ${H}` }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="absolute inset-0 h-full w-full touch-none rounded-xl shadow-[0_6px_30px_rgba(0,0,0,.18)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Where Apple draws its own text/logo — keep important art out of these. */}
      {showGuides &&
        SAFE_ZONES[boardKey].map((z) => (
          <div
            key={z.label}
            className="pointer-events-none absolute rounded-md border-2 border-dashed border-white/80 bg-white/10"
            style={{ left: pct(z.x, W), top: pct(z.y, H), width: pct(z.w, W), height: pct(z.h, H) }}
          >
            <span className="absolute left-1.5 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {z.label}
            </span>
          </div>
        ))}

      {showGuides && <AppleTextOverlay boardKey={boardKey} apple={apple} />}

      {snapLines.v && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-fuchsia-500" />}
      {snapLines.h && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-fuchsia-500" />}

      {sel && selB && (
        <div
          className="pointer-events-none absolute border-2 border-gold"
          style={{ left: pct(selB.x, W), top: pct(selB.y, H), width: pct(selB.w, W), height: pct(selB.h, H) }}
        >
          <div
            onPointerDown={(e) => onHandleDown(e, sel)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="pointer-events-auto absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-gold shadow"
            title="Drag to resize"
          />
        </div>
      )}
    </div>
  );
}

export type AppleText = {
  offerLabel: string | null;
  offerValue: string | null;
  secondaryLabel: string | null;
  secondaryValue: string | null;
  fgColor: string;
  labelColor: string;
  textAlign: "left" | "center" | "right";
};

/**
 * Apple's wording, faded, exactly where Wallet draws it on this artboard — measured
 * from the passes on device (same numbers as the live preview). Sizes are in container
 * units of the artboard's own width, so it stays true at any zoom.
 */
function AppleTextOverlay({ boardKey, apple }: { boardKey: ArtboardKey; apple: AppleText }) {
  const value = apple.offerValue || "Your reward";
  const label = apple.offerLabel || "COUPON";
  const ghost = "pointer-events-none absolute inset-0 @container opacity-80 [text-shadow:0_0_1px_rgba(0,0,0,.35)]";
  const sys = { fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif", textAlign: apple.textAlign } as const;
  const tag = (
    <span className="absolute right-[2cqw] top-[2cqw] rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      Apple&apos;s text (not part of the image)
    </span>
  );

  if (boardKey === "banner") {
    // On older iPhones the banner sits under the logo; the big text runs along its top,
    // nearly full width, and the small label sits below it.
    const size = Math.max(4.2, Math.min(8.1, 89 / (value.length * 0.47)));
    return (
      <div className={ghost} style={sys}>
        {tag}
        <div className="absolute inset-x-0 top-0 pl-[9%] pr-[1%] pt-[3%]" style={{ color: apple.fgColor }}>
          <div className="whitespace-nowrap font-light leading-tight tracking-[-0.01em] outline-1 outline-dashed outline-white/70" style={{ fontSize: `${size}cqw` }}>{value}</div>
          <div className="mt-[10%] inline-block truncate text-[4.4cqw] outline-1 outline-dashed outline-white/70">{label}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={ghost} style={sys}>
      {tag}
      <div className="absolute inset-x-0 bottom-0 p-[4.6cqw] outline-1 outline-dashed outline-white/70" style={{ color: apple.fgColor }}>
        <div className="text-[3.5cqw] font-semibold uppercase tracking-wide" style={{ color: apple.labelColor }}>{label}</div>
        <div className="text-[7.7cqw] font-bold leading-tight">{value}</div>
        <div className="mt-[4.6cqw] text-[3.5cqw] font-semibold uppercase tracking-wide" style={{ color: apple.labelColor }}>{apple.secondaryLabel || "WHERE TO BUY"}</div>
        <div className="text-[4.6cqw]">{apple.secondaryValue || "Tap for the map"}</div>
      </div>
    </div>
  );
}
