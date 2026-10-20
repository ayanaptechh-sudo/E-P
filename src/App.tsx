/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Minus,
  Square,
  X,
  ClipboardCheck,
  LogOut,
  Users,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { AuthProvider, useAuth } from './services/authContext';
import { ThemeProvider } from './services/themeContext';
import { ThemeToggle } from './ui/components/ThemeToggle';
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
  category: 'Workspace' | 'Security & Risk' | 'Governance';
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    category: 'Workspace',
    icon: (active) => (
      <LayoutDashboard
        className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500'}`}
      />
    ),
  },
  {
    id: 'inventory',
    label: 'AI Inventory',
    category: 'Workspace',
    icon: (active) => (
      <Cpu
        className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500'}`}
      />
    ),
  },
  {
    id: 'scan-text',
    label: 'Local Scanner',
    category: 'Workspace',
    icon: (active) => (
      <Scan
        className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500'}`}
      />
    ),
  },
  {
    id: 'scan-clipboard',
    label: 'Clipboard Guard',
    category: 'Workspace',
    icon: (active) => (
      <ClipboardCheck
        className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500'}`}
      />
    ),
  },
  {
    id: 'findings',
    label: 'Findings Ledger',
    category: 'Security & Risk',
    icon: (active) => (
      <FileSearch
        className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500'}`}
      />
    ),
  },
  {
    id: 'risk',
    label: 'Risk Analysis',
    category: 'Security & Risk',
    icon: (active) => (
      <Activity
        className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500'}`}
      />
    ),
  },
  {
    id: 'incidents',
    label: 'Incident Timeline',
    category: 'Security & Risk',
    icon: (active) => (
      <Clock
        className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500'}`}
      />
    ),
  },
  {
    id: 'policies',
    label: 'Policy Engine',
    category: 'Governance',
    icon: (active) => (
      <Sliders
        className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500'}`}
      />
    ),
  },
  {
    id: 'reports',
    label: 'Compliance Reports',
    category: 'Governance',
    icon: (active) => (
      <FileText
        className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500'}`}
      />
    ),
  },
  {
    id: 'settings',
    label: 'Settings & Audit',
    category: 'Governance',
    icon: (active) => (
      <Settings
        className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-slate-500'}`}
      />
    ),
  },
];

