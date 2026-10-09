import { useState } from "react";
import { BarChart3, Circle, LineChart, PieChart, Plus, Trash2 } from "lucide-react";
import Button from "../ui/Button";
import { Input } from "../ui/Input";
import Modal from "../ui/Modal";
import { CHART_PALETTE, defaultChartData } from "./ChartElement";
import { cn } from "../../lib/utils";

const TYPES = [
  { id: "bar", label: "Bar", icon: BarChart3 },
  { id: "line", label: "Line", icon: LineChart },
  { id: "pie", label: "Pie", icon: PieChart },
  { id: "donut", label: "Donut", icon: Circle },
];

function seed(element) {
  const d = element?.data || {};
  const fallback = defaultChartData(d.chartType || "bar");
  const rows = Array.isArray(d.data) ? d.data : fallback.data;
  return {
    chartType: d.chartType || "bar",
    title: d.title ?? "",
    // Rows get a stable key and always a concrete color for the color input.
    rows: rows.map((r, i) => ({
      key: i,
      label: r.label ?? "",
      value: String(r.value ?? 0),
      color: r.color || CHART_PALETTE[i % CHART_PALETTE.length],
    })),
  };
}

function Editor({ element, onClose, onSave }) {
  const [state, setState] = useState(() => seed(element));
  const [nextKey, setNextKey] = useState(state.rows.length);
  const { chartType, title, rows } = state;

  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const updateRow = (key, p) =>
    patch({ rows: rows.map((r) => (r.key === key ? { ...r, ...p } : r)) });

  const addRow = () => {
    patch({
      rows: [
        ...rows,
        { key: nextKey, label: "", value: "0", color: CHART_PALETTE[rows.length % CHART_PALETTE.length] },
      ],
    });
    setNextKey((k) => k + 1);
  };

  const save = () => {
    onSave({
      chartType,
      title,
      data: rows
        .filter((r) => r.label.trim())
        .map((r) => ({ label: r.label.trim(), value: Number(r.value) || 0, color: r.color })),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit chart"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save chart</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => patch({ chartType: id })}
              className={cn(
                "focus-ring flex flex-col items-center gap-1 rounded-2xl border border-line py-2.5 text-xs font-medium transition-colors",
                chartType === id
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "bg-surface text-muted hover:bg-surface-2",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>

        <Input label="Title" value={title} onChange={(e) => patch({ title: e.target.value })} />

        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted">Data</span>
          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <input
                  type="color"
                  value={r.color}
                  onChange={(e) => updateRow(r.key, { color: e.target.value })}
                  aria-label="Color"
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-full border border-line bg-surface p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <Input
                    placeholder="Label"
                    value={r.label}
                    onChange={(e) => updateRow(r.key, { label: e.target.value })}
                  />
                </div>
                <div className="w-24 shrink-0">
                  <Input
                    type="number"
                    placeholder="Value"
                    value={r.value}
                    onChange={(e) => updateRow(r.key, { value: e.target.value })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Delete row"
                  onClick={() => patch({ rows: rows.filter((x) => x.key !== r.key) })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="soft" size="sm" className="mt-3" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Mounted only while open so the local form state is re-seeded from the element each time.
export default function ChartEditor({ open, element, onClose, onSave }) {
  if (!open || !element) return null;
  return <Editor key={element.id} element={element} onClose={onClose} onSave={onSave} />;
}
