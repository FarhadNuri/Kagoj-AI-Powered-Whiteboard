import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import { Input, Select } from "../ui/Input";
import Modal from "../ui/Modal";
import { boardApi } from "../../lib/api";
import { cn } from "../../lib/utils";

const BADGE = {
  owner: "bg-brand-50 text-brand-700",
  editor: "bg-surface-2 text-ink",
  viewer: "bg-surface-2 text-muted",
};

export default function ShareModal({ open, onClose, boardId, members = [], setMembers, ownerId }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [busy, setBusy] = useState(null); // "invite" | member id

  const isOwner = (m) => m.id === ownerId || m.role === "owner";
  const sorted = [...members].sort((a, b) => Number(isOwner(b)) - Number(isOwner(a)));

  const invite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy("invite");
    try {
      const member = await boardApi.addMember(boardId, { email: email.trim(), role });
      setMembers((list) =>
        list.some((m) => m.id === member.id)
          ? list.map((m) => (m.id === member.id ? { ...m, ...member } : m))
          : [...list, member],
      );
      setEmail("");
      toast.success(`Invited ${member.name || member.email}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (member) => {
    setBusy(member.id);
    try {
      await boardApi.removeMember(boardId, member.id);
      setMembers((list) => list.filter((m) => m.id !== member.id));
      toast.success("Access removed");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share whiteboard"
      description="Invite people by email to collaborate."
    >
      <form onSubmit={invite} className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
          <Input
            label="Email"
            type="email"
            placeholder="teammate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="min-w-0 flex-1 sm:w-28 sm:flex-none">
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </Select>
        </div>
        <Button type="submit" loading={busy === "invite"} disabled={!email.trim()} className="shrink-0">
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </form>

      <h3 className="mb-2 mt-6 text-xs font-medium text-muted">People with access ({members.length})</h3>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {sorted.map((m) => {
          const owner = isOwner(m);
          return (
            <li key={m.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-2">
              <Avatar user={m} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{m.name || m.email}</p>
                <p className="truncate text-xs text-muted">{m.email}</p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                  BADGE[owner ? "owner" : m.role] || BADGE.viewer,
                )}
              >
                {owner ? "owner" : m.role}
              </span>
              {!owner && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label={`Remove ${m.name || m.email}`}
                  loading={busy === m.id}
                  disabled={!!busy}
                  onClick={() => remove(m)}
                >
                  {busy !== m.id && <X className="h-4 w-4" />}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
