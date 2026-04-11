import type { ReactNode } from "react";
import Card from "./Card";

interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
}

const StatCard = ({ label, value, helper, icon }: StatCardProps) => (
  <Card className="p-5" glow>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="mt-3 text-2xl font-semibold text-white md:text-3xl">{value}</p>
        {helper ? <p className="mt-2 text-sm text-[var(--color-accent)]">{helper}</p> : null}
      </div>
      {icon ? (
        <div className="rounded-2xl border border-[var(--color-accent)]/15 bg-[var(--color-accent)]/10 p-3 text-[var(--color-accent)]">
          {icon}
        </div>
      ) : null}
    </div>
  </Card>
);

export default StatCard;
