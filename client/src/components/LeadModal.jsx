import React, { useState, useEffect } from 'react';
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
  DollarSign,
  Building,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  FileText,
  AlertCircle,
  Cpu,
  Layers,
  Zap,
  ShieldCheck,
  User,
  MapPin,
  Globe,
  Link2
} from 'lucide-react';
import { STAGES } from './PipelineView.jsx';

export default function LeadModal({
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

  // Tabs: 'details' (Step 1) | 'demo' (Step 2) | 'pitch' (Step 3) | 'followups' (Step 4)
  const [activeTab, setActiveTab] = useState('details');
  const [videoUrlInput, setVideoUrlInput] = useState(lead.demoVideoUrl || '');
  const [pitchSubject, setPitchSubject] = useState(lead.pitchDraft?.subject || '');
  const [pitchBody, setPitchBody] = useState(lead.pitchDraft?.body || '');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedSourceUrl, setCopiedSourceUrl] = useState(false);
  const [copiedContactEmail, setCopiedContactEmail] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState('');

  const handleCopySourceUrl = () => {
    if (lead?.sourceUrl) {
      navigator.clipboard.writeText(lead.sourceUrl);
      setCopiedSourceUrl(true);
      setTimeout(() => setCopiedSourceUrl(false), 2000);
    }
  };

  const handleCopyContactEmail = (email) => {
    if (email) {
      navigator.clipboard.writeText(email);
      setCopiedContactEmail(true);
      setTimeout(() => setCopiedContactEmail(false), 2000);
    }
  };

  // Local state for pitch generation overlay
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);

  // Futuristic loading step tracker
  const [aiStepIndex, setAiStepIndex] = useState(0);

  // Update input states when lead prop updates
  useEffect(() => {
    if (lead) {
      setVideoUrlInput(lead.demoVideoUrl || '');
      setPitchSubject(lead.pitchDraft?.subject || `Regarding ${lead.title}`);
      setPitchBody(lead.pitchDraft?.body || '');
    }
  }, [lead]);

  // AI loading step message cycler for futuristic overlay
  useEffect(() => {
    let interval;
    if (isAuditing || isGeneratingPitch) {
      setAiStepIndex(0);
      interval = setInterval(() => {
        setAiStepIndex((prev) => (prev + 1) % 3);
      }, 1400);
    }
    return () => clearInterval(interval);
  }, [isAuditing, isGeneratingPitch]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Navigation handlers
  const handleProceedToDemo = () => {
    setActiveTab('demo');
    // If no demo script is present, automatically trigger AI prep!
    if (!lead.demoScript?.hook && !isAuditing) {
      onRunAudit(lead._id);
    }
  };

  const handleProceedToPitch = async () => {
    setActiveTab('pitch');
    // If no pitch draft is present, generate it automatically
    if ((!lead.pitchDraft?.body || lead.pitchDraft.body.trim() === '') && !isGeneratingPitch) {
      setIsGeneratingPitch(true);
      try {
        await onGeneratePitch(lead._id);
      } finally {
        setIsGeneratingPitch(false);
      }
    }
  };

  const handleSaveVideoAndProceed = async () => {
    if (videoUrlInput.trim()) {
      setIsGeneratingPitch(true);
      try {
        await onSubmitVideo(lead._id, videoUrlInput.trim());
        setActiveTab('pitch');
      } finally {
        setIsGeneratingPitch(false);
      }
    } else {
      handleProceedToPitch();
    }
  };

  const handleRegeneratePitch = async () => {
    setIsGeneratingPitch(true);
    try {
      await onGeneratePitch(lead._id);
    } finally {
      setIsGeneratingPitch(false);
    }
  };

  const handleCopyScript = () => {
    const full =
      lead.demoScript?.fullScript ||
      `Hook: ${lead.demoScript?.hook || ''}\n\nProblem: ${lead.demoScript?.problemStatement || ''}\n\nSolution: ${lead.demoScript?.microSolution || ''}\n\nCTA: ${lead.demoScript?.callToAction || ''}`;
    navigator.clipboard.writeText(full);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleCopyPitch = () => {
    const full = `Subject: ${pitchSubject}\n\n${pitchBody}`;
    navigator.clipboard.writeText(full);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
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
      // After dispatching, smoothly advance to followups cooldown tab
      setTimeout(() => {
        setActiveTab('followups');
      }, 1500);
    }
  };

  // Step state calculations
  const isDetailsDone = true;
  const isDemoDone = Boolean(lead.demoScript?.hook || lead.demoVideoUrl);
  const isPitchDone = Boolean(lead.pitchDraft?.body && lead.stage !== 'discovered');
  const isContacted = ['contacted', 'replied', 'closed_won', 'closed_lost'].includes(lead.stage);

  const steps = [
    {
      id: 'details',
      number: '1',
      title: 'Lead Details & Fit',
      isCompleted: isDetailsDone,
      isActive: activeTab === 'details',
      icon: FileText
    },
    {
      id: 'demo',
      number: '2',
      title: 'Demo Script & Prep',
      isCompleted: isDemoDone,
      isActive: activeTab === 'demo',
      icon: Video
    },
    {
      id: 'pitch',
      number: '3',
      title: 'Outreach Pitch',
      isCompleted: isPitchDone,
      isActive: activeTab === 'pitch',
      icon: Send
    },
    {
      id: 'followups',
      number: '4',
      title: 'Cooldown & Follow-ups',
      isCompleted: isContacted,
      isActive: activeTab === 'followups',
      icon: Clock
    }
  ];

  const auditSteps = [
    'Synthesizing job requirements & target architecture...',
    'Pinpointing client bottlenecks & high-impact micro-demo...',
    'Writing customized 60-second video demo script & profile tips...'
  ];

  const pitchSteps = [
    'Analyzing value proposition & recorded demo angle...',
    'Crafting high-converting personalized email pitch...',
    'Injecting case studies, calendar link & subject line...'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-6 animate-in fade-in duration-200">
      {/* Outer Click Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Modal Container */}
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[920px] bg-card border border-theme rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 text-primary">
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-theme bg-surface flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0 space-y-2">
            {/* 1. Primary Title - Bold, prominent, top-level heading */}
            <h2 className="text-lg md:text-xl font-bold text-primary tracking-tight leading-snug break-words" title={lead.title}>
              {lead.title}
            </h2>

            {/* 2. Organized Metadata Details Subline (Under the Title) */}
            <div className="flex items-center gap-2.5 flex-wrap text-xs text-secondary">
              {/* Platform Tag */}
              <span className="font-semibold px-2.5 py-0.5 rounded-md bg-card-subtle text-secondary border border-theme text-[11px] flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                {lead.platform ? (lead.platform.charAt(0).toUpperCase() + lead.platform.slice(1)) : 'Opportunity'}
              </span>

              {/* Match Fit Score */}
              {lead.matchScore > 0 && (
                <span className="font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1 text-[11px] shadow-sm">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  {lead.matchScore}% Match Fit
                </span>
              )}

              {/* Budget */}
              {lead.budget && (
                <span className="flex items-center gap-1 text-xs">
                  <span className="text-muted">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {typeof lead.budget === 'object'
                      ? (lead.budget.amount > 0 ? `$${lead.budget.amount}${lead.budget.type === 'hourly' ? '/hr' : ''}` : 'Flexible Budget')
                      : String(lead.budget)}
                  </span>
                </span>
              )}

              {/* Client Name */}
              {(lead.clientName || lead.clientInfo?.name) && (lead.clientName !== 'Hiring Client' && lead.clientInfo?.name !== 'Hiring Client') && (
                <span className="flex items-center gap-1 text-xs">
                  <span className="text-muted">•</span>
                  <span className="text-secondary font-medium">{lead.clientName || lead.clientInfo?.name}</span>
                </span>
              )}

              {/* Company */}
              {(lead.company || lead.clientInfo?.company) && (
                <span className="flex items-center gap-1 text-xs">
                  <span className="text-muted">•</span>
                  <span className="text-muted">{lead.company || lead.clientInfo?.company}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action buttons on the right */}
          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
            {lead.sourceUrl && (
              <a
                href={lead.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-card-subtle hover:bg-slate-200/60 dark:hover:bg-slate-800 active:scale-95 rounded-lg border border-theme transition-all shadow-sm"
                title="Open original job posting"
              >
                <ExternalLink className="w-3.5 h-3.5 text-brand-500" />
                <span>Open Listing</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-secondary hover:text-primary bg-card-subtle hover:bg-slate-200/60 dark:hover:bg-slate-800 active:scale-95 rounded-lg border border-theme transition-all cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEPPER WORKFLOW BAR */}
        <div className="px-6 py-2.5 bg-card-subtle/80 dark:bg-[#090d18] border-b border-theme flex items-center justify-between gap-2 overflow-x-auto flex-shrink-0">
          <div className="flex items-center gap-2 min-w-max">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => {
                      if (step.id === 'demo' && !lead.demoScript?.hook && !isAuditing) {
                        onRunAudit(lead._id);
                      }
                      setActiveTab(step.id);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      step.isActive
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25 ring-1 ring-brand-400/40'
                        : step.isCompleted
                        ? 'text-primary hover:bg-card bg-surface border border-theme'
                        : 'text-secondary hover:text-primary hover:bg-card border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        step.isActive
                          ? 'bg-white text-brand-700'
                          : step.isCompleted
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {step.isCompleted ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : step.number}
                    </div>
                    <span>{step.title}</span>
                  </button>
                  {idx < steps.length - 1 && <span className="text-muted text-xs">/</span>}
                </React.Fragment>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-secondary">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Guided Conversion Pipeline</span>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE CONTENT) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 relative min-h-0 bg-canvas dark:bg-[#0a0f1d]">
          {/* ============================================================ */}
          {/* TAB 1: COMPLETE LEAD DETAILS AS FIRST SECTION                */}
          {/* ============================================================ */}
          {activeTab === 'details' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Fit Overview Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-brand-50/90 via-indigo-50/60 to-white dark:from-brand-950/40 dark:to-slate-900/80 border border-brand-200/80 dark:border-brand-500/25 shadow-sm dark:shadow-none space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                      AI Opportunity Match Fit: {lead.matchScore || 85}%
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-muted dark:text-slate-400">
                    Source: <span className="text-primary dark:text-slate-200 capitalize font-medium">{lead.platform}</span>
                  </span>
                </div>
                <p className="text-xs text-secondary dark:text-slate-300 leading-relaxed">
                  {lead.matchReasoning ||
                    'Identified as a high-affinity project matching your agency capabilities, technology stack, and business requirements.'}
                </p>
                {lead.demoAngle && (
                  <div className="pt-2 border-t border-theme flex items-start gap-2 text-xs">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                      Suggested Angle:
                    </span>
                    <span className="text-primary dark:text-slate-200">{lead.demoAngle}</span>
                  </div>
                )}
              </div>

              {/* 1. SOURCE LISTING & COUNTER-VERIFICATION (ALWAYS AVAILABLE IN LEAD DETAILS & FIT) */}
              <div className="p-4 rounded-xl bg-card border border-theme shadow-sm dark:shadow-none space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-theme">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                        <span>Original Job Listing & Counter-Verification</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 capitalize border border-brand-500/20">
                          {lead.platform || 'Platform'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-secondary mt-0.5">
                        Verify this posting on the original host platform to counter-check job authenticity, client reputation, and active status.
                      </p>
                    </div>
                  </div>

                  {lead.sourceUrl && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopySourceUrl}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-card-subtle hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg border border-theme transition-all cursor-pointer"
                        title="Copy source listing URL"
                      >
                        {copiedSourceUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-muted" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                      <a
                        href={lead.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        <span>Open Original Listing</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {lead.sourceUrl ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-card-subtle border border-theme text-xs font-mono">
                    <span className="text-muted shrink-0 text-[11px] font-sans font-medium">Verified Source Link:</span>
                    <a
                      href={lead.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-600 dark:text-brand-400 hover:underline truncate flex-1 font-medium"
                      title={lead.sourceUrl}
                    >
                      {lead.sourceUrl}
                    </a>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-card-subtle border border-theme text-xs text-secondary flex items-center justify-between">
                    <span>Direct Inbound / Manual Entry (No external URL attached)</span>
                    <span className="text-[10px] font-medium text-muted uppercase">Direct Origin</span>
                  </div>
                )}
              </div>

              {/* 2. PROPER SECTION-WISE CLIENT & CONTACT INTELLIGENCE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-primary">
                        Client & Contact Intelligence
                      </h4>
                      <p className="text-[11px] text-secondary mt-0.5">
                        Verified contact profile, organizational details, and engagement scope.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-muted px-2 py-0.5 rounded-md bg-card-subtle border border-theme">
                    Primary Point of Contact
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {/* Client / Hiring Lead */}
                  <div className="p-3.5 rounded-xl bg-card border border-theme shadow-sm dark:shadow-none space-y-1">
                    <div className="flex items-center gap-1.5 text-muted text-[11px] font-medium">
                      <User className="w-3.5 h-3.5 text-brand-500" />
                      <span>Contact Person</span>
                    </div>
                    <p className="font-semibold text-primary truncate text-sm">
                      {lead.clientInfo?.name && lead.clientInfo.name !== 'Hiring Client'
                        ? lead.clientInfo.name
                        : (lead.clientName || 'Hiring Client')}
                    </p>
                    <span className="text-[10px] text-muted block">Direct Hiring Authority</span>
                  </div>

                  {/* Company / Organization */}
                  <div className="p-3.5 rounded-xl bg-card border border-theme shadow-sm dark:shadow-none space-y-1">
                    <div className="flex items-center gap-1.5 text-muted text-[11px] font-medium">
                      <Building className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Organization</span>
                    </div>
                    <p className="font-semibold text-primary truncate text-sm">
                      {lead.clientInfo?.company || lead.company || 'Direct Engagement'}
                    </p>
                    <span className="text-[10px] text-muted block">Client Entity</span>
                  </div>

                  {/* Contact Email / Channel */}
                  <div className="p-3.5 rounded-xl bg-card border border-theme shadow-sm dark:shadow-none space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-muted text-[11px] font-medium">
                        <Mail className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Outreach Email / Channel</span>
                      </div>
                      {lead.clientInfo?.email && (
                        <button
                          type="button"
                          onClick={() => handleCopyContactEmail(lead.clientInfo.email)}
                          className="text-[10px] text-brand-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          {copiedContactEmail ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                    <p className="font-semibold text-primary truncate text-sm">
                      {lead.clientInfo?.email ? (
                        <a
                          href={`mailto:${lead.clientInfo.email}`}
                          className="hover:underline text-brand-600 dark:text-brand-400"
                        >
                          {lead.clientInfo.email}
                        </a>
                      ) : (
                        'Platform Direct / Bid System'
                      )}
                    </p>
                    <span className="text-[10px] text-muted block">
                      {lead.clientInfo?.email ? 'Direct Inbox Available' : 'Dispatched via In-Platform Messaging'}
                    </span>
                  </div>

                  {/* Budget & Engagement */}
                  <div className="p-3.5 rounded-xl bg-card border border-theme shadow-sm dark:shadow-none space-y-1">
                    <div className="flex items-center gap-1.5 text-muted text-[11px] font-medium">
                      <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                      <span>Project Budget</span>
                    </div>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 truncate text-sm">
                      {lead.budget?.amount > 0
                        ? `${lead.budget.currency && lead.budget.currency !== 'USD' ? lead.budget.currency + ' ' : '$'}${lead.budget.amount.toLocaleString()} (${lead.budget.type || 'fixed'})`
                        : 'Flexible / Market Rate'}
                    </p>
                    <span className="text-[10px] text-muted block">
                      {lead.budget?.type === 'hourly' ? 'Hourly Engagement' : 'Fixed Milestone / Escrow'}
                    </span>
                  </div>

                  {/* Location / Geography */}
                  <div className="p-3.5 rounded-xl bg-card border border-theme shadow-sm dark:shadow-none space-y-1">
                    <div className="flex items-center gap-1.5 text-muted text-[11px] font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>Client Location</span>
                    </div>
                    <p className="font-semibold text-primary truncate text-sm">
                      {lead.clientInfo?.location || 'Remote / Global'}
                    </p>
                    <span className="text-[10px] text-muted block">Timezone / Geography</span>
                  </div>

                  {/* Client Website */}
                  <div className="p-3.5 rounded-xl bg-card border border-theme shadow-sm dark:shadow-none space-y-1">
                    <div className="flex items-center gap-1.5 text-muted text-[11px] font-medium">
                      <Globe className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Web / Digital Presence</span>
                    </div>
                    <p className="font-semibold text-primary truncate text-sm">
                      {lead.clientInfo?.website ? (
                        <a
                          href={lead.clientInfo.website.startsWith('http') ? lead.clientInfo.website : `https://${lead.clientInfo.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                        >
                          <span className="truncate">{lead.clientInfo.website.replace(/^https?:\/\//, '')}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        'Not Disclosed'
                      )}
                    </p>
                    <span className="text-[10px] text-muted block">Online Footprint</span>
                  </div>
                </div>
              </div>

              {/* 3. REQUIRED SKILLS & TECHNOLOGIES */}
              {lead.skillsRequired?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-secondary block">Required Skills & Technologies</span>
                    <span className="text-[10px] text-muted font-medium">{lead.skillsRequired.length} Skills Listed</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lead.skillsRequired.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-medium bg-card text-primary px-3 py-1 rounded-lg border border-theme shadow-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. COMPLETE JOB DESCRIPTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary block">Complete Job Description</span>
                  {lead.description && (
                    <span className="text-[10px] text-muted font-mono">
                      {lead.description.length.toLocaleString()} characters ({lead.description.trim().split(/\s+/).length} words)
                    </span>
                  )}
                </div>
                <div className="p-5 rounded-xl bg-card border border-theme text-xs text-secondary whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto font-sans shadow-sm dark:shadow-none select-text">
                  {lead.description || 'No extended description provided.'}
                </div>
              </div>

              {/* STEP 1 FOOTER: NEXT STEP BUTTON */}
              <div className="p-4 rounded-xl bg-card border border-theme flex items-center justify-between gap-4 shadow-sm dark:shadow-none">
                <div>
                  <h4 className="text-xs font-bold text-primary">Next Step: 60-Second Video Demo & Prep</h4>
                  <p className="text-[11px] text-secondary mt-0.5">
                    {lead.demoScript?.hook
                      ? 'AI demo script and tips are already prepared for this lead.'
                      : 'Gemini will automatically analyze the job and generate your tailored 60s demo script.'}
                  </p>
                </div>
                <button
                  onClick={handleProceedToDemo}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-xl shadow-lg shadow-brand-600/30 transition-all flex-shrink-0 cursor-pointer"
                >
                  <span>{lead.demoScript?.hook ? 'View Demo Script' : 'Proceed to Demo Prep'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: DEMO SCRIPT & PRE-REQS (WITH AUTONOMOUS AI OVERLAY)    */}
          {/* ============================================================ */}
          {activeTab === 'demo' && (
            <div className="relative space-y-6 max-w-4xl mx-auto">
              {/* FUTURISTIC AI LOADING OVERLAY (Active during generation) */}
              {isAuditing && (
                <div className="absolute inset-0 z-30 bg-[#0c1222]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                  {/* Cyber glowing orb */}
                  <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-brand-500/20 blur-xl animate-pulse" />
                    <div className="w-16 h-16 rounded-full border-2 border-brand-500/40 border-t-brand-400 border-r-indigo-400 animate-spin" />
                    <Cpu className="w-8 h-8 text-brand-400 absolute" />
                  </div>

                  {/* Scanning beam effect */}
                  <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden mb-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-500 to-transparent w-1/2 animate-shimmer" />
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Gemini Autonomous AI Preparing 60s Demo Script
                  </h3>

                  <p className="text-xs text-brand-300 mt-2 font-medium min-h-[20px] transition-all">
                    {auditSteps[aiStepIndex]}
                  </p>

                  <span className="text-[10px] text-slate-500 mt-4 uppercase tracking-wider font-semibold">
                    Synthesizing hooks • Identifying micro-solution • Crafting profile tips
                  </span>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    60-Second Video Demo Script & Recording Guide
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRunAudit(lead._id)}
                    disabled={isAuditing}
                    className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary px-3 py-1.5 rounded-lg bg-card border border-theme hover:bg-card-subtle transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
                    <span>Regenerate Script</span>
                  </button>
                  {lead.demoScript?.hook && (
                    <button
                      onClick={handleCopyScript}
                      className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary px-3 py-1.5 rounded-lg bg-card border border-theme hover:bg-card-subtle transition-colors shadow-sm cursor-pointer"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? 'Copied to Clipboard' : 'Copy Full Script'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Optimization Tips */}
              {lead.profileOptimizationTips?.length > 0 && (
                <div className="p-4 rounded-xl bg-card border border-theme space-y-2.5 shadow-sm dark:shadow-none">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Profile & Proposal Optimization Strategy
                  </h4>
                  <ul className="space-y-2">
                    {lead.profileOptimizationTips.map((tip, idx) => (
                      <li key={idx} className="text-xs text-secondary flex items-start gap-2.5">
                        <span className="text-amber-500 font-bold mt-0.5">•</span>
                        <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 60-Second Script Structured Blocks */}
              {lead.demoScript?.hook ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-card border border-theme space-y-1.5 shadow-sm dark:shadow-none">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        0:00 - 0:10 • The Attention Hook
                      </span>
                      <span className="text-[10px] text-muted font-medium">10 Seconds</span>
                    </div>
                    <p className="text-xs text-primary leading-relaxed font-sans">{lead.demoScript.hook}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-theme space-y-1.5 shadow-sm dark:shadow-none">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                        0:10 - 0:25 • Problem Statement
                      </span>
                      <span className="text-[10px] text-muted font-medium">15 Seconds</span>
                    </div>
                    <p className="text-xs text-primary leading-relaxed font-sans">
                      {lead.demoScript.problemStatement}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-theme space-y-1.5 shadow-sm dark:shadow-none">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        0:25 - 0:50 • Micro-Solution & Proof
                      </span>
                      <span className="text-[10px] text-muted font-medium">25 Seconds</span>
                    </div>
                    <p className="text-xs text-primary leading-relaxed font-sans">
                      {lead.demoScript.microSolution}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-card border border-theme space-y-1.5 shadow-sm dark:shadow-none">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                        0:50 - 1:00 • Call To Action
                      </span>
                      <span className="text-[10px] text-muted font-medium">10 Seconds</span>
                    </div>
                    <p className="text-xs text-primary leading-relaxed font-sans">
                      {lead.demoScript.callToAction}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center rounded-xl bg-card border border-theme space-y-3 shadow-sm dark:shadow-none">
                  <p className="text-xs text-secondary">No demo script generated yet.</p>
                  <button
                    onClick={() => onRunAudit(lead._id)}
                    disabled={isAuditing}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                  >
                    Generate Demo Script with Gemini
                  </button>
                </div>
              )}

              {/* Loom / Video URL Upload & Next Step */}
              <div className="p-5 rounded-xl bg-card border border-theme space-y-4 shadow-sm dark:shadow-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-brand-500" />
                      Attach Recorded Demo Video (Loom, YouTube, Drive)
                    </h4>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Paste your recorded video URL. Submitting this will automatically generate your personalized outreach pitch!
                    </p>
                  </div>
                  {lead.demoVideoUrl && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold flex-shrink-0">
                      <Check className="w-3.5 h-3.5" /> Video Attached
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="url"
                    placeholder="https://www.loom.com/share/..."
                    value={videoUrlInput}
                    onChange={(e) => setVideoUrlInput(e.target.value)}
                    className="flex-1 bg-surface border border-theme rounded-xl px-3.5 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 shadow-sm"
                  />
                  <button
                    onClick={handleSaveVideoAndProceed}
                    disabled={isGeneratingPitch}
                    className="flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold !text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-xl transition-all shadow-md shadow-brand-600/25 flex-shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{videoUrlInput.trim() ? 'Save Video & Generate Pitch' : 'Generate Outreach Pitch'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: OUTREACH PITCH (WITH AUTONOMOUS AI OVERLAY)           */}
          {/* ============================================================ */}
          {activeTab === 'pitch' && (
            <div className="relative space-y-6 max-w-4xl mx-auto">
              {/* FUTURISTIC AI LOADING OVERLAY (Active during pitch generation) */}
              {isGeneratingPitch && (
                <div className="absolute inset-0 z-30 bg-[#0c1222]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                  <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                    <div className="w-16 h-16 rounded-full border-2 border-emerald-500/40 border-t-emerald-400 border-r-brand-400 animate-spin" />
                    <Send className="w-8 h-8 text-emerald-400 absolute" />
                  </div>

                  <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden mb-4 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500 to-transparent w-1/2 animate-shimmer" />
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Gemini Synthesizing High-Conversion Outreach Pitch
                  </h3>

                  <p className="text-xs text-emerald-300 mt-2 font-medium min-h-[20px] transition-all">
                    {pitchSteps[aiStepIndex]}
                  </p>

                  <span className="text-[10px] text-slate-500 mt-4 uppercase tracking-wider font-semibold">
                    Embedding demo link • Personalizing hook • Formatting delivery channels
                  </span>
                </div>
              )}

              {/* Pitch Header Controls */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Personalized Outreach Pitch Draft
                  </h3>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Target Channel: <span className="text-brand-600 dark:text-brand-300 font-semibold">{lead.clientInfo?.email ? lead.clientInfo.email : `${lead.platform} direct proposal/message`}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegeneratePitch}
                    disabled={isGeneratingPitch}
                    className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary px-3 py-1.5 rounded-lg bg-card border border-theme hover:bg-card-subtle transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPitch ? 'animate-spin' : ''}`} />
                    <span>Regenerate Pitch</span>
                  </button>

                  <button
                    onClick={handleCopyPitch}
                    className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary px-3 py-1.5 rounded-lg bg-card border border-theme hover:bg-card-subtle transition-colors shadow-sm cursor-pointer"
                  >
                    {copiedPitch ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPitch ? 'Copied' : 'Copy Full Pitch'}</span>
                  </button>
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary block">Outreach Email Subject</label>
                <input
                  type="text"
                  value={pitchSubject}
                  onChange={(e) => setPitchSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="w-full bg-surface border border-theme rounded-xl px-4 py-2.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 font-medium shadow-sm"
                />
              </div>

              {/* Message Body Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-secondary block">Message Body Content</label>
                <textarea
                  rows={10}
                  value={pitchBody}
                  onChange={(e) => setPitchBody(e.target.value)}
                  placeholder="Draft message content..."
                  className="w-full bg-surface border border-theme rounded-xl p-4 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 leading-relaxed font-sans shadow-sm"
                />
              </div>

              {/* Dispatch Section */}
              <div className="p-5 rounded-xl bg-card border border-theme space-y-4 shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-primary">Select Dispatch Channel</h4>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Dispatching moves the lead to <b>Contacted</b> and starts the 3-touch follow-up timeline.
                    </p>
                  </div>
                  {sendSuccessMsg && (
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      <span>{sendSuccessMsg}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Copy & Open Job Listing */}
                  <button
                    onClick={() => handleDispatch('manual')}
                    disabled={isSending}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-secondary hover:text-primary bg-card-subtle hover:bg-slate-200/60 dark:hover:bg-slate-700 active:scale-95 rounded-xl border border-theme transition-all shadow-sm cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-brand-500" />
                    <span>Copy & Open Job Listing</span>
                  </button>

                  {/* Send Email via SMTP */}
                  <button
                    onClick={() => handleDispatch('smtp')}
                    disabled={isSending}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'Dispatching Email...' : 'Send Email via SMTP'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: COOLDOWN & FOLLOW-UPS SEQUENCE                        */}
          {/* ============================================================ */}
          {activeTab === 'followups' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Cooldown Header Banner */}
              <div className="p-5 rounded-xl bg-card border border-theme flex items-center justify-between gap-4 flex-wrap shadow-sm dark:shadow-none">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    Automated Cooldown & 3-Touch Follow-up Sequence
                  </h3>
                  <p className="text-[11px] text-secondary mt-1">
                    Sequences pause immediately the exact second a client replies, preventing embarrassing spam.
                  </p>
                </div>

                {lead.stage !== 'replied' ? (
                  <button
                    onClick={() => onClientReplied(lead._id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-4 py-2 rounded-xl border border-rose-500/25 transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-rose-500" />
                    <span>Client Replied! (Halt Follow-ups)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3.5 py-1.5 rounded-lg border border-rose-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Client Responded • All Follow-ups Stopped</span>
                  </div>
                )}
              </div>

              {/* Follow-up Sequence Cards */}
              <div className="space-y-3">
                {(lead.followUps?.length
                  ? lead.followUps
                  : [
                      { stage: 'day_2', delayDays: 2, status: 'pending', subject: 'Quick Bump & Context Re-check' },
                      { stage: 'day_7', delayDays: 7, status: 'pending', subject: 'Technical Value-Add Architecture Tip' },
                      { stage: 'day_21', delayDays: 21, status: 'pending', subject: 'Closing Project File & Final Check-in' }
                    ]
                ).map((followUp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-card border border-theme space-y-2 hover:border-brand-300 dark:hover:border-slate-700 transition-colors shadow-sm dark:shadow-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-card-subtle text-secondary border border-theme text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-primary">
                          Touch {idx + 1}: After {followUp.delayDays || (idx === 0 ? 2 : idx === 1 ? 7 : 21)} Days
                        </span>
                      </div>

                      <span
                        className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md ${
                          followUp.status === 'sent'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : followUp.status === 'ready'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse'
                            : followUp.status === 'skipped'
                            ? 'bg-card-subtle text-muted border border-theme'
                            : 'bg-card-subtle text-secondary border border-theme'
                        }`}
                      >
                        {followUp.status || 'pending'}
                      </span>
                    </div>

                    {followUp.subject && (
                      <p className="text-xs text-brand-600 dark:text-brand-300 font-medium pl-8">{followUp.subject}</p>
                    )}
                    {followUp.body && (
                      <p className="text-xs text-secondary whitespace-pre-wrap bg-surface p-3 rounded-xl border border-theme ml-8 leading-relaxed">
                        {followUp.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
