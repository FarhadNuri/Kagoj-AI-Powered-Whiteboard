import { useEffect, useRef, useState } from "react";
import ElementRenderer from "./ElementRenderer";
import {
  TOOLS,
  boundsIntersectRect,
  getBounds,
  hitTest,
  resizeData,
  screenToWorld,
  strokeToPath,
  translateData,
} from "../../lib/canvas";

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 5;
const MIN_SIZE = 8;
const CURSOR_THROTTLE_MS = 45;
const SHAPE_TOOLS = [TOOLS.rect, TOOLS.ellipse, TOOLS.diamond];
const LINE_TOOLS = [TOOLS.line, TOOLS.arrow];
const BRAND = "#2f8159";

const HANDLES = {
  nw: { fx: 0, fy: 0, cursor: "nwse-resize" },
  n: { fx: 0.5, fy: 0, cursor: "ns-resize" },
  ne: { fx: 1, fy: 0, cursor: "nesw-resize" },
  e: { fx: 1, fy: 0.5, cursor: "ew-resize" },
  se: { fx: 1, fy: 1, cursor: "nwse-resize" },
  s: { fx: 0.5, fy: 1, cursor: "ns-resize" },
  sw: { fx: 0, fy: 1, cursor: "nesw-resize" },
  w: { fx: 0, fy: 0.5, cursor: "ew-resize" },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rotationOf = (el) => el.data?.rotation || 0;

function centerOf(el) {
  const b = getBounds(el);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

function rotateAttr(el) {
  const r = rotationOf(el);
  if (!r) return undefined;
  const c = centerOf(el);
  return `rotate(${r} ${c.x} ${c.y})`;
}

// Rotate a world point by -rotation around the element's centre (into its local frame).
function unrotate(el, x, y) {
  const r = rotationOf(el);
  if (!r) return { x, y };
  const c = centerOf(el);
  const a = (-r * Math.PI) / 180;
  const dx = x - c.x;
  const dy = y - c.y;
  return { x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) };
}

const hitEl = (el, x, y, tol) => {
  const p = unrotate(el, x, y);
  return hitTest(el, p.x, p.y, tol);
};

function unionBounds(els) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of els) {
    const b = getBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function normRect(x0, y0, x1, y1) {
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) };
}

function SelectionOverlay({ selected, zoom, canEdit, onStart }) {
  if (!selected.length) return null;
  const k = 1 / zoom;
  const single = selected.length === 1 ? selected[0] : null;
  const handleProps = { fill: "#fff", stroke: BRAND, strokeWidth: 1.5 * k };

  if (single && (single.type === "line" || single.type === "arrow")) {
    const d = single.data;
    return (
      <g>
        {[
          [1, d.x1, d.y1],
          [2, d.x2, d.y2],
        ].map(([n, x, y]) => (
          <circle
            key={n}
            cx={x}
            cy={y}
            r={6 * k}
            {...handleProps}
            style={{ cursor: "move", pointerEvents: canEdit ? "all" : "none" }}
            onPointerDown={(e) => onStart(e, "endpoint", n)}
          />
        ))}
      </g>
    );
  }

  const box = unionBounds(selected);
  const hs = 9 * k;
  const cx = box.x + box.w / 2;
  return (
    <g transform={single ? rotateAttr(single) : undefined}>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        fill="none"
        stroke={BRAND}
        strokeWidth={1.5 * k}
        strokeDasharray={`${5 * k} ${4 * k}`}
        pointerEvents="none"
      />
      {canEdit && (
        <>
          <line x1={cx} y1={box.y} x2={cx} y2={box.y - 26 * k} stroke={BRAND} strokeWidth={1.5 * k} pointerEvents="none" />
          <circle
            cx={cx}
            cy={box.y - 26 * k}
            r={5.5 * k}
            {...handleProps}
            style={{ cursor: "grab" }}
            onPointerDown={(e) => onStart(e, "rotate")}
          />
          {Object.entries(HANDLES).map(([name, h]) => (
            <rect
              key={name}
              x={box.x + box.w * h.fx - hs / 2}
              y={box.y + box.h * h.fy - hs / 2}
              width={hs}
              height={hs}
              rx={2 * k}
              {...handleProps}
              style={{ cursor: h.cursor }}
              onPointerDown={(e) => onStart(e, "resize", name)}
            />
          ))}
        </>
      )}
    </g>
  );
}

