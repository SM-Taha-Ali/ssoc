import React, { useState } from 'react';
import {
  Sparkles,
  Video,
  FileText,
  Send,
  Clock,
  MessageSquare,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  User,
  DollarSign
} from 'lucide-react';
import { PipelineSkeleton } from './Skeletons.jsx';

export const STAGES = [
  { id: 'discovered', label: '1. Discovered', icon: Sparkles, color: 'text-sky-400', border: 'border-sky-500/30', bg: 'bg-sky-500/10' },
  { id: 'pre_reqs', label: '2. Needs Demo', icon: Video, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  { id: 'draft_ready', label: '3. Draft Ready', icon: FileText, color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10' },
  { id: 'sent', label: '4. Contacted', icon: Send, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  { id: 'cooldown', label: '5. Follow-up', icon: Clock, color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  { id: 'replied', label: '6. Client Replied', icon: MessageSquare, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
  { id: 'meeting', label: '7. Meeting Booked', icon: Calendar, color: 'text-teal-400', border: 'border-teal-500/30', bg: 'bg-teal-500/10' },
  { id: 'closed_won', label: '8. Won', icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' }
];

const COLUMN_PAGE_SIZE = 25;

function formatLeadRecency(lead) {
  const ref = lead.postedAt || lead.createdAt;
  if (!ref) return 'Recent';
  const diffMs = Math.max(0, Date.now() - new Date(ref).getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatPlatformLabel(platform) {
  const map = {
    freelancer: 'Freelancer',
    ycombinator: 'Y Combinator',
    upwork: 'Upwork',
    linkedin: 'LinkedIn',
    remoteok: 'Remotive',
    github: 'GitHub',
    reddit: 'Reddit',
    apollo: 'Apollo',
    manual: 'Direct'
  };
  const key = (platform || '').toLowerCase();
  return map[key] || (platform || 'Project').slice(0, 11);
}

function getEffectivePriority(lead) {
  if (typeof lead.priorityScore === 'number') return lead.priorityScore;
  const match = typeof lead.matchScore === 'number' ? lead.matchScore : 75;
  const refMs = new Date(lead.postedAt || lead.createdAt || Date.now()).getTime();
  const ageDays = Math.max(0, (Date.now() - refMs) / 86400000);
  const boost = ageDays <= 0.5 ? 5 : ageDays <= 1 ? 3 : 0;
  return match + boost - Math.min(48, ageDays * 4);
}

export default function PipelineView({
  leads = [],
  loading = false,
  selectedLead,
  onSelectLead,
  onAdvanceStage,
  sortMode = 'smart'
}) {
  const [visibleCounts, setVisibleCounts] = useState({});

  if (loading) {
    return <PipelineSkeleton />;
  }

  return (
    <div className="flex-1 overflow-x-auto p-6">
      <div className="inline-flex gap-4 min-w-full pb-4">
        {STAGES.map((stage) => {
          const StageIcon = stage.icon;

          // Sort leads by Smart Rank (Match % + Recency) by default so fresh high-match leads stay at top
          const stageLeads = leads
            .filter((l) => l.stage === stage.id)
            .sort((a, b) => {
              if (sortMode === 'newest') {
                return new Date(b.postedAt || b.createdAt || 0) - new Date(a.postedAt || a.createdAt || 0);
              }
              if (sortMode === 'oldest') {
                return new Date(a.postedAt || a.createdAt || 0) - new Date(b.postedAt || b.createdAt || 0);
              }
              if (sortMode === 'match') {
                const scoreA = typeof a.matchScore === 'number' ? a.matchScore : 0;
                const scoreB = typeof b.matchScore === 'number' ? b.matchScore : 0;
                if (scoreB !== scoreA) return scoreB - scoreA;
              }
              const prioA = getEffectivePriority(a);
              const prioB = getEffectivePriority(b);
              if (prioB !== prioA) return prioB - prioA;
              return new Date(b.postedAt || b.createdAt || 0) - new Date(a.postedAt || a.createdAt || 0);
            });

          const currentLimit = visibleCounts[stage.id] || COLUMN_PAGE_SIZE;
          const visibleLeads = stageLeads.slice(0, currentLimit);
          const hasMoreInStage = stageLeads.length > currentLimit;

          const handleColumnScroll = (e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop - clientHeight < 100 && hasMoreInStage) {
              setVisibleCounts((prev) => ({
                ...prev,
                [stage.id]: (prev[stage.id] || COLUMN_PAGE_SIZE) + COLUMN_PAGE_SIZE
              }));
            }
          };

          return (
            <div
              key={stage.id}
              className="w-80 flex-shrink-0 flex flex-col bg-card-subtle rounded-xl border border-theme overflow-hidden shadow-sm max-h-[calc(100vh-140px)]"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-theme flex items-center justify-between bg-surface">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${stage.bg} ${stage.color}`}>
                    <StageIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-semibold text-primary tracking-wide uppercase">
                    {stage.label}
                  </h3>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-card text-secondary border border-theme">
                  {stageLeads.length}
                </span>
              </div>

              {/* Column Content */}
              <div
                onScroll={handleColumnScroll}
                className="p-3 flex-1 overflow-y-auto space-y-3"
              >
                {stageLeads.length === 0 ? (
                  <div className="h-32 border-2 border-dashed border-theme rounded-xl flex items-center justify-center text-muted text-xs font-medium">
                    No leads in this stage
                  </div>
                ) : (
                  visibleLeads.map((lead) => {
                    const isSelected = selectedLead?._id === lead._id;
                    const matchScore = lead.matchScore || 0;

                    return (
                      <div
                        key={lead._id}
                        onClick={() => onSelectLead(lead)}
                        className={`group p-3.5 rounded-xl border transition-all cursor-pointer relative bg-card hover:bg-card-subtle shadow-sm ${
                          isSelected
                            ? 'border-brand-500 ring-2 ring-brand-500/40 shadow-md shadow-brand-500/10'
                            : 'border-theme hover:border-slate-400/50'
                        }`}
                      >
                        {/* Top Meta: Platform, Recency & Match Score */}
                        <div className="flex items-center justify-between gap-1.5 mb-2 flex-nowrap">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-card-subtle text-secondary border border-theme whitespace-nowrap shrink-0">
                              {formatPlatformLabel(lead.platform)}
                            </span>
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-card-subtle text-muted border border-theme flex items-center gap-1 whitespace-nowrap shrink-0"
                              title="Posting Recency (older leads rank lower)"
                            >
                              <Clock className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                              <span>{formatLeadRecency(lead)}</span>
                            </span>
                          </div>

                          {matchScore > 0 && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 ${
                                matchScore >= 80
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : matchScore >= 60
                                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  : 'bg-card-subtle text-muted border border-theme'
                              }`}
                            >
                              {matchScore}% Match
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-primary group-hover:text-brand-400 transition-colors line-clamp-2 mb-1.5 leading-snug">
                          {lead.title}
                        </h4>

                        {/* AI Fit Reasoning / Description snippet */}
                        <p className="text-[11px] text-secondary line-clamp-2 mb-3 leading-relaxed">
                          {lead.matchReasoning || lead.description || 'Project/contract engagement matching workspace stack.'}
                        </p>

                        {/* Details Footer */}
                        <div className="pt-2 border-t border-theme flex items-center justify-between text-[11px] text-secondary">
                          <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                            <User className="w-3 h-3 text-muted flex-shrink-0" />
                            <span className="truncate">
                              {lead.clientInfo?.company || lead.clientInfo?.name || 'Hiring Lead'}
                            </span>
                          </div>

                          {lead.budget?.amount > 0 && (
                            <div className="flex items-center gap-0.5 text-emerald-400 font-medium">
                              <DollarSign className="w-3 h-3" />
                              <span>{lead.budget.amount}</span>
                            </div>
                          )}

                          {lead.demoVideoUrl && (
                            <div className="flex items-center gap-1 text-indigo-400" title="Demo Video Recorded">
                              <Video className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        {/* Stage Specific Badges */}
                        {stage.id === 'cooldown' && (
                          <div className="mt-2 text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 flex items-center justify-between">
                            <span>Follow-up active</span>
                            <Clock className="w-3 h-3 text-purple-400" />
                          </div>
                        )}

                        {stage.id === 'closed_lost' && (
                          <div className="mt-2 text-[10px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center justify-between">
                            <span>Closed Lost</span>
                            <XCircle className="w-3 h-3 text-rose-400" />
                          </div>
                        )}

                        {stage.id === 'replied' && (
                          <div className="mt-2 text-[10px] font-bold text-rose-600 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 flex items-center justify-between">
                            <span>Client Replied! Follow-ups Stopped</span>
                            <MessageSquare className="w-3 h-3 text-rose-400" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {hasMoreInStage && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCounts((prev) => ({
                        ...prev,
                        [stage.id]: (prev[stage.id] || COLUMN_PAGE_SIZE) + COLUMN_PAGE_SIZE
                      }))
                    }
                    className="w-full py-2 px-3 rounded-xl bg-card hover:bg-card-subtle border border-theme text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <span>Load more ({stageLeads.length - currentLimit} remaining)</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
