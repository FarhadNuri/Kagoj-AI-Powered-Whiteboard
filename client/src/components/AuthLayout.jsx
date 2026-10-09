import { Link } from "react-router-dom";
import { PenLine } from "lucide-react";
import { cn } from "../lib/utils";

function Logo({ className }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
        <PenLine className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-bold">Kagoj</span>
    </Link>
  );
}

export default function AuthLayout({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="brand-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo />

        <div className="max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">
            Think it. Draw it. Share it.
          </h2>
          <p className="mt-4 text-white/80">
            An infinite whiteboard for notes, diagrams, sketches and sticky-note brainstorms —
            with AI and live collaboration built in.
          </p>
        </div>

        <div className="flex gap-6 text-sm text-white/70">
          <span>✎ Freehand &amp; shapes</span>
          <span>✦ AI brainstorm</span>
          <span>◑ Real-time</span>
        </div>

        <svg
          className="pointer-events-none absolute -bottom-10 -right-10 opacity-20"
          width="320"
          height="320"
          viewBox="0 0 320 320"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="160" cy="160" r="110" />
          <path d="M60 230 C 120 130, 200 130, 270 200" />
        </svg>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className={cn("animate-in w-full", wide ? "max-w-md" : "max-w-sm")}>
          <Logo className="mb-8 text-ink lg:hidden [&>span:first-child]:bg-brand-50 [&>span:first-child]:text-brand-600" />
          {title && <h1 className="font-display text-2xl font-bold">{title}</h1>}
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
