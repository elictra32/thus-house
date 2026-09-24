import Link from "next/link";
import { cn } from "@/lib/utils";
import LoadingSpinner from "./LoadingSpinner";

type Variant = "primary" | "purple" | "plum" | "paper" | "ghost" | "outline" | "danger";

const styles: Record<Variant, string> = {
  primary: "bg-white text-bg hover:bg-white/90",
  purple: "bg-brand text-white hover:bg-brand-dark",
  plum: "bg-plum-900 text-white hover:bg-plum-700",
  paper: "border border-charcoal/15 bg-white/60 text-charcoal hover:border-charcoal/40",
  ghost: "bg-raised text-ink border border-edge hover:border-muted/60",
  outline: "border border-brand text-brand-light hover:bg-brand/10",
  danger: "bg-danger text-white hover:bg-red-700",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] px-[18px] py-[11px] text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  size?: "sm" | "md";
};

export default function Button({ variant = "purple", loading, size = "md", className, children, disabled, ...rest }: Props) {
  return (
    <button
      className={cn(base, styles[variant], size === "sm" && "px-3 py-2 text-xs", className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <LoadingSpinner size={14} />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "purple",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(base, styles[variant], size === "sm" && "px-3 py-2 text-xs", className)}>
      {children}
    </Link>
  );
}
