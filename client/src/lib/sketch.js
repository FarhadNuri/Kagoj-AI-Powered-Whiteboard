// Deterministic hand-drawn wobble: same id -> same output on every render and client.
export function seededRandom(id) {
  // FNV-1a hash
  let h = 2166136261;
  for (const ch of String(id)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  // mulberry32
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const jitter = (rand, amp) => (rand() - 0.5) * 2 * amp;
const f = (n) => n.toFixed(1);

// Quadratic smoothing through midpoints of the given points.
function smooth(points, closed) {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M${f(points[0][0])},${f(points[0][1])} L${f(points[1][0])},${f(points[1][1])}`;
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const n = points.length;
  if (closed) {
    const start = mid(points[n - 1], points[0]);
    let d = `M${f(start[0])},${f(start[1])}`;
    for (let i = 0; i < n; i++) {
      const m = mid(points[i], points[(i + 1) % n]);
      d += ` Q${f(points[i][0])},${f(points[i][1])} ${f(m[0])},${f(m[1])}`;
    }
    return d + " Z";
  }
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 1; i < n - 1; i++) {
    const m = mid(points[i], points[i + 1]);
    d += ` Q${f(points[i][0])},${f(points[i][1])} ${f(m[0])},${f(m[1])}`;
  }
  return d + ` L${f(points[n - 1][0])},${f(points[n - 1][1])}`;
}

// Points along a segment, jittered, excluding the final endpoint.
function wobblySegment(x1, y1, x2, y2, rand, amp) {
  const steps = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 40));
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    pts.push([x1 + (x2 - x1) * t + jitter(rand, amp), y1 + (y2 - y1) * t + jitter(rand, amp)]);
  }
  return pts;
}

export function sketchLine(x1, y1, x2, y2, rand, amp = 1.8) {
  const pts = wobblySegment(x1, y1, x2, y2, rand, amp);
  pts.push([x2 + jitter(rand, amp), y2 + jitter(rand, amp)]);
  return smooth(pts, false);
}

export function sketchPolygon(points, rand, amp = 1.8) {
  const pts = [];
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    pts.push(...wobblySegment(x, y, nx, ny, rand, amp));
  });
  return smooth(pts, true);
}

export function sketchRect(x, y, w, h, rand, amp = 1.8) {
  return sketchPolygon(
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
    ],
    rand,
    amp,
  );
}

export function sketchEllipse(cx, cy, rx, ry, rand, amp = 2) {
  const n = 22;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx + jitter(rand, amp), cy + Math.sin(a) * ry + jitter(rand, amp)]);
  }
  return smooth(pts, true);
}
