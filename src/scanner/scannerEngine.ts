/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isValidLuhn } from './luhn';
import { ScannerRuleConfig } from '../core/defaultPolicies';
import { SeverityLevel } from '../database/types';

export type PlaceholderKind =
  | 'cnic'
  | 'email'
  | 'api_key'
  | 'password'
  | 'card'
  | 'confidential'
  | 'custom';

export interface ScanMatchOffset {
  rule_id: string;
  category: string;
  severity: SeverityLevel;
  start: number;
  end: number;
  explanation: string;
  falsePositiveNote: string;
  placeholderType: PlaceholderKind;
  keyPrefix?: string; // e.g. "password=" to preserve key name while redacting value
}

export interface ScanResult {
  scan_status: 'Completed' | 'Partial' | 'Failed';
  totalMatches: number;
  categories: string[];
  categoryCounts: Record<string, number>;
  highestSeverity: SeverityLevel | 'None';
  matches: ScanMatchOffset[]; // NEVER contains matched secret values
  ruleMatches: Record<string, number>;
  durationMs: number;
  disclaimer: string;
}

const PASSWORD_PLACEHOLDERS = new Set([
  'changeme',
  'your_password',
  'your_secret',
  'xxxx',
  'xxxxxx',
  'password',
  'placeholder',
  'example',
  'test',
  '123456',
  '<password>',
  '{password}',
  'null',
  'undefined',
  'true',
  'false',
]);

const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

/**
 * Scan a text payload against active policies and scanner rules.
 * Strictly enforces Privacy Invariants: No matched secret values are returned or preserved.
 */
