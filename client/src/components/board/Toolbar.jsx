import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  BarChart3,
  Circle,
  Diamond,
  Eraser,
  Feather,
  Hand,
  Image as ImageIcon,
  List,
  Minus,
  MousePointer2,
  Pencil,
  Smile,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import { TOOLS } from "../../lib/canvas";
import { cn } from "../../lib/utils";

// Groups are separated by dividers. `view` tools stay enabled for read-only users.
const GROUPS = [
  [
    { id: TOOLS.select, label: "Select", icon: MousePointer2, key: "V", view: true },
    { id: TOOLS.pan, label: "Pan", icon: Hand, key: "H", view: true },
  ],
  [
    { id: TOOLS.text, label: "Text", icon: Type, key: "T" },
    { id: TOOLS.hand, label: "Handwriting", icon: Feather, key: "G" },
    { id: TOOLS.sticky, label: "Sticky note", icon: StickyNote, key: "S" },
    { id: TOOLS.bullet, label: "Bullet list", icon: List, key: "B" },
  ],
  [
    { id: TOOLS.rect, label: "Rectangle", icon: Square, key: "R" },
    { id: TOOLS.ellipse, label: "Ellipse", icon: Circle, key: "O" },
    { id: TOOLS.diamond, label: "Diamond", icon: Diamond, key: "D" },
    { id: TOOLS.line, label: "Line", icon: Minus, key: "L" },
    { id: TOOLS.arrow, label: "Arrow", icon: ArrowRight, key: "A" },
  ],
  [
    { id: TOOLS.draw, label: "Draw", icon: Pencil, key: "P" },
    { id: TOOLS.eraser, label: "Eraser", icon: Eraser, key: "E" },
  ],
];

const MENU_HEIGHT = 160;
const TOP_BAR_HEIGHT = 64;

const CHART_TYPES = [
  ["bar", "Bar"],
  ["line", "Line"],
  ["pie", "Pie"],
  ["donut", "Donut"],
];

// Buttons shrink on short viewports so the rail fits under the top bar.
const btn = "grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl transition-all disabled:pointer-events-none disabled:opacity-40 md:[@media(max-height:820px)]:h-8 md:[@media(max-height:820px)]:w-8";
const idle = "text-muted hover:bg-surface-2 hover:text-ink";

function Divider() {
  return <div className="mx-1.5 my-0.5 h-px shrink-0 bg-line max-md:mx-0.5 max-md:my-1.5 max-md:h-auto max-md:w-px" />;
}

function ChartMenu({ disabled, onInsertChart }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        title="Chart"
        aria-label="Insert chart"
        disabled={disabled}
        onClick={() => {
          const r = buttonRef.current.getBoundingClientRect();
          // The chart button is the last in the rail, so keep the menu inside the viewport.
          if (window.matchMedia("(max-width: 767px)").matches) {
            // Bottom rail on phones: open the menu above the button.
            setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 136)), top: r.top - MENU_HEIGHT - 8 });
          } else {
            setPos({ left: r.right + 8, top: Math.max(TOP_BAR_HEIGHT, Math.min(r.top, window.innerHeight - MENU_HEIGHT - 8)) });
          }
          setOpen((o) => !o);
        }}
        className={cn(btn, open ? "bg-surface-2 text-ink" : idle)}
      >
        <BarChart3 className="h-[18px] w-[18px]" />
      </button>
      {open &&
        createPortal(
        <div
          ref={menuRef}
          className="card fixed z-[100] w-32 rounded-2xl p-1.5 shadow-[var(--shadow-lift)]"
          style={pos}
        >
          {CHART_TYPES.map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setOpen(false);
                onInsertChart?.(type);
              }}
              className="w-full cursor-pointer rounded-lg px-2.5 py-1.5 text-left text-sm text-ink hover:bg-surface-2"
            >
              {label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function Toolbar({ tool, setTool, disabled, onInsertImage, onInsertChart, onInsertEmoji }) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 top-16 z-30 flex items-center max-md:inset-x-0 max-md:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-md:left-0 max-md:top-auto max-md:justify-center max-md:px-2">
      <div className="card no-scrollbar pointer-events-auto flex max-h-full flex-col gap-1 overflow-y-auto rounded-2xl p-1.5 shadow-[var(--shadow-soft)] md:[@media(max-height:820px)]:gap-0.5 max-md:max-w-full max-md:flex-row max-md:overflow-x-auto max-md:overflow-y-hidden">
        {GROUPS.map((group, i) => (
          <Fragment key={i}>
            {i > 0 && <Divider />}
            {group.map(({ id, label, icon: Icon, key, view }) => (
              <button
                key={id}
                type="button"
                title={`${label} (${key})`}
                aria-label={label}
                aria-pressed={tool === id}
                disabled={disabled && !view}
                onClick={() => setTool(id)}
                className={cn(btn, tool === id ? "brand-gradient text-white shadow-[var(--shadow-brand)]" : idle)}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            ))}
          </Fragment>
        ))}

        <Divider />
        <button type="button" title="Emoji" aria-label="Insert emoji" disabled={disabled} onClick={onInsertEmoji} className={cn(btn, idle)}>
          <Smile className="h-[18px] w-[18px]" />
        </button>
        <button type="button" title="Image" aria-label="Insert image" disabled={disabled} onClick={onInsertImage} className={cn(btn, idle)}>
          <ImageIcon className="h-[18px] w-[18px]" />
        </button>
        <ChartMenu disabled={disabled} onInsertChart={onInsertChart} />
      </div>
    </div>
  );
}
