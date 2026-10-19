/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RedactionResult } from '../../redaction/redactionEngine';
import { scanRepo } from '../../database/repositories/scanRepo';

export const RedactionCard: React.FC<{
  originalText: string;
  redactionResult: RedactionResult;
  scanId: string;
  onClear: () => void;
  onCancel: () => void;
}> = ({ originalText, redactionResult, scanId, onClear, onCancel }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(redactionResult.redactedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      // Log redaction event metadata (action_status: 'Copied')
      await scanRepo.recordRedactionEvent({
        scan_id: scanId,
        redaction_count: redactionResult.redactionCount,
        categories_json: JSON.stringify(redactionResult.categories),
        action_time: new Date().toISOString(),
        action_status: 'Copied',
      });
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleCancelClick = async () => {
    await scanRepo.recordRedactionEvent({
      scan_id: scanId,
      redaction_count: redactionResult.redactionCount,
      categories_json: JSON.stringify(redactionResult.categories),
      action_time: new Date().toISOString(),
      action_status: 'Cancelled',
    });
    onCancel();
  };

  // Helper to render original text with highlighted spans by offset
  const renderOriginalHighlighted = () => {
    if (!originalText || redactionResult.originalHighlights.length === 0) {
      return <span>{originalText}</span>;
    }

    const segments: React.ReactNode[] = [];
    let lastIdx = 0;

    redactionResult.originalHighlights.forEach((h, i) => {
      if (h.start > lastIdx) {
        segments.push(
          <span key={`text-${i}`}>{originalText.slice(lastIdx, h.start)}</span>
        );
      }

      const matchText = originalText.slice(h.start, h.end);
      segments.push(
        <mark
          key={`mark-${i}`}
          title={`${h.category} (${h.severity})`}
          className="bg-rose-100 text-rose-900 border-b-2 border-rose-500 font-mono text-xs px-1 rounded-xs font-semibold"
        >
          {matchText}
        </mark>
      );
      lastIdx = h.end;
    });

    if (lastIdx < originalText.length) {
      segments.push(
        <span key="text-end">{originalText.slice(lastIdx)}</span>
      );
    }

    return segments;
  };

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-150 gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>Redaction Comparison & Sanitizer</span>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              {redactionResult.redactionCount} replacements
            </span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Compare source input with the sanitized payload before copying to your clipboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={handleCancelClick}
            className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-[#5B4DFB] hover:bg-[#4E3EF0] text-white'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Copy Redacted Text</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Side-by-side view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Original Text (Flagged Highlights)
            </span>
            <span className="text-[11px] text-rose-600 font-mono font-bold">
              {redactionResult.originalHighlights.length} flagged zones
            </span>
          </div>
          <div className="h-64 overflow-y-auto p-4 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs whitespace-pre-wrap text-gray-900 leading-relaxed">
            {renderOriginalHighlighted()}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Sanitized Output (Ready for Prompt)
            </span>
            <span className="text-[11px] text-emerald-700 font-mono font-bold">
              Zero Raw Secrets
            </span>
          </div>
          <div className="h-64 overflow-y-auto p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl font-mono text-xs whitespace-pre-wrap text-emerald-950 font-medium leading-relaxed select-all">
            {redactionResult.redactedText}
          </div>
        </div>
      </div>

      {/* Mandatory review note */}
      <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
        <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{redactionResult.disclaimer}</span>
      </div>
    </div>
  );
};
