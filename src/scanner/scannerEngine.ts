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
  | 'possible_secret'
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
  failedRuleIds?: string[];
  failureMessage?: string;
}

export const KNOWN_PLACEHOLDERS = [
  'changeme',
  'your_api_key',
  'your_password',
  'your_secret',
  'your_token',
  'xxxx',
  'xxxxxx',
  'example',
  'test123',
  '<api_key>',
  '<apikey>',
  '{api_key}',
  '<password>',
  '{password}',
  'placeholder',
  'null',
  'undefined',
  'true',
  'false',
];

/**
 * Checks if a candidate secret is an obvious placeholder or dummy value
 */
export function isPlaceholder(val: string): boolean {
  if (!val) return true;
  const lower = val.toLowerCase().trim();
  if (lower.length === 0) return true;
  for (const ph of KNOWN_PLACEHOLDERS) {
    if (lower === ph || lower.includes(ph)) {
      return true;
    }
  }
  // All x's, asterisks, or dashes
  if (/^x+$/i.test(lower) || /^\*+$/.test(lower) || /^-+$/.test(lower)) {
    return true;
  }
  return false;
}

/**
 * Calculates Shannon entropy for a given string
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const char in frequencies) {
    const p = frequencies[char] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Returns regex flags guaranteed to include 'g'
 */
export function getRuleFlags(rule: ScannerRuleConfig): string {
  const raw = (rule.flags || 'g').trim();
  const set = new Set(raw.split(''));
  set.add('g'); // always include 'g'
  return Array.from(set).join('');
}

/**
 * Compiles a safe RegExp using rule.flags, sanitizing any legacy inline (?i) or (?m)
 */
export function compileRuleRegex(rule: ScannerRuleConfig): RegExp {
  let pattern = rule.regex;
  let flags = getRuleFlags(rule);

  if (pattern.includes('(?i)')) {
    pattern = pattern.replace(/\(\?i\)/g, '');
    if (!flags.includes('i')) flags += 'i';
  }
  if (pattern.includes('(?m)')) {
    pattern = pattern.replace(/\(\?m\)/g, '');
    if (!flags.includes('m')) flags += 'm';
  }

  return new RegExp(pattern, flags);
}

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
    'No configured patterns matched. This does not mean the text is safe.';

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
  const failedRuleIds: string[] = [];

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
          const cardRe = compileRuleRegex(rule);
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
          const pwdRe = compileRuleRegex(rule);
          let m: RegExpExecArray | null;
          while ((m = pwdRe.exec(text)) !== null) {
            const rawMatch = m[0];
            const capturedValue = m[1] || '';
            const normalized = capturedValue.toLowerCase().trim();

            if (normalized.length >= 4 && !isPlaceholder(capturedValue)) {
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
        } else if (rule.rule_id === 'rule_natural_language_credentials') {
          // Conversational credentials detection: e.g. "my api key is X", "the password is X"
          // Redacts ONLY the value, keeping the phrase prefix intact
          const nlRe = compileRuleRegex(rule);
          let m: RegExpExecArray | null;
          while ((m = nlRe.exec(text)) !== null) {
            const fullMatch = m[0];
            const capturedVal = (m[1] || '').trim();
            if (!capturedVal) continue;

            const cleanedVal = capturedVal.replace(/[.,;!?]+$/, '').trim();
            if (cleanedVal.length < 6) continue;
            if (isPlaceholder(cleanedVal)) continue;

            // At least one digit or mixed case
            const hasDigit = /\d/.test(cleanedVal);
            const hasMixedCase = /[a-z]/.test(cleanedVal) && /[A-Z]/.test(cleanedVal);
            if (!hasDigit && !hasMixedCase) continue;

            const valIdx = fullMatch.indexOf(capturedVal);
            if (valIdx === -1) continue;

            let start = m.index + valIdx;
            let end = start + cleanedVal.length;

            // If quotes surrounded the value in the match, redact including the quotes
            if (valIdx > 0 && (fullMatch[valIdx - 1] === '"' || fullMatch[valIdx - 1] === "'")) {
              start = m.index + valIdx - 1;
              const endCharIdx = valIdx + capturedVal.length;
              if (endCharIdx < fullMatch.length && (fullMatch[endCharIdx] === '"' || fullMatch[endCharIdx] === "'")) {
                end = m.index + endCharIdx + 1;
              }
            }

            matches.push({
              rule_id: rule.rule_id,
              category: rule.category,
              severity: rule.severity,
              start,
              end,
              explanation: rule.explanation,
              falsePositiveNote: rule.falsePositiveNote,
              placeholderType: 'api_key',
            });
            categoryCounts[rule.category] = (categoryCounts[rule.category] || 0) + 1;
            ruleMatches[rule.rule_id] = (ruleMatches[rule.rule_id] || 0) + 1;
          }
        } else if (rule.rule_id === 'rule_high_entropy_secret') {
          // Standalone string of 16+ chars with mixed letters and digits and Shannon entropy > 3.5
          // only when a credential word (key, token, secret, password, auth) appears within 40 characters
          const entropyRe = compileRuleRegex(rule);
          let m: RegExpExecArray | null;
          while ((m = entropyRe.exec(text)) !== null) {
            const candidate = m[0];
            if (candidate.length < 16) continue;

            const hasLetters = /[a-zA-Z]/.test(candidate);
            const hasDigits = /\d/.test(candidate);
            if (!hasLetters || !hasDigits) continue;

            if (isPlaceholder(candidate)) continue;

            const entropy = calculateShannonEntropy(candidate);
            if (entropy <= 3.5) continue;

            const tokenStart = m.index;
            const tokenEnd = m.index + candidate.length;
            const before = text.slice(Math.max(0, tokenStart - 40), tokenStart);
            const after = text.slice(tokenEnd, Math.min(text.length, tokenEnd + 40));

            const credWordRe = /(?:key|token|secret|password|auth)/i;
            if (!credWordRe.test(before) && !credWordRe.test(after)) {
              continue;
            }

            matches.push({
              rule_id: rule.rule_id,
              category: rule.category,
              severity: rule.severity,
              start: tokenStart,
              end: tokenEnd,
              explanation: `${rule.explanation} (Shannon entropy: ${entropy.toFixed(2)})`,
              falsePositiveNote: rule.falsePositiveNote,
              placeholderType: 'possible_secret',
            });
            categoryCounts[rule.category] = (categoryCounts[rule.category] || 0) + 1;
            ruleMatches[rule.rule_id] = (ruleMatches[rule.rule_id] || 0) + 1;
          }
        } else if (rule.rule_id === 'rule_national_id_cnic') {
          const cnicRe = compileRuleRegex(rule);
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
          const emailRe = compileRuleRegex(rule);
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
          const confRe = compileRuleRegex(rule);
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
          const genericRe = compileRuleRegex(rule);
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
        failedRuleIds.push(rule.rule_id);
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
    const scan_status = failedRuleIds.length > 0 ? 'Partial' : 'Completed';
    const failureMessage =
      failedRuleIds.length === 1
        ? `Partial scan: rule ${failedRuleIds[0]} failed`
        : failedRuleIds.length > 1
        ? `Partial scan: rules ${failedRuleIds.join(', ')} failed`
        : undefined;

    return {
      scan_status,
      totalMatches: matches.length,
      categories: Object.keys(categoryCounts),
      categoryCounts,
      highestSeverity,
      matches,
      ruleMatches,
      durationMs,
      disclaimer,
      failedRuleIds: failedRuleIds.length > 0 ? failedRuleIds : undefined,
      failureMessage,
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
