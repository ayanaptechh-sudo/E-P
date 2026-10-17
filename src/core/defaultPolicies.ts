/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ScannerRuleConfig {
  rule_id: string;
  category: string;
  regex: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  enabled: boolean;
  explanation: string;
  falsePositiveNote: string;
}

export interface PolicyTemplate {
  name: string;
  description: string;
  toolApprovalPolicy: {
    defaultStatus: 'Unreviewed' | 'Restricted';
    allowedDomains: string[];
    restrictedDomains: string[];
  };
  dataCategories: ScannerRuleConfig[];
  alertThresholds: {
    minSeverityForAlert: 'Low' | 'Medium' | 'High' | 'Critical';
    minRiskScoreForAlert: number;
    autoEscalateCritical: boolean;
  };
  retention: {
    eventRetentionDays: number;
    findingRetentionDays: number;
    auditLogRetentionDays: number;
    reportRetentionDays: number;
  };
}

export const DEFAULT_SCANNER_RULES: ScannerRuleConfig[] = [
  {
    rule_id: 'rule_national_id_cnic',
    category: 'National ID',
    // Matches Pakistani CNIC standard format 12345-1234567-1 or 13 consecutive digits
    regex: '\\b\\d{5}-\\d{7}-\\d\\b|\\b\\d{13}\\b',
    severity: 'High',
    enabled: true,
    explanation: 'Detected Pakistani National Identity Card (CNIC) number format.',
    falsePositiveNote: '13-digit numbers could represent barcode SKUs or invoice tracking numbers.',
  },
  {
    rule_id: 'rule_payment_card',
    category: 'Payment Cards',
    // 13 to 19 digits with optional spaces or hyphens; must pass Luhn check
    regex: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\\d{3})\\d{11}|(?:[0-9]{4}[-\\s]?){3,4}[0-9]{1,4})\\b',
    severity: 'Critical',
    enabled: true,
    explanation: 'Detected payment card primary account number (PAN) passing Luhn checksum.',
    falsePositiveNote: 'Random numbers formatted like cards may coincidentally pass the Luhn algorithm.',
  },
  {
    rule_id: 'rule_email_list',
    category: 'Email Lists',
    // Email regex
    regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
    severity: 'Medium', // Escalates to High if 3+ emails found in scan
    enabled: true,
    explanation: 'Detected corporate or personal email addresses in prompt payload.',
    falsePositiveNote: 'Public contact emails, support addresses, or documentation examples.',
  },
  {
    rule_id: 'rule_api_keys',
    category: 'API Keys & Secrets',
    // Known key patterns: OpenAI sk-, Stripe sk_live_/pk_live_, AWS AKIA, Google AIza, GitHub ghp/gho/github_pat, Slack xox, JWT, Bearer tokens, PEM headers
    regex: '\\b(?:sk-[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]{24,}|pk_live_[a-zA-Z0-9]{24,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|(?:ghp|gho|github_pat)_[a-zA-Z0-9_]{36,}|xox[baprs]-[0-9a-zA-Z-]+|eyJ[a-zA-Z0-9_-]{10,}\\.eyJ[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}|Bearer\\s+[a-zA-Z0-9_\\-\\.]{20,})\\b|-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----',
    severity: 'Critical',
    enabled: true,
    explanation: 'Detected production API key, cloud access token, JWT, or private cryptographic key.',
    falsePositiveNote: 'Sanitized dummy keys or tutorial tokens inside markdown code blocks.',
  },
  {
    rule_id: 'rule_password_assignments',
    category: 'Password Assignments',
    // password = value, passwd = value, secret = value
    regex: '(?:password|passwd|pwd|secret|api_key|apikey)\\s*[:=]\\s*["\']?([^"\'\\s\\r\\n]{4,})["\']?',
    severity: 'High',
    enabled: true,
    explanation: 'Detected explicit password or authentication secret key-value assignment.',
    falsePositiveNote: 'Placeholder values like "changeme", "your_password", or template variables.',
  },
  {
    rule_id: 'rule_credential_labels',
    category: 'Credential Labels',
    // username: with password: nearby or "login credentials"
    regex: '(?i)(?:login\\s+credentials|username\\s*:[^\\n]+\\s*password\\s*:|auth\\s+credentials)',
    severity: 'High',
    enabled: true,
    explanation: 'Detected bundled credential pair or authentication prompt phrasing.',
    falsePositiveNote: 'Login page user interface text or technical documentation copy.',
  },
  {
    rule_id: 'rule_source_config_markers',
    category: 'Source Code & Config Markers',
    // Database connection strings, .env assignments, private config blocks
    regex: '(?:mongodb(?:\\+srv)?|postgres(?:ql)?|mysql|redis):\\/\\/[^\\s"\'`]+|(?m)^[A-Z0-9_]{3,}\\s*=\\s*["\']?[^\\s"\']{8,}["\']?',
    severity: 'High',
    enabled: true,
    explanation: 'Detected database connection URI with embedded credentials or environment configuration variable.',
    falsePositiveNote: 'Localhost connection strings without passwords (e.g. localhost:5432).',
  },
  {
    rule_id: 'rule_confidentiality_labels',
    category: 'Confidentiality Labels',
    // Explicit classification headers
    regex: '(?i)\\b(?:CONFIDENTIAL|STRICTLY CONFIDENTIAL|INTERNAL ONLY|INTERNAL USE ONLY|PROPRIETARY & CONFIDENTIAL|RESTRICTED DISCLOSURE)\\b',
    severity: 'High',
    enabled: true,
    explanation: 'Detected explicit institutional confidentiality or internal-use restriction marking.',
    falsePositiveNote: 'Standard non-disclosure boilerplate in open-source license files.',
  },
];

