import { Link } from "react-router-dom";
import { Download, MousePointer2, PenLine, Shapes, Sparkles, Users } from "lucide-react";
import Button from "../components/ui/Button";
import Scribble from "../components/Scribble";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  {
    icon: Shapes,
    title: "Every tool you need",
    text: "Text, sticky notes, shapes, lines, arrows, freehand drawing and bullet lists on one infinite canvas.",
  },
  {
    icon: Sparkles,
    title: "AI brainstorming",
    text: "Turn a prompt into a wall of sticky notes or a structured outline. Summarize a busy board in a click.",
  },
  {
    icon: Users,
    title: "Real-time collaboration",
    text: "See teammates' cursors and edits live. Share a board with editors and viewers.",
  },
  {
    icon: Download,
    title: "Export anywhere",
    text: "Download your whiteboard as a crisp PNG or a scalable SVG to drop into docs and decks.",
  },
];

const notebookPaper = {
  backgroundColor: "#fdfbf5",
  backgroundImage:
    "repeating-linear-gradient(180deg, transparent 0 35px, #e3ebf5 35px 36px)",
};

const floating = "shadow-[var(--shadow-soft)]";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen" style={notebookPaper}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="brand-gradient grid h-9 w-9 place-items-center rounded-xl text-white">
            <PenLine className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold">Kagoj</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <Link to="/dashboard">
              <Button size="sm">Open app</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button size="sm" variant="ghost">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="animate-in relative mx-auto max-w-6xl px-5 pb-12 pt-10 text-center sm:px-6 sm:pt-16">
        <div
          className={`${floating} absolute left-2 top-16 hidden w-44 -rotate-6 bg-[#fde68a] p-4 text-left text-sm font-medium md:block`}
          aria-hidden="true"
        >
          Brainstorm: 3 launch ideas
        </div>
        <div
          className={`${floating} absolute right-2 top-40 hidden w-40 rotate-3 bg-[#bfdbfe] p-4 text-left text-sm font-medium md:block`}
          aria-hidden="true"
        >
          Ship the MVP 🚀
        </div>

        <div className="relative mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-muted shadow-[var(--shadow-card)]">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            AI-powered whiteboard notes
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
            The infinite canvas for <br />
            <span className="relative inline-block text-gradient">
              notes that think with you.
              <Scribble className="absolute -bottom-3 left-0 w-full" />
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg text-muted">
            Sketch, diagram and brainstorm freely. Drop text, shapes and sticky notes, draw by
            hand, and let AI expand your ideas, all in real time.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={user ? "/dashboard" : "/register"}>
              <Button size="lg">
                <MousePointer2 className="h-4 w-4" />
                Start whiteboarding
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">Sign in</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div
          className="card flex flex-wrap items-center justify-center gap-6 rounded-3xl p-5 shadow-[var(--shadow-lift)] sm:gap-8 sm:p-8"
          style={notebookPaper}
        >
          <div
            className={`${floating} -rotate-3 rounded-lg bg-[#fde68a] px-6 py-8 text-sm font-medium`}
          >
            💡 Brainstorm ideas
          </div>
          <div
            className={`${floating} rounded-xl border-[3px] border-brand-500 bg-surface px-8 py-5 text-sm font-semibold`}
          >
            Plan
          </div>
          <svg width="80" height="40" viewBox="0 0 80 40" fill="none" aria-hidden="true">
            <path
              d="M4 28 C 28 4, 50 4, 72 20 M60 18.7 L72 20 L67 9"
              stroke="#e11d48"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            className={`${floating} rotate-2 rounded-full bg-[#bfdbfe] px-6 py-3 text-sm font-medium`}
          >
            Ship 🚀
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="card rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line bg-surface/60 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <p className="text-sm text-muted">Built by Farhad Nuri</p>
          <p className="text-center text-sm text-muted">
            React · Express · PostgreSQL · Socket.IO · Neon
          </p>
          <a
            href="https://github.com/FarhadNuri/Kagoj-AI-Powered-Whiteboard"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Kagoj on GitHub"
            className="grid h-11 w-11 place-items-center rounded-xl text-zinc-800 transition hover:bg-brand-50 hover:text-brand-600"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.37.5 0 5.78 0 12.292c0 5.211 3.438 9.63 8.205 11.188.6.111.82-.254.82-.567 0-.28-.01-1.022-.015-2.005-3.338.711-4.042-1.582-4.042-1.582-.546-1.361-1.335-1.724-1.335-1.724-1.087-.731.084-.716.084-.716 1.205.082 1.838 1.215 1.838 1.215 1.07 1.803 2.809 1.282 3.495.981.108-.763.417-1.282.76-1.577-2.665-.295-5.466-1.309-5.466-5.827 0-1.287.465-2.339 1.235-3.164-.135-.298-.54-1.497.105-3.121 0 0 1.005-.316 3.3 1.209A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.135 3.006.396 2.28-1.525 3.285-1.209 3.285-1.209.645 1.624.24 2.823.12 3.121.765.825 1.23 1.877 1.23 3.164 0 4.53-2.805 5.527-5.475 5.817.42.354.81 1.077.81 2.182 0 1.578-.015 2.846-.015 3.229 0 .309.21.678.825.56C20.565 21.917 24 17.495 24 12.292 24 5.78 18.627.5 12 .5z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
