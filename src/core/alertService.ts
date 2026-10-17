/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { alertRepo } from '../database/repositories/alertRepo';
import { auditRepo, userRepo } from '../database/repositories/userRepo';
import { toolRepo } from '../database/repositories/toolRepo';
import { policyRepo } from '../database/repositories/policyRepo';
import { Alert, AlertStatus, Finding, SeverityLevel } from '../database/types';

export const alertService = {
  /**
   * Evaluates a newly created finding and generates an alert if policy thresholds are met.
   * Privacy Invariant: Description contains ONLY non-sensitive metadata (category, rule, tool name).
   */
  async evaluateFindingForAlert(
    finding: Finding,
    intendedToolId?: string | null
  ): Promise<Alert | null> {
    const thresholdPolicy = policyRepo.getLatest('pol_alert_thresholds');
    let minSeverity: SeverityLevel = 'High';

    if (thresholdPolicy && thresholdPolicy.enabled) {
      try {
        const config = JSON.parse(thresholdPolicy.policy_json);
        if (config.minSeverityForAlert) {
          minSeverity = config.minSeverityForAlert;
        }
      } catch (e) {
        console.warn('Failed to parse threshold policy:', e);
      }
    }

    const severityRanks: Record<SeverityLevel, number> = {
      Low: 1,
      Medium: 2,
      High: 3,
      Critical: 4,
    };

    let effectiveSeverity: SeverityLevel = finding.severity;

    // Check destination tool approval status
    let toolName = 'Unspecified Destination';
    if (intendedToolId) {
      const tool = toolRepo.getById(intendedToolId);
      if (tool) {
        toolName = tool.tool_name;
        if (tool.approval_status === 'Restricted' && (finding.category.includes('API') || finding.category.includes('Password'))) {
          // Escalate to Critical if destination tool is restricted and finding involves high-value credentials
          effectiveSeverity = 'Critical';
        }
      }
    }

    if (severityRanks[effectiveSeverity] < severityRanks[minSeverity]) {
      // Below alert threshold
      return null;
    }

    const title = `${effectiveSeverity} DLP Warning: ${finding.category} Detected`;
    const description = `Rule [${finding.rule_id}] matched in local scan targeting [${toolName}]. Category: ${finding.category}, Match Count: ${finding.match_count}.`;

    const alert = await alertRepo.create({
      finding_id: finding.finding_id,
      user_id: finding.user_id,
      severity: effectiveSeverity,
      title,
      description,
      assigned_to: null,
      status: 'Open',
    });

    await auditRepo.log({
      user_id: finding.user_id,
      action: 'ALERT_GENERATED',
      target_type: 'alert',
      target_id: alert.alert_id,
      outcome: 'Success',
      details: `Generated ${effectiveSeverity} alert for ${finding.category} (Tool: ${toolName})`,
    });

    return alert;
  },

  async updateAlertStatus(
    alertId: string,
    newStatus: AlertStatus,
    performedByUserId: string,
    assignedToUserId?: string | null
  ): Promise<void> {
    const alert = alertRepo.getById(alertId);
    if (!alert) throw new Error('Alert not found');

    await alertRepo.updateStatus(alertId, newStatus, assignedToUserId);

    let assignedName = 'Unassigned';
    if (assignedToUserId) {
      const u = userRepo.getById(assignedToUserId);
      if (u) assignedName = u.username;
    }

    await auditRepo.log({
      user_id: performedByUserId,
      action: 'ALERT_STATUS_UPDATE',
      target_type: 'alert',
      target_id: alertId,
      outcome: 'Success',
      details: `Status transitioned to ${newStatus}. Assigned to: ${assignedName}`,
    });
  },
};
