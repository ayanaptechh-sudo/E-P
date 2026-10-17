/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import { incidentRepo } from '../../database/repositories/alertRepo';
import { userRepo } from '../../database/repositories/userRepo';
import { Incident, IncidentPriority, IncidentStatus, IncidentTimeline, TimelineEventType } from '../../database/types';
import { DataTable, Column, Modal } from '../components/DataTable';
import { RiskBadge } from '../components/CommonUI';
import { incidentService } from '../../core/incidentService';
import {
  generateIncidentReportHtml,
  generateIncidentReportPdf,
  exportReportFile,
} from '../../reports/reportGenerator';

export const IncidentsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [incidents, setIncidents] = useState(() => incidentRepo.getAll());
  const [selectedIncident, setSelectedIncident] = useState<
    (Incident & { username?: string; assigned_name?: string }) | null
  >(null);
  const [timeline, setTimeline] = useState<IncidentTimeline[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddTimelineModalOpen, setIsAddTimelineModalOpen] = useState(false);

  // Create Form State
  const [newTitle, setNewTitle] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newPriority, setNewPriority] = useState<IncidentPriority>('High');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newSummary, setNewSummary] = useState('');

  // Add Timeline Event Form State
  const [eventType, setEventType] = useState<TimelineEventType>('Review');
  const [eventDesc, setEventDesc] = useState('');

  const users = useMemo(() => userRepo.getAll(), []);

  const reload = () => {
    setIncidents(incidentRepo.getAll());
    if (selectedIncident) {
      const refreshed = incidentRepo.getById(selectedIncident.incident_id);
      setSelectedIncident(refreshed);
      setTimeline(incidentRepo.getTimeline(selectedIncident.incident_id));
    }
  };

  const handleSelectIncident = (inc: Incident & { username?: string; assigned_name?: string }) => {
    setSelectedIncident(inc);
    setTimeline(incidentRepo.getTimeline(inc.incident_id));
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentUser) return;

    const created = await incidentService.createIncident({
      title: newTitle,
      user_id: newUserId || currentUser.user_id,
      priority: newPriority,
      assigned_to: newAssignedTo || currentUser.user_id,
      summary: newSummary,
      opened_by: currentUser.username,
    });

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewSummary('');
    reload();
    const fullInc = incidentRepo.getById(created.incident_id);
    if (fullInc) handleSelectIncident(fullInc);
  };

  const handleAddTimelineEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !eventDesc.trim() || !currentUser) return;

    await incidentService.addTimelineEvent({
      incident_id: selectedIncident.incident_id,
      event_type: eventType,
      description: eventDesc,
      recorded_by: currentUser.username,
    });

    setIsAddTimelineModalOpen(false);
    setEventDesc('');
    reload();
  };

  const handleUpdateStatus = async (status: IncidentStatus) => {
    if (!selectedIncident || !currentUser) return;
    await incidentService.updateIncident(
      selectedIncident.incident_id,
      { status },
      currentUser.username
    );
    reload();
  };

  const handleExportReport = async (format: 'html' | 'pdf') => {
    if (!selectedIncident || !currentUser) return;

    const reportData = {
      reportId: `REP-${selectedIncident.incident_number}`,
      generatedAt: new Date().toISOString(),
      generatedBy: currentUser.username,
      incident: selectedIncident,
      timeline,
      username: selectedIncident.username || selectedIncident.user_id,
      assignedToName: selectedIncident.assigned_name || 'Unassigned',
      telemetryLimitations: [
        'Client-side browser evaluation only. No native OS root interception.',
        'Network transit verification relies on endpoint history and voluntary scan records.',
      ],
      recommendations: [
        'Enforce mandatory local prompt redaction before pasting code into public AI models.',
        'Rotate exposed credentials immediately if evidence suggests external transmission.',
        'Schedule employee security awareness refresher on institutional AI policies.',
      ],
    };

    const fileName = `${selectedIncident.incident_number}_Dossier_${Date.now()}.${format}`;

    if (format === 'html') {
      const html = generateIncidentReportHtml(reportData);
      await exportReportFile({
        reportType: 'Incident Summary',
        fileName,
        format: 'html',
        content: html,
        generatedByUserId: currentUser.user_id,
        incidentId: selectedIncident.incident_id,
      });
    } else {
      const pdfBytes = generateIncidentReportPdf(reportData);
      await exportReportFile({
        reportType: 'Incident Summary',
        fileName,
        format: 'pdf',
        content: pdfBytes,
        generatedByUserId: currentUser.user_id,
        incidentId: selectedIncident.incident_id,
      });
    }
  };

  const columns: Column<Incident & { username?: string; assigned_name?: string }>[] = [
    {
      header: 'Incident ID',
      accessor: (inc) => (
        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
          {inc.incident_number}
        </span>
      ),
      sortable: true,
      sortValue: (inc) => inc.incident_number,
    },
    {
      header: 'Title',
      accessor: (inc) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{inc.title}</div>
          <div className="text-[11px] text-slate-500 line-clamp-1">{inc.summary}</div>
        </div>
      ),
      sortable: true,
      sortValue: (inc) => inc.title,
    },
    {
      header: 'Priority',
      accessor: (inc) => <RiskBadge level={inc.priority} size="sm" />,
      sortable: true,
      sortValue: (inc) => inc.priority,
    },
    {
      header: 'Status',
      accessor: (inc) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
            inc.status === 'Open'
              ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
              : inc.status === 'Closed'
              ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
              : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
          }`}
        >
          {inc.status}
        </span>
      ),
    },
    {
      header: 'Target User',
      accessor: (inc) => inc.username || inc.user_id.slice(0, 8),
    },
    {
      header: 'Assigned',
      accessor: (inc) => inc.assigned_name || <span className="text-slate-400 italic">Unassigned</span>,
    },
    {
      header: 'Opened',
      accessor: (inc) => (
        <span className="font-mono text-[11px] text-slate-500">
          {new Date(inc.opened_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
      sortValue: (inc) => inc.opened_at,
    },
    {
      header: 'Action',
      align: 'right',
      accessor: (inc) => (
        <button
          onClick={() => handleSelectIncident(inc)}
          className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700"
        >
          View Dossier &rarr;
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Security Incidents & Evidence Timeline
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Formal investigation cases with strict separation of scan vs attempted vs confirmed transmission evidence
          </p>
        </div>

        <button
          onClick={() => {
            setNewTitle('');
            setNewSummary('');
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 self-start"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Open New Incident</span>
        </button>
      </div>

      {/* Incident Detail Drawer / Panel if Selected */}
      {selectedIncident && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-6 shadow-md mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                  {selectedIncident.incident_number}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedIncident.title}
                </h2>
                <RiskBadge level={selectedIncident.priority} size="sm" />
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                <span>User: <strong>{selectedIncident.username}</strong></span>
                <span>Assigned: <strong>{selectedIncident.assigned_name || 'Unassigned'}</strong></span>
                <span>Opened: <strong>{new Date(selectedIncident.opened_at).toLocaleDateString()}</strong></span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedIncident.status}
                onChange={(e) => handleUpdateStatus(e.target.value as IncidentStatus)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="Open">Status: Open</option>
                <option value="In Progress">Status: In Progress</option>
                <option value="On Hold">Status: On Hold</option>
                <option value="Closed">Status: Closed</option>
              </select>

              <button
                onClick={() => setIsAddTimelineModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-lg"
              >
                + Add Timeline Event
              </button>

              <button
                onClick={() => handleExportReport('pdf')}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100"
              >
                Export PDF
              </button>

              <button
                onClick={() => handleExportReport('html')}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg"
              >
                Export HTML
              </button>

              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Case Summary & Context
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 leading-relaxed">
              {selectedIncident.summary}
            </p>
          </div>

          {/* Chronological Timeline */}
          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Audited Chronological Timeline ({timeline.length} events)
            </h4>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-lg text-xs text-blue-800 dark:text-blue-300 mb-4">
              <strong>Evidence Invariant:</strong> The timeline rigorously distinguishes <em>Scan</em> vs <em>Attempted Submission</em> vs <em>Confirmed Submission</em>. No transmission is inferred unless corroborated by network endpoint logs.
            </div>

            <div className="space-y-3">
              {timeline.map((item, idx) => (
                <div
                  key={item.timeline_id}
                  className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-mono shrink-0 font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.event_type}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(item.event_time).toISOString().replace('T', ' ').slice(0, 19)} UTC
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-1 leading-normal">
                      {item.description}
                    </p>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Recorded by: <span className="font-medium text-slate-500">{item.recorded_by}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Incidents Table */}
      <DataTable
        columns={columns}
        data={incidents}
        keyField="incident_id"
        searchPlaceholder="Filter incidents by ID, title, summary, user..."
        searchFilter={(inc, q) =>
          inc.incident_number.toLowerCase().includes(q) ||
          inc.title.toLowerCase().includes(q) ||
          inc.summary.toLowerCase().includes(q) ||
          (inc.username || '').toLowerCase().includes(q)
        }
        emptyTitle="No incidents on record"
        emptySubtitle="Security incidents can be created manually or escalated from alerts and findings."
      />

      {/* Create Incident Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Open Security Incident Case"
        subtitle="Registers an official investigation case dossier with chronological audit logging."
      >
        <form onSubmit={handleCreateIncident} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Incident Title
            </label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Unapproved Claude Prompting with Customer Database URI"
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as IncidentPriority)}
                className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Subject User
              </label>
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">Current User ({currentUser?.username})</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.username} ({u.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned Investigator
            </label>
            <select
              value={newAssignedTo}
              onChange={(e) => setNewAssignedTo(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">Assign to Me ({currentUser?.username})</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.username} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Executive Summary & Scope
            </label>
            <textarea
              rows={4}
              required
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Describe observation, workstation telemetry, and initial findings..."
              className="mt-1 w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Create Incident
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Timeline Entry Modal */}
      <Modal
        isOpen={isAddTimelineModalOpen}
        onClose={() => setIsAddTimelineModalOpen(false)}
        title="Add Chronological Timeline Event"
        subtitle="Record verified actions. Distinguish carefully between scans, warnings, and verified submissions."
      >
        <form onSubmit={handleAddTimelineEntry} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Event Classification
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as TimelineEventType)}
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="Scan">Scan (Local client text scan performed)</option>
              <option value="Finding">Finding (Specific rule triggered)</option>
              <option value="Warning">Warning (DLP banner presented to user)</option>
              <option value="Redaction">Redaction (User previewed or copied sanitized text)</option>
              <option value="Attempted Submission">Attempted Submission (User clicked send or paste to tool)</option>
              <option value="Confirmed Submission">Confirmed Submission (Corroborated by proxy / network egress)</option>
              <option value="Review">Review (Investigator audit note)</option>
              <option value="Resolution">Resolution (Remediation confirmed / closed)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Event Description & Metadata
            </label>
            <textarea
              rows={3}
              required
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              placeholder="e.g. Employee acknowledged warning and replaced credentials with redaction token."
              className="mt-1 w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddTimelineModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Append Timeline Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
