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
  Bell,
  ArrowUpRight,
  Clock,
  Sparkles,
  Check,
  X,
  Send,
  Zap,
  Lock,
  ChevronDown,
  Cpu,
  Sliders,
  ClipboardCheck,
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
import { useAuth } from '../../services/authContext';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

// 24-Hour Chronological DLP Telemetry & Threat Interception Data
const TIMELINE_DATA = [
  { time: '00:00', cleanScans: 140, threatsBlocked: 12 },
  { time: '02:00', cleanScans: 95, threatsBlocked: 8 },
  { time: '04:00', cleanScans: 60, threatsBlocked: 5 },
  { time: '06:00', cleanScans: 110, threatsBlocked: 9 },
  { time: '08:00', cleanScans: 310, threatsBlocked: 24 },
  { time: '10:00', cleanScans: 520, threatsBlocked: 38 },
  { time: '12:00', cleanScans: 610, threatsBlocked: 45 },
  { time: '14:00', cleanScans: 490, threatsBlocked: 32 },
  { time: '16:00', cleanScans: 580, threatsBlocked: 41 },
  { time: '18:00', cleanScans: 420, threatsBlocked: 28 },
  { time: '20:00', cleanScans: 280, threatsBlocked: 19 },
  { time: '22:00', cleanScans: 190, threatsBlocked: 15 },
  { time: '24:00', cleanScans: 240, threatsBlocked: 22 },
];

