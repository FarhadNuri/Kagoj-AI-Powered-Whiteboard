import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  Eye,
  LayoutGrid,
  Minus,
  Plus,
  Redo2,
  Share2,
  Sparkles,
  Undo2,
} from "lucide-react";
import Button from "../ui/Button";
import { cn, colorFromId, initials } from "../../lib/utils";

const PATTERNS = [
  { id: "dots", label: "Dots" },
  { id: "grid", label: "Grid" },
  { id: "plain", label: "Plain" },
];
const BG_COLORS = ["#ffffff", "#f8fafc", "#fffbeb", "#f0fdf4", "#eff6ff", "#faf5ff", "#fef2f2", "#1e293b"];
const MAX_AVATARS = 4;

function useOutsideClose(open, close) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && close();
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);
  return ref;
}

function IconButton({ className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "focus-ring grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

function Popover({ className, children }) {
  return (
    <div className={cn("card absolute right-0 top-11 z-50 rounded-2xl p-2 shadow-[var(--shadow-lift)]", className)}>
      {children}
    </div>
  );
}

function Presence({ viewers = [] }) {
  const shown = viewers.slice(0, MAX_AVATARS);
  const extra = viewers.length - shown.length;
  if (!viewers.length) return null;
  return (
    <div className="flex -space-x-2">
      {shown.map((u) => (
        <div
          key={u.id}
          title={u.name || u.email}
          className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white ring-2 ring-surface"
          style={{ background: colorFromId(u.id || u.email || u.name) }}
        >
          {initials(u.name || u.email)}
        </div>
      ))}
      {extra > 0 && (
        <div className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-[11px] font-bold text-muted ring-2 ring-surface">
          +{extra}
        </div>
      )}
    </div>
  );
}

function BackgroundMenu({ board, onSetBackground, onSetBgColor, onPreviewBgColor }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const bgColor = board?.bg_color || "#ffffff";

  return (
    <div ref={ref} className="relative">
      <IconButton aria-label="Background" title="Background" onClick={() => setOpen((o) => !o)}>
        <LayoutGrid className="h-4 w-4" />
      </IconButton>
      {open && (
        <Popover className="w-56 p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-faint">Pattern</p>
          {PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSetBackground?.(p.id)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm text-ink hover:bg-surface-2"
            >
              {p.label}
              {board?.background === p.id && <Check className="h-4 w-4 text-brand-500" />}
            </button>
          ))}
          <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wide text-faint">Color</p>
          <div className="grid grid-cols-4 gap-2">
            {BG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => onSetBgColor?.(c)}
                className={cn(
                  "h-8 rounded-lg border border-line transition-transform hover:scale-105",
                  bgColor.toLowerCase() === c && "ring-2 ring-brand-500 ring-offset-1",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
          <label className="relative mt-3 flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink hover:bg-surface-2">
            <span
              className="h-4 w-4 rounded-full border border-line"
              style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
            />
            Custom...
            <input
              type="color"
              value={bgColor}
              onChange={(e) => onPreviewBgColor?.(e.target.value)}
              onBlur={(e) => onSetBgColor?.(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </Popover>
      )}
    </div>
  );
}

function ExportMenu({ onExportPNG, onExportSVG }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const pick = (fn) => () => {
    setOpen(false);
    fn?.();
  };
  return (
    <div ref={ref} className="relative">
      <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)} aria-label="Export" className="max-md:w-8 max-md:px-0!">
        <Download className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Export</span>
        <ChevronDown className="hidden h-3.5 w-3.5 md:block" />
      </Button>
      {open && (
        <Popover className="w-44">
          {[
            ["Download PNG", onExportPNG],
            ["Download SVG", onExportSVG],
          ].map(([label, fn]) => (
            <button
              key={label}
              type="button"
              onClick={pick(fn)}
              className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-ink hover:bg-surface-2"
            >
              {label}
            </button>
          ))}
        </Popover>
      )}
    </div>
  );
}

export default function TopBar({
  board,
  role,
  viewers,
  onRename,
  onShare,
  onAI,
  onSetBackground,
  onSetBgColor,
  onPreviewBgColor,
  onExportPNG,
  onExportSVG,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) {
  const navigate = useNavigate();
  const editable = role !== "viewer";
  const title = board?.title || "";
  const [draft, setDraft] = useState(null); // null = not editing, show the board title

  const commitTitle = () => {
    const next = (draft ?? title).trim();
    setDraft(null);
    if (next && next !== title) onRename?.(next);
  };

  return (
    <header className="glass absolute inset-x-0 top-0 z-40 flex items-center justify-between border-b border-line gap-2 px-2 py-2 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1 md:flex-none md:gap-2">
        <IconButton aria-label="Back to dashboard" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </IconButton>
        <input
          value={draft ?? title}
          disabled={!editable}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label="Whiteboard title"
          className="min-w-0 flex-1 truncate rounded-lg md:w-56 md:max-w-[40vw] md:flex-none bg-transparent px-2 py-1 font-display text-base font-semibold text-ink outline-none transition-colors hover:bg-surface-2 focus:bg-surface-2 disabled:hover:bg-transparent"
        />
        {!editable && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
            <Eye className="h-3.5 w-3.5" />
            View only
          </span>
        )}
        {editable && (
          <div className="flex items-center">
            <IconButton aria-label="Undo" title="Undo" onClick={onUndo} disabled={!canUndo}>
              <Undo2 className="h-4 w-4" />
            </IconButton>
            <IconButton aria-label="Redo" title="Redo" onClick={onRedo} disabled={!canRedo}>
              <Redo2 className="h-4 w-4" />
            </IconButton>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2.5">
        <div className="hidden md:block">
          <Presence viewers={viewers} />
        </div>
        <BackgroundMenu
          board={board}
          onSetBackground={onSetBackground}
          onSetBgColor={onSetBgColor}
          onPreviewBgColor={onPreviewBgColor}
        />

        <div className="hidden items-center rounded-full border border-line bg-surface p-0.5 md:flex">
          <IconButton aria-label="Zoom out" onClick={onZoomOut}>
            <Minus className="h-3.5 w-3.5" />
          </IconButton>
          <button
            type="button"
            onClick={onZoomReset}
            title="Reset zoom"
            className="tabular w-12 text-center text-xs font-semibold text-ink"
          >
            {Math.round(zoom * 100)}%
          </button>
          <IconButton aria-label="Zoom in" onClick={onZoomIn}>
            <Plus className="h-3.5 w-3.5" />
          </IconButton>
        </div>

        {editable && (
          <Button size="sm" variant="soft" onClick={onAI} aria-label="AI assistant" className="max-md:w-8 max-md:px-0!">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden md:inline">AI</span>
          </Button>
        )}
        <ExportMenu onExportPNG={onExportPNG} onExportSVG={onExportSVG} />
        {role === "owner" && (
          <Button size="sm" onClick={onShare} aria-label="Share" className="max-md:w-8 max-md:px-0!">
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Share</span>
          </Button>
        )}
      </div>
    </header>
  );
}
