import { Link } from "react-router-dom";
import { PenLine } from "lucide-react";
import { cn } from "../lib/utils";
import Scribble from "./Scribble";

const notebookPaper = {
  backgroundColor: "#fdfbf5",
  backgroundImage:
    "linear-gradient(90deg, transparent 64px, #f0a3a3 64px, #f0a3a3 65px, transparent 65px), repeating-linear-gradient(180deg, transparent 0 35px, #d5e2f0 35px 36px)",
};

function Logo({ className }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="brand-gradient grid h-9 w-9 place-items-center rounded-xl text-white">
        <PenLine className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-bold">Kagoj</span>
    </Link>
  );
}

function StickyNote({ className, color, children }) {
  return (
    <div
      className={cn("absolute w-44 p-4 text-sm font-medium text-ink shadow-[var(--shadow-soft)]", className)}
      style={{ background: color }}
    >
      {children}
    </div>
  );
}

export default function AuthLayout({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside
        className="relative hidden overflow-hidden border-r border-line p-12 lg:flex lg:flex-col lg:justify-between"
        style={notebookPaper}
      >
        <Logo />

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Think it. Draw it.{" "}
            <span className="relative inline-block">
              Share it.
              <Scribble className="absolute -bottom-3 left-0 w-full" />
            </span>
          </h2>
          <p className="mt-6 text-muted">
            An infinite whiteboard for notes, diagrams, sketches and sticky-note brainstorms,
            with AI and live collaboration built in.
          </p>
        </div>

        <div className="relative h-60">
          <StickyNote className="left-0 top-0 -rotate-3" color="#fde68a">
            Brainstorm: 3 launch ideas
          </StickyNote>
          <StickyNote className="left-36 top-24 rotate-2" color="#bfdbfe">
            Ship the MVP 🚀
          </StickyNote>
          <svg
            className="absolute left-12 top-36 h-16 w-24 text-rose-600"
            viewBox="0 0 96 64"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 14 C 30 50, 60 56, 84 40 M74 36 L85 40 L81 51"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-muted">
          {["✎ Freehand", "✦ AI brainstorm", "◑ Real-time"].map((chip) => (
            <span key={chip} className="rounded-full border border-line bg-surface px-3 py-1.5">
              {chip}
            </span>
          ))}
        </div>
      </aside>

      <main className="flex items-center justify-center bg-bg p-6 sm:p-10">
        <div className={cn("animate-in w-full", wide ? "max-w-md" : "max-w-sm")}>
          <Logo className="mb-8 lg:hidden" />
          <div className="card relative rounded-2xl p-7 shadow-[var(--shadow-lift)] sm:p-8">
            <span
              className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-2 bg-[#fde68a]/80"
              aria-hidden="true"
            />
            {title && <h1 className="font-display text-2xl font-bold">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
