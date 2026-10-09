import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut } from "lucide-react";
import Avatar from "./ui/Avatar";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex items-center gap-2.5 rounded-full p-1 pr-2 transition-colors hover:bg-surface-2"
      >
        <Avatar user={user} size="md" />
        <div className="hidden text-left sm:block">
          <p className="max-w-[12rem] truncate text-sm font-semibold text-ink">{user.name}</p>
          <p className="max-w-[12rem] truncate text-xs text-muted">{user.email}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-faint transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="card absolute right-0 top-12 z-30 w-64 rounded-2xl p-2 shadow-[var(--shadow-lift)]"
          >
            <div className="flex items-center gap-3 p-2">
              <Avatar user={user} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
            <div className="my-1.5 h-px bg-line" />
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
