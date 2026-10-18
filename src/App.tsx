/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  LayoutDashboard,
  Cpu,
  Scan,
  FileSearch,
  Activity,
  Clock,
  Sliders,
  FileText,
  Settings,
  Search,
  Bell,
  Minus,
  Square,
  X,
  ClipboardCheck,
  User,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { AuthProvider, useAuth } from './services/authContext';
import { PageId } from './services/authService';
import { SetupPage, LoginPage } from './ui/pages/AuthPages';
import { DashboardPage } from './ui/pages/DashboardPage';
import { InventoryPage } from './ui/pages/InventoryPage';
import { ScanTextPage, ScanClipboardPage } from './ui/pages/ScanPages';
import { FindingsPage, AlertsPage, RiskAnalysisPage } from './ui/pages/RiskAndAlertPages';
import { IncidentsPage } from './ui/pages/IncidentsPage';
import { PolicyPage, ReportsPage } from './ui/pages/PolicyAndReportPages';
import { UsersPage, SettingsPage } from './ui/pages/UsersAndSettingsPages';

interface NavItem {
  id: PageId;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (active) => (
      <LayoutDashboard
        className={`w-3.5 h-3.5 transition-colors ${
          active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-slate-400'
        }`}
      />
    ),
  },
  {
    id: 'inventory',
    label: 'AI Inventory',
    icon: (active) => (
      <Cpu
        className={`w-3.5 h-3.5 transition-colors ${
          active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-slate-400'
        }`}
      />
    ),
  },
  {
    id: 'scan-text',
    label: 'Local Scanner',
    icon: (active) => (
      <Scan
        className={`w-3.5 h-3.5 transition-colors ${
          active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-slate-400'
        }`}
      />
    ),
  },
  {
    id: 'findings',
    label: 'Findings & Logs',
    icon: (active) => (
      <FileSearch
        className={`w-3.5 h-3.5 transition-colors ${
          active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-slate-400'
        }`}
      />
    ),
  },
  {
    id: 'risk',
    label: 'Risk Analysis',
    icon: (active) => (
      <Activity
        className={`w-3.5 h-3.5 transition-colors ${
          active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-slate-400'
        }`}
      />
    ),
  },
  {
    id: 'incidents',
    label: 'Incident Timeline',
    icon: (active) => (
      <Clock
        className={`w-3.5 h-3.5 transition-colors ${
          active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-slate-400'
        }`}
      />
    ),
  },
  {
    id: 'policies',
    label: 'Policies & Rules',
    icon: (active) => (
      <Sliders
        className={`w-3.5 h-3.5 transition-colors ${
          active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-slate-400'
        }`}
      />
    ),
  },
  {
    id: 'reports',
    label: 'Compliance Reports',
    icon: (active) => (
      <FileText
        className={`w-3.5 h-3.5 transition-colors ${
          active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-slate-400'
        }`}
      />
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (active) => (
      <Settings
        className={`w-3.5 h-3.5 transition-colors ${
          active ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'text-slate-400'
        }`}
      />
    ),
  },
];

