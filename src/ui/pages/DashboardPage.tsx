import React from 'react';
import { Shield, Activity, AlertTriangle, CheckCircle2, Lock, Bell, Search } from 'lucide-react';

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps = {}) {
  return (
    // Main Background - Deep Obsidian
    <div className="min-h-screen bg-[#0B0F19] text-white p-6 md:p-8 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-1">Security Dashboard</h2>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
        </div>
        
        {/* Top Right Controls */}
        <div className="flex items-center gap-4">
          {/* Status Pill */}
          <div className="flex items-center gap-3 bg-[#1E293B]/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
            <span className="text-sm font-medium text-gray-400">Shield Status:</span>
            <div className="flex items-center gap-2 bg-[#10B981]/10 px-3 py-1 rounded-full border border-[#10B981]/20">
              <div className="w-2.5 h-2.5 bg-[#10B981] rounded-full animate-pulse shadow-[0_0_10px_#10B981]"></div>
              <span className="text-xs font-bold text-[#10B981] tracking-wide">ACTIVE</span>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"/>
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-[#1E293B]/60 backdrop-blur-md border border-white/10 text-white text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-[#10B981]/50 transition-colors w-48"
            />
          </div>

          {/* Profile & Notifications */}
          <button className="relative p-2 bg-[#1E293B]/60 border border-white/10 rounded-full hover:bg-white/10 transition">
            <Bell className="w-5 h-5 text-gray-300"/>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0B0F19]"></span>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold border-2 border-white/10 shadow-lg">
            A
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Welcome & Protection Summary */}
        <div className="col-span-1 lg:col-span-1 p-6 rounded-3xl bg-[#1E293B]/40 backdrop-blur-xl border border-white/5 shadow-2xl hover:-translate-y-1 transition-transform duration-300">
          <p className="text-gray-400 text-sm mb-1">Welcome back,</p>
          <h2 className="text-2xl font-bold text-white mb-6">Ayan</h2>
          
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Protection Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm flex items-center gap-2"><Lock className="w-4 h-4 text-gray-500"/> System</span>
              <span className="text-[#10B981] text-xs font-bold px-2 py-1 bg-[#10B981]/10 rounded-md border border-[#10B981]/20">Optimal</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm flex items-center gap-2"><Search className="w-4 h-4 text-gray-500"/> PII Scan</span>
              <span className="text-[#10B981] text-xs font-bold px-2 py-1 bg-[#10B981]/10 rounded-md border border-[#10B981]/20">ACTIVE</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm flex items-center gap-2"><Shield className="w-4 h-4 text-gray-500"/> Block</span>
              <span className="text-cyan-400 text-xs font-bold px-2 py-1 bg-cyan-400/10 rounded-md border border-cyan-400/20">ENABLED</span>
            </div>
          </div>
        </div>

        {/* AI Tool Inventory */}
        <div className="col-span-1 lg:col-span-1 p-6 rounded-3xl bg-[#1E293B]/40 backdrop-blur-xl border border-white/5 shadow-2xl hover:-translate-y-1 transition-transform duration-300 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-semibold">AI Tool Inventory</h3>
            <span className="flex items-center gap-1 text-[#10B981] text-xs bg-[#10B981]/10 px-2 py-1 rounded-md border border-[#10B981]/20"><CheckCircle2 className="w-3 h-3"/> Optimal</span>
          </div>
          
          <div className="flex items-center justify-between flex-1">
            {/* Fake Donut Chart UI */}
            <div className="relative w-24 h-24 rounded-full border-8 border-[#1E293B] flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-[#10B981]" strokeDasharray="180" strokeDashoffset="40" />
              </svg>
              <div className="text-center z-10">
                <span className="text-xl font-bold text-white block">82%</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  <span className="text-gray-300 text-sm">Approved</span>
                </div>
                <span className="text-white font-bold">28</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-gray-300 text-sm">Restricted</span>
                </div>
                <span className="text-white font-bold">12</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                  <span className="text-gray-300 text-sm">Unreviewed</span>
                </div>
                <span className="text-white font-bold">4</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sensitive Data Checks (PII) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 p-6 rounded-3xl bg-[#1E293B]/40 backdrop-blur-xl border border-white/5 shadow-2xl hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            Sensitive Data Checks (PII)
          </h3>
          <div className="flex justify-around items-end h-full pb-2 pt-6">
            <div className="w-full">
              <p className="text-gray-400 text-sm mb-1">File checks</p>
              <h4 className="text-4xl font-bold text-white mb-3">820</h4>
              <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full w-[80%] shadow-[0_0_10px_#06b6d4]"></div>
              </div>
            </div>
            <div className="w-px h-16 bg-white/10 mx-8"></div>
            <div className="w-full">
              <p className="text-gray-400 text-sm mb-1">Clipboard</p>
              <h4 className="text-4xl font-bold text-white mb-3">512</h4>
              <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#10B981] h-full w-[60%] shadow-[0_0_10px_#10B981]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Findings Identified */}
        <div className="col-span-1 lg:col-span-1 p-6 rounded-3xl bg-[#1E293B]/40 backdrop-blur-xl border border-white/5 shadow-2xl hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-semibold">Findings Identified</h3>
            <span className="bg-red-500/20 border border-red-500/30 text-red-400 px-2 py-1 rounded-md text-xs font-bold">65</span>
          </div>
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]"></div>
                <span className="text-gray-300 text-sm">National ID</span>
              </div>
              <span className="text-white font-bold">42</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_#f59e0b]"></div>
                <span className="text-gray-300 text-sm">API Keys</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Alert!</span>
                <span className="text-white font-bold">12</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]"></div>
                <span className="text-gray-300 text-sm">Passwords</span>
              </div>
              <span className="text-white font-bold">3</span>
            </div>
          </div>
        </div>

        {/* Threat Timeline Placeholder */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 p-6 rounded-3xl bg-[#1E293B]/40 backdrop-blur-xl border border-white/5 shadow-2xl hover:-translate-y-1 transition-transform duration-300 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-semibold">Chronological Threat Timeline</h3>
            <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded text-gray-400">24h</span>
          </div>
          <p className="text-gray-500 text-xs mb-4">Scans & Intercepts</p>
          <div className="flex-1 flex items-end justify-center pb-4 pt-8 border-b border-l border-white/10 relative">
             {/* Fake Neon Line Graph Simulation */}
             <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-24 stroke-cyan-400 fill-cyan-400/20 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                <path d="M0,30 L0,20 Q5,15 10,25 T20,10 T30,22 T40,5 T50,18 T60,8 T70,25 T80,12 T90,28 T100,15 L100,30 Z" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
          </div>
        </div>

      </div>
    </div>
  );
}

export default DashboardPage;
