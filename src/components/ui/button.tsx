import type { ButtonHTMLAttributes } from "react";

export const inputClass =
  "min-h-9 w-full rounded-md border border-line bg-surface px-3 py-2 text-fg placeholder:text-faint pointer-coarse:min-h-11 " +
  "focus-visible:border-accent disabled:opacity-50";

const variants = {
  primary: "bg-accent text-accent-ink hover:brightness-110 font-semibold",
  ghost: "border border-line-strong text-fg hover:bg-raised",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
} as const;

export function buttonClass(variant: keyof typeof variants = "primary", extra = "") {
  return (
    "inline-flex min-h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors pointer-coarse:min-h-11 " +
    `disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${extra}`
  );
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