export async function scanTextAsync(
  text: string,
  rules: ScannerRuleConfig[],
  customIdRegex?: string
): Promise<ScanResult> {
  const startTime = performance.now();
  const disclaimer =
    'Pattern detection is not a complete DLP solution. No matches does not mean the text is safe.';

  if (!text || text.trim().length === 0) {
    return {
      scan_status: 'Completed',
      totalMatches: 0,
      categories: [],
      categoryCounts: {},
      highestSeverity: 'None',
      matches: [],
      ruleMatches: {},
      durationMs: 0,
      disclaimer,
    };
  }

  const matches: ScanMatchOffset[] = [];
  const categoryCounts: Record<string, number> = {};
  const ruleMatches: Record<string, number> = {};

  try {
    // Process text in chunks or allow micro-task yielding for very long text
    if (text.length > 50000) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // 1. Process custom ID regex if defined
    if (customIdRegex && customIdRegex.trim().length > 0) {
      try {
        const customIdRe = new RegExp(customIdRegex, 'g');
        let m: RegExpExecArray | null;
        while ((m = customIdRe.exec(text)) !== null) {
          if (m[0].length === 0) break;
          matches.push({
            rule_id: 'rule_custom_id',
            category: 'National ID',
            severity: 'High',
            start: m.index,
            end: m.index + m[0].length,
            explanation: 'Detected organization-defined custom National ID pattern.',
            falsePositiveNote: 'May match internal serial numbers or codes.',
            placeholderType: 'cnic',
          });
          categoryCounts['National ID'] = (categoryCounts['National ID'] || 0) + 1;
          ruleMatches['rule_custom_id'] = (ruleMatches['rule_custom_id'] || 0) + 1;
        }
      } catch (e) {
        console.warn('Failed executing customIdRegex:', e);
      }
    }

    // 2. Process all configured policy rules
    for (const rule of rules) {
      if (!rule.enabled) continue;

      try {
        if (rule.rule_id === 'rule_payment_card') {
          // Card regex candidate detection + Luhn filter
          const cardRe = new RegExp(rule.regex, 'g');
          let m: RegExpExecArray | null;
          while ((m = cardRe.exec(text)) !== null) {
            const candidate = m[0];
            if (isValidLuhn(candidate)) {
              matches.push({
                rule_id: rule.rule_id,
                category: rule.category,
                severity: rule.severity,
                start: m.index,
                end: m.index + candidate.length,
                explanation: rule.explanation,
                falsePositiveNote: rule.falsePositiveNote,
                placeholderType: 'card',
              });
              categoryCounts[rule.category] = (categoryCounts[rule.category] || 0) + 1;
              ruleMatches[rule.rule_id] = (ruleMatches[rule.rule_id] || 0) + 1;
            }
          }
        } else if (rule.rule_id === 'rule_password_assignments') {
          // Password assignments with placeholder filtering
          const pwdRe = new RegExp(rule.regex, 'gi');
          let m: RegExpExecArray | null;
          while ((m = pwdRe.exec(text)) !== null) {
            const rawMatch = m[0];
            const capturedValue = m[1] || '';
            const normalized = capturedValue.toLowerCase().trim();

            if (normalized.length >= 4 && !PASSWORD_PLACEHOLDERS.has(normalized)) {
              // Find the prefix (e.g. "password=" or "secret: ")
              const splitIdx = rawMatch.indexOf(capturedValue);
              const prefix = splitIdx > 0 ? rawMatch.slice(0, splitIdx) : 'password=';

              matches.push({
                rule_id: rule.rule_id,
                category: rule.category,
                severity: rule.severity,
                start: m.index,
                end: m.index + rawMatch.length,
                explanation: rule.explanation,
                falsePositiveNote: rule.falsePositiveNote,
                placeholderType: 'password',
                keyPrefix: prefix,
              });
              categoryCounts[rule.category] = (categoryCounts[rule.category] || 0) + 1;
              ruleMatches[rule.rule_id] = (ruleMatches[rule.rule_id] || 0) + 1;
            }
          }
        } else if (rule.rule_id === 'rule_national_id_cnic') {
          const cnicRe = new RegExp(rule.regex, 'g');
          let m: RegExpExecArray | null;
          while ((m = cnicRe.exec(text)) !== null) {
            matches.push({
              rule_id: rule.rule_id,
              category: rule.category,
              severity: rule.severity,
              start: m.index,
              end: m.index + m[0].length,
              explanation: rule.explanation,
              falsePositiveNote: rule.falsePositiveNote,
              placeholderType: 'cnic',
            });
            categoryCounts[rule.category] = (categoryCounts[rule.category] || 0) + 1;
            ruleMatches[rule.rule_id] = (ruleMatches[rule.rule_id] || 0) + 1;
          }
        } else if (rule.rule_id === 'rule_email_list') {
          const emailRe = new RegExp(rule.regex, 'gi');
          let m: RegExpExecArray | null;
          const emailOffsets: { start: number; end: number }[] = [];
          while ((m = emailRe.exec(text)) !== null) {
            emailOffsets.push({ start: m.index, end: m.index + m[0].length });
          }

          // Severity escalates to High if 3+ emails found in payload
          const effectiveSeverity: SeverityLevel = emailOffsets.length >= 3 ? 'High' : 'Medium';
          for (const off of emailOffsets) {
            matches.push({
              rule_id: rule.rule_id,
              category: rule.category,
              severity: effectiveSeverity,
              start: off.start,
              end: off.end,
              explanation:
                emailOffsets.length >= 3
                  ? 'Bulk email address list detected (3+ addresses), elevating exposure risk.'
                  : rule.explanation,
              falsePositiveNote: rule.falsePositiveNote,
              placeholderType: 'email',
            });
            categoryCounts[rule.category] = (categoryCounts[rule.category] || 0) + 1;
            ruleMatches[rule.rule_id] = (ruleMatches[rule.rule_id] || 0) + 1;
          }
        } else if (rule.rule_id === 'rule_confidentiality_labels') {
          const confRe = new RegExp(rule.regex, 'gi');
          let m: RegExpExecArray | null;
          while ((m = confRe.exec(text)) !== null) {
            matches.push({
              rule_id: rule.rule_id,
              category: rule.category,
              severity: rule.severity,
              start: m.index,
              end: m.index + m[0].length,
              explanation: rule.explanation,
              falsePositiveNote: rule.falsePositiveNote,
              placeholderType: 'confidential',
            });
            categoryCounts[rule.category] = (categoryCounts[rule.category] || 0) + 1;
            ruleMatches[rule.rule_id] = (ruleMatches[rule.rule_id] || 0) + 1;
          }
        } else {
          // Standard custom or known pattern regex
          const genericRe = new RegExp(rule.regex, 'g');
          let m: RegExpExecArray | null;
          let placeholderType: PlaceholderKind = 'custom';
          if (rule.category.includes('API') || rule.category.includes('Secret')) {
            placeholderType = 'api_key';
          } else if (rule.category.includes('Confidential')) {
            placeholderType = 'confidential';
          }

          while ((m = genericRe.exec(text)) !== null) {
            if (m[0].length === 0) break;
            matches.push({
              rule_id: rule.rule_id,
              category: rule.category,
              severity: rule.severity,
              start: m.index,
              end: m.index + m[0].length,
              explanation: rule.explanation,
              falsePositiveNote: rule.falsePositiveNote,
              placeholderType,
            });
            categoryCounts[rule.category] = (categoryCounts[rule.category] || 0) + 1;
            ruleMatches[rule.rule_id] = (ruleMatches[rule.rule_id] || 0) + 1;
          }
        }
      } catch (ruleErr) {
        console.warn(`Error running rule ${rule.rule_id}:`, ruleErr);
      }
    }

    // Determine highest severity
    let highestSeverity: SeverityLevel | 'None' = 'None';
    let maxWeight = 0;
    for (const m of matches) {
      const w = SEVERITY_WEIGHTS[m.severity];
      if (w > maxWeight) {
        maxWeight = w;
        highestSeverity = m.severity;
      }
    }

    const durationMs = Math.round(performance.now() - startTime);

    return {
      scan_status: 'Completed',
      totalMatches: matches.length,
      categories: Object.keys(categoryCounts),
      categoryCounts,
      highestSeverity,
      matches,
      ruleMatches,
      durationMs,
      disclaimer,
    };
  } catch (err) {
    console.error('Scan failed:', err);
    return {
      scan_status: 'Failed',
      totalMatches: 0,
      categories: [],
      categoryCounts: {},
      highestSeverity: 'None',
      matches: [],
      ruleMatches: {},
      durationMs: Math.round(performance.now() - startTime),
      disclaimer: 'Scan execution failed unexpectedly. Text should NOT be considered safe.',
    };
  }
}
