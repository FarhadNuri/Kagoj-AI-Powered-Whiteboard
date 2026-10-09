import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, FileText, GitBranch, Loader2, Sparkles, StickyNote, Wand2, X } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../ui/Button";
import { aiApi } from "../../lib/api";
import { cn } from "../../lib/utils";

const CREATE_ACTIONS = [
  { id: "brainstorm", label: "Sticky notes", icon: StickyNote },
  { id: "outline", label: "Outline", icon: FileText },
  { id: "diagram", label: "Flow diagram", icon: GitBranch },
  { id: "chart", label: "Chart", icon: BarChart3 },
];

function Divider({ children }) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-faint">
      <div className="h-px flex-1 bg-line" />
      {children}
      {children && <div className="h-px flex-1 bg-line" />}
    </div>
  );
}

function SummaryList({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">{title}</p>
      <ul className="list-disc space-y-1 pl-4 text-xs text-muted">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SummaryView({ summary }) {
  return (
    <div className="max-h-56 space-y-3 overflow-y-auto rounded-xl bg-surface-2 p-3">
      {summary.headline && <p className="text-sm font-semibold text-ink">{summary.headline}</p>}
      <SummaryList title="Themes" items={summary.themes} />
      <SummaryList title="Action items" items={summary.actionItems} />
      <SummaryList title="Open questions" items={summary.questions} />
    </div>
  );
}

export default function AIPanel({
  open,
  onClose,
  boardId,
  selectedIds = [],
  getDropPoint,
  onElementsCreated,
  onElementsUpdated,
}) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(6);
  const [busy, setBusy] = useState(null);
  const [summary, setSummary] = useState(null);

  const hasSelection = selectedIds.length > 0;

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const needTopic = () => {
    if (topic.trim()) return true;
    toast.error("Describe what you want first");
    return false;
  };

  const create = (action) => {
    if (!needTopic()) return;
    run(action, async () => {
      const { x, y } = getDropPoint();
      const elements = await aiApi[action](boardId, { topic: topic.trim(), count, x, y });
      onElementsCreated?.(elements);
    });
  };

  const editSelected = () => {
    if (!needTopic()) return;
    run("edit", async () => {
      const elements = await aiApi.edit(boardId, { instruction: topic.trim(), ids: selectedIds });
      onElementsUpdated?.(elements);
      toast.success("Selection updated");
    });
  };

  const summarize = () =>
    run("summary", async () => setSummary(await aiApi.summary(boardId)));

  const spin = (key, Icon) =>
    busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />;

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="card absolute right-4 top-16 z-30 w-80 space-y-4 p-4 shadow-[var(--shadow-lift)] max-md:inset-x-3 max-md:w-auto max-md:max-h-[calc(100dvh-10rem)] max-md:overflow-y-auto"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Sparkles className="h-4 w-4 text-brand-500" />
              AI assistant
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="focus-ring grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <textarea
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              hasSelection
                ? "How should the selection change? e.g. “make it more concise”"
                : "What should we brainstorm? e.g. “launch plan for a mobile app”"
            }
            className="input-base resize-none rounded-2xl"
          />

          {hasSelection && (
            <Button variant="soft" className="w-full" disabled={!!busy} onClick={editSelected}>
              {spin("edit", Wand2)}
              Edit {selectedIds.length} selected
            </Button>
          )}

          <Divider>{hasSelection ? "or create new" : "create"}</Divider>

          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-medium text-muted">
              Items <span className="tabular text-ink">{count}</span>
            </span>
            <input
              type="range"
              min={3}
              max={12}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            {CREATE_ACTIONS.map(({ id, label, icon }) => (
              <Button
                key={id}
                variant="outline"
                size="sm"
                disabled={!!busy}
                onClick={() => create(id)}
                className={cn("justify-start", busy === id && "border-brand-300")}
              >
                {spin(id, icon)}
                {label}
              </Button>
            ))}
          </div>

          <Divider />

          <Button variant="secondary" className="w-full" disabled={!!busy} onClick={summarize}>
            {spin("summary", FileText)}
            Summarize this board
          </Button>
          {summary && <SummaryView summary={summary} />}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