export const BALANCED_TEMPLATE: PolicyTemplate = {
  name: 'Balanced (Standard Enterprise)',
  description: 'Recommended for general business environments. Monitors unreviewed AI tools with standard DLP warnings.',
  toolApprovalPolicy: {
    defaultStatus: 'Unreviewed',
    allowedDomains: ['copilot.microsoft.com'],
    restrictedDomains: ['deepseek.com'],
  },
  dataCategories: DEFAULT_SCANNER_RULES,
  alertThresholds: {
    minSeverityForAlert: 'High',
    minRiskScoreForAlert: 50,
    autoEscalateCritical: true,
  },
  retention: {
    eventRetentionDays: 90,
    findingRetentionDays: 180,
    auditLogRetentionDays: 365,
    reportRetentionDays: 365,
  },
};

export const STRICT_TEMPLATE: PolicyTemplate = {
  name: 'Strict (Regulated & Defense)',
  description: 'Aggressive data protection. Alerts on all unreviewed tools and Medium+ findings.',
  toolApprovalPolicy: {
    defaultStatus: 'Restricted',
    allowedDomains: [],
    restrictedDomains: ['chatgpt.com', 'openai.com', 'claude.ai', 'deepseek.com', 'perplexity.ai'],
  },
  dataCategories: DEFAULT_SCANNER_RULES.map(r => ({
    ...r,
    severity: r.severity === 'Low' ? 'Medium' : r.severity,
  })),
  alertThresholds: {
    minSeverityForAlert: 'Medium',
    minRiskScoreForAlert: 30,
    autoEscalateCritical: true,
  },
  retention: {
    eventRetentionDays: 180,
    findingRetentionDays: 365,
    auditLogRetentionDays: 730,
    reportRetentionDays: 730,
  },
};

export const EDUCATION_TEMPLATE: PolicyTemplate = {
  name: 'Education & Research',
  description: 'Permissive baseline with warnings for high-risk financial and cryptographic secrets.',
  toolApprovalPolicy: {
    defaultStatus: 'Unreviewed',
    allowedDomains: ['chatgpt.com', 'claude.ai', 'gemini.google.com', 'perplexity.ai', 'huggingface.co'],
    restrictedDomains: [],
  },
  dataCategories: DEFAULT_SCANNER_RULES,
  alertThresholds: {
    minSeverityForAlert: 'Critical',
    minRiskScoreForAlert: 75,
    autoEscalateCritical: false,
  },
  retention: {
    eventRetentionDays: 30,
    findingRetentionDays: 90,
    auditLogRetentionDays: 180,
    reportRetentionDays: 180,
  },
};
