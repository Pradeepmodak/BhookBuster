import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-background)] shadow-[0_18px_38px_rgba(250,204,21,0.16)] hover:brightness-110",
  secondary:
    "border border-white/10 bg-[var(--color-card)] text-white hover:border-[var(--color-accent)]/40 hover:bg-white/6",
  ghost:
    "border border-transparent bg-transparent text-gray-300 hover:border-white/10 hover:bg-white/5 hover:text-white",
  danger:
    "border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-3 text-sm",
  lg: "px-5 py-3.5 text-sm",
};

const Button = ({
  className,
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) => (
  <button
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
      variantClasses[variant],
      sizeClasses[size],
      fullWidth && "w-full",
      className,
    )}
    disabled={disabled}
    {...props}
  >
    {leftIcon}
    <span>{children}</span>
    {rightIcon}
  </button>
);

export default Button;
