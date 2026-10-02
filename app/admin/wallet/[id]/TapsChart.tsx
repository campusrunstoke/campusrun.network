/**
 * Taps per hour — a single-series bar chart, so one hue (ink; gold is reserved for
 * the one action on a page), no legend (the title names the series), recessive axis, hover tooltip on
 * every bar via <title>. Server-rendered SVG: no chart library, nothing to load.
 */
export default function TapsChart({ points }: { points: { t: string; n: number }[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted">No taps yet — the peak will show here.</p>;
  }

  // Fill missing hours so the timeline is continuous, and always show at least a
  // 12-hour window (padding before the first tap) so a single busy hour reads as a
  // spike on a timeline rather than one bar filling the canvas.
  const HOUR = 3600_000;
  const MIN_HOURS = 12;
  const MAX_HOURS = 72;
  const first = new Date(points[0].t).getTime();
  const end = new Date(points[points.length - 1].t).getTime();
  const start = Math.min(first, end - (MIN_HOURS - 1) * HOUR);
  const byHour = new Map(points.map((p) => [new Date(p.t).getTime(), p.n]));
  const series: { t: number; n: number }[] = [];
  for (let t = start; t <= end; t += HOUR) series.push({ t, n: byHour.get(t) ?? 0 });
  const shown = series.slice(-MAX_HOURS);

  const W = 800;
  const H = 180;
  const padL = 32;
  const padB = 24;
  const padT = 8;
  const innerW = W - padL - 8;
  const innerH = H - padB - padT;
  const max = Math.max(1, ...shown.map((p) => p.n));
  const gap = 2;
  // Cap bar width so sparse windows don't produce slabs; the row stays left-anchored.
  const bw = Math.min(40, Math.max(2, innerW / shown.length - gap));

  // Pacific time, matching the rest of the dashboard: "10/4 2pm".
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "numeric", day: "numeric", hour: "numeric" });
  const label = (t: number) => fmt.format(new Date(t)).replace(",", "").replace(" AM", "am").replace(" PM", "pm");
  const tickEvery = Math.max(1, Math.ceil(shown.length / 8));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full min-w-[480px]" role="img" aria-label="Taps per hour">
        {/* recessive gridlines */}
        {(max >= 2 ? [0, 0.5, 1] : [0, 1]).map((f) => {
          const y = padT + innerH - f * innerH;
          return (
            <g key={f}>
              <line x1={padL} x2={W - 8} y1={y} y2={y} stroke="#E5E5EA" strokeWidth="1" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#6E6E73" fontFamily="ui-monospace, monospace">
                {Math.round(f * max)}
              </text>
            </g>
          );
        })}
        {/* bars — 4px rounded top anchored to baseline, 2px surface gap */}
        {shown.map((p, i) => {
          const h = (p.n / max) * innerH;
          const x = padL + i * (bw + gap);
          const y = padT + innerH - h;
          return (
            <g key={p.t}>
              <rect x={x} y={y} width={bw} height={Math.max(h, p.n ? 2 : 0)} rx={Math.min(4, bw / 2)} fill="#003B5C">
                <title>{`${label(p.t)} — ${p.n} tap${p.n === 1 ? "" : "s"}`}</title>
              </rect>
              {/* wider invisible hit target */}
              <rect x={x - gap / 2} y={padT} width={bw + gap} height={innerH} fill="transparent">
                <title>{`${label(p.t)} — ${p.n} tap${p.n === 1 ? "" : "s"}`}</title>
              </rect>
              {i % tickEvery === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#6E6E73" fontFamily="ui-monospace, monospace">
                  {label(p.t)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
