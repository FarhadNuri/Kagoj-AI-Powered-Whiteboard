import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const variants = {
  primary:
    "brand-gradient text-white shadow-[var(--shadow-brand)] hover:brightness-[1.07]",
  secondary:
    "bg-surface hover:bg-surface-2 text-ink border border-line shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)]",
  ghost: "text-muted hover:text-ink hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-95",
  outline: "border border-line bg-surface text-ink hover:border-brand-300",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
};

const sizes = {
  sm: "h-8 px-3.5 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
  icon: "h-10 w-10",
  iconSm: "h-8 w-8",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
