import { cn, colorFromId, initials } from "../../lib/utils";

const sizes = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-base",
};

export default function Avatar({ user, size = "md", ring = false, className }) {
  const name = user?.name || user?.email;
  return (
    <div
      title={name}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold text-white shadow-[var(--shadow-card)]",
        sizes[size],
        ring && "ring-2 ring-surface",
        className,
      )}
      style={{ background: colorFromId(user?.id || user?.email || user?.name) }}
    >
      {initials(name)}
    </div>
  );
}
