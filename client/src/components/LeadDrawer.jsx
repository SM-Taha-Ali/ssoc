import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Sparkles,
  Video,
  Send,
  Copy,
  Check,
  RefreshCw,
  Clock,
  MessageSquare,
  Calendar,
  DollarSign,
  User,
  Building,
  Mail,
  AlertCircle,
  FileCheck,
  ChevronDown
} from 'lucide-react';
import { STAGES } from './PipelineView.jsx';
import CustomSelect from './CustomSelect.jsx';

const DRAWER_STAGES_OPTIONS = [
  ...STAGES.map((s) => ({ value: s.id, label: s.label })),
  { value: 'closed_lost', label: 'Closed Lost' }
];

export default function LeadDrawer({
  lead,
  onClose,
  onUpdateStage,
  onRunAudit,
  onSubmitVideo,
  onGeneratePitch,
  onSendPitch,
  onClientReplied,
  isAuditing,
  isSending
}) {
  if (!lead) return null;

  const [activeTab, setActiveTab] = useState('demo'); // 'demo' | 'pitch' | 'followups' | 'details'
  const [videoUrlInput, setVideoUrlInput] = useState(lead.demoVideoUrl || '');
  const [pitchSubject, setPitchSubject] = useState(lead.pitchDraft?.subject || '');
  const [pitchBody, setPitchBody] = useState(lead.pitchDraft?.body || '');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState('');

  // Handle Copy Script
  const handleCopyScript = () => {
    const full = lead.demoScript?.fullScript ||
      `Hook: ${lead.demoScript?.hook}\n\nProblem: ${lead.demoScript?.problemStatement}\n\nSolution: ${lead.demoScript?.microSolution}\n\nCTA: ${lead.demoScript?.callToAction}`;
    navigator.clipboard.writeText(full);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Handle Copy Pitch
  const handleCopyPitch = () => {
    const full = `Subject: ${pitchSubject}\n\n${pitchBody}`;
    navigator.clipboard.writeText(full);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleSaveVideo = () => {
    if (!videoUrlInput.trim()) return;
    onSubmitVideo(lead._id, videoUrlInput);
  };

  const handleDispatch = async (provider = 'manual') => {
    setSendSuccessMsg('');
    const res = await onSendPitch(lead._id, {
      subject: pitchSubject,
      messageBody: pitchBody,
      providerOverride: provider
    });
    if (res?.success) {
      setSendSuccessMsg(res.dispatchResult?.details || 'Pitch dispatched successfully!');
      if (res.dispatchResult?.actionUrl) {
        window.open(res.dispatchResult.actionUrl, '_blank');
      }
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-[#0f172a] border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
      {/* Drawer Header */}
      <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-900/90 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {lead.platform}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              Stage:
            </span>
            <CustomSelect
              value={lead.stage}
              onChange={(val) => onUpdateStage(lead._id, val)}
              options={DRAWER_STAGES_OPTIONS}
              size="sm"
              buttonClassName="bg-slate-800 text-brand-300 border-slate-700 py-0.5"
            />

            {lead.matchScore > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {lead.matchScore}% Fit
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-white line-clamp-2 leading-snug">
            {lead.title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {lead.sourceUrl && (
            <a
              href={lead.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
              title="Open Original Job Link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 px-5 text-xs font-medium">
        <button
          onClick={() => setActiveTab('demo')}
          className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'demo'
              ? 'border-brand-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-3.5 h-3.5 text-amber-400" />
          Demo Script & Pre-Reqs
        </button>

        <button
          onClick={() => setActiveTab('pitch')}
          className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'pitch'
              ? 'border-brand-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-emerald-400" />
          Outreach Pitch
        </button>

        <button
          onClick={() => setActiveTab('followups')}
          className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'followups'
              ? 'border-brand-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-purple-400" />
          Follow-up Sequence
        </button>

        <button
          onClick={() => setActiveTab('details')}
          className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'details'
              ? 'border-brand-500 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-3.5 h-3.5 text-sky-400" />
          Lead Details
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* TAB 1: DEMO SCRIPT & PRE-REQS */}
        {activeTab === 'demo' && (
          <div className="space-y-5">
            {/* AI Audit Action Banner */}
            {(!lead.demoScript || !lead.demoScript.hook) && (
              <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-brand-300">Generate 60s Demo Script & Tips</h4>
                  <p className="text-[11px] text-slate-400">Let Gemini analyze this job and craft your exact recording script.</p>
                </div>
                <button
                  onClick={() => onRunAudit(lead._id)}
                  disabled={isAuditing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAuditing ? 'Generating...' : 'Run AI Prep'}
                </button>
              </div>
            )}

            {/* Profile Optimization Tips */}
            {lead.profileOptimizationTips?.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Profile Optimization Tips for this Lead
                </h4>
                <ul className="space-y-1.5">
                  {lead.profileOptimizationTips.map((tip, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 60-Second Video Demo Script */}
            {lead.demoScript?.hook ? (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    60-Second Video Demo Script
                  </h4>
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 transition-colors"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedScript ? 'Copied' : 'Copy Script'}
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">0:00 - 0:10 Hook:</span>
                    <p className="text-slate-200 mt-0.5">{lead.demoScript.hook}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">0:10 - 0:25 Problem Statement:</span>
                    <p className="text-slate-200 mt-0.5">{lead.demoScript.problemStatement}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">0:25 - 0:50 Micro-Solution:</span>
                    <p className="text-slate-200 mt-0.5">{lead.demoScript.microSolution}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">0:50 - 1:00 Call to Action:</span>
                    <p className="text-slate-200 mt-0.5">{lead.demoScript.callToAction}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Video Link Submission */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-brand-400" />
                Upload / Link Recorded Demo Video
              </h4>
              <p className="text-[11px] text-slate-400">
                Paste your recorded Loom, YouTube, or Drive video URL. Submitting this marks the lead as <b>Draft Ready</b> and automatically generates your custom pitch!
              </p>

              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://www.loom.com/share/..."
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
                <button
                  onClick={handleSaveVideo}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
                >
                  Save & Generate Pitch
                </button>
              </div>

              {lead.demoVideoUrl && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3 h-3" />
                  Current Link: <a href={lead.demoVideoUrl} target="_blank" rel="noreferrer" className="underline truncate max-w-sm">{lead.demoVideoUrl}</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: OUTREACH PITCH */}
        {activeTab === 'pitch' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Outreach Draft
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onGeneratePitch(lead._id)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate with AI
                </button>
                <button
                  onClick={handleCopyPitch}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 transition-colors"
                >
                  {copiedPitch ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedPitch ? 'Copied' : 'Copy Pitch'}
                </button>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Subject</label>
              <input
                type="text"
                value={pitchSubject}
                onChange={(e) => setPitchSubject(e.target.value)}
                placeholder="Pitch subject..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Message Body</label>
              <textarea
                rows={9}
                value={pitchBody}
                onChange={(e) => setPitchBody(e.target.value)}
                placeholder="Draft message content..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-brand-500 leading-relaxed font-sans"
              />
            </div>

            {/* Dispatch Buttons (Automated & Zero-Cost Manual Fallback) */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold text-slate-200">Delivery Channels</h5>
                <span className="text-[11px] text-slate-400">
                  Target: {lead.clientInfo?.email ? lead.clientInfo.email : `${lead.platform} message`}
                </span>
              </div>

              {sendSuccessMsg && (
                <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{sendSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1-Click Manual Fallback Dispatch (Zero Cost, Opens Platform or Mailto) */}
                <button
                  onClick={() => handleDispatch('manual')}
                  disabled={isSending}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-lg border border-slate-700 transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-brand-400" />
                  1-Click Copy & Open Link
                </button>

                {/* Direct Automated Dispatch (SMTP or Resend) */}
                <button
                  onClick={() => handleDispatch('smtp')}
                  disabled={isSending}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-lg shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Sending...' : 'Send Pitch Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COOLDOWN & FOLLOW-UPS */}
        {activeTab === 'followups' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Follow-up Sequence Tracker (4-Month Cadence)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Day 7 → Day 21 → Monthly check-ins for 4 months. Leads unreplied after 4 months auto-move to Lost.
                </p>
              </div>

              {lead.stage !== 'replied' && (
                <button
                  onClick={() => onClientReplied(lead._id)}
                  className="flex items-center gap-1 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                  Mark Client Replied!
                </button>
              )}
            </div>

            {lead.stage === 'replied' && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Client has replied! All automated follow-up sequences have been permanently stopped.</span>
              </div>
            )}

            {/* Sequence Cards */}
            <div className="space-y-3">
              {(lead.followUps?.length ? lead.followUps : [
                { stage: 'day_7', delayDays: 7, status: 'pending', subject: 'Day 7: Architecture Tip & Walkthrough Check' },
                { stage: 'day_21', delayDays: 21, status: 'pending', subject: 'Day 21: Case Study & Re-checking Priority' },
                { stage: 'month_1', delayDays: 51, status: 'pending', subject: 'Month 1: Engineering Bandwidth Check-in' },
                { stage: 'month_2', delayDays: 81, status: 'pending', subject: 'Month 2: Periodic Follow-up' },
                { stage: 'month_3', delayDays: 111, status: 'pending', subject: 'Month 3: Initiative Progress Review' },
                { stage: 'month_4', delayDays: 141, status: 'pending', subject: 'Month 4: Final Touch (Auto-Closed to Lost if no reply)' }
              ]).map((followUp, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Touch {idx + 1}: After {followUp.delayDays || (idx === 0 ? 2 : idx === 1 ? 7 : 21)} Days
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        followUp.status === 'sent'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : followUp.status === 'ready'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          : followUp.status === 'skipped'
                          ? 'bg-slate-800 text-slate-500 border border-slate-700'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {followUp.status || 'pending'}
                    </span>
                  </div>

                  {followUp.subject && (
                    <p className="text-xs text-brand-300 font-medium">{followUp.subject}</p>
                  )}
                  {followUp.body && (
                    <p className="text-[11px] text-slate-400 whitespace-pre-wrap bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                      {followUp.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: LEAD DETAILS & RAW TEXT */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            {/* Client info grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Client Name</span>
                <span className="font-semibold text-slate-200">{lead.clientInfo?.name || 'N/A'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Company</span>
                <span className="font-semibold text-slate-200">{lead.clientInfo?.company || 'N/A'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Client Email</span>
                <span className="font-semibold text-slate-200">{lead.clientInfo?.email || 'N/A'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Budget</span>
                <span className="font-semibold text-emerald-400">
                  {lead.budget?.amount > 0 ? `$${lead.budget.amount} (${lead.budget.type})` : 'Unspecified'}
                </span>
              </div>
            </div>

            {/* Skills */}
            {lead.skillsRequired?.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Required Skills:</span>
                <div className="flex flex-wrap gap-1.5">
                  {lead.skillsRequired.map((skill, idx) => (
                    <span key={idx} className="text-[10px] font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Full Description */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Job Description:</span>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {lead.description}
              </div>
            </div>

            {/* Activity Logs */}
            {lead.activityLogs?.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Activity History:</span>
                <div className="space-y-1.5">
                  {lead.activityLogs.map((log, idx) => (
                    <div key={idx} className="text-[11px] text-slate-400 flex items-start gap-2 bg-slate-900/40 p-2 rounded border border-slate-800/60">
                      <span className="text-brand-400 font-semibold">{log.action}:</span>
                      <span>{log.details}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
