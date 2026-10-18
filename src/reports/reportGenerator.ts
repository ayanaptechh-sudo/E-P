/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { computeSha256, generateUUID } from '../security/crypto';
import { reportRepo } from '../database/repositories/reportRepo';
import { auditRepo } from '../database/repositories/userRepo';
import { ReportRecord, ReportType, Incident, IncidentTimeline } from '../database/types';

export interface UsageReportData {
  reportId: string;
  generatedAt: string;
  generatedBy: string;
  reportingPeriod: string;
  totalTools: number;
  approvedCount: number;
  unreviewedCount: number;
  restrictedCount: number;
  totalEvents: number;
  totalFindings: number;
  categoriesDetected: { category: string; count: number }[];
  riskDistribution: { Low: number; Medium: number; High: number; Critical: number };
  telemetryLimitations: string[];
  recommendations: string[];
}

export interface IncidentReportData {
  reportId: string;
  generatedAt: string;
  generatedBy: string;
  incident: Incident;
  timeline: IncidentTimeline[];
  username: string;
  assignedToName: string;
  telemetryLimitations: string[];
  recommendations: string[];
}

/**
 * Generate self-contained HTML for AI Usage & Compliance Report
 */
export function generateUsageReportHtml(data: UsageReportData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PromptShield — AI Usage & Compliance Report [${data.reportId}]</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 40px; font-size: 13px; line-height: 1.5; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { margin: 0; font-size: 22px; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 12px; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
    .meta-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .meta-val { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px; font-family: monospace; }
    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 24px 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 11px; color: #475569; border-bottom: 1px solid #cbd5e1; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .tag-low { color: #166534; background: #dcfce7; }
    .tag-med { color: #854d0e; background: #fef9c3; }
    .tag-high { color: #9a3412; background: #ffedd5; }
    .tag-crit { color: #991b1b; background: #fee2e2; }
    .callout { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px; margin: 16px 0; color: #1e40af; font-size: 12px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    .sign-off { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sign-line { border-bottom: 1px solid #94a3b8; height: 35px; margin-bottom: 4px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>PromptShield — AI Usage & Compliance Report</h1>
      <div class="subtitle">Confidential DLP Governance & Shadow AI Risk Audit</div>
    </div>
    <div style="text-align: right; font-family: monospace; font-size: 11px; color: #64748b;">
      ID: ${data.reportId}<br>Generated: ${new Date(data.generatedAt).toUTCString()}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">Reporting Period</div>
      <div class="meta-val">${data.reportingPeriod}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Audited By</div>
      <div class="meta-val">${data.generatedBy}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Cataloged AI Tools</div>
      <div class="meta-val">${data.totalTools} (${data.approvedCount} Approved, ${data.unreviewedCount} Unreviewed)</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">DLP Findings Recorded</div>
      <div class="meta-val">${data.totalFindings}</div>
    </div>
  </div>

  <div class="callout">
    <strong>Privacy & Confidentiality Notice:</strong> In strict compliance with zero-leak privacy invariants, all raw prompt text, user clipboard contents, and matched secrets have been permanently excluded from this report. Only high-level categorical frequencies, timestamps, and policy metadata are retained.
  </div>

  <div class="section-title">1. Sensitive Data Category Distribution</div>
  <table>
    <thead>
      <tr>
        <th>Detected Sensitive Data Category</th>
        <th style="text-align: right;">Occurrences Detected</th>
        <th style="text-align: right;">Percentage of Total</th>
      </tr>
    </thead>
    <tbody>
      ${data.categoriesDetected.length === 0
        ? '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">No configured patterns matched. This does not mean the text is safe.</td></tr>'
        : data.categoriesDetected.map(c => `
          <tr>
            <td><strong>${c.category}</strong></td>
            <td style="text-align: right; font-family: monospace;">${c.count}</td>
            <td style="text-align: right; font-family: monospace;">${data.totalFindings > 0 ? ((c.count / data.totalFindings) * 100).toFixed(1) : 0}%</td>
          </tr>
        `).join('')}
    </tbody>
  </table>

  <div class="section-title">2. Findings Severity Breakdown</div>
  <div style="display: flex; gap: 12px; margin-bottom: 20px;">
    <span class="tag tag-low">Low: ${data.riskDistribution.Low}</span>
    <span class="tag tag-med">Medium: ${data.riskDistribution.Medium}</span>
    <span class="tag tag-high">High: ${data.riskDistribution.High}</span>
    <span class="tag tag-crit">Critical: ${data.riskDistribution.Critical}</span>
  </div>

  <div class="section-title">3. Telemetry Coverage & Limitations</div>
  <ul style="padding-left: 20px; color: #475569;">
    ${data.telemetryLimitations.map(lim => `<li>${lim}</li>`).join('')}
  </ul>

  <div class="section-title">4. Governance Recommendations</div>
  <ol style="padding-left: 20px; color: #475569;">
    ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
  </ol>

  <div class="sign-off">
    <div>
      <div class="sign-line"></div>
      <div style="font-size: 11px; color: #64748b;">Compliance Reviewer Signature</div>
    </div>
    <div>
      <div class="sign-line"></div>
      <div style="font-size: 11px; color: #64748b;">Information Security Officer / DPO Signature</div>
    </div>
  </div>

  <div class="footer">
    <span>PromptShield ShadowAI Leak Guard &bull; Client-Side Verified Audit</span>
    <span>Report Verification: Cryptographic SHA-256 Registered</span>
  </div>
</body>
</html>`;
}

/**
 * Generate self-contained HTML for Incident Report
 */
export function generateIncidentReportHtml(data: IncidentReportData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Incident Report — ${data.incident.incident_number}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; background: #fff; margin: 0; padding: 40px; font-size: 13px; line-height: 1.5; }
    .header { border-bottom: 2px solid #dc2626; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { margin: 0; font-size: 22px; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 12px; margin-top: 4px; }
    .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
    .meta-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .meta-val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 24px 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f1f5f9; text-align: left; padding: 8px; font-size: 11px; color: #475569; border-bottom: 1px solid #cbd5e1; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    .callout { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin: 16px 0; color: #991b1b; font-size: 12px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
    .sign-off { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sign-line { border-bottom: 1px solid #94a3b8; height: 35px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Security Incident Summary: ${data.incident.incident_number}</h1>
      <div class="subtitle">${data.incident.title}</div>
    </div>
    <div style="text-align: right; font-family: monospace; font-size: 11px; color: #64748b;">
      Priority: ${data.incident.priority}<br>Status: ${data.incident.status}
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-label">Target User</div>
      <div class="meta-val">${data.username}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Investigator</div>
      <div class="meta-val">${data.assignedToName || 'Unassigned'}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Opened At</div>
      <div class="meta-val">${new Date(data.incident.opened_at).toUTCString()}</div>
    </div>
    <div class="meta-card">
      <div class="meta-label">Closed At</div>
      <div class="meta-val">${data.incident.closed_at ? new Date(data.incident.closed_at).toUTCString() : 'Active Investigation'}</div>
    </div>
  </div>

  <div class="callout">
    <strong>Evidence Invariant:</strong> This record documents local client-side pattern matches. Never assume or imply data was transmitted when evidence only shows a scan or copy action.
  </div>

  <div class="section-title">Incident Summary</div>
  <p style="background: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; white-space: pre-wrap;">${data.incident.summary}</p>

  <div class="section-title">Chronological Audit Timeline</div>
  <table>
    <thead>
      <tr>
        <th style="width: 160px;">Timestamp (UTC)</th>
        <th style="width: 140px;">Event Category</th>
        <th>Description & Metadata</th>
        <th style="width: 120px;">Recorded By</th>
      </tr>
    </thead>
    <tbody>
      ${data.timeline.length === 0
        ? '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No timeline events recorded.</td></tr>'
        : data.timeline.map(t => `
          <tr>
            <td style="font-family: monospace; font-size: 11px;">${new Date(t.event_time).toISOString().replace('T', ' ').slice(0, 19)}</td>
            <td><strong>${t.event_type}</strong></td>
            <td>${t.description}</td>
            <td style="font-family: monospace; font-size: 11px;">${t.recorded_by}</td>
          </tr>
        `).join('')}
    </tbody>
  </table>

  <div class="section-title">Telemetry Limitations</div>
  <ul style="padding-left: 20px; color: #475569;">
    ${data.telemetryLimitations.map(lim => `<li>${lim}</li>`).join('')}
  </ul>

  <div class="section-title">Investigator Remediation Steps</div>
  <ol style="padding-left: 20px; color: #475569;">
    ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
  </ol>

  <div class="sign-off">
    <div>
      <div class="sign-line"></div>
      <div style="font-size: 11px; color: #64748b;">Assigned Investigator Signature</div>
    </div>
    <div>
      <div class="sign-line"></div>
      <div style="font-size: 11px; color: #64748b;">Chief Information Security Officer Approval</div>
    </div>
  </div>

  <div class="footer">
    <span>PromptShield ShadowAI Leak Guard &bull; Incident Dossier</span>
    <span>Cryptographically Hashed Record</span>
  </div>
</body>
</html>`;
}

/**
 * Generate PDF for AI Usage Compliance Report
 */
export function generateUsageReportPdf(data: UsageReportData): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('PromptShield — AI Usage & Compliance Report', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Report ID: ${data.reportId}  |  Generated: ${new Date(data.generatedAt).toUTCString()}`, 14, 24);

  // Meta banner
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 28, 182, 18, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PERIOD:', 18, 34);
  doc.text('AUDITED BY:', 65, 34);
  doc.text('AI TOOLS:', 115, 34);
  doc.text('DLP FINDINGS:', 160, 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(data.reportingPeriod, 18, 41);
  doc.text(data.generatedBy, 65, 41);
  doc.text(`${data.totalTools} (${data.approvedCount} Appr)`, 115, 41);
  doc.text(String(data.totalFindings), 160, 41);

  // Disclaimer banner
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.rect(14, 50, 182, 12, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  doc.text(
    'Privacy Notice: No raw scanned text or secret values are preserved. Only categorical metadata is reported.',
    18,
    57
  );

  // Categories Table
  const tableData = data.categoriesDetected.map(c => [
    c.category,
    String(c.count),
    data.totalFindings > 0 ? `${((c.count / data.totalFindings) * 100).toFixed(1)}%` : '0%',
  ]);

  autoTable(doc, {
    startY: 66,
    head: [['Sensitive Data Category', 'Occurrences', 'Percentage']],
    body: tableData.length > 0 ? tableData : [['No configured patterns matched. This does not mean the text is safe.', '0', '0%']],
    theme: 'striped',
    styles: { fontSize: 8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Severity summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Severity Distribution', 14, finalY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Low: ${data.riskDistribution.Low}   |   Medium: ${data.riskDistribution.Medium}   |   High: ${data.riskDistribution.High}   |   Critical: ${data.riskDistribution.Critical}`,
    14,
    finalY + 6
  );

  // Limitations & Recommendations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Governance Recommendations & Source Limitations', 14, finalY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let lineY = finalY + 22;
  for (const r of data.recommendations) {
    doc.text(`• ${r}`, 14, lineY);
    lineY += 5;
  }
  for (const lim of data.telemetryLimitations) {
    doc.text(`• Telemetry Notice: ${lim}`, 14, lineY);
    lineY += 5;
  }

  // Signatures
  lineY = Math.max(lineY + 10, 240);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, lineY, 80, lineY);
  doc.line(110, lineY, 180, lineY);
  doc.text('Compliance Reviewer Signature', 14, lineY + 4);
  doc.text('Information Security Officer Signature', 110, lineY + 4);

  return new Uint8Array(doc.output('arraybuffer'));
}

/**
 * Generate PDF for Incident Summary Report
 */
export function generateIncidentReportPdf(data: IncidentReportData): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(`Security Incident Summary: ${data.incident.incident_number}`, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Title: ${data.incident.title}  |  Priority: ${data.incident.priority}  |  Status: ${data.incident.status}`, 14, 24);

  // Meta box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 28, 182, 18, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TARGET USER:', 18, 34);
  doc.text('INVESTIGATOR:', 70, 34);
  doc.text('OPENED:', 120, 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(data.username, 18, 41);
  doc.text(data.assignedToName || 'Unassigned', 70, 41);
  doc.text(new Date(data.incident.opened_at).toLocaleDateString(), 120, 41);

  // Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Summary:', 14, 53);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const splitSummary = doc.splitTextToSize(data.incident.summary, 182);
  doc.text(splitSummary, 14, 58);

  const timelineStartY = 58 + splitSummary.length * 4 + 6;

  // Timeline Table
  const timelineRows = data.timeline.map(t => [
    new Date(t.event_time).toISOString().replace('T', ' ').slice(0, 19),
    t.event_type,
    t.description,
    t.recorded_by,
  ]);

  autoTable(doc, {
    startY: timelineStartY,
    head: [['Time (UTC)', 'Event Type', 'Description', 'Recorded By']],
    body: timelineRows.length > 0 ? timelineRows : [['-', 'No timeline entries', '-', '-']],
    theme: 'striped',
    styles: { fontSize: 8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // Signatures
  const signY = Math.max(finalY, 240);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, signY, 80, signY);
  doc.line(110, signY, 180, signY);
  doc.text('Assigned Investigator Signature', 14, signY + 4);
  doc.text('Security Lead Approval', 110, signY + 4);

  return new Uint8Array(doc.output('arraybuffer'));
}

/**
 * Downloads a generated file and registers the cryptographic record in reports table
 */
export async function exportReportFile(params: {
  reportType: ReportType;
  fileName: string;
  format: 'html' | 'pdf';
  content: string | Uint8Array;
  generatedByUserId: string;
  incidentId?: string | null;
}): Promise<ReportRecord> {
  const hash = await computeSha256(params.content);

  // Trigger browser download
  const mimeType = params.format === 'html' ? 'text/html;charset=utf-8' : 'application/pdf';
  const blob = new Blob([params.content as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = params.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Record in reports table
  const record = await reportRepo.record({
    incident_id: params.incidentId || null,
    report_type: params.reportType,
    file_name: params.fileName,
    generated_by: params.generatedByUserId,
    sha256_hash: hash,
  });

  await auditRepo.log({
    user_id: params.generatedByUserId,
    action: 'REPORT_EXPORTED',
    target_type: 'report',
    target_id: record.report_id,
    outcome: 'Success',
    details: `Exported ${params.format.toUpperCase()} report: "${params.fileName}" (SHA-256: ${hash.slice(0, 16)}...)`,
  });

  return record;
}