function MainLayout() {
  const { currentUser, isLoading, dbError, isFirstRun, logout, hasAccess, retryInit } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isMaximized, setIsMaximized] = useState(false);

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
      <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-700 dark:text-slate-200 font-sans p-4 select-none">
        <div className="w-8 h-8 border-2 border-slate-200 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin mb-3" />
        <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
          Starting PromptShield Core
        </h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
          Loading WebAssembly SQLite engine
        </p>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-800 dark:text-slate-200 font-sans">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 max-w-sm w-full shadow-xs text-center">
          <div className="w-9 h-9 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-200 dark:border-rose-900">
            <Shield className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">DLP Engine Offline</h2>
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-xs text-slate-700 dark:text-slate-300 mb-3.5 font-mono text-left break-words">
            {dbError}
          </div>
          <button
            onClick={() => retryInit()}
            className="w-full py-2 px-3 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-colors cursor-pointer"
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
  const categories: Array<'Workspace' | 'Security & Risk' | 'Governance'> = [
    'Workspace',
    'Security & Risk',
    'Governance',
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-100/70 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased overflow-hidden select-none">
      {/* =========================================================================
          1. DESKTOP WINDOW TITLEBAR (Native Raycast / Linear style)
         ========================================================================= */}
      <header className="h-9 bg-slate-100 dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between px-3 shrink-0 z-50">
        {/* Left: Window identity & breadcrumb */}
        <div className="flex items-center gap-2">
          {/* macOS-style window controls or subtle badge */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400/40 dark:border-slate-600/40 inline-block" />
            <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400/40 dark:border-slate-600/40 inline-block" />
            <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400/40 dark:border-slate-600/40 inline-block" />
          </div>

          <div className="h-3.5 w-px bg-slate-250 dark:bg-slate-700 mr-1 hidden sm:block" />

          <div className="flex items-center gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight">PromptShield</span>
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">/</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px] truncate max-w-[160px]">
              {NAV_ITEMS.find((n) => n.id === currentPage)?.label || 'Desktop'}
            </span>
          </div>
        </div>

        {/* Center: Window search trigger / command trigger */}
        <div className="hidden md:flex items-center">
          <div className="px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-2xs">
            <Search className="w-3 h-3 text-slate-400" />
            <span>Search policies, tools, rules...</span>
            <kbd className="font-mono text-[9px] bg-slate-100 dark:bg-slate-700 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Airgap Daemon status + Theme Toggle + Window Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tracking-tight">
              LOCAL AIRGAP · SQLite WASM
            </span>
          </div>

          {/* Theme Toggle Button (Light/Dark Mode) */}
          <div className="flex items-center border-l border-slate-200 dark:border-slate-700/80 pl-2">
            <ThemeToggle />
          </div>

          {/* Desktop Window Controls */}
          <div className="flex items-center -mr-1 text-slate-500 dark:text-slate-400">
            <button
              type="button"
              className="h-6 w-7 flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="h-6 w-7 flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              className="h-6 w-7 flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN APPLICATION WINDOW FRAME
         ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* =========================================================================
            2. DESKTOP NATIVE SIDEBAR (Linear/Raycast style, subtle Slate-50)
           ========================================================================= */}
        <aside className="w-[216px] bg-slate-50/90 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 select-none z-30">
          {/* Workspace Switcher / App Badge */}
          <div className="h-12 px-3 flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 tracking-tight truncate leading-tight">
                  PromptShield
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-tight leading-none">
                  v2.4.0 · Local DLP
                </span>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500" title="Shield Daemon Online" />
          </div>

          {/* Grouped Desktop Navigation */}
          <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
            {categories.map((cat) => {
              const groupItems = accessibleNavItems.filter((i) => i.category === cat);
              if (groupItems.length === 0) return null;

              return (
                <div key={cat} className="space-y-0.5">
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                    {cat}
                  </div>
                  {groupItems.map((item) => {
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentPage(item.id)}
                        className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer group ${
                          isActive
                            ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/40 dark:hover:bg-slate-800/60 font-medium'
                        }`}
                      >
                        {item.icon(isActive)}
                        <span className="truncate tracking-tight">{item.label}</span>
                        {isActive && (
                          <span className="ml-auto w-1 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Sidebar Bottom: Quick Daemon Action & Current User */}
          <div className="p-2 border-t border-slate-200/80 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/60 space-y-2">
            <button
              type="button"
              onClick={() => setCurrentPage('scan-clipboard')}
              className="w-full py-1.5 px-2.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 text-xs font-medium flex items-center justify-between shadow-2xs transition-colors cursor-pointer group"
            >
              <span className="flex items-center gap-2">
                <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11px] font-medium">Audit Clipboard</span>
              </span>
              <kbd className="text-[9px] font-mono text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                ⌥C
              </kbd>
            </button>

            {/* User Profile Bar */}
            <div className="flex items-center justify-between px-1.5 py-1 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 border border-indigo-200 dark:border-indigo-800">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate leading-none">
                    {currentUser.username}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                    {currentUser.role}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => logout()}
                title="Sign Out"
                className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* =========================================================================
            3. MAIN CONTENT WORKSPACE (Linear / Raycast High Density)
           ========================================================================= */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white dark:bg-slate-950">
          <main className="p-5 md:p-6 max-w-[1400px] w-full mx-auto select-text">
            {currentPage === 'dashboard' && (
              <DashboardPage onNavigate={(p) => setCurrentPage(p as PageId)} />
            )}
            {currentPage === 'inventory' && <InventoryPage />}
            {currentPage === 'scan-text' && <ScanTextPage />}
            {currentPage === 'scan-clipboard' && <ScanClipboardPage />}
            {currentPage === 'findings' && (
              <FindingsPage onNavigateToIncidents={() => setCurrentPage('incidents')} />
            )}
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
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}
