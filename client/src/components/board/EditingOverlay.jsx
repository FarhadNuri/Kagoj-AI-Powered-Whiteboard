import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fontFamilyFor, getBounds, worldToScreen } from "../../lib/canvas";

const SHAPES = ["rect", "ellipse", "diamond"];

function initialValue(el) {
  const d = el.data;
  if (el.type === "bullet") return (d.items || []).join("\n");
  if (SHAPES.includes(el.type)) return d.label || "";
  return d.text || "";
}

// Map the textarea value to the data patch for each element type.
function patchFor(el, value) {
  if (el.type === "bullet") return { items: value.split("\n") };
  if (SHAPES.includes(el.type)) return { label: value };
  return { text: value };
}

export default function EditingOverlay({ element, camera, onLocalChange, onCommit }) {
  const ref = useRef(null);
  const done = useRef(false);
  const lastH = useRef(null);
  const [value, setValue] = useState(() => initialValue(element));

  const d = element.data;
  const type = element.type;
  const zoom = camera.zoom;
  const b = getBounds(element);
  const pos = worldToScreen(b.x, b.y, camera);

  const isText = type === "text";
  const isBullet = type === "bullet";
  const isSticky = type === "sticky";
  const isShape = SHAPES.includes(type);
  const grows = isText || isBullet;

  const baseSize = isText ? d.fontSize || 20 : isBullet ? d.fontSize || 16 : isSticky ? d.fontSize || 18 : d.font === "hand" ? 16 : 14;
  const fontSize = baseSize * zoom;
  const hand = d.font === "hand";
  const lineHeight = isBullet ? 1.7 : isSticky && hand ? 1.15 : 1.35;

  useEffect(() => {
    const t = setTimeout(() => {
      const ta = ref.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Auto-grow text/bullet blocks and report the measured height in world units.
  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta || !(grows || isShape)) return;
    ta.style.height = "auto";
    const px = ta.scrollHeight;
    ta.style.height = `${px}px`;
    if (!grows) return;
    const h = px / zoom;
    if (lastH.current === null || Math.abs(lastH.current - h) > 0.5) {
      lastH.current = h;
      onLocalChange?.({ h });
    }
  }, [value, zoom, grows, isShape, onLocalChange]);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    const v = value;
    const h = ref.current ? ref.current.scrollHeight / zoom : undefined;
    if (isBullet) {
      const items = v.split("\n").map((s) => s.trim()).filter(Boolean);
      onCommit(items.length ? { items, h } : null);
    } else if (isText) {
      onCommit(v.trim() ? { text: v, h } : null);
    } else {
      onCommit(patchFor(element, v));
    }
  };

  const textStyle = {
    fontSize,
    fontFamily: fontFamilyFor(d.font),
    lineHeight,
    fontWeight: isText ? d.weight || 500 : 400,
    color: d.color || "#16161d",
    textAlign: isShape ? "center" : "left",
  };

  const boxStyle = {
    position: "absolute",
    left: pos.x,
    top: pos.y,
    width: b.w * zoom,
    transform: d.rotation ? `rotate(${d.rotation}deg)` : undefined,
    transformOrigin: "center",
  };

  const textarea = (extra) => (
    <textarea
      ref={ref}
      value={value}
      spellCheck={false}
      onChange={(e) => {
        setValue(e.target.value);
        onLocalChange?.(patchFor(element, e.target.value));
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") ref.current?.blur();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        ...textStyle,
        display: "block",
        width: "100%",
        resize: "none",
        overflow: "hidden",
        border: "none",
        outline: "none",
        background: "transparent",
        margin: 0,
        boxSizing: "border-box",
        ...extra,
      }}
    />
  );

  if (isSticky) {
    return (
      <div
        style={{
          ...boxStyle,
          height: b.h * zoom,
          background: d.fill || "#fde68a",
          borderRadius: 10 * zoom,
          boxShadow: "0 0 0 2px rgba(47,129,89,.5)",
        }}
      >
        {textarea({ height: "100%", padding: 14 * zoom })}
      </div>
    );
  }

  if (isShape) {
    return (
      <div
        style={{
          ...boxStyle,
          height: b.h * zoom,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8 * zoom,
          boxSizing: "border-box",
        }}
      >
        {textarea({ maxHeight: "100%", padding: 0 })}
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      {textarea({
        padding: 0,
        paddingLeft: isBullet ? baseSize * 1.2 * zoom : 0,
        outline: "1.5px dashed rgba(47,129,89,.6)",
        outlineOffset: 2,
      })}
    </div>
  );
}
