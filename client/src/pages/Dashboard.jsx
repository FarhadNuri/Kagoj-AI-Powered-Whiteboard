import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid, PenLine, Plus, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import { Input, Select, Textarea } from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import UserMenu from "../components/UserMenu";
import BoardThumbnail from "../components/BoardThumbnail";
import { boardApi } from "../lib/api";
import { relativeTime } from "../lib/utils";

const TINTS = ["#ebf6ef", "#eef4ff", "#fdf2f8", "#fefce8", "#f5f3ff", "#fff7ed"];
const EMPTY_FORM = { title: "", description: "", background: "dots" };

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="brand-gradient grid h-9 w-9 place-items-center rounded-xl text-white">
        <PenLine className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-bold">Kagoj</span>
    </Link>
  );
}

function BoardCard({ board, index, onDelete }) {
  return (
    <Link
      to={`/board/${board.id}`}
      className="card group overflow-hidden rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"
    >
      <div
        className="h-32"
        style={{ background: `linear-gradient(180deg, ${TINTS[index % TINTS.length]}, #fff)` }}
      >
        <BoardThumbnail boardId={board.id} updatedAt={board.updated_at} />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="line-clamp-1 font-display font-semibold">{board.title}</h3>
          {board.is_owner && (
            <button
              type="button"
              aria-label="Delete whiteboard"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(board);
              }}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-faint opacity-0 transition-all hover:bg-surface-2 hover:text-danger group-hover:opacity-100 pointer-coarse:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {board.description && (
          <p className="mt-1 line-clamp-1 text-xs text-muted">{board.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-faint">
          <span>{board.element_count} items</span>
          <span className="flex items-center gap-1.5">
            {!board.is_owner && <Users className="h-3.5 w-3.5" />}
            {relativeTime(board.updated_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    boardApi
      .list()
      .then(setBoards)
      .catch((err) => {
        toast.error(err.message);
        setBoards([]);
      });
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const board = await boardApi.create(form);
      navigate(`/board/${board.id}`);
    } catch (err) {
      toast.error(err.message);
      setCreating(false);
    }
  };

  const remove = async (board) => {
    if (!confirm(`Delete "${board.title}"? This can't be undone.`)) return;
    try {
      await boardApi.remove(board.id);
      setBoards((list) => list.filter((b) => b.id !== board.id));
      toast.success("Whiteboard deleted");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-20 border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Brand />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Your whiteboards</h1>
            {boards && (
              <p className="mt-1 text-sm text-muted">
                {boards.length} {boards.length === 1 ? "board" : "boards"}
              </p>
            )}
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New whiteboard
          </Button>
        </div>

        {boards === null ? (
          <div className="mt-24 flex justify-center">
            <Spinner label="Loading your boards..." />
          </div>
        ) : boards.length === 0 ? (
          <div className="card mt-8 rounded-3xl py-20 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold">No whiteboards yet</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
              Create your first board to start sketching, diagramming and brainstorming.
            </p>
            <Button onClick={openCreate} className="mt-6">
              <Plus className="h-4 w-4" />
              New whiteboard
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b, i) => (
              <BoardCard key={b.id} board={b} index={i} onDelete={remove} />
            ))}
          </div>
        )}
      </main>

      <Modal
        open={createOpen}
        onClose={() => !creating && setCreateOpen(false)}
        title="New whiteboard"
        description="Give it a name and pick a background."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" form="create-board" loading={creating}>
              Create &amp; open
            </Button>
          </>
        }
      >
        <form id="create-board" onSubmit={create} className="space-y-4">
          <Input label="Title" autoFocus value={form.title} onChange={setField("title")} />
          <Textarea
            label="Description (optional)"
            rows={2}
            value={form.description}
            onChange={setField("description")}
          />
          <Select label="Background" value={form.background} onChange={setField("background")}>
            <option value="dots">Dotted grid</option>
            <option value="grid">Lined grid</option>
            <option value="plain">Plain</option>
          </Select>
        </form>
      </Modal>
    </div>
  );
}
