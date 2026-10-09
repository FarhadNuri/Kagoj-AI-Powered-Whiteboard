import { Link } from "react-router-dom";
import { Download, MousePointer2, PenLine, Shapes, Sparkles, Users } from "lucide-react";
import Button from "../components/ui/Button";
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

const floating = "shadow-[var(--shadow-soft)]";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
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

      <section className="animate-in mx-auto max-w-4xl px-5 pb-10 pt-10 text-center sm:px-6 sm:pt-16">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-muted shadow-[var(--shadow-card)]">
          <Sparkles className="h-3.5 w-3.5 text-brand-500" />
          AI-powered whiteboard notes
        </span>
        <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
          The infinite canvas for <br />
          <span className="text-gradient">notes that think with you.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Sketch, diagram and brainstorm freely. Drop text, shapes and sticky notes, draw by
          hand, and let AI expand your ideas — all in real time.
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
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div
          className="card canvas-bg-dots flex flex-wrap items-center justify-center gap-6 rounded-3xl p-5 shadow-[var(--shadow-lift)] sm:gap-8 sm:p-8"
          style={{ backgroundSize: "22px 22px", backgroundColor: "#fff" }}
        >
          <div
            className={`${floating} -rotate-3 rounded-lg px-6 py-8 text-sm font-medium`}
            style={{ background: "#fde68a" }}
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
            className={`${floating} rotate-2 rounded-full px-6 py-3 text-sm font-medium`}
            style={{ background: "#bfdbfe" }}
          >
            Ship 🚀
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card rounded-2xl p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        Built with the PERN stack · React · Express · PostgreSQL · Socket.IO
      </footer>
    </div>
  );
}
