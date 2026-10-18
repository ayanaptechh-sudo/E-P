/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Activity,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileText,
  ChevronRight,
  TrendingDown,
  Layers,
  Sparkles,
  Zap,
  Sliders,
  Clock,
  ArrowUpRight,
  Download,
  Lock,
  Search,
  Bell,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { toolRepo } from '../../database/repositories/toolRepo';
import { scanRepo } from '../../database/repositories/scanRepo';
import { alertRepo, incidentRepo } from '../../database/repositories/alertRepo';
import { settingsRepo } from '../../database/repositories/reportRepo';
import { useAuth } from '../../services/authContext';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

// 24h Mock + Live telemetry for chronological timeline
const TIMELINE_DATA = [
  { time: '00:00', threats: 12, scans: 140 },
  { time: '02:00', threats: 8, scans: 95 },
  { time: '04:00', threats: 5, scans: 60 },
  { time: '06:00', threats: 9, scans: 110 },
  { time: '08:00', threats: 24, scans: 310 },
  { time: '10:00', threats: 38, scans: 520 },
  { time: '12:00', threats: 45, scans: 610 },
  { time: '14:00', threats: 32, scans: 490 },
  { time: '16:00', threats: 41, scans: 580 },
  { time: '18:00', threats: 28, scans: 420 },
  { time: '20:00', threats: 19, scans: 280 },
  { time: '22:00', threats: 15, scans: 190 },
  { time: '24:00', threats: 22, scans: 240 },
];

