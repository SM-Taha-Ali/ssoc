import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  Key,
  Rss,
  Mail,
  Plus,
  Trash2,
  Check,
  Copy,
  Sparkles,
  Link,
  ShieldAlert,
  Zap,
  Clock,
  Database,
  AlertTriangle
} from 'lucide-react';
import CustomSelect from './CustomSelect.jsx';

const GEMINI_MODEL_OPTIONS = [
  { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Recommended)' },
  { value: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash (Balanced)' },
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite (High Speed)' }
];

const MODAL_FEED_PLATFORM_OPTIONS = [
  { value: 'upwork', label: 'Upwork RSS' },
  { value: 'remoteok', label: 'RemoteOK' },
  { value: 'weworkremotely', label: 'WeWorkRemotely' },
  { value: 'ycombinator', label: 'Y Combinator' },
  { value: 'rss', label: 'Generic RSS' }
];
import axios from 'axios';

export default function SettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('company'); // 'company' | 'ai' | 'email' | 'feeds'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Company Profile State
  const [company, setCompany] = useState({
    name: '',
    tagline: '',
    website: '',
    valueProposition: '',
    targetServices: [],
    targetKeywords: [],
    negativeKeywords: [],
    minBudget: 100,
    portfolioLinks: [],
    senderName: '',
    senderTitle: '',
    senderEmail: ''
  });

  // String helpers for arrays
  const [servicesStr, setServicesStr] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [negativeKeywordsStr, setNegativeKeywordsStr] = useState('');

  // Integrations State
  const [integrations, setIntegrations] = useState({
    geminiApiKey: '',
    geminiModel: 'gemini-3.8-flash',
    emailProvider: 'manual',
    smtp: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromEmail: '',
      fromName: ''
    },
    resend: {
      apiKey: '',
      fromEmail: ''
    },
    apolloApiKey: '',
    rssFeeds: []
  });

  // New RSS Feed input
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedPlatform, setNewFeedPlatform] = useState('upwork');
  const [newFeedUrl, setNewFeedUrl] = useState('');

  // Scheduler & Maintenance State
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [triggeringFinder, setTriggeringFinder] = useState(false);
  const [triggeringCooldown, setTriggeringCooldown] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchSchedulerStatus();
  }, []);

  const fetchSchedulerStatus = async () => {
    try {
      const res = await axios.get('/api/integrations/scheduler-status');
      setSchedulerStatus(res.data);
    } catch (e) {
      console.error('Failed to fetch scheduler status:', e);
    }
  };

  const handleTriggerFinder = async () => {
    setTriggeringFinder(true);
    setMaintenanceMsg('');
    try {
      const res = await axios.post('/api/integrations/run-lead-finder');
      setMaintenanceMsg(`Success: ${res.data.message}`);
      fetchSchedulerStatus();
      if (typeof window !== 'undefined' && window.__refreshLeads) {
        window.__refreshLeads();
      }
    } catch (err) {
      setMaintenanceMsg(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setTriggeringFinder(false);
    }
  };

  const handleTriggerCooldown = async () => {
    setTriggeringCooldown(true);
    setMaintenanceMsg('');
    try {
      const res = await axios.post('/api/integrations/run-cooldown-tracker');
      setMaintenanceMsg(`Success: ${res.data.message}`);
      fetchSchedulerStatus();
    } catch (err) {
      setMaintenanceMsg(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setTriggeringCooldown(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('Are you sure you want to completely clear all leads from the database? This cannot be undone.')) {
      return;
    }
    setResettingDb(true);
    setMaintenanceMsg('');
    try {
      const res = await axios.post('/api/integrations/reset-database');
      setMaintenanceMsg(`Database Reset: ${res.data.message}`);
      fetchSchedulerStatus();
      if (typeof window !== 'undefined' && window.__refreshLeads) {
        window.__refreshLeads();
      }
    } catch (err) {
      setMaintenanceMsg(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setResettingDb(false);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [compRes, intRes] = await Promise.all([
        axios.get('/api/company-profile'),
        axios.get('/api/integrations')
      ]);

      if (compRes.data) {
        setCompany(compRes.data);
        setServicesStr((compRes.data.targetServices || []).join('\n'));
        setKeywordsStr((compRes.data.targetKeywords || []).join(', '));
        setNegativeKeywordsStr((compRes.data.negativeKeywords || []).join(', '));
      }

      if (intRes.data) {
        setIntegrations(intRes.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess('');
    try {
      const updatedCompany = {
        ...company,
        targetServices: servicesStr.split('\n').map((s) => s.trim()).filter(Boolean),
        targetKeywords: keywordsStr.split(',').map((s) => s.trim()).filter(Boolean),
        negativeKeywords: negativeKeywordsStr.split(',').map((s) => s.trim()).filter(Boolean)
      };

      await Promise.all([
        axios.put('/api/company-profile', updatedCompany),
        axios.put('/api/integrations', integrations)
      ]);

      setSaveSuccess('All configurations saved successfully!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRss = async (e) => {
    e.preventDefault();
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;

    try {
      const res = await axios.post('/api/integrations/rss', {
        name: newFeedName,
        platform: newFeedPlatform,
        url: newFeedUrl
      });
      setIntegrations({
        ...integrations,
        rssFeeds: [...(integrations.rssFeeds || []), res.data]
      });
      setNewFeedName('');
      setNewFeedUrl('');
    } catch (err) {
      console.error('Error adding RSS feed:', err);
    }
  };

  const handleDeleteRss = async (feedId) => {
    try {
      await axios.delete(`/api/integrations/rss/${feedId}`);
      setIntegrations({
        ...integrations,
        rssFeeds: integrations.rssFeeds.filter((f) => f.id !== feedId)
      });
    } catch (err) {
      console.error('Error deleting feed:', err);
    }
  };

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/integrations/inbound-webhook`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-surface border border-theme rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-theme flex items-center justify-between bg-card">
          <div>
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              SSOC Operations Settings
              <span className="text-[10px] text-emerald-500 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Multi-Tenant & Zero-Hardcoded
              </span>
            </h3>
            <p className="text-xs text-secondary">Configure your company identity, targeting rules, AI model, and dispatch channels.</p>
          </div>
          <button onClick={onClose} className="p-1 text-secondary hover:text-primary rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-theme bg-card-subtle text-xs font-semibold px-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('company')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'company'
                ? 'border-brand-500 text-brand-500 font-bold'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-brand-400" />
            Company & Targeting
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Gemini AI Settings
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'email'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-emerald-400" />
            Delivery & Email ($0 SMTP / Resend)
          </button>

          <button
            onClick={() => setActiveTab('feeds')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'feeds'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rss className="w-3.5 h-3.5 text-sky-400" />
            Lead Feeds & Inbound Webhook
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'schedules'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            Automations & Maintenance
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading configurations...</div>
          ) : (
            <>
              {/* TAB 1: COMPANY & TARGETING */}
              {activeTab === 'company' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Company / Agency Name</label>
                      <input
                        type="text"
                        value={company.name}
                        onChange={(e) => setCompany({ ...company, name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tagline</label>
                      <input
                        type="text"
                        value={company.tagline}
                        onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Value Proposition (Injected into AI pitch drafts)
                    </label>
                    <textarea
                      rows={2}
                      value={company.valueProposition}
                      onChange={(e) => setCompany({ ...company, valueProposition: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Sender Name</label>
                      <input
                        type="text"
                        value={company.senderName}
                        onChange={(e) => setCompany({ ...company, senderName: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Sender Title</label>
                      <input
                        type="text"
                        value={company.senderTitle}
                        onChange={(e) => setCompany({ ...company, senderTitle: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Sender Email</label>
                      <input
                        type="email"
                        value={company.senderEmail}
                        onChange={(e) => setCompany({ ...company, senderEmail: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Target Services (One per line)
                    </label>
                    <textarea
                      rows={3}
                      value={servicesStr}
                      onChange={(e) => setServicesStr(e.target.value)}
                      placeholder="e.g. AI & Workflows (AI agents, n8n, RAG)&#10;Full-Stack Apps (React, Node, MERN)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-brand-500 font-mono text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Target Keywords (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={keywordsStr}
                        onChange={(e) => setKeywordsStr(e.target.value)}
                        placeholder="AI, Agent, n8n, React, DevOps, MERN"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Negative Keywords (Exclude automatically)
                      </label>
                      <input
                        type="text"
                        value={negativeKeywordsStr}
                        onChange={(e) => setNegativeKeywordsStr(e.target.value)}
                        placeholder="unpaid, internship, volunteer, crypto shill"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GEMINI AI */}
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Google Gemini Engine
                    </h4>
                    <p className="text-slate-400">
                      Configure your Google AI Studio API key and desired model.
                    </p>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Gemini API Key
                      </label>
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={integrations.geminiApiKey || ''}
                        onChange={(e) => setIntegrations({ ...integrations, geminiApiKey: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Get a free key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-brand-400 underline">aistudio.google.com</a>. If omitted, the server checks <code className="text-slate-400">process.env.GEMINI_API_KEY</code>.
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Gemini Model
                      </label>
                      <CustomSelect
                        value={integrations.geminiModel || 'gemini-3.8-flash'}
                        onChange={(val) => setIntegrations({ ...integrations, geminiModel: val })}
                        options={GEMINI_MODEL_OPTIONS}
                        className="w-full"
                        buttonClassName="w-full bg-slate-950 border-slate-800 py-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DELIVERY & EMAIL */}
              {activeTab === 'email' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                      Default Outreach Sending Provider
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setIntegrations({ ...integrations, emailProvider: 'manual' })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          integrations.emailProvider === 'manual'
                            ? 'border-brand-500 bg-brand-500/10 text-white'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold block text-xs">Manual Fallback</span>
                        <span className="text-[10px] text-slate-400">1-Click Copy & Open Link ($0)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIntegrations({ ...integrations, emailProvider: 'smtp' })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          integrations.emailProvider === 'smtp'
                            ? 'border-brand-500 bg-brand-500/10 text-white'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold block text-xs">Standard SMTP</span>
                        <span className="text-[10px] text-slate-400">Gmail / Outlook / SES ($0)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIntegrations({ ...integrations, emailProvider: 'resend' })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          integrations.emailProvider === 'resend'
                            ? 'border-brand-500 bg-brand-500/10 text-white'
                            : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold block text-xs">Resend API</span>
                        <span className="text-[10px] text-slate-400">Transactional Free Tier</span>
                      </button>
                    </div>
                  </div>

                  {/* SMTP Settings */}
                  {integrations.emailProvider === 'smtp' && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-white">SMTP Configuration</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Host</label>
                          <input
                            type="text"
                            placeholder="smtp.gmail.com"
                            value={integrations.smtp?.host || ''}
                            onChange={(e) => setIntegrations({
                              ...integrations,
                              smtp: { ...integrations.smtp, host: e.target.value }
                            })}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Port</label>
                          <input
                            type="number"
                            placeholder="587"
                            value={integrations.smtp?.port || 587}
                            onChange={(e) => setIntegrations({
                              ...integrations,
                              smtp: { ...integrations.smtp, port: Number(e.target.value) }
                            })}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Username / Email</label>
                          <input
                            type="text"
                            value={integrations.smtp?.user || ''}
                            onChange={(e) => setIntegrations({
                              ...integrations,
                              smtp: { ...integrations.smtp, user: e.target.value }
                            })}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">App Password</label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={integrations.smtp?.pass || ''}
                            onChange={(e) => setIntegrations({
                              ...integrations,
                              smtp: { ...integrations.smtp, pass: e.target.value }
                            })}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resend Settings */}
                  {integrations.emailProvider === 'resend' && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-white">Resend API Key</h4>
                      <div>
                        <input
                          type="password"
                          placeholder="re_..."
                          value={integrations.resend?.apiKey || ''}
                          onChange={(e) => setIntegrations({
                            ...integrations,
                            resend: { ...integrations.resend, apiKey: e.target.value }
                          })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FEEDS & INBOUND WEBHOOK */}
              {activeTab === 'feeds' && (
                <div className="space-y-4">
                  {/* Webhook Info */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-brand-300 flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5" />
                      Inbound Lead Webhook (Apollo / Zapier / Scrapers)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Send any POST request with JSON payload <code className="text-slate-300">{"{ title, description, platform, clientInfo, budget }"}</code> to push leads directly:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/api/integrations/inbound-webhook`}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 font-mono"
                      />
                      <button
                        onClick={copyWebhookUrl}
                        className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                      >
                        {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedWebhook ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Apollo API Key Card */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Apollo.io Prospecting API
                      </h4>
                      <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20 font-semibold">
                        Direct Decision-Makers
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Enables the automated Daily Lead Finder to query Apollo for founders, CTOs, and engineering heads matching your target keywords:
                    </p>
                    <input
                      type="password"
                      placeholder="Enter Apollo API Key (or set APOLLO_API_KEY in .env)"
                      value={integrations.apolloApiKey || ''}
                      onChange={(e) => setIntegrations({ ...integrations, apolloApiKey: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>

                  {/* Active Feeds List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Active Lead Feeds ({integrations.rssFeeds?.length || 0})
                    </h4>

                    {(integrations.rssFeeds || []).map((feed) => (
                      <div
                        key={feed.id}
                        className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {feed.platform}
                            </span>
                            <span className="font-semibold text-slate-200">{feed.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate max-w-md mt-0.5">{feed.url}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteRss(feed.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Feed Form */}
                  <form onSubmit={handleAddRss} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <h5 className="text-xs font-bold text-slate-200">Add New Search RSS Feed (Upwork, WWR, YC, RemoteOK)</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Feed Name (e.g. Upwork AI Workflows)"
                        value={newFeedName}
                        onChange={(e) => setNewFeedName(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                      />
                      <CustomSelect
                        value={newFeedPlatform}
                        onChange={setNewFeedPlatform}
                        options={MODAL_FEED_PLATFORM_OPTIONS}
                        size="sm"
                        className="w-full"
                        buttonClassName="w-full bg-slate-950 border-slate-800"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://www.upwork.com/ab/feed/jobs/rss?q=..."
                        value={newFeedUrl}
                        onChange={(e) => setNewFeedUrl(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded transition-colors whitespace-nowrap"
                      >
                        Add Feed
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 5: AUTOMATIONS & MAINTENANCE */}
              {activeTab === 'schedules' && (
                <div className="space-y-4">
                  {maintenanceMsg && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      maintenanceMsg.startsWith('Error')
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}>
                      <span>{maintenanceMsg}</span>
                      <button onClick={() => setMaintenanceMsg('')} className="text-slate-400 hover:text-white ml-2">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Lead Finder Automation Card */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Daily Lead Finder Cron Job</h4>
                          <p className="text-[11px] text-slate-400">
                            Schedule: <span className="text-sky-300 font-mono font-semibold">{schedulerStatus?.leadFinderSchedule || '0 8 * * *'}</span> ({schedulerStatus?.leadFinderHuman || 'Every day at 8:00 AM'})
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Configured & Active
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      When triggered, it crawls active sources, removes duplicates, checks your positive & negative keywords, audits matches via Gemini AI, and inserts discovered tech leads.
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px] text-slate-400">
                        Active Sources: <span className="text-slate-200 font-medium">RemoteOK, Freelancer, Y Combinator, WeWorkRemotely, Apollo</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleTriggerFinder}
                        disabled={triggeringFinder}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white rounded text-xs font-semibold shadow transition-all disabled:opacity-50"
                      >
                        <Play className={`w-3 h-3 ${triggeringFinder ? 'animate-spin' : ''}`} />
                        {triggeringFinder ? 'Running Lead Finder...' : 'Run Lead Finder Now'}
                      </button>
                    </div>
                  </div>

                  {/* Cooldown Tracker Automation Card */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Daily Follow-Up & Lost Lead Tracker</h4>
                          <p className="text-[11px] text-slate-400">
                            Schedule: <span className="text-purple-300 font-mono font-semibold">{schedulerStatus?.cooldownSchedule || '0 9 * * *'}</span> ({schedulerStatus?.cooldownHuman || 'Every day at 9:00 AM'})
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Configured & Active
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Scans leads in sent/follow-up stage. Progresses follow-ups automatically after Day 7, Day 21, and monthly for 4 months. Unreplied leads are automatically moved to <strong>9. Lost</strong>.
                    </p>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleTriggerCooldown}
                        disabled={triggeringCooldown}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        <Play className={`w-3 h-3 ${triggeringCooldown ? 'animate-spin text-purple-400' : ''}`} />
                        {triggeringCooldown ? 'Checking Follow-ups...' : 'Check Follow-ups Now'}
                      </button>
                    </div>
                  </div>

                  {/* Database Maintenance Card */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-rose-950/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                          <Database className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Database Pipeline Reset</h4>
                          <p className="text-[11px] text-slate-400">
                            Current Leads in Database: <span className="text-white font-bold">{schedulerStatus?.totalLeadsInDb ?? 0}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Want to start completely fresh? Clearing the database wipes out all leads from the pipeline while safely preserving your company profile and integration credentials.
                    </p>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleResetDatabase}
                        disabled={resettingDb}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 active:scale-95 text-white rounded text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {resettingDb ? 'Clearing Database...' : 'Reset & Clear All Leads'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/80">
          {saveSuccess ? (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4" />
              {saveSuccess}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-lg shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
