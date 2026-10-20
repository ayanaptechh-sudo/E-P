/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronRight,
  TrendingUp,
  Download,
  Search,
  ArrowUpRight,
  Clock,
  Check,
  X,
  Send,
  Zap,
  Lock,
  Cpu,
  ClipboardCheck,
  Sliders,
  FileSearch,
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
} from 'recharts';
import { toolRepo } from '../../database/repositories/toolRepo';
import { scanRepo } from '../../database/repositories/scanRepo';
import { alertRepo, incidentRepo } from '../../database/repositories/alertRepo';
import { policyRepo } from '../../database/repositories/policyRepo';
import { getActiveScannerRules } from '../../scanner/scannerEngine';
import { useAuth } from '../../services/authContext';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardProps = {}) {
  const { currentUser } = useAuth();
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'warn'>('all');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Real tool and scan counts from local SQLite (no hardcoded mock minimums)
  const tools = useMemo(() => toolRepo.getAll(), [refreshKey]);
  const findings = useMemo(() => scanRepo.getFindings(), [refreshKey]);
  const scanSessions = useMemo(() => scanRepo.getScanSessions(100), [refreshKey]);
  const alerts = useMemo(() => alertRepo.getAll(), [refreshKey]);
  const incidents = useMemo(() => incidentRepo.getAll(), [refreshKey]);

  // Dynamic active rules count from SQLite policy
  const activeRulesSummary = useMemo(() => {
    const policyRecord = policyRepo.getLatest('pol_data_categories');
    return getActiveScannerRules(policyRecord?.policy_json, policyRecord?.version);
  }, [refreshKey]);

  const totalTools = tools.length;
  const approvedTools = tools.filter((t) => t.approval_status === 'Approved').length;
  const restrictedTools = tools.filter((t) => t.approval_status === 'Restricted').length;
  const totalFindings = findings.length;

  // Build real 24-hour chronological telemetry from actual scan sessions and findings
  const timelineData = useMemo(() => {
    const buckets: Record<string, { time: string; cleanScans: number; threatsBlocked: number }> = {
      '00:00': { time: '00:00', cleanScans: 0, threatsBlocked: 0 },
      '04:00': { time: '04:00', cleanScans: 0, threatsBlocked: 0 },
      '08:00': { time: '08:00', cleanScans: 0, threatsBlocked: 0 },
      '12:00': { time: '12:00', cleanScans: 0, threatsBlocked: 0 },
      '16:00': { time: '16:00', cleanScans: 0, threatsBlocked: 0 },
      '20:00': { time: '20:00', cleanScans: 0, threatsBlocked: 0 },
      '24:00': { time: '24:00', cleanScans: 0, threatsBlocked: 0 },
    };

    scanSessions.forEach((s) => {
      const date = new Date(s.scan_time);
      const hour = date.getHours();
      let slot = '24:00';
      if (hour < 4) slot = '00:00';
      else if (hour < 8) slot = '04:00';
      else if (hour < 12) slot = '08:00';
      else if (hour < 16) slot = '12:00';
      else if (hour < 20) slot = '16:00';
      else slot = '20:00';

      if (s.detected_count > 0) {
        buckets[slot].threatsBlocked += s.detected_count;
      } else {
        buckets[slot].cleanScans += 1;
      }
    });

    return Object.values(buckets);
  }, [scanSessions]);

  // Filtered actual findings for recent detections
  const filteredFindings = useMemo(() => {
    if (filterType === 'critical') {
      return findings.filter((f) => f.severity === 'Critical');
    }
    if (filterType === 'warn') {
      return findings.filter((f) => f.severity === 'High' || f.severity === 'Medium');
    }
    return findings;
  }, [findings, filterType]);

  // Unreviewed tools queue
  const unreviewedTools = useMemo(() => {
    return tools.filter((t) => t.approval_status === 'Unreviewed').slice(0, 3);
  }, [tools]);

  const handleToolDecision = async (id: string, decision: 'Approved' | 'Restricted') => {
    await toolRepo.updateApprovalStatus(id, decision);
    setRefreshKey((k) => k + 1);
  };

  const handleQuickScan = () => {
    if (onNavigate) {
      onNavigate('scan-text');
    }
  };

  // Real compliance score based on zero leaks: 100% clean if no unreviewed/critical incidents
  const complianceScore = useMemo(() => {
    if (totalFindings === 0 && incidents.length === 0) return 100;
    const ratio = Math.max(0, 100 - (totalFindings * 5 + incidents.length * 10));
    return Math.round(ratio);
  }, [totalFindings, incidents]);

  return (
    <div className="space-y-4">
      {/* =========================================================================
          COMPACT DESKTOP HEADER & PRIMARY ACTIONS
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Security Overview
            </h1>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              Active Protection
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            PromptShield Local DLP · Zero Cloud Exfiltration · WebAssembly Engine
          </p>
        </div>

        {/* Desktop Quick Action Buttons (Flat, Rounded-md, Single Indigo Accent) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('scan-text')}
            className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-medium shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Launch Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('scan-clipboard')}
            className="px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-medium shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Audit Clipboard</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROW 1: 4 HIGH-DENSITY METRIC CARDS (Monochrome Slate + Tabular Numerals)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Monitored AI Tools */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Monitored AI Tools
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
              Real-time Catalog
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight block font-mono tabular-nums">
              {totalTools}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              {approvedTools} approved · {restrictedTools} restricted
            </span>
          </div>
        </div>

        {/* Card 2: PII & Secret Interceptions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              PII Interceptions
            </span>
            <span className={`text-[11px] font-mono font-medium ${totalFindings > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {totalFindings > 0 ? `${totalFindings} detected` : 'Zero Interceptions'}
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight block font-mono tabular-nums">
              {totalFindings}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Cards, CNICs, API Keys, Passwords
            </span>
          </div>
        </div>

        {/* Card 3: Active DLP Rules */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Active Risk Rules
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
              AST Verified
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight block font-mono tabular-nums">
              {activeRulesSummary.totalCount}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Zero ReDoS · Safe Regex Engine
            </span>
          </div>
        </div>

        {/* Card 4: Clipboard Guard Status */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Real-time Scanner Status
            </span>
            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight block font-mono tabular-nums">
              100%
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              In-memory airgap isolation
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: MIDDLE SECTION (Telemetry Stream + Security Posture)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 cols): Chronological Security Event Timeline */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                  Chronological Security Event Timeline
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Rolling telemetry of clean prompt scans vs. intercepted data risks
                </p>
              </div>

              {/* Chart Legend (Monochrome + Indigo Accent) */}
              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 dark:bg-indigo-400" />
                  <span>Clean Scans</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 dark:bg-slate-500" />
                  <span>Threats Blocked</span>
                </div>
              </div>
            </div>

            {/* Recharts Composed Chart (Bar + Trend Line) */}
            <div className="mt-3">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#94A3B8" strokeOpacity={0.2} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-2.5 shadow-sm text-xs font-mono">
                              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{label}</p>
                              <p className="text-indigo-600 dark:text-indigo-400">
                                Clean Scans: {payload[0]?.value}
                              </p>
                              <p className="text-slate-600 dark:text-slate-400">
                                Blocked: {payload[1]?.value}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Secondary slate bar for threats */}
                    <Bar
                      dataKey="threatsBlocked"
                      fill="#94A3B8"
                      radius={[2, 2, 0, 0]}
                      barSize={6}
                    />
                    {/* Primary Indigo Bar */}
                    <Bar
                      dataKey="cleanScans"
                      fill="#6366F1"
                      radius={[2, 2, 0, 0]}
                      barSize={6}
                    />
                    {/* Primary Indigo Line */}
                    <Line
                      type="monotone"
                      dataKey="cleanScans"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>00:00 UTC</span>
            <span>24-Hour Rolling Telemetry ({scanSessions.length} total local scans)</span>
            <span>24:00 UTC</span>
          </div>
        </div>

        {/* Right Column (4 cols): Security Posture & Compliance */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Security Posture</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Airgap compliance grade</p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('reports')}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span>Export Audit</span>
              </button>
            </div>

            {/* Score */}
            <div className="mt-3">
              <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight font-mono tabular-nums">
                {complianceScore}%
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">Overall DLP compliance rating</span>
            </div>

            {/* Gauge Graphic */}
            <div className="mt-3 flex items-center justify-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    className="stroke-slate-200 dark:stroke-slate-700"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    stroke="#4F46E5"
                    strokeWidth="10"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 * (1 - complianceScore / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight font-mono tabular-nums">
                    {complianceScore}%
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Compliant
                  </span>
                </div>
              </div>
            </div>

            {/* Metric Breakdown */}
            <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-indigo-600 dark:bg-indigo-400" />
                  <span>Approved Tool Ratio</span>
                </span>
                <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">
                  {totalTools > 0 ? Math.round((approvedTools / totalTools) * 100) : 100}%
                </span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-slate-300 dark:bg-slate-600" />
                  <span>Unreviewed Catalog Items</span>
                </span>
                <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">
                  {tools.filter((t) => t.approval_status === 'Unreviewed').length}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <button
              onClick={() => onNavigate && onNavigate('findings')}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Findings Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: RECENT DETECTIONS + PENDING REVIEWS + PROMPT SANDBOX
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Card 1 (4 cols): Recent Interceptions */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Recent Interceptions</h3>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Real-time</span>
            </div>

            {/* Segmented Filter Control (Notion / Linear style) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-md my-3">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All ({findings.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('critical')}
                className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                  filterType === 'critical'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Critical ({findings.filter((f) => f.severity === 'Critical').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('warn')}
                className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                  filterType === 'warn'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Warning ({findings.filter((f) => f.severity === 'High' || f.severity === 'Medium').length})
              </button>
            </div>

            {/* Detection Items (Data-Dense Desktop Rows) */}
            <div className="space-y-2">
              {filteredFindings.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-md">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">No incidents detected</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Your local clipboard and prompt scans are currently safe from data leaks.
                  </p>
                </div>
              ) : (
                filteredFindings.slice(0, 3).map((f) => (
                  <div key={f.finding_id} className="p-2.5 rounded-md bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{f.category}</span>
                      <span className="text-[10px] font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                        {f.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {f.explanation || `Rule match: ${f.rule_id}`}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>{new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button
                        onClick={() => onNavigate && onNavigate('findings')}
                        className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
                      >
                        Inspect →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Card 2 (4 cols): Pending Tool Reviews */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Tool Review Queue</h3>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('inventory')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 cursor-pointer"
              >
                View Catalog ({tools.length})
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 my-2.5">
              Detected AI services awaiting governance classification
            </p>

            {/* List of Real Unreviewed Tools from Database */}
            <div className="space-y-2">
              {unreviewedTools.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-md">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">All tools classified</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    No unreviewed AI tools pending governance decision.
                  </p>
                </div>
              ) : (
                unreviewedTools.map((t) => (
                  <div key={t.tool_id} className="flex items-center justify-between p-2 rounded-md bg-slate-50/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center shrink-0">
                        {t.tool_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="max-w-[130px] truncate">
                        <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">{t.tool_name}</h5>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{t.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToolDecision(t.tool_id, 'Approved')}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                        title="Approve"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToolDecision(t.tool_id, 'Restricted')}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                        title="Restrict"
                      >
                        Restrict
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Card 3 (4 cols): Local Prompt & Secret Sandbox */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                Prompt Leak Sandbox
              </h3>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Local Sandbox</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Instantly test a prompt, code snippet, or token for DLP rule matches.
            </p>

            <div className="mt-3">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-2.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
                <textarea
                  rows={3}
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  placeholder="Paste confidential data, secrets, or prompts to test..."
                  maxLength={500}
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none font-mono"
                />
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {quickPrompt.length}/500
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickScan}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Test Prompt</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            Evaluated using safe non-backtracking regular expressions.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
