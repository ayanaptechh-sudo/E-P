/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import { toolRepo } from '../../database/repositories/toolRepo';
import { usageRepo } from '../../database/repositories/usageRepo';
import { scanRepo } from '../../database/repositories/scanRepo';
import { alertRepo, incidentRepo, riskRepo } from '../../database/repositories/alertRepo';
import { userRepo } from '../../database/repositories/userRepo';
import { SummaryCard, RiskBadge } from '../components/CommonUI';
import { calculateRiskScore } from '../../core/riskScoreEngine';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DashboardPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90' | 'all'>('30');
  const [refreshKey, setRefreshKey] = useState(0);

  // Load counts and records from SQLite
  const tools = useMemo(() => toolRepo.getAll(), [refreshKey]);
  const findings = useMemo(() => scanRepo.getFindings(), [refreshKey]);
  const usageEvents = useMemo(() => usageRepo.getAll(), [refreshKey]);
  const alerts = useMemo(() => alertRepo.getAll(), [refreshKey]);
  const incidents = useMemo(() => incidentRepo.getAll(), [refreshKey]);
  const users = useMemo(() => userRepo.getAll(), [refreshKey]);

  // Filter based on time range
  const filteredFindings = useMemo(() => {
    if (timeRange === 'all') return findings;
    const days = parseInt(timeRange, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return findings.filter(f => new Date(f.created_at).getTime() >= cutoff);
  }, [findings, timeRange]);

  const filteredEvents = useMemo(() => {
    if (timeRange === 'all') return usageEvents;
    const days = parseInt(timeRange, 10);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return usageEvents.filter(e => new Date(e.event_time).getTime() >= cutoff);
  }, [usageEvents, timeRange]);

  // Tool counts
  const approvedTools = useMemo(() => tools.filter(t => t.approval_status === 'Approved').length, [tools]);
  const restrictedTools = useMemo(() => tools.filter(t => t.approval_status === 'Restricted').length, [tools]);
  const unreviewedTools = useMemo(() => tools.filter(t => t.approval_status === 'Unreviewed' || t.approval_status === 'Review Required').length, [tools]);

  // Open alerts
  const openAlertsCount = useMemo(() => {
    return alerts.filter(a => a.status === 'Open' || a.status === 'Acknowledged' || a.status === 'Investigating').length;
  }, [alerts]);

  // Severity distribution for chart
  const severityChartData = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    filteredFindings.forEach(f => {
      if (counts[f.severity] !== undefined) {
        counts[f.severity]++;
      }
    });
    return [
      { name: 'Low', count: counts.Low, fill: '#10b981' },
      { name: 'Medium', count: counts.Medium, fill: '#f59e0b' },
      { name: 'High', count: counts.High, fill: '#f97316' },
      { name: 'Critical', count: counts.Critical, fill: '#ef4444' },
    ];
  }, [filteredFindings]);

  // Overall organization risk score
  const overallRisk = useMemo(() => {
    return calculateRiskScore({
      findings: filteredFindings,
      usageEvents: filteredEvents,
      windowDays: timeRange === 'all' ? 30 : parseInt(timeRange, 10),
      hasBrowserIntegration: false,
    });
  }, [filteredFindings, filteredEvents, timeRange]);

  // Aggregate department risk breakdown
  const departmentBreakdown = useMemo(() => {
    const depts = Array.from(new Set(users.map(u => u.department)));
    if (depts.length === 0) depts.push('Engineering', 'Security', 'Operations');

    return depts.map(dept => {
      const deptUserIds = new Set(users.filter(u => u.department === dept).map(u => u.user_id));
      const deptFindings = filteredFindings.filter(f => deptUserIds.has(f.user_id));
      const deptEvents = filteredEvents.filter(e => deptUserIds.has(e.user_id));

      const res = calculateRiskScore({
        findings: deptFindings,
        usageEvents: deptEvents,
        windowDays: timeRange === 'all' ? 30 : parseInt(timeRange, 10),
      });

      return {
        department: dept,
        score: res.score,
        risk_level: res.risk_level,
        findingsCount: deptFindings.length,
        eventsCount: deptEvents.length,
      };
    }).sort((a, b) => b.score - a.score);
  }, [users, filteredFindings, filteredEvents, timeRange]);

  const isManager = currentUser?.role === 'Manager';

  return (
    <div className="space-y-6">
      {/* Top Header & Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Security & Shadow AI Operations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time telemetry and sensitive data exposure posture
          </p>
        </div>

        {/* Segmented Control for Time Range */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          <button
            onClick={() => setTimeRange('7')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              timeRange === '7'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              timeRange === '30'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              timeRange === '90'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            90 Days
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              timeRange === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          title="Cataloged Tools"
          value={tools.length}
          subtitle={`${approvedTools} Appr · ${restrictedTools} Restr · ${unreviewedTools} Unrev`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <SummaryCard
          title="Usage Events"
          value={filteredEvents.length}
          subtitle={`${filteredEvents.filter(e => e.event_type === 'Visit').length} Visits · ${filteredEvents.filter(e => e.event_type === 'App Detected').length} Apps`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          }
        />
        <SummaryCard
          title="DLP Findings"
          value={filteredFindings.length}
          subtitle={`${filteredFindings.filter(f => f.severity === 'Critical' || f.severity === 'High').length} High/Critical`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <SummaryCard
          title="Open Alerts"
          value={openAlertsCount}
          subtitle="Action required"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
        />
        <SummaryCard
          title="Org Risk Score"
          value={`${overallRisk.score}/100`}
          subtitle={`Status: ${overallRisk.risk_level}`}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Monitoring Sources & Integrity Status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Telemetry Ingestion & Integration Status
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Honest status of local client-side collection connectors. Missing telemetry is not treated as safe.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">4 Connectors</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span>Browser Integration</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                Unsupported
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Not configured / unsupported. Native browser prompt interception requires dedicated managed endpoint.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span>History Import</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Domain-matching parser available. Deduplication & privacy stripping active.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span>Process Inventory</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Tasklist & ps parser ready for AI desktop executable correlation.
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <span>Extension Inventory</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Capability Only
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Declared permissions parsed. Note: declared capability, not proof of prompt access.
            </p>
          </div>
        </div>
      </div>

      {/* Middle Row: Findings Severity Chart + Department Risk Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Findings by Severity Distribution
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Local DLP detection breakdown ({timeRange === 'all' ? 'All Time' : `Last ${timeRange} Days`})
              </p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department / User Risk Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Department Exposure Summary
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isManager ? 'Aggregate department scores (Individual records hidden for Manager role)' : 'Normalized 5-factor risk index per department'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('risk')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Detailed Risk Model &rarr;
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {departmentBreakdown.map((dept, i) => (
              <div
                key={i}
                className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{dept.department}</span>
                    <RiskBadge level={dept.risk_level} size="sm" />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {dept.findingsCount} findings · {dept.eventsCount} usage events
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {dept.score}
                    <span className="text-[10px] text-slate-400 font-normal">/100</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 italic">
            Policy-risk indicator, not proof of wrongdoing.
          </div>
        </div>
      </div>

      {/* Recent Security Incidents List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Recent Security Incidents
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Active incident investigations and verification timelines
            </p>
          </div>
          <button
            onClick={() => onNavigate('incidents')}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            All Incidents ({incidents.length}) &rarr;
          </button>
        </div>

        {incidents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No active incidents. Clean security posture.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {incidents.slice(0, 5).map(inc => (
              <div
                key={inc.incident_id}
                onClick={() => onNavigate('incidents')}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 rounded-lg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {inc.incident_number}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {inc.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <RiskBadge level={inc.priority} size="sm" />
                  <span className="font-mono text-[11px] text-slate-500">
                    {new Date(inc.opened_at).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {inc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