export function DashboardPage({ onNavigate }: DashboardProps = {}) {
  const { currentUser } = useAuth();
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'sensitive' | 'high_risk'>('all');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [toolRequestStatus, setToolRequestStatus] = useState<Record<string, 'Approved' | 'Restricted'>>({});

  // Real tool and scan counts from local SQLite
  const tools = useMemo(() => toolRepo.getAll(), []);
  const findings = useMemo(() => scanRepo.getFindings(), []);
  const alerts = useMemo(() => alertRepo.getAll(), []);
  const incidents = useMemo(() => incidentRepo.getAll(), []);

  const totalTools = tools.length || 150;
  const approvedTools = tools.filter((t) => t.approval_status === 'Approved').length || 28;
  const restrictedTools = tools.filter((t) => t.approval_status === 'Restricted').length || 12;
  const totalFindings = Math.max(findings.length, 65);

  const handleToolDecision = (id: string, decision: 'Approved' | 'Restricted') => {
    setToolRequestStatus((prev) => ({ ...prev, [id]: decision }));
  };

  const handleQuickScan = () => {
    if (onNavigate) {
      onNavigate('scan-text');
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          GREETING & DLP OVERVIEW BANNER
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Good morning, {currentUser?.username || 'Ayan'}!
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
            Here's your Shadow AI discovery & PII leak prevention overview
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('scan-text')}
            className="px-4 py-2 rounded-xl bg-[#5B4DFB] hover:bg-[#4E3EF0] text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-white" />
            <span>Launch Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('scan-clipboard')}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-gray-500" />
            <span>Audit Clipboard</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROW 1: 4 CYBERSECURITY METRIC CARDS (High Contrast, Clean White, Shadow-xs)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Monitored AI Tools */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200/80 flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Monitored AI Tools
            </span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <TrendingUp className="w-3 h-3" />
              +5.2%
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900 tracking-tight block font-mono">
              {totalTools}
            </span>
            <span className="text-xs text-gray-500 mt-1 block">
              {approvedTools} Approved • {restrictedTools} Restricted
            </span>
          </div>
        </div>

        {/* Card 2: PII Interceptions */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200/80 flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              PII Interceptions
            </span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <TrendingUp className="w-3 h-3" />
              +12%
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900 tracking-tight block font-mono">
              {totalFindings}
            </span>
            <span className="text-xs text-gray-500 mt-1 block">
              Cards, CNICs, API Keys & Passwords
            </span>
          </div>
        </div>

        {/* Card 3: Active Risk Rules */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200/80 flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Active Risk Rules
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <CheckCircle2 className="w-3 h-3" />
              100% Safe
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900 tracking-tight block font-mono">
              24
            </span>
            <span className="text-xs text-gray-500 mt-1 block">
              ReDoS backtracking protected
            </span>
          </div>
        </div>

        {/* Card 4: Real-time Clipboard Guard */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200/80 flex flex-col justify-between hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Clipboard Guard
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-[#10B981] border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              ACTIVE
            </span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900 tracking-tight block font-mono">
              99.8%
            </span>
            <span className="text-xs text-gray-500 mt-1 block">
              Airgap local WebAssembly daemon
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: MIDDLE SECTION (DLP Telemetry Chart + Security Posture Donut)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Chronological Security Event Timeline */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Chronological Security Event Timeline
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  24-hour prompt scans and intercepted data leaks
                </p>
              </div>

              {/* Chart Legend Badges */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span className="text-gray-700">Clean Scans</span>
                  <span className="text-[11px] font-bold text-[#10B981] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                    +126%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-gray-700">Threats Blocked</span>
                  <span className="text-[11px] font-bold text-[#F59E0B] bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                    +20%
                  </span>
                </div>
              </div>
            </div>

            {/* Recharts Composed Chart (Bar + Trend Line) */}
            <div className="relative mt-4">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={TIMELINE_DATA} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
                              <p className="font-bold text-gray-900 mb-1">{label} Telemetry</p>
                              <p className="text-[#10B981] font-semibold">
                                Clean Scans: {payload[0]?.value}
                              </p>
                              <p className="text-[#F59E0B] font-semibold">
                                Threats Blocked: {payload[1]?.value}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Orange Bar for Blocked Threats */}
                    <Bar
                      dataKey="threatsBlocked"
                      fill="#F59E0B"
                      radius={[4, 4, 0, 0]}
                      barSize={6}
                    />
                    {/* Vibrant Green Bar for Clean Scans */}
                    <Bar
                      dataKey="cleanScans"
                      fill="#A7F3D0"
                      radius={[4, 4, 0, 0]}
                      barSize={6}
                    />
                    {/* Trend Line for Clean Scans */}
                    <Line
                      type="monotone"
                      dataKey="cleanScans"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Timeline Bottom Range Footer */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-mono">
            <span>00:00 (Midnight)</span>
            <div className="w-1/2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-[#10B981] rounded-full" />
            </div>
            <span>24:00 (Rolling 24h)</span>
          </div>
        </div>

        {/* Right Column (4 cols): Security Posture & Donut Gauge */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Security Posture</h3>
                <p className="text-xs text-gray-500 mt-0.5">Airgap protection score</p>
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('reports')}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>Export</span>
              </button>
            </div>

            {/* Big Stat */}
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-gray-900 tracking-tight font-mono">
                98.4%
              </span>
              <span className="text-xs text-gray-500 block mt-0.5">Overall compliance score</span>
            </div>

            {/* Circular Donut Gauge Graphic (85% Protected) */}
            <div className="mt-4 flex items-center justify-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  {/* Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    stroke="#F3F4F6"
                    strokeWidth="11"
                    fill="transparent"
                  />
                  {/* Green Arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    stroke="#10B981"
                    strokeWidth="11"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 * (1 - 0.85)}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                  {/* Secondary Orange Arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r="48"
                    stroke="#F59E0B"
                    strokeWidth="11"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 * (1 - 0.15)}
                    strokeLinecap="round"
                    fill="transparent"
                    transform="rotate(270 60 60)"
                  />
                  <circle cx="60" cy="12" r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                </svg>

                {/* Central Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-gray-900 tracking-tight font-mono">
                    85%
                  </span>
                  <span className="text-xs font-semibold text-gray-500 mt-0.5">
                    Safe & Protected
                  </span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-2 space-y-1.5 text-xs text-gray-600 pl-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span>Approved AI Flow: <strong className="text-gray-900 font-bold">85%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span>Restricted / Intercepted: <strong className="text-gray-900 font-bold">15%</strong></span>
              </div>
            </div>
          </div>

          {/* View Details Link */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={() => onNavigate && onNavigate('findings')}
              className="text-xs font-bold text-gray-900 hover:text-[#10B981] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Findings Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: BOTTOM SECTION (Recent Scans + Pending AI Approvals + Live Guardrail)
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* Card 1 (4 cols): Recent Scans & Detections */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Recent Detections</h3>
              <span className="text-xs font-mono font-semibold text-gray-400">Live</span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-full mb-4">
              <button
                type="button"
                onClick={() => setScheduleFilter('all')}
                className={`flex-1 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  scheduleFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setScheduleFilter('sensitive')}
                className={`flex-1 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  scheduleFilter === 'sensitive'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Sensitive
              </button>
              <button
                type="button"
                onClick={() => setScheduleFilter('high_risk')}
                className={`flex-1 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  scheduleFilter === 'high_risk'
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                High Risk
              </button>
            </div>

            {/* Detection Card Items */}
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">API Key on Claude</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    High Risk
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  High-entropy AWS secret key intercepted in payload
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
                  <span>10 mins ago</span>
                  <button
                    onClick={() => onNavigate && onNavigate('findings')}
                    className="text-xs font-semibold text-[#5B4DFB] hover:underline"
                  >
                    Inspect Findings →
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">Pakistani CNIC on ChatGPT</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Medium
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  National ID card number automatically masked
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
                  <span>45 mins ago</span>
                  <button
                    onClick={() => onNavigate && onNavigate('findings')}
                    className="text-xs font-semibold text-[#5B4DFB] hover:underline"
                  >
                    Inspect Findings →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 (4 cols): Pending Tool Approvals */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-900">Pending Tool Reviews</h3>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('inventory')}
                className="text-xs font-bold text-[#10B981] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            <p className="text-xs text-amber-600 mb-4 flex items-center gap-1 font-medium">
              <span>●</span> AI services awaiting security classification
            </p>

            {/* List of Tools */}
            <div className="space-y-3">
              {/* Tool 1 */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center">
                    C
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">Cursor AI IDE</h5>
                    <p className="text-[10px] text-gray-400">Engineering • Code Generation</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {toolRequestStatus['cursor'] ? (
                    <span className={`text-[10px] font-bold uppercase ${
                      toolRequestStatus['cursor'] === 'Approved' ? 'text-[#10B981]' : 'text-rose-600'
                    }`}>
                      {toolRequestStatus['cursor']}
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToolDecision('cursor', 'Approved')}
                        className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#10B981] flex items-center justify-center transition-colors cursor-pointer border border-emerald-200/60"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToolDecision('cursor', 'Restricted')}
                        className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors cursor-pointer border border-rose-200/60"
                        title="Restrict"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tool 2 */}
              <div className="flex items-center justify-between py-1 border-t border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold flex items-center justify-center">
                    S
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">Claude 3.7 Sonnet</h5>
                    <p className="text-[10px] text-gray-400">Product • Web & API</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {toolRequestStatus['claude'] ? (
                    <span className={`text-[10px] font-bold uppercase ${
                      toolRequestStatus['claude'] === 'Approved' ? 'text-[#10B981]' : 'text-rose-600'
                    }`}>
                      {toolRequestStatus['claude']}
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToolDecision('claude', 'Approved')}
                        className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#10B981] flex items-center justify-center transition-colors cursor-pointer border border-emerald-200/60"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToolDecision('claude', 'Restricted')}
                        className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors cursor-pointer border border-rose-200/60"
                        title="Restrict"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tool 3 */}
              <div className="flex items-center justify-between py-1 border-t border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold flex items-center justify-center">
                    P
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">Perplexity Pro</h5>
                    <p className="text-[10px] text-gray-400">Research • Web Search</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {toolRequestStatus['perplexity'] ? (
                    <span className={`text-[10px] font-bold uppercase ${
                      toolRequestStatus['perplexity'] === 'Approved' ? 'text-[#10B981]' : 'text-rose-600'
                    }`}>
                      {toolRequestStatus['perplexity']}
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToolDecision('perplexity', 'Approved')}
                        className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#10B981] flex items-center justify-center transition-colors cursor-pointer border border-emerald-200/60"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToolDecision('perplexity', 'Restricted')}
                        className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition-colors cursor-pointer border border-rose-200/60"
                        title="Restrict"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3 (4 cols): Live Prompt Tester & Security Assistant */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80 flex flex-col items-center text-center justify-between">
          <div className="flex flex-col items-center w-full">
            {/* Pastel Sphere Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-100 via-teal-100 to-purple-100 border border-emerald-200/50 flex items-center justify-center shadow-xs">
              <Shield className="w-7 h-7 text-[#10B981]" />
            </div>

            <h4 className="text-sm font-bold text-gray-900 mt-3 leading-snug">
              PromptShield Guardrail
            </h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Test a prompt or code snippet for sensitive leakage
            </p>

            {/* Prompt Input Box */}
            <div className="w-full mt-4 relative">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-left focus-within:border-[#10B981] focus-within:ring-2 focus-within:ring-[#10B981]/20 transition-all">
                <textarea
                  rows={2}
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  placeholder="Paste confidential data, code or prompts to test..."
                  maxLength={500}
                  className="w-full bg-transparent text-xs text-gray-900 placeholder-gray-400 focus:outline-none resize-none font-mono"
                />
                <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                  <span className="text-[10px] text-gray-400 font-mono">
                    {quickPrompt.length}/500
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickScan}
                    className="px-3 py-1 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Scan Now</span>
                    <Send className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
