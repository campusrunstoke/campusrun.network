/**
 * The pass designer's document model and renderer. Browser-only rendering (Canvas 2D),
 * but the types and constants are shared with the API for validation.
 *
 * One render function draws both the on-screen artboard and the exported PNG, so what
 * you see while editing is pixel-for-pixel what ships. Coordinates are in artboard
 * pixels (the exported image size), never screen pixels.
 */

/** Exported image sizes: iOS 27 poster artwork, and the classic coupon strip (@3x). */
export const ARTBOARDS = {
  poster: { w: 1125, h: 1755, label: "iOS 27 poster" },
  banner: { w: 1125, h: 432, label: "Older iPhones (banner)" },
} as const;
export type ArtboardKey = keyof typeof ARTBOARDS;

/**
 * Where Apple draws its own text over the artwork — approximate, from on-device tests.
 * Shown as a see-through overlay so art doesn't collide with the wording.
 */
export const SAFE_ZONES: Record<ArtboardKey, { x: number; y: number; w: number; h: number; label: string }[]> = {
  poster: [
    { x: 0, y: 0, w: 640, h: 230, label: "Logo" },
    { x: 0, y: 1230, w: 1125, h: 525, label: "Apple's text (label, big text, footer)" },
  ],
  banner: [{ x: 0, y: 90, w: 640, h: 260, label: "Apple's big text sits here" }],
};

export type Fill =
  | { type: "solid"; color: string }
  | { type: "linear"; from: string; to: string; angle: number }; // angle in degrees, 180 = top→bottom

type Base = { id: string; x: number; y: number; opacity: number; hidden?: boolean; name?: string };
export type ImageLayer = Base & { type: "image"; assetId: string; w: number; h: number };
export type TextLayer = Base & {
  type: "text";
  text: string;
  font: string; // a system family, or "asset:<id>" for an uploaded font
  size: number;
  weight: number;
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number; // multiple of size
  letterSpacing: number; // px
  glow: { color: string; blur: number } | null;
};
/** The soft radial "spark" most brand art leans on. x/y is the centre. */
export type GlowLayer = Base & { type: "glow"; r: number; inner: string; mid: string };
export type Layer = ImageLayer | TextLayer | GlowLayer;

export type Artboard = { background: Fill; layers: Layer[] };
export type Design = {
  version: 1;
  poster: Artboard;
  banner: Artboard;
  logoAssetId: string | null;
  fonts: { assetId: string; name: string }[];
};

export const SYSTEM_FONTS = [
  "Helvetica Neue",
  "Futura",
  "Avenir Next",
  "Arial Black",
  "Georgia",
  "Courier New",
] as const;

export const emptyDesign = (bg = "#003B5C"): Design => ({
  version: 1,
  poster: { background: { type: "solid", color: bg }, layers: [] },
  banner: { background: { type: "solid", color: bg }, layers: [] },
  logoAssetId: null,
  fonts: [],
});

export const fontFamily = (font: string) =>
  font.startsWith("asset:") ? `"cr-${font.slice(6)}"` : `"${font}", sans-serif`;

export const newId = () => Math.random().toString(36).slice(2, 10);

/* ------------------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;
export type Bounds = { x: number; y: number; w: number; h: number };

function setFont(ctx: Ctx, l: TextLayer) {
  ctx.font = `${l.weight} ${l.size}px ${fontFamily(l.font)}`;
  // letterSpacing is Canvas 2D in Chrome 99+/Safari 17+; harmless where unsupported.
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = `${l.letterSpacing}px`;
}

/** Text box bounds, measured with the same font the renderer uses. */
export function textBounds(ctx: Ctx, l: TextLayer): Bounds {
  setFont(ctx, l);
  const lines = l.text.split("\n");
  const w = Math.max(1, ...lines.map((s) => ctx.measureText(s).width));
  const h = Math.max(1, lines.length * l.size * l.lineHeight);
  const x = l.align === "left" ? l.x : l.align === "center" ? l.x - w / 2 : l.x - w;
  return { x, y: l.y, w, h };
}

export function layerBounds(ctx: Ctx, l: Layer): Bounds {
  if (l.type === "image") return { x: l.x, y: l.y, w: l.w, h: l.h };
  if (l.type === "glow") return { x: l.x - l.r, y: l.y - l.r, w: l.r * 2, h: l.r * 2 };
  return textBounds(ctx, l);
}

function paintFill(ctx: Ctx, fill: Fill, w: number, h: number) {
  if (fill.type === "solid") {
    ctx.fillStyle = fill.color;
  } else {
    // Gradient line through the centre at the given angle (CSS convention: 180° = downward).
    const a = ((fill.angle - 90) * Math.PI) / 180;
    const len = Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a));
    const cx = w / 2, cy = h / 2, dx = (Math.cos(a) * len) / 2, dy = (Math.sin(a) * len) / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, fill.from);
    g.addColorStop(1, fill.to);
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draw an artboard at artboard resolution. `images` maps assetId → a loaded image; a
 * layer whose image isn't loaded yet is skipped (the editor redraws once it arrives).
 */
export function renderArtboard(
  ctx: Ctx,
  key: ArtboardKey,
  board: Artboard,
  images: Map<string, CanvasImageSource>,
) {
  const { w, h } = ARTBOARDS[key];
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  paintFill(ctx, board.background, w, h);
  for (const l of board.layers) {
    if (l.hidden) continue;
    ctx.save();
    ctx.globalAlpha = l.opacity;
    if (l.type === "image") {
      const img = images.get(l.assetId);
      if (img) ctx.drawImage(img, l.x, l.y, l.w, l.h);
    } else if (l.type === "glow") {
      // Brand "spark": white core, coloured middle, fading to nothing at the edge.
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.07, l.inner);
      g.addColorStop(0.5, l.mid);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    } else {
      setFont(ctx, l);
      ctx.textAlign = l.align;
      ctx.textBaseline = "top";
      ctx.fillStyle = l.color;
      const lines = l.text.split("\n");
      const draw = () => lines.forEach((s, i) => ctx.fillText(s, l.x, l.y + i * l.size * l.lineHeight));
      if (l.glow && l.glow.blur > 0) {
        // Neon glow: two blurred passes under a crisp one.
        ctx.shadowColor = l.glow.color;
        ctx.shadowBlur = l.glow.blur;
        draw();
        draw();
        ctx.shadowBlur = 0;
      }
      draw();
    }
    ctx.restore();
  }
  ctx.restore();
}
