/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../services/authContext';
import { userRepo, auditRepo } from '../../database/repositories/userRepo';
import { settingsRepo } from '../../database/repositories/reportRepo';
import { AppUser, UserRole, UserStatus, AuditLog } from '../../database/types';
import { DataTable, Column, Modal } from '../components/DataTable';
import { generateSalt, hashPassword } from '../../security/crypto';
import { exportDatabase, importDatabase } from '../../database/db';
import { retentionService, RetentionRunResult } from '../../core/retentionService';

export const UsersPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>(() => userRepo.getAll());
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('End User');
  const [department, setDepartment] = useState('Engineering');
  const [status, setStatus] = useState<UserStatus>('Active');
  const [formError, setFormError] = useState<string | null>(null);

  const reload = () => {
    setUsers(userRepo.getAll());
    setRefreshKey(k => k + 1);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!username.trim() || password.length < 8) {
      setFormError('Username is required and password must be at least 8 characters.');
      return;
    }

    try {
      const salt = generateSalt();
      const password_hash = await hashPassword(password, salt);
      const created = await userRepo.create({
        username: username.trim(),
        password_hash,
        salt,
        role,
        department,
        status,
      });

      await auditRepo.log({
        user_id: currentUser?.user_id || 'system',
        action: 'USER_CREATED',
        target_type: 'user',
        target_id: created.user_id,
        outcome: 'Success',
        details: `Created user account "${created.username}" with role [${created.role}] in department [${created.department}].`,
      });

      setIsCreateModalOpen(false);
      setUsername('');
      setPassword('');
      reload();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !currentUser) return;

    await userRepo.updateRoleAndStatus(selectedUser.user_id, role, status, department);
    await auditRepo.log({
      user_id: currentUser.user_id,
      action: 'USER_UPDATED',
      target_type: 'user',
      target_id: selectedUser.user_id,
      outcome: 'Success',
      details: `Updated user "${selectedUser.username}": role=${role}, status=${status}, dept=${department}.`,
    });

    setIsEditModalOpen(false);
    setSelectedUser(null);
    reload();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !currentUser || password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    const salt = generateSalt();
    const password_hash = await hashPassword(password, salt);
    await userRepo.resetPassword(selectedUser.user_id, password_hash, salt);

    await auditRepo.log({
      user_id: currentUser.user_id,
      action: 'USER_PASSWORD_RESET',
      target_type: 'user',
      target_id: selectedUser.user_id,
      outcome: 'Success',
      details: `Password reset performed for user account "${selectedUser.username}".`,
    });

    setIsResetPwdModalOpen(false);
    setSelectedUser(null);
    setPassword('');
    reload();
  };

  const columns: Column<AppUser>[] = [
    {
      header: 'Username',
      accessor: (u) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">{u.username}</span>
          <div className="font-mono text-[11px] text-slate-400">{u.user_id.slice(0, 8)}</div>
        </div>
      ),
      sortable: true,
      sortValue: (u) => u.username,
    },
    {
      header: 'Role',
      accessor: (u) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-semibold ${
            u.role === 'Administrator'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
              : u.role === 'Analyst'
              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
              : u.role === 'Manager'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
              : u.role === 'Auditor'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          {u.role}
        </span>
      ),
      sortable: true,
      sortValue: (u) => u.role,
    },
    {
      header: 'Department',
      accessor: 'department',
      sortable: true,
    },
    {
      header: 'Status',
      accessor: (u) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            u.status === 'Active'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
          }`}
        >
          {u.status}
        </span>
      ),
      sortable: true,
      sortValue: (u) => u.status,
    },
    {
      header: 'Created (UTC)',
      accessor: (u) => (
        <span className="font-mono text-[11px] text-slate-500">
          {new Date(u.created_at).toLocaleDateString()}
        </span>
      ),
      sortable: true,
      sortValue: (u) => u.created_at,
    },
    {
      header: 'Actions',
      align: 'right',
      accessor: (u) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setSelectedUser(u);
              setRole(u.role);
              setDepartment(u.department);
              setStatus(u.status);
              setIsEditModalOpen(true);
            }}
            className="text-xs text-indigo-600 hover:underline font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setSelectedUser(u);
              setPassword('');
              setFormError(null);
              setIsResetPwdModalOpen(true);
            }}
            className="text-xs text-slate-500 hover:text-slate-800 hover:underline font-medium ml-2"
          >
            Reset Pwd
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Account & Role Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Role-based access control (Administrator, Analyst, Manager, Auditor, End User)
          </p>
        </div>

        <button
          onClick={() => {
            setUsername('');
            setPassword('');
            setRole('End User');
            setDepartment('Engineering');
            setStatus('Active');
            setFormError(null);
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 self-start"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create New User</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        keyField="user_id"
        searchPlaceholder="Filter users by username, role, department..."
        searchFilter={(u, q) =>
          u.username.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q)
        }
      />

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create App User Account"
        subtitle="Password will be salted and hashed locally using PBKDF2-SHA256 (210,000 iterations)."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Assigned Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Administrator">Administrator</option>
                <option value="Analyst">Analyst</option>
                <option value="Manager">Manager</option>
                <option value="Auditor">Auditor</option>
                <option value="End User">End User</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Department
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Initial Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit User: ${selectedUser?.username}`}
        subtitle="Modify user permission role and account active status."
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="Administrator">Administrator</option>
              <option value="Analyst">Analyst</option>
              <option value="Manager">Manager</option>
              <option value="Auditor">Auditor</option>
              <option value="End User">End User</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Department
            </label>
            <input
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive (Locked)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={isResetPwdModalOpen}
        onClose={() => setIsResetPwdModalOpen(false)}
        title={`Reset Password for ${selectedUser?.username}`}
        subtitle="Generates fresh cryptographic salt and derives new PBKDF2 hash."
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsResetPwdModalOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              Set New Password
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [sessionTimeout, setSessionTimeout] = useState(() => settingsRepo.get('session_timeout_minutes', '30'));
  const [customIdRegex, setCustomIdRegex] = useState(() => settingsRepo.get('custom_id_regex', ''));
  const [orgName, setOrgName] = useState(() => settingsRepo.get('organization_name', 'PromptShield Enterprise'));

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => auditRepo.getAll(500));
  const [purgeResult, setPurgeResult] = useState<RetentionRunResult | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isAdmin = currentUser?.role === 'Administrator';

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isAdmin) return;

    await settingsRepo.set('session_timeout_minutes', sessionTimeout);
    await settingsRepo.set('custom_id_regex', customIdRegex);
    await settingsRepo.set('organization_name', orgName);

    await auditRepo.log({
      user_id: currentUser.user_id,
      action: 'SYSTEM_SETTINGS_UPDATED',
      target_type: 'settings',
      outcome: 'Success',
      details: `Session timeout: ${sessionTimeout}m, custom ID regex updated.`,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportDb = () => {
    const bytes = exportDatabase();
    const blob = new Blob([bytes as BlobPart], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PromptShield_Backup_${Date.now()}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportDb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        await importDatabase(new Uint8Array(buffer));
        alert('Database restored successfully from file. Reloading application...');
        window.location.reload();
      } catch (err) {
        alert('Failed to restore database: ' + String(err));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRunRetention = async () => {
    if (!currentUser || !isAdmin) return;
    setIsPurging(true);
    try {
      const res = await retentionService.runRetention(currentUser.user_id);
      setPurgeResult(res);
      setAuditLogs(auditRepo.getAll(500));
    } catch (err) {
      console.error('Purge failed:', err);
    } finally {
      setIsPurging(false);
    }
  };

  const auditColumns: Column<AuditLog>[] = [
    {
      header: 'Action',
      accessor: (l) => <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{l.action}</span>,
      sortable: true,
      sortValue: (l) => l.action,
    },
    {
      header: 'User',
      accessor: 'user_id',
    },
    {
      header: 'Outcome',
      accessor: (l) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
            l.outcome === 'Success'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : l.outcome === 'Blocked'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
          }`}
        >
          {l.outcome}
        </span>
      ),
      sortable: true,
      sortValue: (l) => l.outcome,
    },
    {
      header: 'Timestamp (UTC)',
      accessor: (l) => (
        <span className="font-mono text-[11px] text-slate-500">
          {new Date(l.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
        </span>
      ),
      sortable: true,
      sortValue: (l) => l.timestamp,
    },
    {
      header: 'Details & Non-Sensitive Metadata',
      accessor: 'details',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings, Database Backup & Audit Logs
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Local SQLite lifecycle maintenance, database binary snapshotting, and system audit log ledger
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
          Settings saved successfully!
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core System Configuration */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Guardrail Parameters
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Local timeout intervals and custom National ID regex filters.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Session Inactivity Timeout (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Custom National ID / SSN Regular Expression
                </label>
                <input
                  type="text"
                  value={customIdRegex}
                  onChange={(e) => setCustomIdRegex(e.target.value)}
                  placeholder="e.g. \\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Organization Entity Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Database Backup & Retention Purge */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Database Backup & Local Persistence
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Export the complete SQLite database file (.db) to store offsite, or restore from an existing backup snapshot.
            </p>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExportDb}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export Database (.db)</span>
                </button>

                {isAdmin && (
                  <label className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Import & Restore (.db)</span>
                    <input
                      type="file"
                      accept=".db,.sqlite,.sqlite3"
                      onChange={handleImportDb}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Retention Purge Section */}
              {isAdmin && (
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      On-Demand Data Retention Purge
                    </h4>
                    <button
                      onClick={handleRunRetention}
                      disabled={isPurging}
                      className="px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      {isPurging ? 'Purging...' : 'Run Retention Purge Now'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Applies the configured policy retention schedule to prune stale events, scans, and audit logs.
                  </p>

                  {purgeResult && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300">
                      Purged: {purgeResult.purgedEvents} events, {purgeResult.purgedScansAndFindings} scans/findings, {purgeResult.purgedAlerts} alerts, {purgeResult.purgedAuditLogs} audit records.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-4">
            Zero cloud transmission. All bytes stored strictly in browser IndexedDB file storage.
          </div>
        </div>
      </div>

      {/* System Audit Logs Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              System Audit Trail ({auditLogs.length} entries)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable security event logging: logins, policy modifications, approval toggles, report generations
            </p>
          </div>
        </div>

        <DataTable
          columns={auditColumns}
          data={auditLogs}
          keyField="audit_log_id"
          searchPlaceholder="Filter audit events by action, user, details..."
          searchFilter={(l, q) =>
            l.action.toLowerCase().includes(q) ||
            l.user_id.toLowerCase().includes(q) ||
            l.details.toLowerCase().includes(q)
          }
          emptyTitle="No audit logs recorded"
          emptySubtitle="System actions will be recorded here automatically."
        />
      </div>
    </div>
  );
};
