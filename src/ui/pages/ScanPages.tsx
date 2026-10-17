/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../services/authContext';
import { toolRepo } from '../../database/repositories/toolRepo';
import { policyRepo } from '../../database/repositories/policyRepo';
import { scanRepo } from '../../database/repositories/scanRepo';
import { settingsRepo } from '../../database/repositories/reportRepo';
import { alertService } from '../../core/alertService';
import { scanTextAsync, ScanResult } from '../../scanner/scannerEngine';
import { redactText, RedactionResult } from '../../redaction/redactionEngine';
import { PrivacyBanner } from '../components/CommonUI';
import { WarningPanel } from '../components/WarningPanel';
import { RedactionCard } from '../components/RedactionCard';
import { readClipboardSafe } from '../../clipboard/clipboardScanner';
import { DEFAULT_SCANNER_RULES, ScannerRuleConfig } from '../../core/defaultPolicies';

export const ScanTextPage: React.FC<{
  initialText?: string;
  onClearExternal?: () => void;
}> = ({ initialText = '', onClearExternal }) => {
  const { currentUser } = useAuth();
  const [text, setText] = useState(initialText);
  const [targetToolId, setTargetToolId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [redactionResult, setRedactionResult] = useState<RedactionResult | null>(null);
  const [activeScanId, setActiveScanId] = useState<string>('');
  const [showRedactionView, setShowRedactionView] = useState(false);

  const tools = useMemo(() => toolRepo.getAll(), []);

  // Update text if initialText changes (e.g. from clipboard scan)
  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  // Clear state when user navigates away or unmounts (Privacy Invariant)
  useEffect(() => {
    return () => {
      setText('');
      setScanResult(null);
      setRedactionResult(null);
      setActiveScanId('');
    };
  }, []);

  const handleClear = () => {
    setText('');
    setScanResult(null);
    setRedactionResult(null);
    setActiveScanId('');
    setShowRedactionView(false);
    if (onClearExternal) onClearExternal();
  };

  const handleScan = async () => {
    if (!text.trim() || !currentUser) return;
    setIsScanning(true);
    setScanResult(null);
    setRedactionResult(null);

    try {
      // 1. Fetch active data categories policy rules
      let rules: ScannerRuleConfig[] = DEFAULT_SCANNER_RULES;
      let policyVersion = 1;
      const catPolicy = policyRepo.getLatest('pol_data_categories');
      if (catPolicy && catPolicy.enabled) {
        try {
          rules = JSON.parse(catPolicy.policy_json);
          policyVersion = catPolicy.version;
        } catch (e) {
          console.warn('Failed to parse policy rules:', e);
        }
      }

      const customIdRegex = settingsRepo.get('custom_id_regex', '');

      // 2. Run local chunked scanner
      const result = await scanTextAsync(text, rules, customIdRegex);
      setScanResult(result);

      // 3. Record scan session metadata (strictly metadata only!)
      const session = await scanRepo.recordScanSession({
        user_id: currentUser.user_id,
        tool_id: targetToolId || null,
        scan_time: new Date().toISOString(),
        scan_source: 'Manual Text',
        detected_count: result.totalMatches,
        categories_json: JSON.stringify(result.categories),
        highest_risk: result.highestSeverity,
        scan_status: result.scan_status,
      });
      setActiveScanId(session.scan_id);

      // 4. Record findings and evaluate alerts if matches found
      if (result.matches.length > 0) {
        const findingsToCreate = result.matches.map((m) => ({
          scan_id: session.scan_id,
          usage_event_id: null,
          user_id: currentUser.user_id,
          tool_id: targetToolId || null,
          category: m.category,
          match_count: 1,
          rule_id: m.rule_id,
          severity: m.severity,
          explanation: m.explanation,
          created_at: new Date().toISOString(),
          status: 'New' as const,
          action_taken: 'Warned' as const,
          policy_version: policyVersion,
        }));

        const recordedFindings = await scanRepo.recordFindings(findingsToCreate);

        // Trigger alert evaluation for each finding
        for (const finding of recordedFindings) {
          await alertService.evaluateFindingForAlert(finding, targetToolId || null);
        }

        // Prepare redaction result
        const redRes = redactText(text, result.matches);
        setRedactionResult(redRes);
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Local Prompt & Data Scanner
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Evaluate text payloads against local DLP patterns before sending to external AI
          </p>
        </div>

        {/* Destination Tool Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Intended AI Target:
          </label>
          <select
            value={targetToolId}
            onChange={(e) => setTargetToolId(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none text-slate-800 dark:text-slate-200"
          >
            <option value="">Unspecified / General AI Tool</option>
            {tools.map((t) => (
              <option key={t.tool_id} value={t.tool_id}>
                {t.tool_name} ({t.approval_status})
              </option>
            ))}
          </select>
        </div>
      </div>

      <PrivacyBanner />

      {/* Redaction View if Active */}
      {showRedactionView && redactionResult ? (
        <RedactionCard
          originalText={text}
          redactionResult={redactionResult}
          scanId={activeScanId}
          onClear={handleClear}
          onCancel={() => setShowRedactionView(false)}
        />
      ) : (
        <>
          {/* Text Area Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Prompt Payload or Code Fragment
              </label>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>{text.length} characters</span>
                <span>{text.split(/\s+/).filter(Boolean).length} words</span>
              </div>
            </div>

            <textarea
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste text, code snippets, database queries, configurations, or credentials here to scan for sensitive exposure..."
              className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 leading-relaxed"
            />

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Luhn checksum filter for cards · Pakistani CNIC & National IDs · Known API keys & PEM · Password assignments
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={!text && !scanResult}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleScan}
                  disabled={!text.trim() || isScanning}
                  className="px-5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isScanning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Scanning Patterns...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Scan Text Locally</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results Warning Panel */}
          {scanResult && (
            <WarningPanel
              scanResult={scanResult}
              onProceedToRedact={() => setShowRedactionView(true)}
              onClear={handleClear}
            />
          )}
        </>
      )}
    </div>
  );
};

export const ScanClipboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [clipboardText, setClipboardText] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear clipboard derived state on unmount
  useEffect(() => {
    return () => {
      setClipboardText('');
      setErrorMessage(null);
    };
  }, []);

  const handleReadAndScan = async () => {
    setIsReading(true);
    setErrorMessage(null);

    const result = await readClipboardSafe();
    setIsReading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to read clipboard.');
      return;
    }

    if (!result.text || !result.text.trim()) {
      setErrorMessage('Clipboard is currently empty or does not contain text.');
      return;
    }

    setClipboardText(result.text);
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Scan Clipboard Safeguard
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Explicit user-initiated clipboard inspection. Zero background polling.
        </p>
      </div>

      <PrivacyBanner />

      {!clipboardText ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Inspect Clipboard for Sensitive Leakage
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Clicking the button reads your active OS clipboard buffer once into local browser memory to scan for API keys, passwords, and IDs before pasting into external AI tools.
          </p>

          {errorMessage && (
            <div className="max-w-md mx-auto mb-6 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 text-left">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleReadAndScan}
            disabled={isReading}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isReading ? (
              <span>Reading Clipboard...</span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                <span>Read & Scan Clipboard Now</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <ScanTextPage
          initialText={clipboardText}
          onClearExternal={() => setClipboardText('')}
        />
      )}
    </div>
  );
};