function MainLayout() {
  const { currentUser, isLoading, dbError, isFirstRun, logout, hasAccess, retryInit } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [forceModeActive, setForceModeActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (!hasAccess(currentPage)) {
        if (currentUser.role === 'End User') {
          setCurrentPage('scan-text');
        } else if (currentUser.role === 'Manager') {
          setCurrentPage('dashboard');
        } else if (currentUser.role === 'Auditor') {
          setCurrentPage('incidents');
        } else {
          setCurrentPage('dashboard');
        }
      }
    }
  }, [currentUser, currentPage, hasAccess]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center text-slate-300 font-sans p-4">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
          <Shield className="w-4 h-4 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <h2 className="text-xs font-semibold text-white tracking-wide mt-3">
          Loading Security Core...
        </h2>
        <p className="text-[11px] text-slate-500 mt-1 font-mono">
          Initializing local WebAssembly SQLite DLP engine
        </p>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
        <div className="bg-[#151D30] border border-rose-800/80 rounded-xl p-6 max-w-md w-full text-center shadow-2xl">
          <div className="w-10 h-10 rounded-lg bg-rose-950/80 text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-800/80">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-white mb-1.5">Security Engine Offline</h2>
          <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-lg text-xs text-rose-300 mb-4 font-mono text-left break-words">
            {dbError}
          </div>
          <button
            onClick={() => retryInit()}
            className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Retry Local Database
          </button>
        </div>
      </div>
    );
  }

  if (isFirstRun) {
    return <SetupPage />;
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const accessibleNavItems = NAV_ITEMS.filter((item) => hasAccess(item.id));

  return (
    <div className="h-screen flex flex-col bg-[#09090B] font-sans text-slate-100 antialiased overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* =========================================================================
          1. FAKE NATIVE OS TITLE BAR (32px Height, Draggable feel, Top Controls)
         ========================================================================= */}
      <div className="h-8 bg-[#070709] border-b border-white/[0.05] flex items-center justify-between px-3 select-none text-[11px] text-slate-400 shrink-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-200 tracking-wide text-[11px]">
            PromptShield
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400 font-mono text-[10px]">
            ShadowAI Leak Guard v2.4
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>AIRGAP DAEMON ACTIVE</span>
          </div>

          {/* Desktop Window Controls */}
          <div className="flex items-center -mr-1">
            <button
              type="button"
              className="h-7 w-8 flex items-center justify-center hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-7 w-8 flex items-center justify-center hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              className="h-7 w-8 flex items-center justify-center hover:bg-rose-600 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN APPLICATION WINDOW FRAME
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* =========================================================================
            2. NARROWER SIDEBAR (~230px, Desktop Density)
           ========================================================================= */}
        <aside className="w-[230px] bg-[#0E131F]/95 border-r border-white/[0.05] flex flex-col shrink-0 select-none backdrop-blur-xl z-30">
          {/* Brand Header */}
          <div className="h-14 px-4 flex items-center gap-2.5 border-b border-white/[0.04]">
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="flex flex-col">
              <span className="font-extrabold text-xs text-white tracking-wider leading-none">
                PROMPT SHIELD
              </span>
              <span className="text-[8px] text-emerald-400 font-mono tracking-[0.18em] mt-1 font-semibold">
                SHADOWAI LEAK GUARD
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
            {accessibleNavItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'border-l-2 border-[#10B981] bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent text-emerald-400 font-semibold shadow-[inset_1px_0_8px_rgba(16,185,129,0.12)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {item.icon(isActive)}
                  <span className="tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Help Widget & Interactive Scan Clipboard Button */}
          <div className="p-3 border-t border-white/[0.04] bg-[#09090B]/40">
            <div className="bg-[#182234]/50 border border-white/[0.05] rounded-xl p-3 mb-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-semibold text-white">Need help?</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-[10px] text-slate-400 leading-snug mb-2.5">
                Leak policies active
              </p>

              <button
                onClick={() => setCurrentPage('scan-clipboard')}
                className="w-full py-2 px-2.5 rounded-lg bg-[#00E676] hover:bg-[#00c864] text-[#0B0F19] text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,230,118,0.35)] animate-breathe-glow"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-[#0B0F19]" />
                <span>Interactive Scan Clipboard</span>
              </button>
            </div>

            {/* User Signout Row */}
            <div className="flex items-center justify-between px-1 pt-1 text-slate-500">
              <span className="text-[9px] font-mono truncate max-w-[130px]">
                {currentUser.username} ({currentUser.role})
              </span>
              <button
                onClick={() => logout()}
                title="Sign Out"
                className="hover:text-rose-400 transition-colors p-0.5"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            3. MAIN CONTENT WORKSPACE (Rich Deep #09090B Background, Compact Header)
           ========================================================================= */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#09090B]">
          {/* Compact Desktop Header (52px Height) */}
          <header className="h-[52px] px-6 border-b border-white/[0.04] bg-[#0E131F]/60 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20">
            {/* Header Title Section */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block leading-tight">
                Security Dashboard
              </span>
              <h1 className="text-base font-bold text-white tracking-tight capitalize leading-tight">
                {currentPage === 'dashboard' ? 'Dashboard' : currentPage.replace('-', ' ')}
              </h1>
            </div>

            {/* Header Controls on Right */}
            <div className="flex items-center gap-3">
              {/* Force Mode Pre-emptive Redaction Toggle */}
              <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px]">
                <span className="text-slate-300 font-medium">Force Mode: Pre-emptive Redaction</span>
                <button
                  type="button"
                  onClick={() => setForceModeActive(!forceModeActive)}
                  className={`w-7 h-3.5 rounded-full transition-colors relative cursor-pointer ${
                    forceModeActive ? 'bg-[#10B981]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                      forceModeActive ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="text-slate-400 text-[10px] pl-0.5">
                  Shield Status: <span className="text-emerald-400 font-semibold font-mono">ACTIVE</span>
                </span>
              </div>

              {/* Glowing ACTIVE Status Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span>ACTIVE</span>
              </div>

              {/* Search Input Bar */}
              <div className="relative hidden sm:block w-40">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1 text-[11px] bg-white/[0.03] border border-white/[0.05] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/40 transition-colors"
                />
              </div>

              {/* User Profile Avatar with Notification Bell */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-white/[0.05]">
                <div className="relative cursor-pointer hover:text-white text-slate-400 transition-colors p-0.5">
                  <Bell className="w-3.5 h-3.5" />
                  <span className="absolute 0 top-0 right-0 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                    {currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : 'AY'}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-[11px] font-bold text-white leading-none">
                      {currentUser.username || 'Ayan'}
                    </span>
                    <span className="text-[9px] text-slate-400 leading-none mt-0.5">
                      ({currentUser.role || 'Admin'})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Dynamic Page Render with Tighter Desktop Spacing */}
          <main className="p-5 max-w-[1550px] w-full mx-auto">
            {currentPage === 'dashboard' && <DashboardPage onNavigate={(p) => setCurrentPage(p as PageId)} />}
            {currentPage === 'inventory' && <InventoryPage />}
            {currentPage === 'scan-text' && <ScanTextPage />}
            {currentPage === 'scan-clipboard' && <ScanClipboardPage />}
            {currentPage === 'findings' && <FindingsPage onNavigateToIncidents={() => setCurrentPage('incidents')} />}
            {currentPage === 'risk' && <RiskAnalysisPage />}
            {currentPage === 'incidents' && <IncidentsPage />}
            {currentPage === 'policies' && <PolicyPage />}
            {currentPage === 'reports' && <ReportsPage />}
            {currentPage === 'settings' && <SettingsPage />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
