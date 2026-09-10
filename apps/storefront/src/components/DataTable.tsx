"use client";

import { useMemo, useState } from "react";

export interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  key: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  emptyMessage?: string;
  rowKey: (row: T) => string;
}

export function DataTable<T>({ columns, rows, pageSize = 10, emptyMessage, rowKey }: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize]
  );

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{emptyMessage || "Nenhum registro encontrado."}</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((col) => (
                  <td key={col.key}>{col.accessor(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Página {page} de {totalPages} ({rows.length} registros)
          </span>
          <div className="flex gap-2">
            <button
              className="btn-secondary py-1"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              className="btn-secondary py-1"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
