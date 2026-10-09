import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import AIPanel from "../components/board/AIPanel";
import Canvas from "../components/board/Canvas";
import { defaultChartData } from "../components/board/ChartElement";
import ChartEditor from "../components/board/ChartEditor";
import EditingOverlay from "../components/board/EditingOverlay";
import EmojiPicker from "../components/board/EmojiPicker";
import ShareModal from "../components/board/ShareModal";
import StylePanel from "../components/board/StylePanel";
import Toolbar from "../components/board/Toolbar";
import TopBar from "../components/board/TopBar";
import { FullScreenSpinner } from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import { useBoardRealtime } from "../hooks/useBoardRealtime";
import { boardApi, elementApi, uploadApi } from "../lib/api";
import { TOOLS, screenToWorld, translateData, worldToScreen } from "../lib/canvas";
import { applyStyleToData, isTempId, isTypingTarget } from "../lib/elementOps";
import { exportPNG, exportSVG } from "../lib/exportCanvas";
import { fileToDownscaledBlob } from "../lib/image";
import { colorFromId } from "../lib/utils";

const HISTORY_LIMIT = 80;
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 5;
const PASTE_OFFSET = 24;

const TOOL_KEYS = {
  v: TOOLS.select,
  h: TOOLS.pan,
  t: TOOLS.text,
  g: TOOLS.hand,
  s: TOOLS.sticky,
  b: TOOLS.bullet,
  r: TOOLS.rect,
  o: TOOLS.ellipse,
  d: TOOLS.diamond,
  l: TOOLS.line,
  a: TOOLS.arrow,
  p: TOOLS.draw,
  e: TOOLS.eraser,
};

const DEFAULT_STYLE = {
  stroke: "#16161d",
  color: "#16161d",
  fill: "transparent",
  strokeWidth: 4,
  fontSize: 24,
  sketch: false,
  bulletStyle: "disc",
};

const upsert = (list, item) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : [...list, item];

function RemoteCursors({ cursors, camera }) {
  return Object.entries(cursors).map(([id, c]) => {
    const p = worldToScreen(c.x, c.y, camera);
    const color = colorFromId(id);
    return (
      <div
        key={id}
        className="pointer-events-none absolute left-0 top-0 z-20 transition-transform duration-75"
        style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill={color} stroke="#fff" strokeWidth="1.2">
          <path d="M2 2l12 5-5 2-2 5z" strokeLinejoin="round" />
        </svg>
        <span
          className="ml-3.5 -mt-1 block w-max rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-[var(--shadow-card)]"
          style={{ background: color }}
        >
          {c.name}
        </span>
      </div>
    );
  });
}

