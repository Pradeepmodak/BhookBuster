import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import Card from "./Card";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  emptyState: string;
  className?: string;
}

const Table = <T,>({ columns, data, emptyState, className }: TableProps<T>) => (
  <Card className={cn("overflow-hidden", className)}>
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left">
        <thead className="bg-black/20">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-5 py-4 text-xs uppercase tracking-[0.18em] text-gray-400">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-gray-400">
                {emptyState}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={index} className="border-t border-white/10">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-5 py-4 text-sm text-gray-200", column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </Card>
);

export default Table;
