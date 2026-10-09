export const CHART_PALETTE = ["#2f8159", "#2563eb", "#e11d48", "#d97706", "#7c3aed", "#0891b2", "#ec4899", "#16a34a"];

export function defaultChartData(chartType) {
  const data =
    chartType === "line"
      ? [
          { label: "Jan", value: 12 },
          { label: "Feb", value: 19 },
          { label: "Mar", value: 15 },
          { label: "Apr", value: 28 },
          { label: "May", value: 24 },
        ]
      : [
          { label: "Design", value: 30 },
          { label: "Build", value: 45 },
          { label: "Test", value: 15 },
          { label: "Ship", value: 10 },
        ];
  return { chartType, title: "Untitled chart", data };
}

const AXIS = "#e2e0f0";
const colorAt = (item, i) => item.color || CHART_PALETTE[i % CHART_PALETTE.length];

function polar(cx, cy, r, a) {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx, cy, r, inner, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  if (!inner) return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`;
  const [x2, y2] = polar(cx, cy, inner, a1);
  const [x3, y3] = polar(cx, cy, inner, a0);
  return `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${inner},${inner} 0 ${large} 0 ${x3},${y3} Z`;
}

function Bars({ items, w, h }) {
  const left = 16;
  const top = 44;
  const plotW = w - left * 2;
  const plotH = h - top - 34;
  const max = Math.max(...items.map((i) => i.value), 1);
  const slot = plotW / items.length;
  const barW = Math.min(slot * 0.62, 60);
  return (
    <g>
      <line x1={left} y1={top + plotH} x2={w - left} y2={top + plotH} stroke={AXIS} />
      <line x1={left} y1={top} x2={left} y2={top + plotH} stroke={AXIS} />
      {items.map((item, i) => {
        const bh = (item.value / max) * (plotH - 16);
        const x = left + slot * i + (slot - barW) / 2;
        return (
          <g key={i}>
            <rect x={x} y={top + plotH - bh} width={barW} height={bh} rx={4} fill={colorAt(item, i)} />
            <text x={x + barW / 2} y={top + plotH - bh - 5} textAnchor="middle" fontSize={11} fill="#16161d">
              {item.value}
            </text>
            <text x={x + barW / 2} y={top + plotH + 16} textAnchor="middle" fontSize={11} fill="#5d5d6e">
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Line({ items, w, h }) {
  const left = 28;
  const top = 48;
  const plotW = w - left * 2;
  const plotH = h - top - 34;
  const max = Math.max(...items.map((i) => i.value), 1);
  const pts = items.map((item, i) => [
    left + (items.length === 1 ? plotW / 2 : (plotW * i) / (items.length - 1)),
    top + plotH - (item.value / max) * plotH,
  ]);
  return (
    <g>
      <line x1={left} y1={top + plotH} x2={w - left} y2={top + plotH} stroke={AXIS} />
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke={CHART_PALETTE[0]}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={3.5} fill="#fff" stroke={CHART_PALETTE[0]} strokeWidth={2} />
          <text x={x} y={top + plotH + 16} textAnchor="middle" fontSize={11} fill="#5d5d6e">
            {items[i].label}
          </text>
        </g>
      ))}
    </g>
  );
}

function Pie({ items, w, h, donut }) {
  const total = items.reduce((s, i) => s + Math.max(i.value, 0), 0) || 1;
  const r = Math.min(w * 0.3, (h - 60) / 2);
  const cx = 16 + r + 8;
  const cy = 44 + (h - 44) / 2;
  const sweeps = items.map((item) => (Math.max(item.value, 0) / total) * Math.PI * 2);
  return (
    <g>
      {items.map((item, i) => {
        const a0 = -Math.PI / 2 + sweeps.slice(0, i).reduce((s, v) => s + v, 0);
        // A full circle can't be drawn as a single arc.
        const a1 = Math.min(a0 + sweeps[i], a0 + Math.PI * 2 - 0.0001);
        return (
          <path
            key={i}
            d={arcPath(cx, cy, r, donut ? r * 0.55 : 0, a0, a1)}
            fill={colorAt(item, i)}
            stroke="#fff"
            strokeWidth={1.5}
          />
        );
      })}
      {items.map((item, i) => {
        const y = 60 + i * 20;
        const lx = cx + r + 24;
        return (
          <g key={i}>
            <rect x={lx} y={y - 9} width={10} height={10} rx={2} fill={colorAt(item, i)} />
            <text x={lx + 16} y={y} fontSize={11} fill="#16161d">
              {item.label} · {Math.round((Math.max(item.value, 0) / total) * 100)}%
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default function ChartElement({ element }) {
  const d = element.data || {};
  const { x = 0, y = 0, w = 360, h = 260 } = d;
  const items = d.data || [];
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={w} height={h} rx={12} fill="#fff" stroke="#e9e8f3" />
      <text x={w / 2} y={26} textAnchor="middle" fontSize={14} fontWeight={700} fill="#16161d">
        {d.title}
      </text>
      {items.length > 0 && d.chartType === "line" && <Line items={items} w={w} h={h} />}
      {items.length > 0 && (d.chartType === "pie" || d.chartType === "donut") && (
        <Pie items={items} w={w} h={h} donut={d.chartType === "donut"} />
      )}
      {items.length > 0 && (!d.chartType || d.chartType === "bar") && <Bars items={items} w={w} h={h} />}
    </g>
  );
}
