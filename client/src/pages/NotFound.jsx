import { Link } from "react-router-dom";
import { PenLine } from "lucide-react";
import Button from "../components/ui/Button";
import Scribble from "../components/Scribble";
import { useAuth } from "../context/AuthContext";

const notebookPaper = {
  backgroundColor: "#fdfbf5",
  backgroundImage: "repeating-linear-gradient(180deg, transparent 0 35px, #e3ebf5 35px 36px)",
};

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col" style={notebookPaper}>
      <header className="mx-auto flex w-full max-w-6xl items-center px-4 py-4 sm:px-6 sm:py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="brand-gradient grid h-9 w-9 place-items-center rounded-xl text-white">
            <PenLine className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold">Kagoj</span>
        </Link>
      </header>

      <main className="animate-in relative flex flex-1 items-center justify-center px-5 pb-16 text-center">
        <div
          className="absolute left-6 top-24 hidden w-44 -rotate-6 bg-[#fde68a] p-4 text-left text-sm font-medium shadow-[var(--shadow-soft)] md:block"
          aria-hidden="true"
        >
          Checked the whole canvas. Nothing here.
        </div>
        <div
          className="absolute right-6 top-32 hidden w-40 rotate-3 bg-[#bfdbfe] p-4 text-left text-sm font-medium shadow-[var(--shadow-soft)] md:block"
          aria-hidden="true"
        >
          Maybe the link is old?
        </div>

        <div className="relative max-w-md">
          <p className="font-display text-8xl font-bold leading-none text-gradient sm:text-9xl">
            404
          </p>
          <div className="relative mt-2 inline-block">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">This page went off the canvas</h1>
            <Scribble className="absolute -bottom-2 left-0 w-full" />
          </div>
          <p className="mx-auto mt-6 max-w-sm text-muted">
            The page you're looking for doesn't exist, or it may have moved. Let's get you back to
            your boards.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={user ? "/dashboard" : "/"}>
              <Button size="lg">{user ? "Go to my boards" : "Back to home"}</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                {user ? "Switch account" : "Sign in"}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
