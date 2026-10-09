import { useEffect, useRef } from "react";

const EMOJIS = [
  "😀", "😂", "😍", "🤔", "😎", "🥳", "😅", "😭",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "👀", "🔥",
  "✨", "💡", "🎯", "🚀", "⭐", "❤️", "💯", "🎉",
  "✅", "❌", "⚠️", "❓", "❗", "📌", "📝", "📅",
  "📈", "📊", "💰", "🔒", "🔑", "🧠", "🛠️", "🐛",
];

export default function EmojiPicker({ open, onClose, onPick }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      // The toolbar button toggles the picker itself.
      if (ref.current?.contains(e.target) || e.target.closest?.('[aria-label="Insert emoji"]')) return;
      onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className="card animate-in absolute left-[4.75rem] top-1/2 z-30 grid w-72 -translate-y-1/2 grid-cols-8 max-md:bottom-[calc(5rem+env(safe-area-inset-bottom))] max-md:left-1/2 max-md:top-auto max-md:w-[min(18rem,calc(100vw-1.5rem))] max-md:-translate-x-1/2 max-md:translate-y-0 gap-1 rounded-2xl p-2 shadow-[var(--shadow-lift)]"
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className="grid h-8 w-8 place-items-center rounded-lg text-xl transition-transform hover:scale-125 hover:bg-surface-2"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
