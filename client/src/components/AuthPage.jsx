import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  Building2,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Sun,
  Moon,
  ShieldCheck,
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useAuth();
  const { mode: themeMode, toggleMode } = useTheme();

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Please provide your company name.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your workspace password.');
      return;
    }

    try {
      setSubmitting(true);
      if (authMode === 'login') {
        await login(companyName.trim(), password.trim());
      } else {
        await register(companyName.trim(), password.trim());
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Authentication failed. Please check credentials and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setAuthMode('login');
    setCompanyName('Apex AI & Cloud Solutions');
    setPassword('apex123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between transition-colors duration-300">
      {/* Top Navigation Bar with Logo and Theme Switcher */}
      <header className="h-16 px-6 border-b border-theme flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-sky-400 p-0.5 shadow-md shadow-brand-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-surface rounded-[10px] flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-primary">Sales Operation Center</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20 uppercase tracking-wider">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] text-muted hidden sm:block">Autonomous Lead Discovery & Pipeline Engine</p>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleMode}
          className="p-2 rounded-lg border border-theme bg-card hover:bg-hover text-muted hover:text-primary transition-colors flex items-center space-x-2 text-xs"
          title={`Switch to ${themeMode === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {themeMode === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-card border border-theme rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm transition-all duration-300">
            {/* Header Titles */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-primary tracking-tight">
                {authMode === 'login' ? 'Company Workspace Sign In' : 'Register Company Workspace'}
              </h1>
              <p className="text-xs text-muted mt-1.5">
                {authMode === 'login'
                  ? 'Access your isolated company sales pipeline and active leads'
                  : 'Provision a dedicated multi-tenant sales operations workspace'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-surface border border-theme rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'login'
                    ? 'bg-card text-primary shadow-sm border border-theme'
                    : 'text-muted hover:text-primary'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError('');
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  authMode === 'register'
                    ? 'bg-card text-primary shadow-sm border border-theme'
                    : 'text-muted hover:text-primary'
                }`}
              >
                Register New Company
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-2.5 text-xs text-red-500 animate-fadeIn">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Registration Feature Highlight */}
            {authMode === 'register' && (
              <div className="mb-5 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-start space-x-2 text-xs text-brand-500">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Instantly provisions isolated database scoping, dedicated company settings, and custom ICP targeting.
                </span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Company Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Tech Solutions"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-surface border border-theme rounded-xl text-sm text-primary placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Workspace Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-surface border border-theme rounded-xl text-sm text-primary placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs tracking-wide transition-all shadow-md shadow-brand-600/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : authMode === 'login' ? (
                  <>
                    <span>Enter Company Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Create Company Workspace</span>
                    <Zap className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Fill */}
            <div className="mt-6 pt-5 border-t border-theme">
              <button
                type="button"
                onClick={handleFillDemo}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-theme hover:border-brand-500/50 bg-surface/50 hover:bg-hover text-[11px] text-muted hover:text-primary transition-all flex items-center justify-center space-x-2 group"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-brand-500 group-hover:scale-110 transition-transform" />
                <span>
                  Demo Credentials: <strong className="text-primary font-medium">Apex AI & Cloud Solutions</strong>
                </span>
              </button>
            </div>
          </div>

          {/* Privacy & Trust Badge */}
          <div className="mt-6 text-center flex items-center justify-center space-x-4 text-[11px] text-muted">
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Multi-Tenant DB Isolation</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>JWT Encrypted Sessions</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 px-6 border-t border-theme flex items-center justify-between text-[11px] text-muted">
        <span>© 2026 Sales Operation Center. All rights reserved.</span>
        <span className="hidden sm:inline">Smart Sales Multi-Tenant Infrastructure v2.4</span>
      </footer>
    </div>
  );
}
