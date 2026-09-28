import React, { useState, useRef, useEffect } from 'react';
import {
  Inbox,
  Kanban,
  Plus,
  RefreshCw,
  Settings,
  Clock,
  Sun,
  Moon,
  Building2,
  LogOut,
  ChevronDown,
  X,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header({
  activeView,
  setActiveView,
  stageCounts = {},
  onOpenAddModal,
  onRunScanner,
  onRunCooldown,
  isScanning,
  isCooldownRunning
}) {
  const { mode, toggleMode } = useTheme();
  const { company, logout } = useAuth();
  const replyCount = stageCounts['replied'] || 0;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenSettings = () => {
    setIsDropdownOpen(false);
    setActiveView('settings');
  };

  const handlePromptLogout = () => {
    setIsDropdownOpen(false);
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const companyInitial = company?.companyName ? company.companyName.charAt(0).toUpperCase() : 'W';

  return (
    <>
      <header className="sticky top-0 z-30 bg-surface backdrop-blur-md border-b border-theme px-4 sm:px-6 py-2.5 transition-colors">
        <div className="flex items-center justify-between gap-3 w-full">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600/20 to-brand-500/10 border border-brand-500/30 flex items-center justify-center shadow-lg shadow-brand-500/10 shrink-0">
                <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                <h1 className="text-xs sm:text-sm font-bold tracking-tight text-primary leading-tight">
                  Sales Operation Center
                </h1>
                <p className="text-[10px] font-medium text-secondary hidden sm:block">
                  Autonomous Lead Discovery & Pipeline Engine
                </p>
              </div>
            </div>

            {/* Primary Workflow Tabs (Pipeline Board & Priority Inbox) */}
            <div className="hidden md:flex items-center bg-card-subtle border border-theme p-0.5 rounded-lg">
              <button
                onClick={() => setActiveView('pipeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all relative ${
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
            </div>
          </div>

          {/* Right: Operational Actions & Workspace Profile Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Scan Feeds Button */}
            <button
              onClick={onRunScanner}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary bg-card-subtle hover:bg-card active:scale-95 rounded-lg border border-theme transition-all disabled:opacity-50"
              title="Trigger daily lead finder to scan all enabled RSS & job feeds"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-brand-400' : 'text-muted'}`} />
              <span className="hidden lg:inline">{isScanning ? 'Scanning...' : 'Scan Leads'}</span>
            </button>

            {/* Check Cooldown Button */}
            <button
              onClick={onRunCooldown}
              disabled={isCooldownRunning}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary bg-card-subtle hover:bg-card active:scale-95 rounded-lg border border-theme transition-all disabled:opacity-50"
              title="Check follow-up cooldown thresholds (Day 2, Day 7, Day 21)"
            >
              <Clock className={`w-3.5 h-3.5 ${isCooldownRunning ? 'animate-spin text-amber-500' : 'text-muted'}`} />
              <span className="hidden lg:inline">{isCooldownRunning ? 'Checking...' : 'Check Cooldowns'}</span>
            </button>

            {/* Add Lead Primary CTA */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-sm shadow-brand-600/20 transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lead</span>
            </button>

            {/* Light/Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleMode}
              className="p-1.5 rounded-lg border text-secondary hover:text-primary bg-card-subtle hover:bg-card border-theme transition-all active:scale-95 shrink-0 focus:outline-none focus:ring-0"
              title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {mode === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-brand-400" />
              )}
            </button>

            {/* Clickable Workspace Dropdown (Apex AI & Cloud Solutions) */}
            {company && (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none cursor-pointer focus:outline-none focus:ring-0 ${
                    isDropdownOpen
                      ? 'bg-card border-brand-500/50 ring-2 ring-brand-500/10 text-primary'
                      : 'bg-card-subtle hover:bg-slate-100 dark:hover:bg-slate-800/80 border-theme text-primary hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  title={`Workspace: ${company.companyName}`}
                >
                  <div
                    className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#ffffff' }}
                  >
                    <span className="font-bold leading-none select-none" style={{ color: '#ffffff' }}>
                      {companyInitial}
                    </span>
                  </div>
                  <span className="max-w-[110px] sm:max-w-[140px] md:max-w-[180px] truncate text-left">
                    {company.companyName}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-muted transition-transform duration-200 shrink-0 ${
                      isDropdownOpen ? 'transform rotate-180 text-brand-400' : ''
                    }`}
                  />
                </button>

                {/* Sleek Floating Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-surface border border-theme shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1">
                    {/* Workspace Header */}
                    <div className="px-3 py-2.5 rounded-lg bg-card-subtle border border-theme">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#ffffff' }}
                        >
                          <span className="font-bold leading-none select-none" style={{ color: '#ffffff' }}>
                            {companyInitial}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-primary truncate">
                            {company.companyName}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-medium text-emerald-500">Active Workspace</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Workspace Settings Item */}
                    <button
                      type="button"
                      onClick={handleOpenSettings}
                      className={`group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all text-left cursor-pointer dropdown-item-btn ${
                        activeView === 'settings' ? 'active' : ''
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5 dropdown-item-icon transition-colors flex-shrink-0" />
                      <span className="flex-1 font-medium dropdown-item-text">Workspace Settings</span>
                    </button>

                    {/* Sign Out Item */}
                    <button
                      type="button"
                      onClick={handlePromptLogout}
                      className="group w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-all text-left cursor-pointer dropdown-item-logout"
                    >
                      <LogOut className="w-3.5 h-3.5 dropdown-logout-icon transition-transform flex-shrink-0 group-hover:scale-110" />
                      <span className="flex-1 font-medium">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile View Switcher (Tabs visible below header on small mobile screens) */}
        <div className="flex md:hidden items-center justify-center pt-2 mt-2 border-t border-theme">
          <div className="flex items-center bg-card-subtle border border-theme p-0.5 rounded-lg w-full justify-around">
            <button
              onClick={() => setActiveView('pipeline')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeView === 'pipeline'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Pipeline
            </button>
            <button
              onClick={() => setActiveView('inbox')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold rounded-md transition-all relative ${
                activeView === 'inbox'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Inbox
              {replyCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 ring-4 ring-rose-500/30 animate-pulse ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modern Sleek Minimal Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface border border-theme rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 relative animate-in zoom-in-95 duration-150">
            {/* Close cross */}
            <button
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="absolute top-4 right-4 text-muted hover:text-primary p-1 rounded-lg hover:bg-card-subtle transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Minimal Rose Badge */}
            <div className="flex items-start gap-3.5 pt-1">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">Sign out of workspace?</h3>
                <p className="text-xs text-secondary mt-1 leading-relaxed">
                  You are signed in to <span className="font-semibold text-primary">{company?.companyName}</span>. Your pipeline data, AI pitches, and leads remain safely saved.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-theme">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-secondary hover:text-primary bg-card-subtle hover:bg-card border border-theme rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 shadow-md shadow-rose-600/25 rounded-xl transition-all flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
