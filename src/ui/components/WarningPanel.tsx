/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ScanResult } from '../../scanner/scannerEngine';
import { RiskBadge } from './CommonUI';
import { SeverityLevel } from '../../database/types';

export const WarningPanel: React.FC<{
  scanResult: ScanResult;
  onProceedToRedact: () => void;
  onClear: () => void;
}> = ({ scanResult, onProceedToRedact, onClear }) => {
  const isPartial = scanResult.scan_status === 'Partial' || (scanResult.failedRuleIds && scanResult.failedRuleIds.length > 0);
  const failureText =
    scanResult.failureMessage ||
    (scanResult.failedRuleIds && scanResult.failedRuleIds.length > 0
      ? `Partial scan: rule ${scanResult.failedRuleIds.join(', ')} failed`
      : 'Partial scan');

  if (scanResult.totalMatches === 0) {
    if (isPartial) {
      return (
        <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-5 mb-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {failureText}
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {scanResult.disclaimer}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 mb-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">
              No configured sensitive patterns matched
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Zero PII or credentials detected in this payload. Note: pattern detection is an airgapped guardrail, always practice caution with confidential IP.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-rose-200/90 rounded-2xl p-6 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-150 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-gray-900">
                Sensitive Data Patterns Detected ({scanResult.totalMatches})
              </h3>
              <RiskBadge level={scanResult.highestSeverity} size="sm" />
              {isPartial ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {failureText}
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Audit Completed
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Evaluated {scanResult.matches.length} detection zones in {scanResult.durationMs}ms locally.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Clear Text
          </button>
          <button
            onClick={onProceedToRedact}
            className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Review & Redact</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {isPartial && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{failureText} &mdash; some rules could not complete execution.</span>
        </div>
      )}

      {/* Category-Grouped Findings Summary - NEVER prints secret contents! */}
      <div className="mt-4 space-y-3">
        {(() => {
          const categoryMap = new Map<
            string,
            {
              category: string;
              matches: typeof scanResult.matches;
              count: number;
              highestSeverity: SeverityLevel;
              primaryRuleId: string;
              alsoMatchedRuleIds: string[];
              explanation: string;
              falsePositiveNote: string;
            }
          >();

          const severityRank: Record<SeverityLevel, number> = {
            Low: 1,
            Medium: 2,
            High: 3,
            Critical: 4,
          };

          for (const m of scanResult.matches) {
            const existing = categoryMap.get(m.category);
            if (!existing) {
              categoryMap.set(m.category, {
                category: m.category,
                matches: [m],
                count: 1,
                highestSeverity: m.severity,
                primaryRuleId: m.rule_id,
                alsoMatchedRuleIds: [...(m.alsoMatchedRuleIds || [])],
                explanation: m.explanation,
                falsePositiveNote: m.falsePositiveNote || '',
              });
            } else {
              existing.matches.push(m);
              existing.count += 1;
              if (severityRank[m.severity] > severityRank[existing.highestSeverity]) {
                existing.highestSeverity = m.severity;
                existing.primaryRuleId = m.rule_id;
                existing.explanation = m.explanation;
                if (m.falsePositiveNote) existing.falsePositiveNote = m.falsePositiveNote;
              }
              if (m.alsoMatchedRuleIds) {
                for (const rid of m.alsoMatchedRuleIds) {
                  if (!existing.alsoMatchedRuleIds.includes(rid)) {
                    existing.alsoMatchedRuleIds.push(rid);
                  }
                }
              }
            }
          }

          const groups = Array.from(categoryMap.values()).sort(
            (a, b) => (severityRank[b.highestSeverity] || 0) - (severityRank[a.highestSeverity] || 0)
          );

          return groups.map((group) => (
            <div
              key={group.category}
              className="p-4 rounded-xl border border-gray-200 bg-gray-50/70"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-gray-900">
                    {group.category}: {group.count}
                  </h4>
                  <RiskBadge level={group.highestSeverity} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-gray-500 font-medium">Rule:</span>
                  <span className="font-mono font-bold text-[#5B4DFB]">
                    {group.primaryRuleId}
                  </span>
                  {group.alsoMatchedRuleIds.length > 0 && (
                    <span className="text-gray-500">
                      (also matched: {group.alsoMatchedRuleIds.join(', ')})
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-800 font-medium">
                {group.explanation}
              </div>

              {group.falsePositiveNote && (
                <div className="mt-2 text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <span className="font-bold">False-positive note:</span> {group.falsePositiveNote}
                </div>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-mono">
                <span>Detected {group.matches.length > 1 ? 'offsets' : 'offset'}:</span>
                {group.matches.map((m, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-800 font-semibold"
                  >
                    chars {m.start}–{m.end}
                  </span>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-150 text-[11px] text-gray-500">
        {scanResult.disclaimer}
      </div>
    </div>
  );
};
