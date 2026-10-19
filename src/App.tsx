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
        className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
      />
    ),
  },
  {
    id: 'inventory',
    label: 'AI Inventory',
    icon: (active) => (
      <Cpu
        className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
      />
    ),
  },
  {
    id: 'scan-text',
    label: 'Local Scanner',
    icon: (active) => (
      <Scan
        className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
      />
    ),
  },
  {
    id: 'findings',
    label: 'Findings & Logs',
    icon: (active) => (
      <FileSearch
        className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
      />
    ),
  },
  {
    id: 'risk',
    label: 'Risk Analysis',
    icon: (active) => (
      <Activity
        className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
      />
    ),
  },
  {
    id: 'incidents',
    label: 'Incident Timeline',
    icon: (active) => (
      <Clock
        className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
      />
    ),
  },
  {
    id: 'policies',
    label: 'Policies & Rules',
    icon: (active) => (
      <Sliders
        className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
      />
    ),
  },
  {
    id: 'reports',
    label: 'Compliance Reports',
    icon: (active) => (
      <FileText
        className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
      />
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (active) => (
      <Settings
        className={`w-4 h-4 transition-colors ${active ? 'text-white' : 'text-gray-400'}`}
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
    // Modern SaaS light theme default
    document.documentElement.classList.remove('dark');
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-700 font-sans p-4">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-purple-200 border-t-[#5B4DFB] rounded-full animate-spin" />
          <Shield className="w-4 h-4 text-[#5B4DFB] absolute inset-0 m-auto animate-pulse" />
        </div>
        <h2 className="text-xs font-semibold text-gray-900 tracking-wide mt-3">
          Loading Security Core...
        </h2>
        <p className="text-[11px] text-gray-400 mt-1 font-mono">
          Initializing local WebAssembly SQLite DLP engine
        </p>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-gray-800 font-sans">
        <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-md w-full text-center shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3 border border-rose-200">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-gray-900 mb-1.5">Security Engine Offline</h2>
          <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg text-xs text-rose-700 mb-4 font-mono text-left break-words">
            {dbError}
          </div>
          <button
            onClick={() => retryInit()}
            className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#5B4DFB] hover:bg-[#4E3EF0] rounded-xl shadow-xs transition-colors cursor-pointer"
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
    <div className="h-screen flex flex-col bg-[#F9FAFB] font-sans text-gray-900 antialiased overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* =========================================================================
          1. WINDOW TITLE BAR (Clean Light Desktop Feel)
         ========================================================================= */}
      <div className="h-8 bg-white border-b border-gray-150 flex items-center justify-between px-3 select-none text-[11px] text-gray-500 shrink-0 z-50">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-[#10B981]" />
          <span className="font-bold text-gray-800 tracking-tight text-[11px]">
            PromptShield
          </span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-400 font-mono text-[10px]">
            ShadowAI Leak Guard v2.4
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-[#10B981] font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-[#10B981]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span>AIRGAP DAEMON ACTIVE</span>
          </div>

          {/* Desktop Window Controls */}
          <div className="flex items-center -mr-1 text-gray-400">
            <button
              type="button"
              className="h-7 w-8 flex items-center justify-center hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-7 w-8 flex items-center justify-center hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              className="h-7 w-8 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
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
            2. MODERN CORPORATE SAAS SIDEBAR (Clean Pure White, Pill Active State)
           ========================================================================= */}
        <aside className="w-[230px] bg-white border-r border-gray-150 flex flex-col shrink-0 select-none z-30">
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center gap-2.5 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-4 h-4 text-[#10B981]" />
            </div>

            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-gray-900 tracking-tight leading-none">
                Mesh<span className="text-[#10B981]">DLP</span>
              </span>
              <span className="text-[9px] text-gray-400 font-medium tracking-wider mt-0.5">
                PROMPTSHIELD GUARD
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {accessibleNavItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-gray-950 text-white font-medium shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 font-medium'
                  }`}
                >
                  {item.icon(isActive)}
                  <span className="tracking-tight">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Help Widget & Interactive Scan Clipboard Button */}
          <div className="p-3 border-t border-gray-100 bg-gray-50/50">
            <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 mb-2 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-900">Need help?</span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              </div>
              <p className="text-[11px] text-gray-400 leading-snug mb-3">
                Leak policies active & running locally.
              </p>

              <button
                onClick={() => setCurrentPage('scan-clipboard')}
                className="w-full py-2 px-3 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-white" />
                <span>Scan Clipboard</span>
              </button>
            </div>

            {/* User Signout Row */}
            <div className="flex items-center justify-between px-2 pt-1 text-gray-400">
              <span className="text-[10px] font-medium truncate max-w-[130px] text-gray-600">
                {currentUser.username} ({currentUser.role})
              </span>
              <button
                onClick={() => logout()}
                title="Sign Out"
                className="hover:text-rose-600 transition-colors p-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            3. MAIN CONTENT WORKSPACE (Modern SaaS Light Theme)
           ========================================================================= */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F9FAFB]">
          {/* Dynamic Page Render */}
          <main className="p-6 md:p-8 max-w-[1600px] w-full mx-auto">
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