export default function Canvas({
  elements,
  setElements,
  tool,
  setTool,
  style = {},
  camera,
  setCamera,
  selectedIds,
  setSelectedIds,
  editingId,
  setEditingId,
  canEdit,
  background = "dots",
  bgColor = "#ffffff",
  persist,
  emitLive,
  emitCursor,
  onRequestChartEdit,
  onCheckpoint,
}) {
  const svgRef = useRef(null);
  const gesture = useRef(null);
  const touches = useRef(new Map()); // active touch pointers, for two-finger pan/zoom
  const spaceRef = useRef(false);
  const lastCursorAt = useRef(0);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [draft, setDraft] = useState(null); // { type, a, b }
  const [draftPoints, setDraftPoints] = useState(null);
  const [marquee, setMarquee] = useState(null);

  // Wheel needs a non-passive listener so we can preventDefault the browser zoom/scroll.
  useEffect(() => {
    const svg = svgRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = svg.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * 0.01);
        setCamera((c) => {
          const zoom = clamp(c.zoom * factor, MIN_ZOOM, MAX_ZOOM);
          const wx = (px - c.x) / c.zoom;
          const wy = (py - c.y) / c.zoom;
          return { zoom, x: px - wx * zoom, y: py - wy * zoom };
        });
      } else {
        setCamera((c) => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
      }
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [setCamera]);

  useEffect(() => {
    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    const down = (e) => {
      if (e.code !== "Space" || typing(e)) return;
      e.preventDefault();
      spaceRef.current = true;
      setSpaceHeld(true);
    };
    const up = (e) => {
      if (e.code !== "Space") return;
      spaceRef.current = false;
      setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const toWorld = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top, camera);
  };

  const startGesture = (e, g) => {
    svgRef.current.setPointerCapture(e.pointerId);
    gesture.current = g;
  };

  // persist.* only talks to the server; this component owns local element state.
  const add = async (type, data, { edit = false, select = true } = {}) => {
    const el = await persist.create(type, data);
    if (!el) return null;
    setElements((prev) => (prev.some((x) => x.id === el.id) ? prev : [...prev, el]));
    if (select) setSelectedIds([el.id]);
    if (edit) setEditingId(el.id);
    return el;
  };

  const applyData = (g, map) => {
    g.latest = map;
    setElements((prev) => prev.map((el) => (map.has(el.id) ? { ...el, data: map.get(el.id) } : el)));
    for (const el of g.orig.values()) {
      if (map.has(el.id)) emitLive?.({ id: el.id, type: el.type, data: map.get(el.id) });
    }
  };

  const shapeData = (type, a, b) => {
    const common = { stroke: style.stroke, strokeWidth: style.strokeWidth, sketch: style.sketch };
    const dragged = Math.hypot(b.x - a.x, b.y - a.y) * camera.zoom > 4;
    if (LINE_TOOLS.includes(type)) {
      const end = dragged ? b : { x: a.x + 140, y: a.y };
      return { x1: a.x, y1: a.y, x2: end.x, y2: end.y, ...common };
    }
    const box = dragged ? normRect(a.x, a.y, b.x, b.y) : { x: a.x, y: a.y, w: 140, h: 90 };
    return { ...box, fill: style.fill, ...common };
  };

  const textLikeCreate = (type, w) => {
    const hand = type === TOOLS.hand;
    add(
      "text",
      {
        x: w.x,
        y: w.y,
        w: hand ? 300 : 260,
        text: "",
        fontSize: hand ? Math.max(style.fontSize || 0, 28) : style.fontSize || 24,
        color: "#16161d",
        weight: 500,
        ...(hand ? { font: "hand" } : {}),
      },
      { edit: true },
    );
  };

  const selectDown = (e, w) => {
    const hit = [...elements].reverse().find((el) => hitEl(el, w.x, w.y, 6 / camera.zoom));
    if (!hit) {
      if (!e.shiftKey) setSelectedIds([]);
      startGesture(e, { kind: "marquee", x0: w.x, y0: w.y, base: e.shiftKey ? selectedIds : [] });
      return;
    }
    let ids = selectedIds;
    let clickId = null;
    if (e.shiftKey) {
      ids = ids.includes(hit.id) ? ids.filter((i) => i !== hit.id) : [...ids, hit.id];
      setSelectedIds(ids);
      if (!ids.includes(hit.id)) return;
    } else if (!ids.includes(hit.id)) {
      ids = [hit.id];
      setSelectedIds(ids);
    } else if (ids.length > 1) {
      clickId = hit.id;
    }
    if (!canEdit) return;
    const orig = new Map(elements.filter((el) => ids.includes(el.id)).map((el) => [el.id, el]));
    startGesture(e, { kind: "move", sx: w.x, sy: w.y, cx: e.clientX, cy: e.clientY, orig, clickId, moved: false });
  };

  const startTransform = (e, kind, handle) => {
    e.stopPropagation();
    if (!canEdit) return;
    const sel = elements.filter((el) => selectedIds.includes(el.id));
    if (!sel.length) return;
    onCheckpoint?.();
    const box = unionBounds(sel);
    const single = sel.length === 1 ? sel[0] : null;
    const center = single ? centerOf(single) : { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    const w = toWorld(e);
    startGesture(e, {
      kind,
      handle,
      orig: new Map(sel.map((el) => [el.id, el])),
      box,
      single,
      center,
      startAngle: Math.atan2(w.y - center.y, w.x - center.x),
      latest: null,
    });
  };

  // Finish or drop whatever one finger was doing before a second finger takes over.
  const cancelForPinch = () => {
    const g = gesture.current;
    if (g?.latest) for (const [id, data] of g.latest) persist.update(id, { data });
    gesture.current = null;
    setDraft(null);
    setDraftPoints(null);
    setMarquee(null);
    setPanning(false);
  };

  const touchPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e) => {
    if (e.button === 2) return;
    if (e.pointerType === "touch") {
      touches.current.set(e.pointerId, touchPoint(e));
      if (touches.current.size === 2) {
        svgRef.current.setPointerCapture(e.pointerId);
        cancelForPinch();
        const [a, b] = [...touches.current.values()];
        gesture.current = {
          kind: "pinch",
          dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          cam: camera,
        };
        return;
      }
    }
    const w = toWorld(e);
    if (tool === TOOLS.pan || spaceRef.current || e.button === 1) {
      setPanning(true);
      startGesture(e, { kind: "pan", sx: e.clientX, sy: e.clientY, cam: camera });
      return;
    }
    if (tool === TOOLS.select) return selectDown(e, w);
    if (!canEdit) return;

    if (tool === TOOLS.eraser) {
      onCheckpoint?.();
      startGesture(e, { kind: "erase", erased: new Set() });
      eraseAt(gesture.current, w);
      return;
    }
    if (SHAPE_TOOLS.includes(tool) || LINE_TOOLS.includes(tool)) {
      onCheckpoint?.();
      setDraft({ type: tool, a: w, b: w });
      startGesture(e, { kind: "shape", type: tool, a: w, b: w });
      return;
    }
    if (tool === TOOLS.draw) {
      onCheckpoint?.();
      const pt = e.pointerType === "pen" ? [w.x, w.y, e.pressure] : [w.x, w.y];
      setDraftPoints([pt]);
      startGesture(e, { kind: "draw", points: [pt] });
      return;
    }

    onCheckpoint?.();
    if (tool === TOOLS.text || tool === TOOLS.hand) {
      textLikeCreate(tool, w);
    } else if (tool === TOOLS.sticky) {
      add(
        "sticky",
        {
          x: w.x,
          y: w.y,
          w: 190,
          h: 190,
          text: "",
          fill: style.fill && style.fill !== "transparent" ? style.fill : "#fde68a",
          fontSize: 16,
        },
        { edit: true },
      );
    } else if (tool === TOOLS.bullet) {
      add(
        "bullet",
        { x: w.x, y: w.y, w: 280, items: ["Item"], fontSize: 16, color: "#16161d", bulletStyle: style.bulletStyle || "disc" },
        { edit: true },
      );
    }
  };

  const eraseAt = (g, w) => {
    const tol = 6 / camera.zoom;
    const hits = elements.filter((el) => !g.erased.has(el.id) && hitEl(el, w.x, w.y, tol));
    if (!hits.length) return;
    for (const el of hits) {
      g.erased.add(el.id);
      persist.remove(el.id);
    }
    setElements((prev) => prev.filter((el) => !g.erased.has(el.id)));
    setSelectedIds((ids) => ids.filter((id) => !g.erased.has(id)));
  };

  const onPointerMove = (e) => {
    if (e.pointerType === "touch" && touches.current.has(e.pointerId)) {
      touches.current.set(e.pointerId, touchPoint(e));
      const pinch = gesture.current;
      if (pinch?.kind === "pinch" && touches.current.size >= 2) {
        const [a, b] = [...touches.current.values()];
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const zoom = clamp((pinch.cam.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.dist, MIN_ZOOM, MAX_ZOOM);
        // Keep the world point that was under the starting midpoint under the moving midpoint.
        const wx = (pinch.mid.x - pinch.cam.x) / pinch.cam.zoom;
        const wy = (pinch.mid.y - pinch.cam.y) / pinch.cam.zoom;
        setCamera({ zoom, x: mid.x - wx * zoom, y: mid.y - wy * zoom });
        return;
      }
    }
    const w = toWorld(e);
    const now = performance.now();
    if (emitCursor && now - lastCursorAt.current > CURSOR_THROTTLE_MS) {
      lastCursorAt.current = now;
      emitCursor(w.x, w.y);
    }

    const g = gesture.current;
    if (!g) return;

    switch (g.kind) {
      case "pan":
        setCamera((c) => ({ ...c, x: g.cam.x + e.clientX - g.sx, y: g.cam.y + e.clientY - g.sy }));
        break;
      case "shape":
        g.b = w;
        setDraft({ type: g.type, a: g.a, b: w });
        break;
      case "draw": {
        g.points.push(e.pointerType === "pen" ? [w.x, w.y, e.pressure] : [w.x, w.y]);
        setDraftPoints([...g.points]);
        break;
      }
      case "erase":
        eraseAt(g, w);
        break;
      case "marquee": {
        const rect = normRect(g.x0, g.y0, w.x, w.y);
        setMarquee(rect);
        const inside = elements.filter((el) => boundsIntersectRect(el, rect)).map((el) => el.id);
        setSelectedIds([...new Set([...g.base, ...inside])]);
        break;
      }
      case "move": {
        if (!g.moved) {
          if (Math.hypot(e.clientX - g.cx, e.clientY - g.cy) < 3) return;
          g.moved = true;
          onCheckpoint?.();
        }
        const dx = w.x - g.sx;
        const dy = w.y - g.sy;
        applyData(g, new Map([...g.orig].map(([id, el]) => [id, translateData(el, dx, dy)])));
        break;
      }
      case "resize": {
        const p = g.single ? unrotate(g.single, w.x, w.y) : w;
        const ob = g.box;
        let L = ob.x;
        let R = ob.x + ob.w;
        let T = ob.y;
        let B = ob.y + ob.h;
        if (g.handle.includes("w")) L = Math.min(p.x, R - MIN_SIZE);
        if (g.handle.includes("e")) R = Math.max(p.x, L + MIN_SIZE);
        if (g.handle.includes("n")) T = Math.min(p.y, B - MIN_SIZE);
        if (g.handle.includes("s")) B = Math.max(p.y, T + MIN_SIZE);
        const nb = { x: L, y: T, w: R - L, h: B - T };
        const sx = ob.w ? nb.w / ob.w : 1;
        const sy = ob.h ? nb.h / ob.h : 1;
        applyData(
          g,
          new Map(
            [...g.orig].map(([id, el]) => {
              if (g.single) return [id, resizeData(el, nb)];
              const b = getBounds(el);
              return [
                id,
                resizeData(el, {
                  x: nb.x + (b.x - ob.x) * sx,
                  y: nb.y + (b.y - ob.y) * sy,
                  w: Math.max(b.w * sx, 1),
                  h: Math.max(b.h * sy, 1),
                }),
              ];
            }),
          ),
        );
        break;
      }
      case "rotate": {
        const delta = ((Math.atan2(w.y - g.center.y, w.x - g.center.x) - g.startAngle) * 180) / Math.PI;
        applyData(
          g,
          new Map(
            [...g.orig].map(([id, el]) => {
              let rot = rotationOf(el) + delta;
              if (e.shiftKey) rot = Math.round(rot / 15) * 15;
              return [id, { ...el.data, rotation: ((rot % 360) + 360) % 360 }];
            }),
          ),
        );
        break;
      }
      case "endpoint": {
        const [[id, el]] = [...g.orig];
        const keys = g.handle === 1 ? ["x1", "y1"] : ["x2", "y2"];
        applyData(g, new Map([[id, { ...el.data, [keys[0]]: w.x, [keys[1]]: w.y }]]));
        break;
      }
    }
  };

  const endGesture = (e) => {
    if (e.pointerType === "touch") {
      touches.current.delete(e.pointerId);
      if (gesture.current?.kind === "pinch") {
        if (touches.current.size < 2) gesture.current = null;
        if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
        return;
      }
    }
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);

    switch (g.kind) {
      case "pan":
        setPanning(false);
        break;
      case "marquee":
        setMarquee(null);
        break;
      case "shape":
        setDraft(null);
        add(g.type, shapeData(g.type, g.a, g.b));
        setTool(TOOLS.select);
        break;
      case "draw":
        setDraftPoints(null);
        add(
          "draw",
          { points: g.points, stroke: style.stroke, strokeWidth: style.strokeWidth },
          { select: false },
        );
        break;
      case "move":
        if (!g.moved && g.clickId) setSelectedIds([g.clickId]);
        // fall through
      case "resize":
      case "rotate":
      case "endpoint":
        if (g.latest) for (const [id, data] of g.latest) persist.update(id, { data });
        break;
    }
  };

  const onDoubleClick = (e) => {
    if (tool !== TOOLS.select) return;
    const w = toWorld(e);
    const hit = [...elements].reverse().find((el) => hitEl(el, w.x, w.y, 6 / camera.zoom));
    if (!hit) return;
    if (hit.type === "chart") {
      if (canEdit) onRequestChartEdit?.(hit);
    } else if (canEdit && ["text", "sticky", "bullet", "rect", "ellipse", "diamond"].includes(hit.type)) {
      setSelectedIds([hit.id]);
      setEditingId(hit.id);
    }
  };

  const cursor = panning
    ? "grabbing"
    : tool === TOOLS.pan || spaceHeld
      ? "grab"
      : tool === TOOLS.select
        ? "default"
        : tool === TOOLS.eraser
          ? "cell"
          : "crosshair";

  const bgClass = background === "dots" ? "canvas-bg-dots" : background === "grid" ? "canvas-bg-grid" : "";
  const draftElement = draft && {
    id: "draft",
    type: draft.type,
    data: shapeData(draft.type, draft.a, draft.b),
  };
  const selected = editingId ? [] : elements.filter((el) => selectedIds.includes(el.id));
  const k = 1 / camera.zoom;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className={`absolute inset-0 ${bgClass}`}
        style={{
          backgroundColor: bgColor,
          backgroundSize: `${22 * camera.zoom}px ${22 * camera.zoom}px`,
          backgroundPosition: `${camera.x}px ${camera.y}px`,
        }}
      />
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full select-none"
        style={{ cursor, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}>
          {elements.map((el) => (
            <g key={el.id} transform={rotateAttr(el)}>
              <ElementRenderer element={el} editing={el.id === editingId} />
            </g>
          ))}

          {draftElement && (
            <g opacity={0.8} pointerEvents="none">
              <ElementRenderer element={draftElement} />
            </g>
          )}
          {draftPoints && (
            <path
              d={strokeToPath(draftPoints, style.strokeWidth || 4)}
              fill={style.stroke || "#16161d"}
              pointerEvents="none"
            />
          )}
          {marquee && (
            <rect
              {...marquee}
              width={marquee.w}
              height={marquee.h}
              fill="rgba(47,129,89,0.08)"
              stroke={BRAND}
              strokeWidth={1.2 * k}
              strokeDasharray={`${5 * k} ${4 * k}`}
              pointerEvents="none"
            />
          )}

          <SelectionOverlay selected={selected} zoom={camera.zoom} canEdit={canEdit} onStart={startTransform} />
        </g>
      </svg>
    </div>
  );
}
