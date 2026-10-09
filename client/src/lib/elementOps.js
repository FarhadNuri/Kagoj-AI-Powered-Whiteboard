const SHAPES = ["rect", "ellipse", "diamond"];
const STROKED = [...SHAPES, "line", "arrow", "draw"];
const FILLABLE = [...SHAPES, "sticky"];
const TEXTUAL = ["text", "sticky", "bullet"];
const SKETCHABLE = [...SHAPES, "line", "arrow"];

// Which style keys apply to which element types.
const RULES = {
  stroke: STROKED,
  strokeWidth: STROKED,
  fill: FILLABLE,
  fontSize: TEXTUAL,
  color: ["text", "bullet"],
  font: [...TEXTUAL, ...SHAPES],
  sketch: SKETCHABLE,
  bulletStyle: ["bullet"],
};

// Returns the element's new data with the applicable part of `patch` applied, or null if nothing applies.
export function applyStyleToData(el, patch) {
  const changes = {};
  for (const [key, types] of Object.entries(RULES)) {
    if (key in patch && types.includes(el.type)) changes[key] = patch[key];
  }
  if (!Object.keys(changes).length) return null;
  const data = { ...el.data, ...changes };
  // Text height is re-estimated after a size/font change; a stale measured height would clip it.
  if (("fontSize" in changes || "font" in changes) && (el.type === "text" || el.type === "bullet")) {
    delete data.h;
  }
  return data;
}

export const isTempId = (id) => String(id).startsWith("tmp-");

export const isTypingTarget = (e) =>
  /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