function Board({ boardId }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [board, setBoard] = useState(null);
  const [members, setMembers] = useState([]);
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState(TOOLS.select);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingChart, setEditingChart] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [historySize, setHistorySize] = useState({ undo: 0, redo: 0 });

  const fileRef = useRef(null);
  const elementsRef = useRef([]);
  const history = useRef({ past: [], future: [] });
  const pending = useRef(new Map()); // temp id -> promise of the server row
  const clipboard = useRef({ items: [], pastes: 0 });
  const savedMeta = useRef({});
  const editSnapshot = useRef(null);
  const actions = useRef({});

  const role = board?.role;
  const canEdit = role === "owner" || role === "editor";

  // Single entry point for element state: keeps elementsRef in sync so handlers never read stale data.
  const applyElements = useCallback((next) => {
    const value = typeof next === "function" ? next(elementsRef.current) : next;
    elementsRef.current = value;
    setElements(value);
  }, []);

  /* ---------------------------------- load --------------------------------- */

  useEffect(() => {
    let cancelled = false;
    boardApi
      .get(boardId)
      .then((res) => {
        if (cancelled) return;
        savedMeta.current = { background: res.board.background, bg_color: res.board.bg_color };
        setBoard(res.board);
        setMembers(res.members || []);
        applyElements(res.elements || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err.message);
        navigate("/dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [boardId, navigate, applyElements]);

  /* ------------------------------- real-time ------------------------------- */

  const { viewers, cursors, emitCursor, emitLive } = useBoardRealtime(boardId, {
    onElementCreated: (el) => applyElements((p) => (p.some((x) => x.id === el.id) ? p : [...p, el])),
    onElementUpdated: (el) => {
      if (el.id === editingId) return;
      applyElements((p) => p.map((x) => (x.id === el.id ? el : x)));
    },
    onElementDeleted: (id) => {
      applyElements((p) => p.filter((x) => x.id !== id));
      setSelectedIds((ids) => ids.filter((i) => i !== id));
    },
    onLive: (el) => {
      if (el.id === editingId) return;
      applyElements((p) => p.map((x) => (x.id === el.id ? { ...x, data: el.data } : x)));
    },
    onBoardUpdated: (b) => {
      savedMeta.current = { ...savedMeta.current, background: b.background, bg_color: b.bg_color };
      setBoard((prev) => ({ ...prev, ...b }));
    },
    onMemberAdded: (m) => {
      setMembers((list) => upsert(list, m));
      if (m.id === user?.id) setBoard((b) => ({ ...b, role: m.role }));
    },
    onMemberRemoved: (userId) => {
      if (userId === user?.id) {
        toast.error("You no longer have access to this whiteboard");
        navigate("/dashboard");
      } else {
        setMembers((list) => list.filter((m) => m.id !== userId));
      }
    },
  });

  const emitLiveSafe = useCallback(
    (el) => {
      if (!isTempId(el.id)) emitLive(el);
    },
    [emitLive],
  );

  /* ------------------------------ element CRUD ------------------------------ */

  const nextZ = () => {
    const zs = elementsRef.current.map((e) => e.z).filter(Number.isFinite);
    return zs.length ? Math.max(...zs) + 1 : 1000;
  };

  // Temp ids resolve to the server id once the create has finished.
  const resolveId = async (id) => {
    const p = pending.current.get(id);
    if (!p) return id;
    const row = await p.catch(() => null);
    return row?.id ?? null;
  };

  const create = async (type, data, zOverride) => {
    const z = zOverride ?? nextZ();
    const tid = `tmp-${crypto.randomUUID()}`;
    applyElements((p) => [...p, { id: tid, type, data, z }]);
    const promise = elementApi.create(boardId, { type, data, z });
    pending.current.set(tid, promise);
    try {
      const row = await promise;
      // Keep any local edits made while the request was in flight.
      applyElements((p) => p.map((e) => (e.id === tid ? { ...row, data: e.data } : e)));
      setSelectedIds((ids) => ids.map((i) => (i === tid ? row.id : i)));
      setEditingId((id) => (id === tid ? row.id : id));
      return row;
    } catch (err) {
      applyElements((p) => p.filter((e) => e.id !== tid));
      setSelectedIds((ids) => ids.filter((i) => i !== tid));
      toast.error(err.message);
      return null;
    } finally {
      pending.current.delete(tid);
    }
  };

  const update = async (id, patch) => {
    try {
      const rid = await resolveId(id);
      if (rid) await elementApi.update(boardId, rid, patch);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeRemote = async (id) => {
    try {
      const rid = await resolveId(id);
      if (rid) await elementApi.remove(boardId, rid);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = (id) => {
    applyElements((p) => p.filter((e) => e.id !== id));
    setSelectedIds((ids) => ids.filter((i) => i !== id));
    return removeRemote(id);
  };

  const persist = { create, update, remove };

  /* ------------------------------ undo / redo ------------------------------- */

  const syncHistorySize = () =>
    setHistorySize({ undo: history.current.past.length, redo: history.current.future.length });

  const pushSnapshot = (snapshot) => {
    const h = history.current;
    if (h.past[h.past.length - 1] === snapshot) return;
    h.past.push(snapshot);
    if (h.past.length > HISTORY_LIMIT) h.past.shift();
    h.future = [];
    syncHistorySize();
  };

  const checkpoint = () => pushSnapshot(elementsRef.current);

  // Re-created elements get new server ids; rewrite them everywhere, including saved snapshots.
  const remapId = (oldId, newId) => {
    const fix = (list) => list.map((e) => (e.id === oldId ? { ...e, id: newId } : e));
    applyElements(fix);
    history.current.past = history.current.past.map(fix);
    history.current.future = history.current.future.map(fix);
  };

  const restore = (target) => {
    const current = elementsRef.current;
    applyElements(target);
    setSelectedIds((ids) => ids.filter((id) => target.some((e) => e.id === id)));
    setEditingId(null);
    syncHistorySize();

    const targetIds = new Set(target.map((e) => e.id));
    const currentById = new Map(current.map((e) => [e.id, e]));
    const jobs = [];
    for (const el of current) if (!targetIds.has(el.id)) jobs.push(removeRemote(el.id));
    for (const el of target) {
      const cur = currentById.get(el.id);
      if (!cur) {
        jobs.push(
          elementApi
            .create(boardId, { type: el.type, data: el.data, z: el.z })
            .then((row) => remapId(el.id, row.id))
            .catch((err) => toast.error(err.message)),
        );
      } else if (cur.data !== el.data && JSON.stringify(cur.data) !== JSON.stringify(el.data)) {
        jobs.push(update(el.id, { data: el.data }));
      } else if (cur.z !== el.z) {
        jobs.push(update(el.id, { z: el.z }));
      }
    }
    return Promise.all(jobs);
  };

  const undo = () => {
    const h = history.current;
    if (!h.past.length) return;
    h.future.push(elementsRef.current);
    restore(h.past.pop());
  };

  const redo = () => {
    const h = history.current;
    if (!h.future.length) return;
    h.past.push(elementsRef.current);
    restore(h.future.pop());
  };

  /* --------------------------------- style --------------------------------- */

  const selected = elements.filter((e) => selectedIds.includes(e.id));

  const applyStyle = (patch) => {
    const updates = [];
    for (const el of elementsRef.current) {
      if (!selectedIds.includes(el.id)) continue;
      const data = applyStyleToData(el, patch);
      if (data) updates.push([el.id, data]);
    }
    if (!updates.length) return;
    checkpoint();
    const map = new Map(updates);
    applyElements((p) => p.map((e) => (map.has(e.id) ? { ...e, data: map.get(e.id) } : e)));
    for (const [id, data] of updates) update(id, { data });
  };

  /* -------------------------------- editing -------------------------------- */

  const editingEl = editingId ? elements.find((e) => e.id === editingId) : null;

  // Remember the pre-edit state so committing a text change is undoable.
  useEffect(() => {
    editSnapshot.current = editingId ? elementsRef.current : null;
  }, [editingId]);

  const onEditLocalChange = useCallback(
    (patch) => {
      applyElements((p) => p.map((e) => (e.id === editingId ? { ...e, data: { ...e.data, ...patch } } : e)));
    },
    [editingId, applyElements],
  );

  const onEditCommit = (patch) => {
    const id = editingId;
    const el = elementsRef.current.find((e) => e.id === id);
    const before = editSnapshot.current?.find((e) => e.id === id);
    setEditingId(null);
    if (!el) return;
    const wasBlank = !before || before.data.text === "";
    if (!wasBlank) pushSnapshot(editSnapshot.current);
    if (patch === null) {
      remove(id);
      return;
    }
    const data = { ...el.data, ...patch };
    applyElements((p) => p.map((e) => (e.id === id ? { ...e, data } : e)));
    update(id, { data });
  };

  /* ------------------------------- board meta ------------------------------- */

  const rename = (title) => {
    const prev = board.title;
    setBoard((b) => ({ ...b, title }));
    boardApi.update(boardId, { title }).catch((err) => {
      setBoard((b) => ({ ...b, title: prev }));
      toast.error(err.message);
    });
  };

  const updateBoardMeta = (patch) => {
    setBoard((b) => ({ ...b, ...patch }));
    boardApi
      .update(boardId, patch)
      .then(() => {
        savedMeta.current = { ...savedMeta.current, ...patch };
      })
      .catch((err) => {
        const rollback = Object.fromEntries(Object.keys(patch).map((k) => [k, savedMeta.current[k]]));
        setBoard((b) => ({ ...b, ...rollback }));
        toast.error(err.message);
      });
  };

  const previewBgColor = (color) => setBoard((b) => ({ ...b, bg_color: color }));

  /* --------------------------- copy / paste / dup --------------------------- */

  const copySelection = () => {
    const items = elementsRef.current
      .filter((e) => selectedIds.includes(e.id))
      .map((e) => ({ type: e.type, data: structuredClone(e.data) }));
    if (!items.length) return false;
    clipboard.current = { items, pastes: 0 };
    return true;
  };

  const cloneAll = async (items, offset) => {
    checkpoint();
    const rows = await Promise.all(
      items.map((it) => create(it.type, translateData({ type: it.type, data: structuredClone(it.data) }, offset, offset))),
    );
    const ids = rows.filter(Boolean).map((r) => r.id);
    setSelectedIds(ids);
  };

  const pasteElements = () => {
    const c = clipboard.current;
    if (!c.items.length) return;
    c.pastes += 1;
    cloneAll(c.items, PASTE_OFFSET * c.pastes);
  };

  const duplicate = () => {
    const items = elementsRef.current
      .filter((e) => selectedIds.includes(e.id))
      .map((e) => ({ type: e.type, data: e.data }));
    if (items.length) cloneAll(items, PASTE_OFFSET);
  };

  const deleteSelection = () => {
    if (!selectedIds.length) return;
    checkpoint();
    selectedIds.forEach(remove);
  };

  /* ---------------------------------- media --------------------------------- */

  const viewportCenter = () => screenToWorld(window.innerWidth / 2, window.innerHeight / 2, camera);

  const selectRow = (row) => row && setSelectedIds([row.id]);

  const insertImageFile = async (file, at) => {
    if (!canEdit || !file?.type.startsWith("image/")) return;
    const tid = toast.loading("Uploading image...");
    try {
      const { blob, width, height } = await fileToDownscaledBlob(file);
      const src = await uploadApi.image(boardId, blob, file.name);
      const scale = Math.min(1, 360 / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const c = at || viewportCenter();
      checkpoint();
      selectRow(await create("image", { x: c.x - w / 2, y: c.y - h / 2, w, h, src }));
      toast.success("Image added", { id: tid });
    } catch (err) {
      toast.error(err.message, { id: tid });
    }
  };

  const insertChart = async (type) => {
    const c = viewportCenter();
    checkpoint();
    selectRow(await create("chart", { x: c.x - 180, y: c.y - 120, w: 360, h: 240, ...defaultChartData(type) }));
  };

  const insertEmoji = async (emoji) => {
    setEmojiOpen(false);
    const c = viewportCenter();
    const jitter = () => (Math.random() - 0.5) * 80;
    checkpoint();
    selectRow(await create("emoji", { x: c.x - 44 + jitter(), y: c.y - 44 + jitter(), w: 88, h: 88, emoji, rotation: 0 }));
  };

  const saveChart = (chart) => {
    const el = editingChart;
    setEditingChart(null);
    if (!el) return;
    const data = { ...el.data, ...chart };
    checkpoint();
    applyElements((p) => p.map((e) => (e.id === el.id ? { ...e, data } : e)));
    update(el.id, { data });
  };

  const doExport = async (kind) => {
    if (!elementsRef.current.length) {
      toast.error("Nothing to export yet");
      return;
    }
    try {
      const name = board.title || "whiteboard";
      await (kind === "png" ? exportPNG : exportSVG)(elementsRef.current, name);
    } catch (err) {
      toast.error(err.message);
    }
  };

  /* ----------------------------------- zoom ---------------------------------- */

  const zoomBy = (factor) =>
    setCamera((c) => {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor));
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      return { zoom, x: cx - ((cx - c.x) / c.zoom) * zoom, y: cy - ((cy - c.y) / c.zoom) * zoom };
    });

  /* ------------------------------ drag & drop ------------------------------- */

  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes("Files");

  const onDragOver = (e) => {
    if (!canEdit || !hasFiles(e)) return;
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
  };

  const onDrop = (e) => {
    setDragOver(false);
    if (!canEdit || !hasFiles(e)) return;
    e.preventDefault();
    const at = screenToWorld(e.clientX, e.clientY, camera);
    [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/")).forEach((f) => insertImageFile(f, at));
  };

  /* ------------------------------ global listeners --------------------------- */

  // Latest closures for the window listeners below (registered once).
  useEffect(() => {
    actions.current = {
      canEdit,
      undo,
      redo,
      deleteSelection,
      duplicate,
      copySelection,
      pasteElements,
      insertImageFile,
      selectAll: () => setSelectedIds(elementsRef.current.map((e) => e.id)),
    };
  });

  useEffect(() => {
    const onKeyDown = (e) => {
      if (isTypingTarget(e)) return;
      const a = actions.current;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod) {
        if (key === "z") {
          e.preventDefault();
          if (!a.canEdit) return;
          (e.shiftKey ? a.redo : a.undo)();
        } else if (key === "y") {
          e.preventDefault();
          if (a.canEdit) a.redo();
        } else if (key === "a") {
          e.preventDefault();
          a.selectAll();
        } else if (key === "d") {
          e.preventDefault();
          if (a.canEdit) a.duplicate();
        } else if (key === "c") {
          a.copySelection();
        } else if (key === "x") {
          if (a.canEdit && a.copySelection()) a.deleteSelection();
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (a.canEdit) {
          e.preventDefault();
          a.deleteSelection();
        }
      } else if (e.key === "Escape") {
        setSelectedIds([]);
        setEditingId(null);
        setEmojiOpen(false);
      } else if (TOOL_KEYS[key] && !e.altKey) {
        if (a.canEdit || key === "v" || key === "h") setTool(TOOL_KEYS[key]);
      }
    };

    const onPaste = (e) => {
      if (isTypingTarget(e)) return;
      const a = actions.current;
      if (!a.canEdit) return;
      const file = [...(e.clipboardData?.items || [])].find((i) => i.kind === "file" && i.type.startsWith("image/"));
      if (file) {
        e.preventDefault();
        a.insertImageFile(file.getAsFile());
      } else {
        a.pasteElements();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, []);

  /* ----------------------------------- render ---------------------------------- */

  if (loading) return <FullScreenSpinner label="Opening whiteboard..." />;

  const allViewers = [{ id: user.id, name: user.name, email: user.email }, ...viewers.filter((v) => v.id !== user.id)];

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-white"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Canvas
        elements={elements}
        setElements={applyElements}
        tool={tool}
        setTool={setTool}
        style={style}
        camera={camera}
        setCamera={setCamera}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        editingId={editingId}
        setEditingId={setEditingId}
        canEdit={canEdit}
        background={board.background}
        bgColor={board.bg_color || "#ffffff"}
        persist={persist}
        emitLive={emitLiveSafe}
        emitCursor={emitCursor}
        onRequestChartEdit={setEditingChart}
        onCheckpoint={checkpoint}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) insertImageFile(file);
        }}
      />

      <RemoteCursors cursors={cursors} camera={camera} />

      {editingEl && (
        <EditingOverlay
          key={editingEl.id}
          element={editingEl}
          camera={camera}
          onLocalChange={onEditLocalChange}
          onCommit={onEditCommit}
        />
      )}

      {elements.length === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="text-sm font-medium text-faint">
            {canEdit ? "Pick a tool and start sketching" : "This whiteboard is empty"}
          </p>
        </div>
      )}

      <TopBar
        board={board}
        role={role}
        viewers={allViewers}
        onRename={rename}
        onShare={() => setShareOpen(true)}
        onAI={() => setAiOpen((o) => !o)}
        onSetBackground={(background) => updateBoardMeta({ background })}
        onSetBgColor={(bg_color) => updateBoardMeta({ bg_color })}
        onPreviewBgColor={previewBgColor}
        onExportPNG={() => doExport("png")}
        onExportSVG={() => doExport("svg")}
        zoom={camera.zoom}
        onZoomIn={() => zoomBy(1.2)}
        onZoomOut={() => zoomBy(1 / 1.2)}
        onZoomReset={() => zoomBy(1 / camera.zoom)}
        onUndo={undo}
        onRedo={redo}
        canUndo={historySize.undo > 0}
        canRedo={historySize.redo > 0}
      />

      {canEdit && (
        <>
          <Toolbar
            tool={tool}
            setTool={setTool}
            disabled={!canEdit}
            onInsertImage={() => fileRef.current?.click()}
            onInsertChart={insertChart}
            onInsertEmoji={() => setEmojiOpen((o) => !o)}
          />
          <EmojiPicker open={emojiOpen} onClose={() => setEmojiOpen(false)} onPick={insertEmoji} />
          <StylePanel
            tool={tool}
            style={style}
            setStyle={setStyle}
            selected={selected}
            onApply={applyStyle}
            onSetFont={(font) => applyStyle({ font })}
          />
          <AIPanel
            open={aiOpen}
            onClose={() => setAiOpen(false)}
            boardId={boardId}
            selectedIds={selectedIds}
            getDropPoint={() => screenToWorld(window.innerWidth * 0.3, window.innerHeight * 0.25, camera)}
            onElementsCreated={(created) => {
              checkpoint();
              applyElements((p) => [...p, ...created.filter((c) => !p.some((x) => x.id === c.id))]);
              setSelectedIds(created.map((c) => c.id));
            }}
            onElementsUpdated={(updated) => {
              checkpoint();
              const map = new Map(updated.map((u) => [u.id, u]));
              applyElements((p) => p.map((e) => (map.has(e.id) ? { ...e, ...map.get(e.id) } : e)));
            }}
          />
        </>
      )}

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        boardId={boardId}
        members={members}
        setMembers={setMembers}
        ownerId={board.owner_id}
      />
      <ChartEditor
        open={!!editingChart}
        element={editingChart}
        onClose={() => setEditingChart(null)}
        onSave={saveChart}
      />

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center bg-brand-500/10 backdrop-blur-[1px]">
          <div className="rounded-3xl border-2 border-dashed border-brand-400 bg-surface/90 px-10 py-8 text-center shadow-[var(--shadow-lift)]">
            <p className="font-display text-lg font-semibold text-brand-700">Drop to add image</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhiteboardPage() {
  const { boardId } = useParams();
  // Keyed so every board starts from fresh state.
  return <Board key={boardId} boardId={boardId} />;
}
