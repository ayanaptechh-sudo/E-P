/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../services/authContext';

export const LoginPage: React.FC = () => {
  const { login, setupAdmin, isFirstRun } = useAuth();
  const [email, setEmail] = useState('admin@promptshield.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowForgotNotice(false);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      if (isFirstRun) {
        // Automatic master administrator setup in airgap environment
        const username = email.includes('@') ? email.split('@')[0] : email.trim();
        await setupAdmin(username, password, 'Information Security');
      } else {
        // Attempt login with given email or username prefix
        try {
          await login(email.trim(), password);
        } catch (firstErr) {
          if (email.includes('@')) {
            const username = email.split('@')[0];
            await login(username, password);
          } else {
            throw firstErr;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0A4296] via-[#062B6D] to-[#031B4D] font-sans antialiased selection:bg-emerald-400 selection:text-black">
      {/* =========================================================================
          1. 3D ABSTRACT TUBULAR & FLUID BACKGROUND SHAPES
         ========================================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Soft atmospheric depth lights */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-[30rem] h-[30rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -top-32 right-1/4 w-[28rem] h-[28rem] rounded-full bg-indigo-600/30 blur-[100px]" />

        {/* 3D Floating Tubular Curved Ribbons (SVG Gradients) */}
        <motion.div
          animate={{
            y: [-15, 15, -15],
            rotate: [0, 6, 0],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-16 -left-12 w-[600px] h-[600px] opacity-80"
        >
          <svg viewBox="0 0 600 600" fill="none" className="w-full h-full">
            <defs>
              <linearGradient id="fluidGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#2563EB" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.1" />
              </linearGradient>
              <filter id="glow1" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="18" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path
              d="M120 180 C 220 80, 420 120, 480 260 C 540 400, 360 520, 240 480 C 120 440, 40 280, 120 180 Z"
              fill="url(#fluidGrad1)"
              filter="url(#glow1)"
            />
          </svg>
        </motion.div>

        {/* Second 3D Tubular Torus / Fluid Blob */}
        <motion.div
          animate={{
            y: [20, -20, 20],
            rotate: [0, -8, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-24 -right-16 w-[680px] h-[680px] opacity-75"
        >
          <svg viewBox="0 0 680 680" fill="none" className="w-full h-full">
            <defs>
              <linearGradient id="fluidGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.75" />
                <stop offset="45%" stopColor="#1D4ED8" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#0F172A" stopOpacity="0.1" />
              </linearGradient>
              <filter id="glow2" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="24" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path
              d="M480 160 C 600 240, 620 440, 500 540 C 380 640, 180 580, 140 440 C 100 300, 340 80, 480 160 Z"
              fill="url(#fluidGrad2)"
              filter="url(#glow2)"
            />
          </svg>
        </motion.div>

        {/* Ambient 3D Depth Sphere */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.35, 0.5, 0.35],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-radial from-blue-400/20 via-cyan-600/10 to-transparent blur-2xl"
        />
      </div>

      {/* =========================================================================
          2. THE LOGIN CARD (FROSTED GLASSMORPHISM)
         ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4 p-8 sm:p-10 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl shadow-black/40 text-white"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white/90">
            PromptShield
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold mb-6 text-white tracking-tight">
          Login
        </h1>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-100 text-xs flex items-start gap-2.5 backdrop-blur-md"
          >
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </motion.div>
        )}

        {/* Forgot Password Notification Banner */}
        {showForgotNotice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3 rounded-lg bg-blue-500/20 border border-blue-400/40 text-blue-100 text-xs leading-relaxed backdrop-blur-md"
          >
            <div className="font-semibold text-white mb-0.5">Airgap Security Policy</div>
            Offline DLP mode is active. Password reset keys must be provisioned directly by your Security Administrator.
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email-input"
              className="block text-white text-sm font-medium mb-1.5"
            >
              Email
            </label>
            <input
              id="email-input"
              type="text"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@promptshield.com"
              className="w-full px-4 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-shadow shadow-inner"
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password-input"
              className="block text-white text-sm font-medium mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 pr-11 bg-white text-slate-900 placeholder:text-slate-400 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-shadow shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={() => setShowForgotNotice(true)}
                className="text-xs text-white/70 hover:text-white transition-opacity cursor-pointer font-normal underline-offset-2 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-[#0A192F] hover:bg-[#071326] active:scale-[0.99] text-white font-medium text-sm shadow-xl shadow-black/30 hover:scale-[1.02] transition-transform duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export const SetupPage: React.FC = LoginPage;
export default LoginPage;
