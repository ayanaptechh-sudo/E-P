/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import { policyRepo } from '../../database/repositories/policyRepo';
import { userRepo, auditRepo } from '../../database/repositories/userRepo';
import { toolRepo } from '../../database/repositories/toolRepo';
import { scanRepo } from '../../database/repositories/scanRepo';
import { usageRepo } from '../../database/repositories/usageRepo';
import { reportRepo } from '../../database/repositories/reportRepo';
import { Policy, SeverityLevel, ReportRecord } from '../../database/types';
import {
  BALANCED_TEMPLATE,
  STRICT_TEMPLATE,
  EDUCATION_TEMPLATE,
  ScannerRuleConfig,
  PolicyTemplate,
} from '../../core/defaultPolicies';
import { isSafeRegex } from '../../scanner/safeRegex';
import { Modal } from '../components/DataTable';
import { RiskBadge } from '../components/CommonUI';
import {
  generateUsageReportHtml,
  generateUsageReportPdf,
  exportReportFile,
} from '../../reports/reportGenerator';

export const PolicyPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Active Policies
  const toolPolicy = useMemo(() => policyRepo.getLatest('pol_tool_approval'), [refreshKey]);
  const dataPolicy = useMemo(() => policyRepo.getLatest('pol_data_categories'), [refreshKey]);
  const alertPolicy = useMemo(() => policyRepo.getLatest('pol_alert_thresholds'), [refreshKey]);
  const retentionPolicy = useMemo(() => policyRepo.getLatest('pol_retention'), [refreshKey]);

  // Active Tab: templates | categories | thresholds | retention | history
  const [activeTab, setActiveTab] = useState<'templates' | 'categories' | 'thresholds' | 'retention' | 'history'>('categories');

  // Scanner Rules editing state
  const rulesList: ScannerRuleConfig[] = useMemo(() => {
    if (!dataPolicy) return [];
    try {
      return JSON.parse(dataPolicy.policy_json);
    } catch {
      return [];
    }
  }, [dataPolicy]);

  // Modal State for Rule Add/Edit
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [ruleId, setRuleId] = useState('');
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleRegex, setRuleRegex] = useState('');
  const [ruleSeverity, setRuleSeverity] = useState<SeverityLevel>('High');
  const [ruleExplanation, setRuleExplanation] = useState('');
  const [ruleFalsePositiveNote, setRuleFalsePositiveNote] = useState('');
  const [ruleError, setRuleError] = useState<string | null>(null);

  // Success Notice
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const reload = () => {
    setRefreshKey(k => k + 1);
  };

  const handleApplyTemplate = async (template: PolicyTemplate) => {
    if (!currentUser) return;
    if (!confirm(`Apply the "${template.name}" template? This will update all policies to new versions.`)) return;

    await policyRepo.saveNewVersion({
      policy_id: 'pol_tool_approval',
      policy_name: 'Enterprise Tool Approval & Classification',
      policy_type: 'Tool Approval',
      policy_json: JSON.stringify(template.toolApprovalPolicy),
      enabled: true,
      updated_by: currentUser.username,
    });

    await policyRepo.saveNewVersion({
      policy_id: 'pol_data_categories',
      policy_name: 'Sensitive Data Category Scanner Rules',
      policy_type: 'Data Category',
      policy_json: JSON.stringify(template.dataCategories),
      enabled: true,
      updated_by: currentUser.username,
    });

    await policyRepo.saveNewVersion({
      policy_id: 'pol_alert_thresholds',
      policy_name: 'DLP Alert Generation Thresholds',
      policy_type: 'Alert Threshold',
      policy_json: JSON.stringify(template.alertThresholds),
      enabled: true,
      updated_by: currentUser.username,
    });

    await policyRepo.saveNewVersion({
      policy_id: 'pol_retention',
      policy_name: 'Data Purge & Retention Schedule',
      policy_type: 'Retention',
      policy_json: JSON.stringify(template.retention),
      enabled: true,
      updated_by: currentUser.username,
    });

    await auditRepo.log({
      user_id: currentUser.user_id,
      action: 'POLICY_TEMPLATE_APPLIED',
      target_type: 'policy',
      target_id: 'all',
      outcome: 'Success',
      details: `Applied policy template "${template.name}". New version created for all 4 policy types.`,
    });

    setSuccessNotice(`Successfully applied "${template.name}" policy template!`);
    setTimeout(() => setSuccessNotice(null), 3500);
    reload();
  };

  const handleToggleRule = async (index: number) => {
    if (!currentUser || !dataPolicy) return;
    const updated = [...rulesList];
    updated[index].enabled = !updated[index].enabled;

    await policyRepo.saveNewVersion({
      policy_id: 'pol_data_categories',
      policy_name: dataPolicy.policy_name,
      policy_type: 'Data Category',
      policy_json: JSON.stringify(updated),
      enabled: true,
      updated_by: currentUser.username,
    });

    await auditRepo.log({
      user_id: currentUser.user_id,
      action: 'POLICY_RULE_TOGGLED',
      target_type: 'policy',
      target_id: 'pol_data_categories',
      outcome: 'Success',
      details: `Toggled rule "${updated[index].rule_id}" to ${updated[index].enabled ? 'Enabled' : 'Disabled'}.`,
    });

    reload();
  };

  const handleDeleteRule = async (index: number) => {
    if (!currentUser || !dataPolicy) return;
    if (!confirm(`Delete rule "${rulesList[index].rule_id}"?`)) return;

    const deleted = rulesList[index];
    const updated = rulesList.filter((_, i) => i !== index);

    await policyRepo.saveNewVersion({
      policy_id: 'pol_data_categories',
      policy_name: dataPolicy.policy_name,
      policy_type: 'Data Category',
      policy_json: JSON.stringify(updated),
      enabled: true,
      updated_by: currentUser.username,
    });

    await auditRepo.log({
      user_id: currentUser.user_id,
      action: 'POLICY_RULE_DELETED',
      target_type: 'policy',
      target_id: 'pol_data_categories',
      outcome: 'Success',
      details: `Deleted rule "${deleted.rule_id}".`,
    });

    reload();
  };

  const openAddRuleModal = () => {
    setEditingRuleIndex(null);
    setRuleId(`rule_custom_${Date.now()}`);
    setRuleCategory('Custom Organization Data');
    setRuleRegex('');
    setRuleSeverity('High');
    setRuleExplanation('Organization custom proprietary identifier pattern.');
    setRuleFalsePositiveNote('Internal serial or reference codes.');
    setRuleError(null);
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: ScannerRuleConfig, idx: number) => {
    setEditingRuleIndex(idx);
    setRuleId(rule.rule_id);
    setRuleCategory(rule.category);
    setRuleRegex(rule.regex);
    setRuleSeverity(rule.severity);
    setRuleExplanation(rule.explanation);
    setRuleFalsePositiveNote(rule.falsePositiveNote);
    setRuleError(null);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !dataPolicy) return;

    // Validate safe regex against ReDoS catastrophic backtracking
    const check = isSafeRegex(ruleRegex);
    if (!check.safe) {
      setRuleError(`Regex validation failed: ${check.error}`);
      return;
    }

    const updated = [...rulesList];
    const newRule: ScannerRuleConfig = {
      rule_id: ruleId.trim(),
      category: ruleCategory.trim(),
      regex: ruleRegex.trim(),
      severity: ruleSeverity,
      enabled: true,
      explanation: ruleExplanation.trim(),
      falsePositiveNote: ruleFalsePositiveNote.trim(),
    };

    if (editingRuleIndex !== null) {
      updated[editingRuleIndex] = newRule;
    } else {
      updated.push(newRule);
    }

    await policyRepo.saveNewVersion({
      policy_id: 'pol_data_categories',
      policy_name: dataPolicy.policy_name,
      policy_type: 'Data Category',
      policy_json: JSON.stringify(updated),
      enabled: true,
      updated_by: currentUser.username,
    });

    await auditRepo.log({
      user_id: currentUser.user_id,
      action: editingRuleIndex !== null ? 'POLICY_RULE_UPDATED' : 'POLICY_RULE_CREATED',
      target_type: 'policy',
      target_id: 'pol_data_categories',
      outcome: 'Success',
      details: `Saved rule "${newRule.rule_id}" (${newRule.category}) with severity ${newRule.severity}.`,
    });

    setIsRuleModalOpen(false);
    reload();
  };

  // Retention and Thresholds config getters
  const alertThresholdConfig = useMemo(() => {
    if (!alertPolicy) return { minSeverityForAlert: 'High', minRiskScoreForAlert: 50, autoEscalateCritical: true };
    try {
      return JSON.parse(alertPolicy.policy_json);
    } catch {
      return { minSeverityForAlert: 'High', minRiskScoreForAlert: 50, autoEscalateCritical: true };
    }
  }, [alertPolicy]);

  const retentionConfig = useMemo(() => {
    if (!retentionPolicy) return { eventRetentionDays: 90, findingRetentionDays: 180, auditLogRetentionDays: 365, reportRetentionDays: 365 };
    try {
      return JSON.parse(retentionPolicy.policy_json);
    } catch {
      return { eventRetentionDays: 90, findingRetentionDays: 180, auditLogRetentionDays: 365, reportRetentionDays: 365 };
    }
  }, [retentionPolicy]);

  // Version history records
  const allPolicyVersions = useMemo(() => {
    return policyRepo.getAllLatest();
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Security Policy & Rule Governance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable multi-version policies, ReDoS-safe DLP regex rules, and alert thresholds
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Scanner Rules ({rulesList.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'templates'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('thresholds')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'thresholds'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Alert Thresholds
          </button>
          <button
            onClick={() => setActiveTab('retention')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'retention'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Retention
          </button>
        </div>
      </div>

      {successNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
          {successNotice}
        </div>
      )}

      {/* Tab: Scanner Rules */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Active Version: <strong>v{dataPolicy?.version || 1}</strong> &bull; Updated by <strong>{dataPolicy?.updated_by}</strong> on {new Date(dataPolicy?.updated_at || Date.now()).toLocaleDateString()}
            </div>
            <button
              onClick={openAddRuleModal}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Custom Rule</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-4 font-semibold">Rule ID</th>
                  <th className="py-2.5 px-4 font-semibold">Category</th>
                  <th className="py-2.5 px-4 font-semibold">Severity</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Pattern Regex</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rulesList.map((r, idx) => (
                  <tr key={r.rule_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                      {r.rule_id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {r.category}
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge level={r.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleRule(idx)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          r.enabled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                      >
                        {r.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                      {r.regex}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditRuleModal(r, idx)}
                          className="text-xs text-indigo-600 hover:underline font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRule(idx)}
                          className="text-xs text-rose-600 hover:underline font-medium ml-2"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">{BALANCED_TEMPLATE.name}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {BALANCED_TEMPLATE.description}
              </p>
              <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div>&bull; Alert on High and Critical findings</div>
                <div>&bull; Default unreviewed tool status</div>
                <div>&bull; 90-day event retention schedule</div>
              </div>
            </div>
            <button
              onClick={() => handleApplyTemplate(BALANCED_TEMPLATE)}
              className="mt-6 w-full py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Apply Balanced Template
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">{STRICT_TEMPLATE.name}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  High Defense
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {STRICT_TEMPLATE.description}
              </p>
              <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div>&bull; Alert on Medium, High, and Critical findings</div>
                <div>&bull; Default restricted tool status</div>
                <div>&bull; 180-day event retention schedule</div>
              </div>
            </div>
            <button
              onClick={() => handleApplyTemplate(STRICT_TEMPLATE)}
              className="mt-6 w-full py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg shadow-xs"
            >
              Apply Strict Template
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">{EDUCATION_TEMPLATE.name}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Permissive
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {EDUCATION_TEMPLATE.description}
              </p>
              <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div>&bull; Alert on Critical secrets and cards only</div>
                <div>&bull; Permissive default tool classification</div>
                <div>&bull; 30-day lightweight retention schedule</div>
              </div>
            </div>
            <button
              onClick={() => handleApplyTemplate(EDUCATION_TEMPLATE)}
              className="mt-6 w-full py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg"
            >
              Apply Education Template
            </button>
          </div>
        </div>
      )}

      {/* Tab: Alert Thresholds */}
      {activeTab === 'thresholds' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs max-w-xl">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Automated Alert Generation Criteria
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Controls which findings and risk scores spawn immediate alert records.
          </p>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Minimum Finding Severity for Alert
              </label>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border font-mono font-bold">
                {alertThresholdConfig.minSeverityForAlert}
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Minimum User Risk Score for Alert
              </label>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border font-mono font-bold">
                {alertThresholdConfig.minRiskScoreForAlert}/100
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Auto-Escalate Critical Violations to Open Incident
              </label>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border font-semibold">
                {alertThresholdConfig.autoEscalateCritical ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Retention Schedule */}
      {activeTab === 'retention' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs max-w-xl">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Data Retention & Purge Configuration
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Configured lifecycle schedules for stored events, scans, and audit traces.
          </p>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span>Usage Telemetry Events Retention:</span>
              <strong className="font-mono">{retentionConfig.eventRetentionDays} Days</strong>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span>DLP Scans & Findings Retention:</span>
              <strong className="font-mono">{retentionConfig.findingRetentionDays} Days</strong>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span>Security Audit Logs Retention:</span>
              <strong className="font-mono">{retentionConfig.auditLogRetentionDays} Days</strong>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span>Compliance Reports Retention:</span>
              <strong className="font-mono">{retentionConfig.reportRetentionDays} Days</strong>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Rule Modal */}
      <Modal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        title={editingRuleIndex !== null ? 'Edit Scanner Rule' : 'Add Custom Scanner Pattern'}
        subtitle="Regex patterns are evaluated locally with automated catastrophic backtracking (ReDoS) guardrails."
      >
        <form onSubmit={handleSaveRule} className="space-y-4">
          {ruleError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300">
              {ruleError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rule Identifier
            </label>
            <input
              type="text"
              required
              value={ruleId}
              onChange={(e) => setRuleId(e.target.value)}
              placeholder="e.g. rule_project_code"
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Category Name
              </label>
              <input
                type="text"
                required
                value={ruleCategory}
                onChange={(e) => setRuleCategory(e.target.value)}
                placeholder="e.g. Internal Project Code"
                className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Severity Level
              </label>
              <select
                value={ruleSeverity}
                onChange={(e) => setRuleSeverity(e.target.value as SeverityLevel)}
                className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Regular Expression Pattern
            </label>
            <input
              type="text"
              required
              value={ruleRegex}
              onChange={(e) => setRuleRegex(e.target.value)}
              placeholder="e.g. \\bPROJ-[A-Z0-9]{6}\\b"
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Explanation (Metadata displayed to user upon match)
            </label>
            <input
              type="text"
              required
              value={ruleExplanation}
              onChange={(e) => setRuleExplanation(e.target.value)}
              placeholder="e.g. Detected classified internal project identifier."
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              False Positive Note
            </label>
            <input
              type="text"
              value={ruleFalsePositiveNote}
              onChange={(e) => setRuleFalsePositiveNote(e.target.value)}
              placeholder="e.g. Public issue trackers or standard tickets."
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsRuleModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Save Rule (Creates v{((dataPolicy?.version || 1) + 1)})
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const ReportsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const reportRecords = useMemo(() => {
    return reportRepo.getAll();
  }, [refreshKey]);

  const canExport = currentUser?.role === 'Administrator' || currentUser?.role === 'Analyst' || currentUser?.role === 'Auditor';

  const handleGenerateComplianceReport = async (format: 'html' | 'pdf') => {
    if (!currentUser || !canExport) return;

    const allTools = toolRepo.getAll();
    const allFindings = scanRepo.getFindings();
    const allEvents = usageRepo.getAll();

    // Group categories
    const catMap: Record<string, number> = {};
    const severityCounts = { Low: 0, Medium: 0, High: 0, Critical: 0 };

    allFindings.forEach((f) => {
      catMap[f.category] = (catMap[f.category] || 0) + 1;
      if (severityCounts[f.severity as SeverityLevel] !== undefined) {
        severityCounts[f.severity as SeverityLevel]++;
      }
    });

    const categoriesDetected = Object.entries(catMap).map(([category, count]) => ({
      category,
      count,
    }));

    const reportId = `GOV-${Date.now().toString().slice(-6)}`;
    const data = {
      reportId,
      generatedAt: new Date().toISOString(),
      generatedBy: currentUser.username,
      reportingPeriod: 'Comprehensive Audit (All Time)',
      totalTools: allTools.length,
      approvedCount: allTools.filter((t) => t.approval_status === 'Approved').length,
      unreviewedCount: allTools.filter((t) => t.approval_status === 'Unreviewed').length,
      restrictedCount: allTools.filter((t) => t.approval_status === 'Restricted').length,
      totalEvents: allEvents.length,
      totalFindings: allFindings.length,
      categoriesDetected,
      riskDistribution: severityCounts,
      telemetryLimitations: [
        'Browser Integration: Unsupported in standard browser sandbox without managed agent.',
        'Extension permissions reflect declared capabilities, not confirmed prompt access.',
      ],
      recommendations: [
        'Establish clear institutional guidelines designating approved enterprise AI environments.',
        'Enforce local in-browser DLP scanning prior to developer pasting code or configs into LLMs.',
        'Conduct bi-monthly audit of unreviewed tools detected in workstation process inventories.',
      ],
    };

    const fileName = `PromptShield_AI_Compliance_${reportId}.${format}`;

    if (format === 'html') {
      const html = generateUsageReportHtml(data);
      await exportReportFile({
        reportType: 'AI Usage Compliance',
        fileName,
        format: 'html',
        content: html,
        generatedByUserId: currentUser.user_id,
      });
    } else {
      const pdfBytes = generateUsageReportPdf(data);
      await exportReportFile({
        reportType: 'AI Usage Compliance',
        fileName,
        format: 'pdf',
        content: pdfBytes,
        generatedByUserId: currentUser.user_id,
      });
    }

    setRefreshKey(k => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Compliance & Incident Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographically hashed (SHA-256) executive compliance exports. 100% devoid of raw secrets or prompt contents.
          </p>
        </div>

        {canExport && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGenerateComplianceReport('pdf')}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export Compliance PDF</span>
            </button>
            <button
              onClick={() => handleGenerateComplianceReport('html')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-lg shadow-xs"
            >
              Export HTML
            </button>
          </div>
        )}
      </div>

      {/* Reports History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Exported Report Ledger & Cryptographic Registry
          </h3>
        </div>

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <th className="py-2.5 px-4 font-semibold">Report File Name</th>
              <th className="py-2.5 px-4 font-semibold">Classification Type</th>
              <th className="py-2.5 px-4 font-semibold">Generated By</th>
              <th className="py-2.5 px-4 font-semibold">Generated (UTC)</th>
              <th className="py-2.5 px-4 font-semibold">SHA-256 Digest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {reportRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No reports exported yet. Click "Export Compliance PDF" above to generate your first audit record.
                </td>
              </tr>
            ) : (
              reportRecords.map((r: any) => (
                <tr key={r.report_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>{r.file_name}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {r.report_type}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {r.generated_by}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {new Date(r.generated_at).toISOString().replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate" title={r.sha256_hash}>
                    {r.sha256_hash.slice(0, 20)}...
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
