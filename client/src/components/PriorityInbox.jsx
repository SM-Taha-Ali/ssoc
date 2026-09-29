import React, { useState } from 'react';
import {
  MessageSquare,
  Clock,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  User,
  Sparkles,
  ShieldCheck,
  Inbox,
  ArrowRight,
  Building,
  Mail,
  Zap,
  Check
} from 'lucide-react';
import { PriorityInboxSkeleton } from './Skeletons.jsx';

export default function PriorityInbox({
  leads = [],
  loading = false,
  onSelectLead,
  onUpdateStage
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'replies' | 'followups'

  if (loading) {
    return <PriorityInboxSkeleton />;
  }

  const repliedLeads = leads.filter((l) => l.stage === 'replied');
  const cooldownReadyLeads = leads.filter(
    (l) => l.stage === 'cooldown' || (l.followUps && l.followUps.some((f) => f.status === 'ready'))
  );
  const totalActionItems = repliedLeads.length + cooldownReadyLeads.length;

  return (
    <div className="flex-1 w-full h-full overflow-y-auto min-h-0 bg-canvas">
      <div className="p-4 sm:p-6 w-full space-y-6 pb-14">
      {/* ============================================================ */}
      {/* EXECUTIVE HEADER & TAB NAVIGATION                            */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-sm">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary tracking-tight">Priority Action Center</h2>
              <p className="text-xs text-secondary">
                Triage incoming client responses, urgent deal milestones, and scheduled follow-ups.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center bg-card-subtle p-1 rounded-xl border border-theme self-start sm:self-auto shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-card text-primary shadow-sm border border-theme/80'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span>All Priority</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                totalActionItems > 0
                  ? 'bg-brand-500/15 text-brand-600 dark:text-brand-400'
                  : 'bg-card text-muted'
              }`}
            >
              {totalActionItems}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('replies')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'replies'
                ? 'bg-card text-primary shadow-sm border border-theme/80'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Client Replies</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                repliedLeads.length > 0
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-card text-muted'
              }`}
            >
              {repliedLeads.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('followups')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'followups'
                ? 'bg-card text-primary shadow-sm border border-theme/80'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Follow-ups</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                cooldownReadyLeads.length > 0
                  ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                  : 'bg-card text-muted'
              }`}
            >
              {cooldownReadyLeads.length}
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3-COLUMN METRICS STRIP                                       */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-card border border-theme shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Inbound Client Replies
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-primary tracking-tight">
                {repliedLeads.length}
              </span>
              <span className="text-[11px] text-muted">
                {repliedLeads.length === 1 ? 'requires triage' : 'requiring triage'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-card border border-theme shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              Follow-ups Due
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-primary tracking-tight">
                {cooldownReadyLeads.length}
              </span>
              <span className="text-[11px] text-muted">scheduled touches</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-card border border-theme shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Pipeline Cadence Guard
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-primary">6 Touches / 4M</span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                • Auto-Lost Armed
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: ACTIVE CLIENT REPLIES                             */}
      {/* ============================================================ */}
      {(activeTab === 'all' || activeTab === 'replies') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Active Client Replies
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {repliedLeads.length}
              </span>
            </div>
            <span className="text-[11px] text-muted hidden sm:inline">
              Sequences halt automatically • Ready for meeting booking
            </span>
          </div>

          {repliedLeads.length === 0 ? (
            <div className="p-8 sm:p-10 rounded-2xl bg-card border border-theme text-center shadow-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-sm font-bold text-primary">Inbox Zero — All Replies Handled</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  No pending client responses require attention right now. When a prospect replies, all automated touches immediately halt and the lead surfaces here for rapid follow-through.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card-subtle border border-theme text-[11px] text-muted">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                <span>Live IMAP sync polls inbox automatically</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {repliedLeads.map((lead) => {
                const clientInitials = (lead.clientInfo?.name || lead.title || 'CL')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={lead._id}
                    className="p-4 sm:p-5 rounded-2xl bg-card border border-theme hover:border-rose-500/40 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-rose-500"
                  >
                    <div
                      className="space-y-1.5 cursor-pointer flex-1"
                      onClick={() => onSelectLead(lead)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-card-subtle text-secondary border border-theme">
                          {lead.platform}
                        </span>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          Client Responded
                        </span>
                        {lead.clientInfo?.email && (
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead.clientInfo.email}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 pt-0.5">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {clientInitials}
                        </div>
                        <h4 className="text-sm font-bold text-primary hover:text-brand-500 transition-colors">
                          {lead.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-secondary pl-9.5">
                        <span className="font-medium text-primary">
                          {lead.clientInfo?.name || 'Hiring Manager'}
                        </span>
                        {lead.clientInfo?.company && (
                          <span className="text-muted flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {lead.clientInfo.company}
                          </span>
                        )}
                        {lead.budget && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {lead.budget}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 pl-9.5 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => onUpdateStage(lead._id, 'meeting')}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 rounded-xl transition-all shadow-sm shadow-teal-600/20 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-white" />
                        <span>Book Meeting</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectLead(lead)}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-secondary hover:text-primary bg-card-subtle hover:bg-card rounded-xl border border-theme transition-all cursor-pointer"
                      >
                        <span>Lead Details</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 2: FOLLOW-UPS DUE FOR REVIEW                         */}
      {/* ============================================================ */}
      {(activeTab === 'all' || activeTab === 'followups') && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                Follow-Ups Due for Review
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {cooldownReadyLeads.length}
              </span>
            </div>
            <span className="text-[11px] text-muted hidden sm:inline">
              Daily automated scheduler at 9:00 AM • 4-month cadence
            </span>
          </div>

          {cooldownReadyLeads.length === 0 ? (
            <div className="p-8 sm:p-10 rounded-2xl bg-card border border-theme text-center shadow-sm flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shadow-inner">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-sm font-bold text-primary">All Follow-Up Sequences Up to Date</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  No leads are currently pending follow-up dispatch. The system evaluates follow-ups automatically across the 6-touch cadence (Day 7, Day 21, and Monthly touches for 4 months) and moves unreplied leads to <strong>9. Lost</strong>.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card-subtle border border-theme text-[11px] text-muted">
                <Clock className="w-3.5 h-3.5 text-purple-500" />
                <span>Next scheduled run at 9:00 AM (or click Check Follow-ups in the top bar)</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cooldownReadyLeads.map((lead) => {
                const clientInitials = (lead.clientInfo?.name || lead.title || 'FL')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={lead._id}
                    onClick={() => onSelectLead(lead)}
                    className="p-4 sm:p-5 rounded-2xl bg-card border border-theme hover:border-purple-500/40 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-purple-500"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-card-subtle text-secondary border border-theme">
                          {lead.platform}
                        </span>
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                          Follow-Up Ready
                        </span>
                        {lead.stage && (
                          <span className="text-[11px] text-muted">
                            Stage: 5. Follow-up
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 pt-0.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {clientInitials}
                        </div>
                        <h4 className="text-sm font-bold text-primary hover:text-brand-500 transition-colors">
                          {lead.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-secondary pl-9.5">
                        <span className="font-medium text-primary">
                          {lead.clientInfo?.name || 'Hiring Lead'}
                        </span>
                        {lead.clientInfo?.company && (
                          <span className="text-muted flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {lead.clientInfo.company}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-9.5 sm:pl-0">
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <span>Review Sequence</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
