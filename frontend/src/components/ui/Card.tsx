import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glow?: boolean;
}

const Card = ({ className, children, glow = false, ...props }: CardProps) => (
  <div
    className={cn(
      "rounded-[28px] border border-white/10 bg-[var(--color-card)] shadow-[0_24px_60px_rgba(0,0,0,0.28)]",
      glow && "shadow-[0_24px_70px_rgba(250,204,21,0.08)]",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export default Card;
