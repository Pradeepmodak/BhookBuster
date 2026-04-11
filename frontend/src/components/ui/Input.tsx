import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  icon?: ReactNode;
}

const Input = ({ className, label, hint, icon, ...props }: InputProps) => (
  <label className="block space-y-2">
    {label ? <span className="text-sm font-medium text-white">{label}</span> : null}
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition focus-within:border-[var(--color-accent)]/40",
        className,
      )}
    >
      {icon ? <span className="text-[var(--color-accent)]">{icon}</span> : null}
      <input
        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
        {...props}
      />
    </div>
    {hint ? <p className="text-xs text-gray-400">{hint}</p> : null}
  </label>
);

export default Input;
