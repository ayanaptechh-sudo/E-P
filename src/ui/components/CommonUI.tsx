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
  let colorStyles = 'bg-gray-100 text-gray-700 border border-gray-200';

  if (norm === 'low' || norm === 'approved') {
    colorStyles = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
  } else if (norm === 'medium' || norm === 'review required') {
    colorStyles = 'bg-amber-50 text-amber-800 border border-amber-200';
  } else if (norm === 'high' || norm === 'unreviewed') {
    colorStyles = 'bg-orange-50 text-orange-800 border border-orange-200';
  } else if (norm === 'critical' || norm === 'restricted') {
    colorStyles = 'bg-rose-50 text-rose-800 border border-rose-200';
  }

  const px = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs font-bold';

  return (
    <span className={`inline-flex items-center font-bold rounded-full ${px} ${colorStyles}`}>
      {level}
    </span>
  );
};

export const PrivacyBanner: React.FC = () => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-xs text-blue-900 shadow-2xs mb-6">
      <div className="flex items-center gap-2.5">
        <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="font-bold">Local Privacy Guarantee:</span>
        <span className="text-blue-800">Scanning is 100% local in-browser via SQLite WebAssembly. Your payload is never transmitted or logged externally.</span>
      </div>
      <span className="hidden sm:inline-block text-[10px] font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200">
        CLIENT-SIDE AIRGAPPED
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
    <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs transition-colors hover:border-gray-300">
      <div className="flex items-center justify-between text-gray-500 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">{title}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="text-3xl font-extrabold font-mono tracking-tight text-gray-900 tabular-nums">
        {value}
      </div>
      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center justify-between text-xs text-gray-500 font-medium">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span
              className={`font-bold inline-flex items-center gap-1 ${
                trendPositive ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded' : 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded'
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