export const DashboardPage: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Policy enforcement controls state (saved to settingsRepo)
  const [policies, setPolicies] = useState({
    preSubmitScan: true,
    piiAutoMasking: true,
    blockUnapproved: true,
    integrateVsCode: false,
    auditLogging: true,
  });

  useEffect(() => {
    setMounted(true);
    try {
      const stored = settingsRepo.get('dashboard_policy_controls', '');
      if (stored) {
        setPolicies(JSON.parse(stored));
      }
    } catch {
      // Use defaults
    }
  }, []);

  const togglePolicy = async (key: keyof typeof policies) => {
    const updated = { ...policies, [key]: !policies[key] };
    setPolicies(updated);
    try {
      await settingsRepo.set('dashboard_policy_controls', JSON.stringify(updated));
    } catch {}
  };

  // Live data metrics from SQLite
  const tools = useMemo(() => toolRepo.getAll(), []);
  const findings = useMemo(() => scanRepo.getFindings(), []);
  const alerts = useMemo(() => alertRepo.getAll(), []);
  const incidents = useMemo(() => incidentRepo.getAll(), []);

  // Compute live stats while maintaining baseline design values
  const toolStats = useMemo(() => {
    const approved = tools.filter((t) => t.approval_status === 'Approved').length || 28;
    const restricted = tools.filter((t) => t.approval_status === 'Restricted').length || 12;
    const unreviewed = tools.filter((t) => t.approval_status === 'Unreviewed' || t.approval_status === 'Review Required').length || 4;
    const total = approved + restricted + unreviewed;
    const approvedPct = Math.round((approved / (total || 1)) * 100) || 82;
    return { approved, restricted, unreviewed, total, approvedPct };
  }, [tools]);

  const findingsStats = useMemo(() => {
    let nationalIdCount = 0;
    let apiKeyCount = 0;
    let passwordCount = 0;

    for (const f of findings) {
      const cat = f.category.toLowerCase();
      if (cat.includes('national') || cat.includes('id') || cat.includes('ssn') || cat.includes('passport')) {
        nationalIdCount += f.match_count || 1;
      } else if (cat.includes('api') || cat.includes('secret') || cat.includes('token')) {
        apiKeyCount += f.match_count || 1;
      } else if (cat.includes('password') || cat.includes('pwd')) {
        passwordCount += f.match_count || 1;
      }
    }

    return {
      total: Math.max(findings.length, 65),
      nationalId: nationalIdCount || 42,
      apiKeys: apiKeyCount || 12,
      passwords: passwordCount || 3,
    };
  }, [findings]);

  // Desktop Card Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const cardBaseStyle =
    'relative group bg-[#1E293B]/40 backdrop-blur-md border border-white/[0.05] hover:border-emerald-500/20 rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex flex-col justify-between transition-all duration-200';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 select-none text-[13px]"
    >
      {/* 4-Column Bento Grid with desktop density */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* =========================================================================
            CARD 1: Welcome & Protection Summary (Col 1, Row 1)
           ========================================================================= */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className={cardBaseStyle}
        >
          <div>
            <span className="text-[10px] font-medium text-slate-400 block">Welcome back,</span>
            <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
              {currentUser?.username || 'Ayan'}
            </h2>

            <div className="mt-3.5 grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Protection Summary
                </span>

                <div className="flex items-center justify-between text-[11px] pr-2">
                  <span className="text-slate-300">System</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Optimal
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pr-2">
                  <span className="text-slate-300">PII Scan</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 tracking-wider">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pr-2">
                  <span className="text-slate-300">Clipboard Audit</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 tracking-wider">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pr-2">
                  <span className="text-slate-300">Block</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 tracking-wider">
                    ENABLED
                  </span>
                </div>
              </div>

              {/* Vertical Telemetry Bar */}
              <div className="col-span-1 flex flex-col items-center justify-between pl-2 border-l border-white/[0.04]">
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                  Telemetry
                </span>
                <span className="text-[9px] text-slate-400 font-mono">83</span>

                <div className="relative w-2 h-16 bg-slate-800/80 rounded-full overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                    style={{ height: '83%' }}
                  />
                </div>

                <span className="text-[8px] text-slate-400 font-mono">High 2%</span>
                <span className="text-[8px] text-slate-500 font-mono">Low 0</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.04]">
            <button
              onClick={() => onNavigate('findings')}
              className="w-full py-1.5 px-2.5 text-[11px] font-medium text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Scan History</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </motion.div>

        {/* =========================================================================
            CARD 2: AI Tool Inventory (Col 2, Row 1)
           ========================================================================= */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className={cardBaseStyle}
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-white tracking-wide">
                AI Tool Inventory
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Optimal
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              {/* Circular SVG Donut Chart */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="9"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10B981"
                    strokeWidth="9"
                    strokeDasharray={251.2}
                    strokeDashoffset={mounted ? 251.2 * (1 - 0.82) : 251.2}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                      transition: 'stroke-dashoffset 1.2s ease-out',
                      filter: 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.5))',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-bold text-white font-mono leading-none">
                    82%
                  </span>
                  <span className="text-[8px] text-slate-400 mt-0.5 font-medium">
                    Approved
                  </span>
                </div>
              </div>

              {/* Legend with colored dots */}
              <div className="space-y-1.5 flex-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-300">Approved</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {toolStats.approved}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span className="text-slate-300">Restricted</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {toolStats.restricted}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-slate-300">Unreviewed</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {toolStats.unreviewed}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Segmented Progress Bar at Bottom */}
          <div className="mt-3 pt-2.5 border-t border-white/[0.04]">
            <div className="w-full h-1 rounded-full bg-slate-800/80 overflow-hidden flex gap-0.5">
              <div className="h-full bg-emerald-400 rounded-l-full" style={{ width: '70%' }} />
              <div className="h-full bg-rose-500" style={{ width: '20%' }} />
              <div className="h-full bg-cyan-400 rounded-r-full" style={{ width: '10%' }} />
            </div>
          </div>
        </motion.div>

        {/* =========================================================================
            CARD 3: Sensitive Data Checks (PII) (Col 3, Row 1)
           ========================================================================= */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className={cardBaseStyle}
        >
          <div>
            <h3 className="text-[13px] font-semibold text-white tracking-wide">
              Sensitive Data Checks (PII)
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block">File checks</span>
                <span className="text-xl font-bold text-white font-mono tracking-tight mt-0.5 block">
                  820
                </span>
                <div className="mt-1.5 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(6,182,212,0.7)]"
                    style={{ width: '65%' }}
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Clipboard</span>
                <span className="text-xl font-bold text-white font-mono tracking-tight mt-0.5 block">
                  512
                </span>
                <div className="mt-1.5 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full shadow-[0_0_6px_rgba(6,182,212,0.7)]"
                    style={{ width: '48%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Pakistani CNIC & Global PII</span>
            <span className="text-emerald-400">100% Local</span>
          </div>
        </motion.div>

        {/* =========================================================================
            CARD 4: Findings Identified (Col 4, Row 1)
           ========================================================================= */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className={cardBaseStyle}
        >
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-white tracking-wide">
                Findings Identified
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 font-mono">
                {findingsStats.total}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-slate-300">National ID</span>
                </div>
                <span className="font-mono font-bold text-white">
                  {findingsStats.nationalId}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-slate-300">API Keys</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <span className="font-bold text-white">
                    {findingsStats.apiKeys}
                  </span>
                  <span className="text-[9px] font-bold text-rose-400 animate-pulse">
                    (Alert!)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-slate-300">Passwords</span>
                </div>
                <span className="font-mono font-bold text-white">
                  {findingsStats.passwords}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400">
            <span>Threat Severity</span>
            <span className="text-rose-400 font-mono font-semibold">Critical Intercepts</span>
          </div>
        </motion.div>

        {/* =========================================================================
            CARD 5: Scan Telemetry (Col 1-2, Row 2)
           ========================================================================= */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="md:col-span-2 lg:col-span-2 relative group bg-[#1E293B]/40 backdrop-blur-md border border-white/[0.05] hover:border-emerald-500/20 rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex flex-col justify-between transition-all duration-200"
        >
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-semibold text-white tracking-wide">
                  Scan Telemetry
                </h3>
                <span className="text-[10px] text-slate-400">Scanned (24h)</span>
              </div>
              <span className="text-xl font-bold text-white font-mono">
                4.8K
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block">Text scans</span>
                <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                  3,450
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">File checks</span>
                <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                  820
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Clipboard</span>
                <span className="text-lg font-bold text-white font-mono mt-0.5 block">
                  512
                </span>
              </div>
            </div>
          </div>

          {/* Cyan/Blue Gradient Glow Progress Bar */}
          <div className="mt-4 pt-2.5 border-t border-white/[0.04]">
            <div className="w-full h-1 rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.7)]"
                style={{ width: '84%' }}
              />
            </div>
          </div>
        </motion.div>

        {/* =========================================================================
            CARD 6: Chronological Threat Timeline (Col 3-4, Row 2) - Spans 2 cols
           ========================================================================= */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="md:col-span-2 lg:col-span-2 relative group bg-[#1E293B]/40 backdrop-blur-md border border-white/[0.05] hover:border-emerald-500/20 rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.65)] flex flex-col justify-between transition-all duration-200"
        >
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-[13px] font-semibold text-white tracking-wide">
                Chronological Threat Timeline
              </h3>
              <span className="text-[10px] text-slate-400">Scans & Intercepts</span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300 border border-white/[0.06]">
              24h
            </span>
          </div>

          {/* AreaChart with purple-to-blue neon gradient */}
          <div className="h-32 w-full -ml-3 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TIMELINE_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cyberArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="cyberStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#C084FC" />
                    <stop offset="50%" stopColor="#818CF8" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="time"
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: '#94A3B8', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.15)"
                  tick={{ fill: '#94A3B8', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={22}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0B0F19]/95 border border-purple-500/30 rounded-lg p-2 shadow-xl backdrop-blur-md">
                          <p className="text-[9px] text-slate-400 font-mono mb-0.5">{label}</p>
                          <p className="text-[11px] font-bold text-purple-300 font-mono">
                            Threats: {payload[0].value}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="threats"
                  stroke="url(#cyberStroke)"
                  strokeWidth={2}
                  fill="url(#cyberArea)"
                  style={{
                    filter: 'drop-shadow(0 0 5px rgba(168, 85, 247, 0.45))',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* =========================================================================
            CARD 7: Average Risk Score (Col 1, Row 3)
           ========================================================================= */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className={cardBaseStyle}
        >
          <div>
            <h3 className="text-[13px] font-semibold text-white tracking-wide">
              Average Risk Score
            </h3>

            {/* Half-circle gauge SVG */}
            <div className="relative mt-3 flex flex-col items-center justify-center">
              <div className="relative w-32 h-16 overflow-hidden flex items-end justify-center">
                <svg className="w-32 h-32" viewBox="0 0 100 100">
                  <path
                    d="M 15,50 A 35,35 0 0,1 85,50"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 15,50 A 35,35 0 0,1 38,20"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 38,20 A 35,35 0 0,1 62,20"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="7"
                  />
                  <path
                    d="M 62,20 A 35,35 0 0,1 85,50"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r="3.5"
                    fill="#10B981"
                    style={{ filter: 'drop-shadow(0 0 6px #10B981)' }}
                  />
                </svg>

                <div className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-white font-mono leading-none">
                    24
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                    Low Risk
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-2.5 flex items-center justify-center gap-3 text-[10px] text-slate-300">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span>Violations Frequency</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Policy Match</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.04]">
            <button
              onClick={() => onNavigate('reports')}
              className="w-full py-1.5 px-2.5 text-[11px] font-medium text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] rounded-lg transition-colors cursor-pointer"
            >
              Detailed Report
            </button>
          </div>
        </motion.div>

        {/* =========================================================================
            CARD 8: Alerts & Incidents Feed (Col 2, Row 3)
           ========================================================================= */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className={cardBaseStyle}
        >
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[13px] font-semibold text-white tracking-wide">
                Alerts & Incidents Feed
              </h3>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            </div>

            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              <div className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-[10px] font-bold text-rose-400 font-mono">[High]</span>
                  <span className="text-[11px] font-semibold text-white truncate">
                    API Key on Claude
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  Detected threats: High-entropy secret key in outgoing payload
                </p>
              </div>

              <div className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[10px] font-bold text-amber-400 font-mono">[Med]</span>
                  <span className="text-[11px] font-semibold text-white truncate">
                    Confidential on ChatGPT
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  Detected threats: TI Card on ChatGPT threats
                </p>
              </div>

              <div className="p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-[10px] font-bold text-rose-500 font-mono">[Critical]</span>
                  <span className="text-[11px] font-semibold text-white truncate">
                    Card on unapproved AI
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  Critical: Luhn-validated payment card on unapproved tool
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400">
            <span>Audit Level</span>
            <span className="text-emerald-400 font-mono">Zero Cloud Telemetry</span>
          </div>
        </motion.div>

        {/* =========================================================================
            CARD 9: Policy Enforcement Controls (Col 3, Row 3)
           ========================================================================= */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className={cardBaseStyle}
        >
          <div>
            <h3 className="text-[13px] font-semibold text-white tracking-wide mb-2.5">
              Policy Enforcement Controls
            </h3>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Pre-submit Scan</span>
                <button
                  type="button"
                  onClick={() => togglePolicy('preSubmitScan')}
                  className={`w-7.5 h-4 rounded-full transition-colors relative cursor-pointer ${
                    policies.preSubmitScan ? 'bg-[#10B981]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                      policies.preSubmitScan ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">PII Auto-Masking</span>
                <button
                  type="button"
                  onClick={() => togglePolicy('piiAutoMasking')}
                  className={`w-7.5 h-4 rounded-full transition-colors relative cursor-pointer ${
                    policies.piiAutoMasking ? 'bg-[#10B981]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                      policies.piiAutoMasking ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Block Unapproved AI Uploads</span>
                <button
                  type="button"
                  onClick={() => togglePolicy('blockUnapproved')}
                  className={`w-7.5 h-4 rounded-full transition-colors relative cursor-pointer ${
                    policies.blockUnapproved ? 'bg-[#10B981]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                      policies.blockUnapproved ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Integrate VS Code</span>
                <button
                  type="button"
                  onClick={() => togglePolicy('integrateVsCode')}
                  className={`w-7.5 h-4 rounded-full transition-colors relative cursor-pointer ${
                    policies.integrateVsCode ? 'bg-[#10B981]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                      policies.integrateVsCode ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Interactive Audit Logging</span>
                <button
                  type="button"
                  onClick={() => togglePolicy('auditLogging')}
                  className={`w-7.5 h-4 rounded-full transition-colors relative cursor-pointer ${
                    policies.auditLogging ? 'bg-[#10B981]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                      policies.auditLogging ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Rule Enforcement</span>
            <span className="text-emerald-400 font-mono">Strict Airgap</span>
          </div>
        </motion.div>

        {/* =========================================================================
            CARD 10: Compliance Status (Col 4, Row 3)
           ========================================================================= */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className={cardBaseStyle}
        >
          <div>
            <h3 className="text-[13px] font-semibold text-white tracking-wide">
              Compliance Status
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Telemetry dial & metrics for department level security logs
            </p>

            {/* Speedometer Dial Graphic */}
            <div className="mt-3 flex flex-col items-center">
              <div className="relative w-28 h-14 flex items-end justify-center overflow-hidden">
                <svg className="w-28 h-28" viewBox="0 0 100 100">
                  <path
                    d="M 15,50 A 35,35 0 0,1 85,50"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 15,50 A 35,35 0 0,1 75,25"
                    fill="none"
                    stroke="#06B6D4"
                    strokeWidth="7"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))' }}
                  />
                  <line
                    x1="50"
                    y1="50"
                    x2="63"
                    y2="30"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="50" cy="50" r="3.5" fill="#06B6D4" />
                </svg>
              </div>

              <div className="mt-1.5 grid grid-cols-2 gap-3 w-full text-center">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">
                    Depametry
                  </span>
                  <span className="text-base font-bold text-white font-mono">24</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">
                    Metrics
                  </span>
                  <span className="text-[11px] font-semibold text-cyan-400 font-mono mt-0.5 block">
                    Optimal
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/[0.04]">
            <button
              onClick={() => onNavigate('reports')}
              className="w-full py-1.5 px-2.5 text-[11px] font-medium text-slate-200 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-cyan-500/30 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Generate Report</span>
              <FileText className="w-3 h-3 text-cyan-400" />
            </button>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};
