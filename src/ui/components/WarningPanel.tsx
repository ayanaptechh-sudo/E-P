/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ScanResult } from '../../scanner/scannerEngine';
import { RiskBadge } from './CommonUI';

export const WarningPanel: React.FC<{
  scanResult: ScanResult;
  onProceedToRedact: () => void;
  onClear: () => void;
}> = ({ scanResult, onProceedToRedact, onClear }) => {
  if (scanResult.totalMatches === 0) {
    return (
      <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Completed – no patterns matched
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              {scanResult.disclaimer}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-xl p-5 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Sensitive Data Patterns Detected ({scanResult.totalMatches})
              </h3>
              <RiskBadge level={scanResult.highestSeverity} size="sm" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Evaluated {scanResult.matches.length} detection zones in {scanResult.durationMs}ms.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Clear Text
          </button>
          <button
            onClick={onProceedToRedact}
            className="px-4 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Review & Redact</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Findings Summary Table - NEVER prints secret contents! */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-medium">
              <th className="pb-2">Category</th>
              <th className="pb-2">Severity</th>
              <th className="pb-2">Rule ID</th>
              <th className="pb-2">Offset Location</th>
              <th className="pb-2">Contextual Explanation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {scanResult.matches.map((m, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="py-2.5 font-semibold text-slate-900 dark:text-white">{m.category}</td>
                <td className="py-2.5"><RiskBadge level={m.severity} /></td>
                <td className="py-2.5 font-mono text-[11px] text-slate-500">{m.rule_id}</td>
                <td className="py-2.5 font-mono text-[11px] text-slate-500">chars {m.start}–{m.end}</td>
                <td className="py-2.5">
                  <div>{m.explanation}</div>
                  {m.falsePositiveNote && (
                    <div className="text-[11px] text-slate-400 mt-0.5 italic">
                      Note: {m.falsePositiveNote}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
        {scanResult.disclaimer}
      </div>
    </div>
  );
};
