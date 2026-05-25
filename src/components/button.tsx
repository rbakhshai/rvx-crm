import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-foreground/[0.04] text-foreground hover:bg-foreground/[0.08] border border-border",
  ghost: "text-foreground/70 hover:bg-foreground/[0.05] hover:text-foreground",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-1.5 text-sm",
};

type Props = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: Props & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...rest} />;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
}: Props & {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href as never} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
