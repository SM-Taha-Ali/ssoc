import React from 'react';
import {
  MessageSquare,
  Clock,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  User,
  Sparkles
} from 'lucide-react';
import { PriorityInboxSkeleton } from './Skeletons.jsx';

export default function PriorityInbox({
  leads = [],
  loading = false,
  onSelectLead,
  onUpdateStage
}) {
  if (loading) {
    return <PriorityInboxSkeleton />;
  }

  const repliedLeads = leads.filter((l) => l.stage === 'replied');
  const cooldownReadyLeads = leads.filter(
    (l) => l.stage === 'cooldown' || (l.followUps && l.followUps.some((f) => f.status === 'ready'))
  );

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* High Priority Replies */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-primary uppercase tracking-wide">
            Active Client Replies ({repliedLeads.length})
          </h3>
          <span className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full font-semibold">
            Requires Your Attention
          </span>
        </div>

        {repliedLeads.length === 0 ? (
          <div className="p-8 text-center bg-card border border-theme rounded-xl text-muted text-xs">
            No active unhandled client replies. As soon as a client responds, automated follow-ups pause and the lead appears here!
          </div>
        ) : (
          <div className="space-y-3">
            {repliedLeads.map((lead) => (
              <div
                key={lead._id}
                className="p-4 rounded-xl bg-card border border-rose-500/30 shadow-md hover:border-rose-500/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 cursor-pointer flex-1" onClick={() => onSelectLead(lead)}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-card-subtle text-secondary border border-theme">
                      {lead.platform}
                    </span>
                    <span className="text-xs font-semibold text-rose-500">Client Responded</span>
                    {lead.clientInfo?.email && (
                      <span className="text-xs text-muted">({lead.clientInfo.email})</span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-primary hover:text-brand-400 transition-colors">
                    {lead.title}
                  </h4>
                  <p className="text-xs text-secondary">
                    Client: {lead.clientInfo?.name} {lead.clientInfo?.company ? `• ${lead.clientInfo.company}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => onUpdateStage(lead._id, 'meeting')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold !text-white bg-teal-600 hover:bg-teal-500 active:scale-95 rounded-lg transition-all shadow-sm shadow-teal-600/20 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 !text-white" />
                    Book Meeting
                  </button>
                  <button
                    onClick={() => onSelectLead(lead)}
                    className="px-3 py-1.5 text-xs font-medium text-secondary hover:text-primary bg-card-subtle hover:bg-card rounded-lg border border-theme transition-colors"
                  >
                    View Lead Drawer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Follow-Ups Due */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-primary uppercase tracking-wide">
            Follow-Ups Due for Review ({cooldownReadyLeads.length})
          </h3>
        </div>

        {cooldownReadyLeads.length === 0 ? (
          <div className="p-8 text-center bg-card border border-theme rounded-xl text-muted text-xs">
            No follow-ups due right now. The background tracker checks cooldown thresholds every day at 9:00 AM.
          </div>
        ) : (
          <div className="space-y-3">
            {cooldownReadyLeads.map((lead) => (
              <div
                key={lead._id}
                onClick={() => onSelectLead(lead)}
                className="p-4 rounded-xl bg-card border border-theme hover:border-slate-400/50 cursor-pointer transition-all flex items-center justify-between gap-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-card-subtle text-secondary border border-theme">
                      {lead.platform}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Cooldown Follow-Up Ready
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-primary">{lead.title}</h4>
                  <p className="text-[11px] text-secondary">
                    Client: {lead.clientInfo?.name || 'Hiring Lead'}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-muted" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
