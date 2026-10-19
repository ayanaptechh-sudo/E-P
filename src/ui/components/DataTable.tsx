/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';

export interface Column<T> {
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  pageSize?: number;
  emptyTitle?: string;
  emptySubtitle?: string;
  actions?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  searchPlaceholder = 'Search records...',
  searchFilter,
  pageSize = 10,
  emptyTitle = 'No records found',
  emptySubtitle = 'There are no items matching the current filter criteria.',
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const filteredData = useMemo(() => {
    let list = data;
    if (search.trim() && searchFilter) {
      const q = search.toLowerCase().trim();
      list = list.filter(row => searchFilter(row, q));
    }
    if (sortCol !== null && columns[sortCol]) {
      const col = columns[sortCol];
      list = [...list].sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';
        if (col.sortValue) {
          valA = col.sortValue(a);
          valB = col.sortValue(b);
        } else if (typeof col.accessor === 'string') {
          valA = (a[col.accessor as keyof T] as unknown as string | number) || '';
          valB = (b[col.accessor as keyof T] as unknown as string | number) || '';
        }
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [data, search, searchFilter, sortCol, sortAsc, columns]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleHeaderClick = (index: number) => {
    if (!columns[index].sortable && !columns[index].sortValue) return;
    if (sortCol === index) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(index);
      setSortAsc(true);
    }
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-xs">
      {(searchFilter || actions) && (
        <div className="p-4 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {searchFilter ? (
            <div className="relative max-w-sm w-full">
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900 placeholder-gray-400 font-medium transition-all"
              />
              <svg
                className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          ) : <div />}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50/80 text-gray-700 font-bold border-b border-gray-200/80">
              {columns.map((col, idx) => {
                const isSortable = col.sortable || !!col.sortValue;
                return (
                  <th
                    key={idx}
                    onClick={() => handleHeaderClick(idx)}
                    className={`py-3.5 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-700 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${isSortable ? 'cursor-pointer select-none hover:text-gray-900' : ''} ${
                      col.className || ''
                    }`}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                      <span>{col.header}</span>
                      {sortCol === idx && (
                        <span className="text-[#5B4DFB] font-mono text-xs font-bold">
                          {sortAsc ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <div className="max-w-xs mx-auto">
                    <p className="text-sm font-bold text-gray-900">{emptyTitle}</p>
                    <p className="text-xs text-gray-500 mt-1">{emptySubtitle}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map(row => (
                <tr
                  key={String(row[keyField])}
                  className="hover:bg-gray-50/70 transition-colors"
                >
                  {columns.map((col, colIdx) => {
                    let cellContent: React.ReactNode = null;
                    if (typeof col.accessor === 'function') {
                      cellContent = col.accessor(row);
                    } else if (typeof col.accessor === 'string') {
                      cellContent = row[col.accessor as keyof T] as unknown as React.ReactNode;
                    }
                    return (
                      <td
                        key={colIdx}
                        className={`py-3 px-4 ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200/80 flex items-center justify-between text-xs text-gray-600 bg-gray-50/30">
          <span>
            Showing <strong className="text-gray-900 font-bold tabular-nums">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-gray-900 font-bold tabular-nums">{Math.min(currentPage * pageSize, filteredData.length)}</strong> of{' '}
            <strong className="text-gray-900 font-bold tabular-nums">{filteredData.length}</strong> records
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-gray-700 shadow-2xs transition-all cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 font-mono tabular-nums text-gray-600 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-gray-700 shadow-2xs transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'md' }) => {
  if (!isOpen) return null;

  const maxWidthClass =
    maxWidth === 'sm'
      ? 'max-w-sm'
      : maxWidth === 'lg'
      ? 'max-w-2xl'
      : maxWidth === 'xl'
      ? 'max-w-4xl'
      : 'max-w-lg';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`bg-white border border-gray-200 rounded-2xl shadow-xl w-full ${maxWidthClass} overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
