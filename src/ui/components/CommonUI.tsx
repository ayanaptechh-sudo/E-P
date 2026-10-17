/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SeverityLevel, RiskLevel, ToolApprovalStatus } from '../../database/types';

export const RiskBadge: React.FC<{
  level: SeverityLevel | RiskLevel | 'None' | string;
  size?: 'sm' | 'md';
}> = ({ level, size = 'sm' }) => {
  const norm = level.toLowerCase();
  let colorStyles = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  if (norm === 'low' || norm === 'approved') {
    colorStyles = 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50';
  } else if (norm === 'medium' || norm === 'review required') {
    colorStyles = 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50';
  } else if (norm === 'high' || norm === 'unreviewed') {
    colorStyles = 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50';
  } else if (norm === 'critical' || norm === 'restricted') {
    colorStyles = 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center font-medium rounded ${px} ${colorStyles}`}>
      {level}
    </span>
  );
};

export const PrivacyBanner: React.FC = () => {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 dark:bg-blue-950/30 dark:border-blue-800/60 dark:text-blue-300 mb-6">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="font-semibold">Local Privacy Guarantee:</span>
        <span>Scanning is 100% local in-browser. Your text is never stored, logged, or transmitted anywhere.</span>
      </div>
      <span className="hidden sm:inline-block text-[11px] font-mono text-blue-700 dark:text-blue-400">
        CLIENT-SIDE ISOLATED
      </span>
    </div>
  );
};

export const SummaryCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}> = ({ title, value, subtitle, icon, trend, trendPositive }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
        <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
        {icon && <div className="text-slate-400 dark:text-slate-500">{icon}</div>}
      </div>
      <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
        {value}
      </div>
      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trendPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
