import { getStroke } from "perfect-freehand";

export const TOOLS = {
  select: "select",
  pan: "pan",
  text: "text",
  sticky: "sticky",
  rect: "rect",
  ellipse: "ellipse",
  diamond: "diamond",
  line: "line",
  arrow: "arrow",
  draw: "draw",
  bullet: "bullet",
  hand: "hand",
  eraser: "eraser",
};

export const fontFamilyFor = (font) =>
  font === "hand" ? '"Caveat", "Segoe Script", cursive' : "Inter, sans-serif";

export const STROKE_COLORS = ["#16161d", "#2f8159", "#2563eb", "#e11d48", "#d97706", "#7c3aed", "#0891b2", "#ec4899"];
export const FILL_COLORS = ["transparent", "#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ddd6fe", "#fed7aa", "#e5e7eb"];
export const STICKY_COLORS = ["#fde68a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#ddd6fe", "#fed7aa"];
export const STROKE_WIDTHS = [2, 4, 8];
export const FONT_SIZES = [14, 18, 24, 34, 48];

export const worldToScreen = (wx, wy, cam) => ({
  x: wx * cam.zoom + cam.x,
  y: wy * cam.zoom + cam.y,
});

export const screenToWorld = (sx, sy, cam) => ({
  x: (sx - cam.x) / cam.zoom,
  y: (sy - cam.y) / cam.zoom,
});

// Points may be [x, y, pressure?] tuples or { x, y, pressure? } objects.
const asTuple = (p) => (Array.isArray(p) ? p : [p.x, p.y, p.pressure]);

export function strokeToPath(points, size = 4) {
  const tuples = (points || []).map(asTuple);
  if (!tuples.length) return "";
  const outline = getStroke(tuples, {
    size: size * 2.2,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: tuples.some((p) => p[2] == null),
  });
  if (!outline.length) return "";
  const f = (n) => n.toFixed(2);
  let d = `M${f(outline[0][0])},${f(outline[0][1])}`;
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d += ` Q${f(x0)},${f(y0)} ${f((x0 + x1) / 2)},${f((y0 + y1) / 2)}`;
  }
  return d + " Z";
}

export function getBounds(el) {
  const d = el.data || {};
  switch (el.type) {
    case "line":
    case "arrow": {
      const x = Math.min(d.x1, d.x2);
      const y = Math.min(d.y1, d.y2);
      return { x, y, w: Math.abs(d.x2 - d.x1), h: Math.abs(d.y2 - d.y1) };
    }
    case "draw": {
      const pts = (d.points || []).map(asTuple);
      if (!pts.length) return { x: d.x || 0, y: d.y || 0, w: 0, h: 0 };
      const pad = (d.strokeWidth || 4) * 1.5;
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX - pad,
        y: minY - pad,
        w: Math.max(...xs) - minX + pad * 2,
        h: Math.max(...ys) - minY + pad * 2,
      };
    }
    case "text": {
      const w = d.w || 260;
      const fs = d.fontSize || 20;
      if (d.h) return { x: d.x, y: d.y, w, h: d.h };
      const charsPerLine = Math.max(1, Math.floor(w / (fs * 0.55)));
      const lines = String(d.text || " ")
        .split("\n")
        .reduce((n, line) => n + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
      return { x: d.x, y: d.y, w, h: lines * fs * 1.35 };
    }
    case "bullet": {
      const fs = d.fontSize || 16;
      return {
        x: d.x,
        y: d.y,
        w: d.w || 280,
        h: d.h || (d.items?.length || 0) * fs * 1.7 + 12,
      };
    }
    default:
      return { x: d.x || 0, y: d.y || 0, w: d.w || 100, h: d.h || 100 };
  }
}

export function translateData(el, dx, dy) {
  const d = el.data;
  switch (el.type) {
    case "line":
    case "arrow":
      return { ...d, x1: d.x1 + dx, y1: d.y1 + dy, x2: d.x2 + dx, y2: d.y2 + dy };
    case "draw":
      return {
        ...d,
        points: (d.points || []).map((p) =>
          Array.isArray(p) ? [p[0] + dx, p[1] + dy, ...p.slice(2)] : { ...p, x: p.x + dx, y: p.y + dy },
        ),
      };
    default:
      return { ...d, x: d.x + dx, y: d.y + dy };
  }
}

export function resizeData(el, bounds) {
  const d = el.data;
  const old = getBounds(el);
  switch (el.type) {
    case "line":
    case "arrow": {
      const sx = old.w ? bounds.w / old.w : 1;
      const sy = old.h ? bounds.h / old.h : 1;
      const map = (x, y) => [bounds.x + (x - old.x) * sx, bounds.y + (y - old.y) * sy];
      const [x1, y1] = map(d.x1, d.y1);
      const [x2, y2] = map(d.x2, d.y2);
      return { ...d, x1, y1, x2, y2 };
    }
    case "draw": {
      const sx = old.w ? bounds.w / old.w : 1;
      const sy = old.h ? bounds.h / old.h : 1;
      return {
        ...d,
        points: (d.points || []).map((p) => {
          const [x, y, ...rest] = asTuple(p);
          const nx = bounds.x + (x - old.x) * sx;
          const ny = bounds.y + (y - old.y) * sy;
          return Array.isArray(p) ? [nx, ny, ...rest] : { ...p, x: nx, y: ny };
        }),
      };
    }
    default:
      return { ...d, x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h };
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function hitTest(el, px, py, tol = 6) {
  const d = el.data || {};
  if (el.type === "line" || el.type === "arrow") {
    return distToSegment(px, py, d.x1, d.y1, d.x2, d.y2) <= tol + (d.strokeWidth || 2) / 2;
  }
  if (el.type === "draw") {
    const pts = (d.points || []).map(asTuple);
    const reach = tol + (d.strokeWidth || 4);
    if (pts.length === 1) return Math.hypot(px - pts[0][0], py - pts[0][1]) <= reach;
    for (let i = 0; i < pts.length - 1; i++) {
      if (distToSegment(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= reach) return true;
    }
    return false;
  }
  const b = getBounds(el);
  return px >= b.x - tol && px <= b.x + b.w + tol && py >= b.y - tol && py <= b.y + b.h + tol;
}

export function boundsIntersectRect(el, rect) {
  const b = getBounds(el);
  return b.x <= rect.x + rect.w && b.x + b.w >= rect.x && b.y <= rect.y + rect.h && b.y + b.h >= rect.y;
}

export function diamondPoints(b) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return `${cx},${b.y} ${b.x + b.w},${cy} ${cx},${b.y + b.h} ${b.x},${cy}`;
}

export function arrowHead(x1, y1, x2, y2, size = 12) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  const p = (a) => `${x2 - size * Math.cos(a)},${y2 - size * Math.sin(a)}`;
  return `${x2},${y2} ${p(angle - spread)} ${p(angle + spread)}`;
}
