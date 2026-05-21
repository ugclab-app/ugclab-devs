import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClass: Record<Variant, string> = {
  primary: "ugclab-btn ugclab-btn-primary",
  secondary: "ugclab-btn ugclab-btn-secondary",
  ghost: "ugclab-btn ugclab-btn-ghost",
  danger: "ugclab-btn ugclab-btn-primary",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button
      type={props.type ?? "button"}
      className={`${variantClass[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
