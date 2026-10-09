import { TOOLS, FILL_COLORS, FONT_SIZES, STROKE_COLORS, STROKE_WIDTHS } from "../../lib/canvas";
import { cn } from "../../lib/utils";

const TOOL_TYPE = {
  [TOOLS.text]: "text",
  [TOOLS.hand]: "text",
  [TOOLS.sticky]: "sticky",
  [TOOLS.bullet]: "bullet",
  [TOOLS.rect]: "rect",
  [TOOLS.ellipse]: "ellipse",
  [TOOLS.diamond]: "diamond",
  [TOOLS.line]: "line",
  [TOOLS.arrow]: "arrow",
  [TOOLS.draw]: "draw",
};

const SHAPES = ["rect", "ellipse", "diamond"];
const STROKED = [...SHAPES, "line", "arrow", "draw"];
const SKETCHABLE = [...SHAPES, "line", "arrow"];

const BULLET_STYLES = [
  ["disc", "•"],
  ["circle", "◦"],
  ["decimal", "1."],
  ["none", "∅"],
];

const RAINBOW = "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)";
const CHECKER =
  "conic-gradient(#d4d4dc 25%, #fff 0 50%, #d4d4dc 0 75%, #fff 0) 0 0 / 10px 10px";

const chip = "grid place-items-center rounded-full transition-all";
const activeCls = "bg-brand-50 ring-2 ring-brand-300";

function Group({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-faint">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function ColorGroup({ label, colors, value, onChange }) {
  const custom = value && !colors.includes(value) && value !== "transparent";
  return (
    <Group label={label}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn(chip, "h-6 w-6 border border-line hover:scale-110", value === c && "ring-2 ring-brand-500 ring-offset-1")}
          style={{ background: c === "transparent" ? CHECKER : c }}
        />
      ))}
      <label
        className={cn(chip, "relative h-6 w-6 cursor-pointer hover:scale-110", custom && "ring-2 ring-brand-500 ring-offset-1")}
        style={{ background: RAINBOW }}
        title="Custom color"
      >
        <input
          type="color"
          value={custom ? value : "#2f8159"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </Group>
  );
}

function Toggle({ active, onClick, title, children, className }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "grid h-7 min-w-7 place-items-center rounded-lg px-1.5 text-sm text-muted transition-colors hover:bg-surface-2",
        active && activeCls,
        active && "text-brand-700",
        className,
      )}
    >
      {children}
    </button>
  );
}

function SizeInput({ value, onChange }) {
  return (
    <input
      key={value}
      type="number"
      min={6}
      max={400}
      defaultValue={value}
      aria-label="Font size"
      onBlur={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n) && e.target.value !== "") onChange(Math.min(400, Math.max(6, Math.round(n))));
        else e.target.value = value;
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="tabular h-7 w-14 rounded-lg border border-line bg-surface px-2 text-xs text-ink outline-none focus:border-brand-300"
    />
  );
}

export default function StylePanel({ tool, style, setStyle, selected = [], onApply, onSetFont }) {
  const types = selected.length ? selected.map((el) => el.type) : TOOL_TYPE[tool] ? [TOOL_TYPE[tool]] : [];
  if (!types.length) return null;

  const has = (list) => types.some((t) => list.includes(t));
  const first = selected[0]?.data;
  const val = (key) => first?.[key] ?? style[key];

  const change = (patch) => {
    setStyle((s) => ({ ...s, ...patch }));
    if (selected.length) onApply?.(patch);
  };

  const showStroke = has(STROKED);
  const showText = has(["text", "bullet"]);
  const showFill = has([...SHAPES, "sticky"]);
  const showSketch = has(SKETCHABLE);
  const showBullets = has(["bullet"]);
  const showFont = has(["text", "sticky", "bullet"]);
  const showSize = showFont;
  if (![showStroke, showText, showFill, showSketch, showBullets, showFont, showSize].some(Boolean)) return null;

  const hand = val("font") === "hand";
  const size = val("fontSize") ?? 24;

  const setFont = (font) => {
    setStyle((s) => ({ ...s, font }));
    if (selected.length) onSetFont?.(font);
  };

  return (
    <div className="card absolute left-1/2 top-16 z-30 flex max-h-[40dvh] max-w-[calc(100vw-8rem)] -translate-x-1/2 overflow-y-auto max-md:bottom-[calc(5rem+env(safe-area-inset-bottom))] max-md:top-auto max-md:max-w-[calc(100vw-1rem)] flex-wrap items-center gap-3 rounded-2xl px-3 py-2 shadow-[var(--shadow-soft)]">
      {showStroke && (
        <ColorGroup label="Stroke" colors={STROKE_COLORS} value={val("stroke")} onChange={(stroke) => change({ stroke })} />
      )}
      {showText && (
        <ColorGroup label="Text color" colors={STROKE_COLORS} value={val("color")} onChange={(color) => change({ color })} />
      )}
      {showFill && (
        <ColorGroup label="Fill" colors={FILL_COLORS} value={val("fill")} onChange={(fill) => change({ fill })} />
      )}

      {showStroke && (
        <Group label="Width">
          {STROKE_WIDTHS.map((w) => (
            <Toggle key={w} active={val("strokeWidth") === w} title={`${w}px`} onClick={() => change({ strokeWidth: w })}>
              <span className="rounded-full bg-current" style={{ width: 6 + w, height: 6 + w }} />
            </Toggle>
          ))}
        </Group>
      )}

      {showSketch && (
        <Group label="Style">
          <Toggle active={!val("sketch")} title="Solid" onClick={() => change({ sketch: false })}>
            <svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 6h18" />
            </svg>
          </Toggle>
          <Toggle active={!!val("sketch")} title="Hand-drawn" onClick={() => change({ sketch: true })}>
            <svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7c3-4 5 3 8-1s5 3 10-1" />
            </svg>
          </Toggle>
        </Group>
      )}

      {showBullets && (
        <Group label="Bullets">
          {BULLET_STYLES.map(([id, glyph]) => (
            <Toggle
              key={id}
              active={(val("bulletStyle") || "disc") === id}
              title={id}
              onClick={() => change({ bulletStyle: id })}
            >
              {glyph}
            </Toggle>
          ))}
        </Group>
      )}

      {showFont && (
        <Group label="Font">
          <Toggle active={!hand} title="Normal" onClick={() => setFont("sans")}>
            <span className="font-sans font-semibold">Aa</span>
          </Toggle>
          <Toggle active={hand} title="Handwriting" onClick={() => setFont("hand")}>
            <span style={{ fontFamily: '"Caveat", cursive' }} className="text-base font-bold">
              Aa
            </span>
          </Toggle>
        </Group>
      )}

      {showSize && (
        <Group label="Size">
          {FONT_SIZES.map((s) => (
            <Toggle key={s} active={size === s} onClick={() => change({ fontSize: s })} className="tabular text-xs">
              {s}
            </Toggle>
          ))}
          <SizeInput value={size} onChange={(fontSize) => change({ fontSize })} />
        </Group>
      )}
    </div>
  );
}
