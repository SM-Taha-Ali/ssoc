import React from 'react';
import {
  Compass,
  Inbox,
  Kanban,
  Plus,
  RefreshCw,
  Settings,
  Zap,
  Clock,
  Video,
  Send,
  MessageSquare,
  Sun,
  Moon,
  Building2,
  LogOut
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header({
  activeView,
  setActiveView,
  stageCounts = {},
  onOpenAddModal,
  onOpenSettingsModal,
  onRunScanner,
  onRunCooldown,
  isScanning,
  isCooldownRunning
}) {
  const { mode, toggleMode } = useTheme();
  const { company, logout } = useAuth();
  const replyCount = stageCounts['replied'] || 0;

  return (
    <header className="sticky top-0 z-30 bg-surface backdrop-blur-md border-b border-theme px-6 py-3.5 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Mode switch */}
        <div className="flex items-center gap-6">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600/20 to-brand-500/10 border border-brand-500/30 flex items-center justify-center shadow-lg shadow-brand-500/10 flex-shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="url(#soc-grad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 6L7 9V15L12 18L17 15V9L12 6Z" fill="url(#soc-fill)" fillOpacity="0.35" stroke="url(#soc-grad)" strokeWidth="1.2"/>
                <circle cx="12" cy="12" r="2.2" fill="#38bdf8" />
                <defs>
                  <linearGradient id="soc-grad" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#818cf8"/>
                    <stop offset="1" stopColor="#38bdf8"/>
                  </linearGradient>
                  <linearGradient id="soc-fill" x1="7" y1="6" x2="17" y2="18" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1"/>
                    <stop offset="1" stopColor="#0ea5e9"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-primary">
                Sales Operation Center
              </h1>
              <p className="text-[11px] font-medium text-secondary">Autonomous Lead Discovery & Pipeline Engine</p>
            </div>
          </div>

          {/* View Toggles */}
          <div className="flex items-center bg-card-subtle border border-theme p-1 rounded-lg">
            <button
              onClick={() => setActiveView('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeView === 'pipeline'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-secondary hover:text-primary hover:bg-card'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Pipeline Board
            </button>
            <button
              onClick={() => setActiveView('inbox')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all relative ${
                activeView === 'inbox'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-secondary hover:text-primary hover:bg-card'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Priority Inbox
              {replyCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-500/30 animate-pulse ml-0.5" />
              )}
            </button>
            <button
              onClick={() => setActiveView('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeView === 'settings'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-secondary hover:text-primary hover:bg-card'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Scan Feeds Button */}
          <button
            onClick={onRunScanner}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary bg-card-subtle hover:bg-card active:scale-95 rounded-lg border border-theme transition-all disabled:opacity-50"
            title="Trigger daily lead finder to scan all enabled RSS & job feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-brand-400' : 'text-muted'}`} />
            {isScanning ? 'Scanning Feeds...' : 'Scan Leads'}
          </button>

          {/* Check Cooldown Button */}
          <button
            onClick={onRunCooldown}
            disabled={isCooldownRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary bg-card-subtle hover:bg-card active:scale-95 rounded-lg border border-theme transition-all disabled:opacity-50"
            title="Check follow-up cooldown thresholds (Day 2, Day 7, Day 21)"
          >
            <Clock className={`w-3.5 h-3.5 ${isCooldownRunning ? 'animate-spin text-amber-500' : 'text-muted'}`} />
            {isCooldownRunning ? 'Checking...' : 'Check Cooldowns'}
          </button>

          {/* Add Lead */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-md shadow-brand-600/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lead
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setActiveView(activeView === 'settings' ? 'pipeline' : 'settings')}
            className={`p-1.5 rounded-lg border transition-all ${
              activeView === 'settings'
                ? 'bg-brand-600 text-white border-brand-500'
                : 'text-secondary hover:text-primary bg-card-subtle hover:bg-card border-theme'
            }`}
            title="Operations Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Quick Light/Dark Mode Toggle */}
          <button
            onClick={toggleMode}
            className="p-1.5 rounded-lg border text-secondary hover:text-primary bg-card-subtle hover:bg-card border-theme transition-all active:scale-95"
            title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {mode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-brand-400" />
            )}
          </button>

          {/* Company Workspace Indicator & Sign Out */}
          {company && (
            <div className="flex items-center pl-1 sm:pl-2 border-l border-theme ml-1 space-x-2">
              <div
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-card-subtle border border-theme text-xs"
                title={`Logged in company workspace: ${company.companyName}`}
              >
                <Building2 className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span className="font-semibold text-primary max-w-[130px] sm:max-w-[180px] truncate">
                  {company.companyName}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg border border-theme bg-card-subtle hover:bg-rose-500/10 hover:border-rose-500/30 text-secondary hover:text-rose-500 transition-all active:scale-95"
                title={`Sign out of ${company.companyName}`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
