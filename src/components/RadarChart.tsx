// Radar / spider chart en SVG puro (sin dependencias). Soporta varias series
// superpuestas (para comparar civs en un matchup). Componente presentacional:
// sirve en Server Components y Client Components.

export type RadarSeries = { name: string; values: number[]; color: string };

export function RadarChart({
  axes,
  series,
  max = 10,
  size = 340,
}: {
  axes: readonly string[];
  series: RadarSeries[];
  max?: number;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 54; // margen para etiquetas
  const n = axes.length;
  const rings = 5;

  const angleAt = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2; // arranca arriba
  const pt = (value: number, i: number) => {
    const rr = r * (Math.min(value, max) / max);
    return [cx + rr * Math.cos(angleAt(i)), cy + rr * Math.sin(angleAt(i))] as const;
  };
  const polygon = (vals: number[]) => vals.map((v, i) => pt(v, i).join(",")).join(" ");

  return (
    <figure className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-sm" role="img">
        {/* anillos de la grilla */}
        {Array.from({ length: rings }).map((_, ring) => {
          const rr = (r * (ring + 1)) / rings;
          const points = axes
            .map((_, i) => {
              const a = angleAt(i);
              return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
            })
            .join(" ");
          return (
            <polygon
              key={ring}
              points={points}
              className="fill-none stroke-zinc-300 dark:stroke-zinc-700"
              strokeWidth={1}
            />
          );
        })}

        {/* radios + etiquetas */}
        {axes.map((axis, i) => {
          const a = angleAt(i);
          const ex = cx + r * Math.cos(a);
          const ey = cy + r * Math.sin(a);
          const lx = cx + (r + 16) * Math.cos(a);
          const ly = cy + (r + 16) * Math.sin(a);
          const cos = Math.cos(a);
          const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
          return (
            <g key={axis}>
              <line
                x1={cx}
                y1={cy}
                x2={ex}
                y2={ey}
                className="stroke-zinc-300 dark:stroke-zinc-700"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="fill-zinc-600 text-[10px] dark:fill-zinc-400"
              >
                {axis}
              </text>
            </g>
          );
        })}

        {/* series */}
        {series.map((s) => (
          <g key={s.name}>
            <polygon
              points={polygon(s.values)}
              fill={s.color}
              fillOpacity={series.length > 1 ? 0.15 : 0.25}
              stroke={s.color}
              strokeWidth={2}
            />
            {s.values.map((v, i) => {
              const [x, y] = pt(v, i);
              return <circle key={i} cx={x} cy={y} r={3} fill={s.color} />;
            })}
          </g>
        ))}
      </svg>

      <figcaption className="flex flex-wrap justify-center gap-3 text-xs">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
