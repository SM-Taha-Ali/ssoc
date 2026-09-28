import React, { useState, useEffect } from 'react';
import {
  Building,
  Briefcase,
  Target,
  Sparkles,
  Wand2,
  Mail,
  Rss,
  Clock,
  Play,
  Database,
  Check,
  Copy,
  AlertTriangle,
  Plus,
  Trash2,
  Key,
  Shield,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Cpu,
  X,
  Palette,
  Sun,
  Moon,
  Eye,
  CheckCircle2
} from 'lucide-react';
import CustomSelect from './CustomSelect.jsx';
import { useTheme, ACCENT_THEMES } from '../context/ThemeContext.jsx';

const FEED_PLATFORM_OPTIONS = [
  { value: 'upwork', label: 'Upwork' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'remoteok', label: 'RemoteOK' },
  { value: 'ycombinator', label: 'Y Combinator' },
  { value: 'rss', label: 'Generic RSS' }
];
import axios from 'axios';

export default function SettingsPage({ onBackToPipeline }) {
  const { mode, setMode, accent, setAccent } = useTheme();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Quick AI Setup State
  const [showQuickAiModal, setShowQuickAiModal] = useState(false);
  const [quickAiText, setQuickAiText] = useState('');
  const [quickAiExtracting, setQuickAiExtracting] = useState(false);
  const [quickAiSuccess, setQuickAiSuccess] = useState('');
  const [quickAiError, setQuickAiError] = useState('');

  // Company Profile state
  const [company, setCompany] = useState({
    name: '',
    tagline: '',
    website: '',
    valueProposition: '',
    caseStudies: '',
    calendarLink: '',
    geographicPreference: 'Remote Worldwide (US/EU timezones preferred)',
    maxLeadsPerBatch: 20,
    minBudget: 150,
    senderName: '',
    senderTitle: '',
    senderEmail: ''
  });

  const [servicesStr, setServicesStr] = useState('');
  const [strengthsStr, setStrengthsStr] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');
  const [negativeKeywordsStr, setNegativeKeywordsStr] = useState('');
  const [industriesStr, setIndustriesStr] = useState('');
  const [rolesStr, setRolesStr] = useState('');
  const [disqualifiersStr, setDisqualifiersStr] = useState('');

  // Integrations state
  const [integrations, setIntegrations] = useState({
    geminiApiKey: '',
    geminiModel: 'Gemini 3.8 Flash',
    deliveryProvider: 'smtp',
    smtpConfig: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: '',
      pass: '',
      fromEmail: ''
    },
    resendConfig: {
      apiKey: '',
      fromEmail: ''
    },
    apolloApiKey: '',
    rssFeeds: []
  });

  // New RSS Feed input
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedPlatform, setNewFeedPlatform] = useState('remoteok');
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
        setStrengthsStr((compRes.data.coreStrengths || []).join('\n'));
        setKeywordsStr((compRes.data.targetKeywords || []).join(', '));
        setNegativeKeywordsStr((compRes.data.negativeKeywords || []).join(', '));
        setIndustriesStr((compRes.data.idealClientProfile?.industries || []).join(', '));
        setRolesStr((compRes.data.idealClientProfile?.targetRoles || []).join(', '));
        setDisqualifiersStr((compRes.data.disqualifiers || []).join('\n'));
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
      const updatedProfile = {
        ...company,
        targetServices: servicesStr.split('\n').map((s) => s.trim()).filter(Boolean),
        coreStrengths: strengthsStr.split('\n').map((s) => s.trim()).filter(Boolean),
        targetKeywords: keywordsStr.split(',').map((s) => s.trim()).filter(Boolean),
        negativeKeywords: negativeKeywordsStr.split(',').map((s) => s.trim()).filter(Boolean),
        disqualifiers: disqualifiersStr.split('\n').map((s) => s.trim()).filter(Boolean),
        idealClientProfile: {
          industries: industriesStr.split(',').map((s) => s.trim()).filter(Boolean),
          targetRoles: rolesStr.split(',').map((s) => s.trim()).filter(Boolean),
          companyStages: ['Pre-Seed to Series B', 'Profitable Bootstrapped', 'Fast-Growing SMBs']
        }
      };

      await Promise.all([
        axios.put('/api/company-profile', updatedProfile),
        axios.put('/api/integrations', integrations)
      ]);

      setSaveSuccess('Settings saved successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
      fetchSchedulerStatus();
      if (typeof window !== 'undefined' && window.__refreshLeads) {
        window.__refreshLeads();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
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

  const handleAddFeed = async (e) => {
    e.preventDefault();
    if (!newFeedName || !newFeedUrl) return;

    try {
      const res = await axios.post('/api/integrations/rss', {
        name: newFeedName,
        platform: newFeedPlatform,
        url: newFeedUrl
      });
      setIntegrations((prev) => ({
        ...prev,
        rssFeeds: [...(prev.rssFeeds || []), res.data]
      }));
      setNewFeedName('');
      setNewFeedUrl('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add RSS feed');
    }
  };

  const handleDeleteFeed = async (id) => {
    try {
      await axios.delete(`/api/integrations/rss/${id}`);
      setIntegrations((prev) => ({
        ...prev,
        rssFeeds: prev.rssFeeds.filter((f) => f.id !== id)
      }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove RSS feed');
    }
  };

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/integrations/inbound-webhook`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleQuickAiExtract = async () => {
    if (!quickAiText.trim()) {
      setQuickAiError('Please paste your website text or company bio.');
      return;
    }
    setQuickAiExtracting(true);
    setQuickAiError('');
    setQuickAiSuccess('');
    try {
      const res = await axios.post('/api/company-profile/ai-extract', { rawText: quickAiText });
      const data = res.data?.data;
      if (data) {
        if (data.name) setCompany(prev => ({ ...prev, name: data.name }));
        if (data.tagline) setCompany(prev => ({ ...prev, tagline: data.tagline }));
        if (data.website) setCompany(prev => ({ ...prev, website: data.website }));
        if (data.valueProposition) setCompany(prev => ({ ...prev, valueProposition: data.valueProposition }));
        if (data.caseStudies) {
          const formattedCaseStudies = Array.isArray(data.caseStudies)
            ? data.caseStudies.map((cs, i) => `${i + 1}. ${cs}`).join('\n')
            : String(data.caseStudies);
          setCompany(prev => ({ ...prev, caseStudies: formattedCaseStudies }));
        }
        
        if (Array.isArray(data.services) && data.services.length) {
          setServicesStr(data.services.join('\n'));
        }
        if (Array.isArray(data.strengths) && data.strengths.length) {
          setStrengthsStr(data.strengths.join('\n'));
        }
        if (Array.isArray(data.targetKeywords) && data.targetKeywords.length) {
          setKeywordsStr(data.targetKeywords.join(', '));
        }
        if (Array.isArray(data.negativeKeywords) && data.negativeKeywords.length) {
          setNegativeKeywordsStr(data.negativeKeywords.join(', '));
        }
        if (Array.isArray(data.disqualifiers) && data.disqualifiers.length) {
          setDisqualifiersStr(data.disqualifiers.join('\n'));
        }
        if (Array.isArray(data.targetIndustries) && data.targetIndustries.length) {
          setIndustriesStr(data.targetIndustries.join(', '));
        }
        if (Array.isArray(data.targetRoles) && data.targetRoles.length) {
          setRolesStr(data.targetRoles.join(', '));
        }
        setQuickAiSuccess('AI auto-extracted profile, value proposition, services, and targeting criteria!');
        setTimeout(() => {
          setShowQuickAiModal(false);
          setQuickAiSuccess('');
        }, 1600);
      }
    } catch (err) {
      setQuickAiError(err.response?.data?.error || err.message || 'Extraction failed');
    } finally {
      setQuickAiExtracting(false);
    }
  };

  const loadSampleAgencyText = () => {
    setQuickAiText(`Apex AI & Cloud Solutions is a specialized boutique software engineering consultancy.
Website: https://apexsolutions.io
We build autonomous AI agents, multi-agent RAG pipelines, and automated workflow orchestrations using n8n, Make, and Zapier. We also develop scalable modern web applications using React, Next.js, Node.js, and TypeScript.
Our superpower is cutting cloud infrastructure waste and modernizing legacy codebases into high-velocity microservices.
Past successes:
- Automated customer support triaging for a Series A FinTech using custom LangChain agents, cutting ticket turnaround by 64%.
- Engineered an automated enterprise payroll sync with Stripe and QuickBooks via n8n, processing $2.4M annually.
- Reduced AWS monthly bill from $18k to $7.2k for an e-commerce platform through database query caching and serverless migration.
We strictly work with B2B SaaS, FinTech, and venture-backed tech startups. We deal directly with CTOs, VPs of Engineering, and Technical Founders with project budgets starting above $500.`);
  };

  const navItems = [
    { id: 'company', label: 'Company Profile', icon: Building, desc: 'Agency name, team & sender credentials' },
    { id: 'valueprop', label: 'Value Proposition & Pitch', icon: Briefcase, desc: 'Core offers, strengths & client proof' },
    { id: 'targeting', label: 'Targeting & Ideal Client (ICP)', icon: Target, desc: 'Target industries, roles, keywords & rules' },
    { id: 'ai', label: 'Gemini AI Engine', icon: Cpu, desc: 'Model selection, API keys & reasoning' },
    { id: 'email', label: 'Delivery Channels', icon: Mail, desc: 'SMTP, Google Workspace, Resend API' },
    { id: 'feeds', label: 'Lead Sources & Webhooks', icon: Rss, desc: 'Job boards, RSS feeds & inbound webhook' },
    { id: 'schedules', label: 'Automations & Database', icon: Clock, desc: 'Daily scan schedules & system reset' },
    { id: 'theme', label: 'Appearance & Theme', icon: Palette, desc: 'Light & dark modes, executive accent colors' }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
        Loading operations settings...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full max-h-full overflow-hidden bg-canvas text-primary min-h-0">
      {/* LEFT SIDEBAR NAVIGATION (FIXED VIEWPORT HEIGHT) */}
      <aside className="w-full md:w-72 h-full max-h-full bg-surface border-r border-theme flex flex-col justify-between flex-shrink-0 min-h-0">
        <div className="h-14 px-5 border-b border-theme flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-bold text-primary tracking-tight">Operations Settings</h2>
          {onBackToPipeline && (
            <button
              onClick={onBackToPipeline}
              className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors"
            >
              Back
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto min-h-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-brand-500/15 border border-brand-500/30 text-primary shadow-sm font-semibold'
                    : 'text-secondary hover:text-primary hover:bg-card-subtle border border-transparent'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    isActive ? 'bg-brand-600 text-white shadow-md' : 'bg-card-subtle text-muted'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs ${isActive ? 'font-bold text-primary' : 'font-medium text-secondary'}`}>
                    {item.label}
                  </div>
                  <div className="text-[10px] text-muted truncate mt-0.5">{item.desc}</div>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-brand-400 mt-1" />}
              </button>
            );
          })}
        </nav>

        {/* Sticky Save Bar Permanently Pinned at Bottom of Left Sidebar */}
        <div className="p-4 border-t border-theme bg-surface flex-shrink-0">
          {saveSuccess && (
            <div className="mb-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-500 flex items-center gap-1.5 font-medium">
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              {saveSuccess}
            </div>
          )}
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 shadow-md shadow-brand-600/25 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving Changes...' : 'Save All Settings'}
          </button>
        </div>
      </aside>

      {/* RIGHT PANE: FULL-WIDTH CONTAINER TO SCREEN EDGE */}
      <section className="flex-1 h-full min-w-0 flex flex-col bg-canvas">
        {/* Full-width Top Breadcrumb & Action Bar */}
        <div className="h-14 px-8 border-b border-theme bg-surface backdrop-blur-md flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-secondary">Settings</span>
            <span className="text-muted">/</span>
            <span className="text-xs font-semibold text-primary">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                <Check className="w-3.5 h-3.5" /> Settings saved
              </span>
            )}
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Scrollable Content (Scrollbar is flush against the right edge of the screen) */}
        <div className="flex-1 h-full overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* TAB 1: COMPANY PROFILE (WHO WE ARE) */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Company Profile & Sender Details</h3>
              <p className="text-xs text-slate-400 mt-1">
                Basic organization details and outbound sender identity used across automated pitches and calendar bookings.
              </p>
            </div>

            {/* Quick AI Auto-Setup Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-brand-900/40 via-indigo-900/30 to-purple-900/20 border border-brand-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                  <Wand2 className="w-5 h-5 text-brand-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    Quick AI Auto-Setup
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      1-Click Extraction
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Paste your agency website copy or company bio. Gemini will auto-fill your profile, value proposition, and targeting rules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAiModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-md shadow-brand-600/30 transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Quick AI Setup</span>
              </button>
            </div>

            {/* Section: Organization Details */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-brand-400" />
                Organization Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Company / Agency Name
                  </label>
                  <input
                    type="text"
                    value={company.name || ''}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    placeholder="e.g. Apex AI & Cloud Engineering"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Company Tagline</label>
                  <input
                    type="text"
                    value={company.tagline || ''}
                    onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                    placeholder="e.g. Production AI Agents & Scalable Cloud Solutions"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Website URL</label>
                  <input
                    type="url"
                    value={company.website || ''}
                    onChange={(e) => setCompany({ ...company, website: e.target.value })}
                    placeholder="https://apexsolutions.io"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Calendar Booking Link (Injected into Pitches)
                  </label>
                  <input
                    type="url"
                    value={company.calendarLink || ''}
                    onChange={(e) => setCompany({ ...company, calendarLink: e.target.value })}
                    placeholder="https://calendly.com/your-name/30min"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Included in outbound emails and pitch video CTAs</p>
                </div>
              </div>
            </div>

            {/* Section: Sender Profile */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                Sender Profile (Appears on Dispatched Outreach)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Sender Name</label>
                  <input
                    type="text"
                    value={company.senderName || ''}
                    onChange={(e) => setCompany({ ...company, senderName: e.target.value })}
                    placeholder="Alex Vance"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Sender Title</label>
                  <input
                    type="text"
                    value={company.senderTitle || ''}
                    onChange={(e) => setCompany({ ...company, senderTitle: e.target.value })}
                    placeholder="Principal Solutions Architect"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Sender Email</label>
                  <input
                    type="email"
                    value={company.senderEmail || ''}
                    onChange={(e) => setCompany({ ...company, senderEmail: e.target.value })}
                    placeholder="alex@apexsolutions.io"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VALUE PROPOSITION & SERVICES (WHAT WE SELL) */}
        {activeTab === 'valueprop' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Value Proposition & Sales Positioning</h3>
              <p className="text-xs text-slate-400 mt-1">
                Define what you sell, your core technical superpowers, and past customer proof. Gemini AI uses this exact data to write personalized pitches and construct 60-second video demo scripts.
              </p>
            </div>

            {/* Quick AI Auto-Setup Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-brand-900/40 via-indigo-900/30 to-purple-900/20 border border-brand-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                  <Wand2 className="w-5 h-5 text-brand-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    Quick AI Auto-Setup
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      1-Click Extraction
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Paste your company capabilities or sales deck. Gemini will automatically distill your value proposition, services, and proof points.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAiModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-md shadow-brand-600/30 transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Quick AI Setup</span>
              </button>
            </div>

            {/* Primary Value Proposition */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  Primary Value Proposition & Transformation
                </label>
                <span className="text-[10px] text-brand-400 font-semibold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                  Core AI Pitch Anchor
                </span>
              </div>
              <textarea
                rows={4}
                value={company.valueProposition || ''}
                onChange={(e) => setCompany({ ...company, valueProposition: e.target.value })}
                placeholder="Describe what unique business outcomes you deliver. E.g.: We build production-ready custom AI agents, automated workflow pipelines (n8n/Zapier), and scalable MERN applications that drive revenue and cut infrastructure bills by 40%."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 leading-relaxed font-mono text-[11px]"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                This is heavily weighted by the AI when framing your outreach emails and 60-second video demo scripts.
              </p>
            </div>

            {/* Core Services Offered */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Core Services Offered (One per line)
              </label>
              <textarea
                rows={4}
                value={servicesStr}
                onChange={(e) => setServicesStr(e.target.value)}
                placeholder="Autonomous AI Agents & Voice Bots&#10;Workflow Automations (n8n, Zapier, Make, Webhooks)&#10;Full-Stack Web Apps (React, Next.js, Node.js, MERN)&#10;Cloud Infrastructure & AWS Cost Reduction"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono text-[11px] leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                These services are matched against job requirements during lead qualification.
              </p>
            </div>

            {/* Core Technical Strengths */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                Technical Strengths & Superpowers (One per line)
              </label>
              <textarea
                rows={4}
                value={strengthsStr}
                onChange={(e) => setStrengthsStr(e.target.value)}
                placeholder="Autonomous AI Agents (LangChain, LlamaIndex, OpenAI, Gemini)&#10;Enterprise Workflow Orchestration (n8n self-hosted, Make, Zapier)&#10;Modern React / Node.js Full-Stack Architecture&#10;High-Volume Database Migrations & API Optimizations"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono text-[11px] leading-relaxed"
              />
            </div>

            {/* Proven Case Studies & Client Wins */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Proven Case Studies, Metrics & Past Wins
              </label>
              <textarea
                rows={4}
                value={company.caseStudies || ''}
                onChange={(e) => setCompany({ ...company, caseStudies: e.target.value })}
                placeholder="1. Automated customer onboarding and Zendesk ticket triaging using custom AI agents, reducing support tickets by 62% for a Series A SaaS.&#10;2. Built multi-tenant n8n & Stripe synchronization pipeline processing $1.2M in annual transactions.&#10;3. Slashed monthly AWS infrastructure bill from $14k to $5.8k."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono text-[11px] leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Injected as real social proof into your cold pitches and profile optimization tips.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: TARGETING & IDEAL CLIENT (ICP) (WHO WE TARGET) */}
        {activeTab === 'targeting' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Targeting Rules & Ideal Client Profile (ICP)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Set the exact criteria for which opportunities get approved into your pipeline. The single-call LLM batch auditor uses these rules to reject irrelevant jobs and keep your focus on high-ticket leads.
              </p>
            </div>

            {/* Quick AI Auto-Setup Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-brand-900/40 via-indigo-900/30 to-purple-900/20 border border-brand-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                  <Wand2 className="w-5 h-5 text-brand-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    Quick AI Auto-Setup
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      1-Click Extraction
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Auto-generate target industries, decision maker titles, tech keywords, and disqualifiers using AI.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAiModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-md shadow-brand-600/30 transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Quick AI Setup</span>
              </button>
            </div>

            {/* Section: Ideal Client Profile (ICP) */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-400" />
                Ideal Client Profile (ICP)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Target Client Industries (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={industriesStr}
                    onChange={(e) => setIndustriesStr(e.target.value)}
                    placeholder="B2B SaaS, Startups, E-commerce, Digital Agencies, FinTech"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Target Decision-Maker Roles (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={rolesStr}
                    onChange={(e) => setRolesStr(e.target.value)}
                    placeholder="Founder / CEO, CTO, VP Engineering, Head of Product"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Section: Keywords & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Positive Keywords */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Positive Tech Keywords (Comma-separated)
                </label>
                <textarea
                  rows={3}
                  value={keywordsStr}
                  onChange={(e) => setKeywordsStr(e.target.value)}
                  placeholder="AI, Agent, n8n, Zapier, React, Node, MERN, Full Stack, Automation, Python, API, RAG, AWS"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Opportunities must match at least one keyword to pass initial ingestion.
                </p>
              </div>

              {/* Negative Keywords */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Negative Keywords (Comma-separated)
                </label>
                <textarea
                  rows={3}
                  value={negativeKeywordsStr}
                  onChange={(e) => setNegativeKeywordsStr(e.target.value)}
                  placeholder="unpaid, internship, volunteer, commission only, spanish speaking, german speaking, telemarketer"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Instantly discarded without consuming LLM credits.
                </p>
              </div>
            </div>

            {/* Strict Disqualifiers */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Strict AI Disqualifier Rules (Evaluated in Batch LLM Prompt)
              </label>
              <textarea
                rows={4}
                value={disqualifiersStr}
                onChange={(e) => setDisqualifiersStr(e.target.value)}
                placeholder="Non-tech sales or cold-calling telesales roles&#10;Specific non-English language requirements (e.g. Spanish-only or German-only customer service)&#10;Staffing agency or generic recruiter headhunting listings&#10;Unpaid internships or 100% commission/equity-only without baseline budget&#10;Basic data entry or virtual assistant tasks with zero engineering"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono text-[11px] leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Jobs matching any of these criteria are rejected during batch AI analysis.
              </p>
            </div>

            {/* Budget & Daily Cap */}
            <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Deal Criteria & Discovery Limits
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Max Discovered Leads Per Run / Day
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={company.maxLeadsPerBatch || 20}
                    onChange={(e) => setCompany({ ...company, maxLeadsPerBatch: parseInt(e.target.value) || 20 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Prevents pipeline noise (Recommended: 20)</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Minimum Project Budget ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={company.minBudget || 150}
                    onChange={(e) => setCompany({ ...company, minBudget: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Filters out micro-budget posts</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Geographic Preference
                  </label>
                  <input
                    type="text"
                    value={company.geographicPreference || ''}
                    onChange={(e) => setCompany({ ...company, geographicPreference: e.target.value })}
                    placeholder="Remote Worldwide (US/EU timezones preferred)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GEMINI AI ENGINE */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Gemini AI Engine Settings</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure Google Gemini LLM settings for high-speed single-call candidate filtering, 60-second video demo scripting, and personalized outreach pitches.
              </p>
            </div>

            {/* Model Selection */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-200 block">
                Select Gemini Model
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Gemini 3.8 Flash */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    integrations.geminiModel === 'Gemini 3.8 Flash' || integrations.geminiModel === 'gemini-3.8-flash'
                      ? 'bg-brand-600/10 border-brand-500 text-white shadow-sm ring-1 ring-brand-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="geminiModel"
                    value="Gemini 3.8 Flash"
                    checked={
                      integrations.geminiModel === 'Gemini 3.8 Flash' ||
                      integrations.geminiModel === 'gemini-3.8-flash'
                    }
                    onChange={(e) => setIntegrations({ ...integrations, geminiModel: e.target.value })}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                      Gemini 3.8 Flash
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-brand-500/20 text-brand-300 font-semibold uppercase">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Highest reasoning fidelity for executive pitches, deep technical scoring, and rich 60-second video demo scripts.
                    </p>
                  </div>
                </label>

                {/* Gemini 3.7 Flash */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    integrations.geminiModel === 'Gemini 3.7 Flash' || integrations.geminiModel === 'gemini-3.7-flash'
                      ? 'bg-brand-600/10 border-brand-500 text-white shadow-sm ring-1 ring-brand-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="geminiModel"
                    value="Gemini 3.7 Flash"
                    checked={
                      integrations.geminiModel === 'Gemini 3.7 Flash' ||
                      integrations.geminiModel === 'gemini-3.7-flash'
                    }
                    onChange={(e) => setIntegrations({ ...integrations, geminiModel: e.target.value })}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                      Gemini 3.7 Flash
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
                        Balanced
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Ultra-fast hybrid reasoning. Exceptional precision for qualification, audit breakdowns, and proposal hooks.
                    </p>
                  </div>
                </label>

                {/* Gemini 3.5 Flash Lite */}
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    integrations.geminiModel === 'Gemini 3.5 Flash Lite' || integrations.geminiModel === 'gemini-3.5-flash-lite'
                      ? 'bg-brand-600/10 border-brand-500 text-white shadow-sm ring-1 ring-brand-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="geminiModel"
                    value="Gemini 3.5 Flash Lite"
                    checked={
                      integrations.geminiModel === 'Gemini 3.5 Flash Lite' ||
                      integrations.geminiModel === 'gemini-3.5-flash-lite'
                    }
                    onChange={(e) => setIntegrations({ ...integrations, geminiModel: e.target.value })}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                      Gemini 3.5 Flash Lite
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-semibold uppercase">
                        High Speed
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Fastest response time and lowest token cost. Ideal for rapid high-volume lead qualification and filtering.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Gemini API Key */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-200 block">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={integrations.geminiApiKey || ''}
                onChange={(e) => setIntegrations({ ...integrations, geminiApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                You can obtain an API key for free at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:underline"
                >
                  Google AI Studio
                </a>
                . Keys saved here or in <code className="text-slate-400">server/.env</code> are securely encrypted.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: DELIVERY CHANNELS */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Delivery & Email Channels</h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose how customized sales pitches and follow-up sequences are delivered to prospect decision makers.
              </p>
            </div>

            {/* Delivery Provider Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SMTP Server / Google Workspace */}
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  integrations.deliveryProvider === 'smtp'
                    ? 'bg-brand-600/10 border-brand-500 text-white shadow-sm ring-1 ring-brand-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryProvider"
                  value="smtp"
                  checked={integrations.deliveryProvider === 'smtp'}
                  onChange={(e) => setIntegrations({ ...integrations, deliveryProvider: e.target.value })}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">SMTP Server / Google Workspace</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Direct outbound email delivery with TLS/SSL authentication. Supports Google Workspace, Gmail, Amazon SES, SendGrid, or custom mail servers.
                </p>
              </label>

              {/* Resend API */}
              <label
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  integrations.deliveryProvider === 'resend'
                    ? 'bg-brand-600/10 border-brand-500 text-white shadow-sm ring-1 ring-brand-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryProvider"
                  value="resend"
                  checked={integrations.deliveryProvider === 'resend'}
                  onChange={(e) => setIntegrations({ ...integrations, deliveryProvider: e.target.value })}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-bold text-white">Resend API</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Enterprise transactional email infrastructure with dedicated domain DKIM, SPF verification, and delivery tracking.
                </p>
              </label>
            </div>

            {/* SMTP Inputs */}
            {integrations.deliveryProvider === 'smtp' && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">SMTP Mail Server Configuration</h4>
                  <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    TLS / SSL Secured
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={integrations.smtpConfig?.host || 'smtp.gmail.com'}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          smtpConfig: { ...integrations.smtpConfig, host: e.target.value }
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">SMTP Port</label>
                    <input
                      type="number"
                      value={integrations.smtpConfig?.port || 465}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          smtpConfig: { ...integrations.smtpConfig, port: parseInt(e.target.value) }
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Gmail / Workspace Email
                    </label>
                    <input
                      type="email"
                      placeholder="your-email@gmail.com"
                      value={integrations.smtpConfig?.user || ''}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          smtpConfig: { ...integrations.smtpConfig, user: e.target.value }
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Google 16-Character App Password
                    </label>
                    <input
                      type="password"
                      placeholder="abcd efgh ijkl mnop"
                      value={integrations.smtpConfig?.pass || ''}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          smtpConfig: { ...integrations.smtpConfig, pass: e.target.value }
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    From Display Email & Name
                  </label>
                  <input
                    type="text"
                    placeholder='"Alex from Apex" <alex@apexsolutions.io>'
                    value={integrations.smtpConfig?.fromEmail || ''}
                    onChange={(e) =>
                      setIntegrations({
                        ...integrations,
                        smtpConfig: { ...integrations.smtpConfig, fromEmail: e.target.value }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {/* Resend Inputs */}
            {integrations.deliveryProvider === 'resend' && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white">Resend API Configuration</h4>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Resend API Key</label>
                  <input
                    type="password"
                    placeholder="re_123456789..."
                    value={integrations.resendConfig?.apiKey || ''}
                    onChange={(e) =>
                      setIntegrations({
                        ...integrations,
                        resendConfig: { ...integrations.resendConfig, apiKey: e.target.value }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Verified Sender Email
                  </label>
                  <input
                    type="email"
                    placeholder="outreach@yourdomain.com"
                    value={integrations.resendConfig?.fromEmail || ''}
                    onChange={(e) =>
                      setIntegrations({
                        ...integrations,
                        resendConfig: { ...integrations.resendConfig, fromEmail: e.target.value }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: LEAD SOURCES */}
        {activeTab === 'feeds' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Lead Discovery Sources & Inbound Webhooks</h3>
              <p className="text-xs text-slate-400 mt-1">
                The operations center pulls live tech jobs automatically from official JSON APIs, RSS feeds, and direct webhooks.
              </p>
            </div>

            {/* Built-in Active Platform Scrapers */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white">Active Platform Discovery Engines</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">RemoteOK Tech API</div>
                    <div className="text-[11px] text-slate-500">Live remote engineering & AI opportunities</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Freelancer.com Projects API</div>
                    <div className="text-[11px] text-slate-500">Active client posted software projects</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Y Combinator & Hacker News API</div>
                    <div className="text-[11px] text-slate-500">YC startup jobs & founder posts via Firebase</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">WeWorkRemotely RSS Feed</div>
                    <div className="text-[11px] text-slate-500">Full-stack & AI programming feed</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Apollo.io Configuration */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Apollo.io Direct B2B Prospecting</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Search and pull decision-makers (Founders, CTOs, VPs) matching your target keywords.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Apollo.io API Key
                </label>
                <input
                  type="password"
                  placeholder="Enter Apollo API Key or keep in server/.env..."
                  value={integrations.apolloApiKey || ''}
                  onChange={(e) => setIntegrations({ ...integrations, apolloApiKey: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Inbound Webhook Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Inbound Lead Webhook URL</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Connect Make, Zapier, n8n, or custom scrapers to send leads directly to SSOC.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded font-medium transition-all"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWebhook ? 'Copied' : 'Copy Webhook URL'}
                </button>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 break-all select-all">
                {window.location.origin}/api/integrations/inbound-webhook
              </div>
            </div>

            {/* Custom RSS Feeds */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white">Custom RSS Feeds</h4>
              <div className="space-y-2">
                {(integrations.rssFeeds || []).map((feed) => (
                  <div
                    key={feed.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">{feed.name}</span>
                      <span className="ml-2 text-[10px] text-slate-500 font-mono">({feed.platform})</span>
                      <div className="text-[11px] text-slate-400 truncate max-w-md">{feed.url}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remove feed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Feed Form */}
              <form onSubmit={handleAddFeed} className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Feed Name (e.g. Upwork AI Jobs)"
                    value={newFeedName}
                    onChange={(e) => setNewFeedName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
                  />
                  <CustomSelect
                    value={newFeedPlatform}
                    onChange={setNewFeedPlatform}
                    options={FEED_PLATFORM_OPTIONS}
                    size="sm"
                    className="w-full"
                    buttonClassName="w-full bg-slate-950 border-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded transition-colors whitespace-nowrap"
                  >
                    Add Feed
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="https://feed-url..."
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
                />
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: AUTOMATIONS & DATABASE */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Automations, Cron Schedules & Maintenance</h3>
              <p className="text-xs text-slate-400 mt-1">
                Monitor background automation daemons, run discovery schedules on demand, or reset the pipeline database.
              </p>
            </div>

            {maintenanceMsg && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  maintenanceMsg.startsWith('Error')
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <span>{maintenanceMsg}</span>
                <button onClick={() => setMaintenanceMsg('')} className="text-slate-400 hover:text-white ml-2">
                  ✕
                </button>
              </div>
            )}

            {/* Lead Finder Automation Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Daily Lead Finder Cron Job</h4>
                    <p className="text-[11px] text-slate-400">
                      Schedule:{' '}
                      <span className="text-sky-300 font-mono font-semibold">
                        {schedulerStatus?.leadFinderSchedule || '0 8 * * *'}
                      </span>{' '}
                      ({schedulerStatus?.leadFinderHuman || 'Every day at 8:00 AM'})
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Configured & Active
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Crawls RemoteOK, Freelancer, YC/HN, and RSS feeds. Runs high-efficiency single-call LLM batch evaluation against your company profile, strictly rejecting non-tech roles and bounding discoveries to {company.maxLeadsPerBatch || 20} leads.
              </p>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-400">
                  Target Bound: <span className="text-white font-semibold">{company.maxLeadsPerBatch || 20} leads / run</span>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerFinder}
                  disabled={triggeringFinder}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white rounded-lg text-xs font-semibold shadow transition-all disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${triggeringFinder ? 'animate-spin' : ''}`} />
                  {triggeringFinder ? 'Running Batch Discovery...' : 'Run Lead Finder Now'}
                </button>
              </div>
            </div>

            {/* Cooldown Tracker Automation Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Daily Cooldown & Follow-Up Tracker</h4>
                    <p className="text-[11px] text-slate-400">
                      Schedule:{' '}
                      <span className="text-amber-300 font-mono font-semibold">
                        {schedulerStatus?.cooldownSchedule || '0 9 * * *'}
                      </span>{' '}
                      ({schedulerStatus?.cooldownHuman || 'Every day at 9:00 AM'})
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Configured & Active
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Scans contacted prospects and progresses follow-up sequences automatically past Day 2, Day 7, and Day 21 thresholds until a client reply is detected.
              </p>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={handleTriggerCooldown}
                  disabled={triggeringCooldown}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${triggeringCooldown ? 'animate-spin text-amber-400' : ''}`} />
                  {triggeringCooldown ? 'Checking Cooldowns...' : 'Check Cooldowns Now'}
                </button>
              </div>
            </div>

            {/* Database Pipeline Reset Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-rose-950/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Database Pipeline Reset</h4>
                    <p className="text-[11px] text-slate-400">
                      Current Leads in Pipeline:{' '}
                      <span className="text-white font-bold">{schedulerStatus?.totalLeadsInDb ?? 0}</span>
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Clearing the database wipes out all leads from the pipeline while safely preserving your company profile, targeting rules, and integration credentials.
              </p>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={handleResetDatabase}
                  disabled={resettingDb}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600/80 hover:bg-rose-600 active:scale-95 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {resettingDb ? 'Clearing Database...' : 'Reset & Clear All Leads'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: APPEARANCE & THEME */}
        {activeTab === 'theme' && (
          <div className="space-y-8">
            {/* Header info */}
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-brand-400" />
                Appearance & Visual Theme
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize your visual environment for maximum readability, fast lead skimming, and comfortable viewing during extended outreach sessions.
              </p>
            </div>

            {/* SECTION 1: INTERFACE MODE (LIGHT VS DARK) */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-200 tracking-wide uppercase flex items-center gap-2">
                <span>1. Interface Mode</span>
                <span className="text-[10px] font-normal text-slate-400 normal-case">(Optimized for day & night viewing)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => setMode('dark')}
                  className={`p-5 rounded-2xl text-left border transition-all active:scale-[0.99] flex flex-col justify-between ${
                    mode === 'dark'
                      ? 'border-brand-500 shadow-lg ring-2 ring-brand-500/40 bg-brand-500/10'
                      : 'border-theme bg-card text-secondary hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-card-subtle border border-theme flex items-center justify-center text-primary">
                      <Moon className="w-5 h-5 text-brand-400" />
                    </div>
                    {mode === 'dark' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/40 flex items-center gap-1">
                        <Check className="w-3 h-3 text-brand-400" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-muted font-medium">Select</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary">Deep Obsidian / Dark Mode</h4>
                    <p className="text-xs text-secondary mt-1 leading-relaxed">
                      Deep slate & obsidian backgrounds with zero screen glare. Engineered for extended focus and reading pitch copy.
                    </p>
                  </div>
                </button>

                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => setMode('light')}
                  className={`p-5 rounded-2xl text-left border transition-all active:scale-[0.99] flex flex-col justify-between ${
                    mode === 'light'
                      ? 'border-brand-500 shadow-lg ring-2 ring-brand-500/40 bg-brand-500/10'
                      : 'border-theme bg-card text-secondary hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-card-subtle border border-theme flex items-center justify-center text-primary">
                      <Sun className="w-5 h-5 text-amber-500" />
                    </div>
                    {mode === 'light' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/40 flex items-center gap-1">
                        <Check className="w-3 h-3 text-brand-400" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-muted font-medium">Select</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary">Executive Paper / Light Mode</h4>
                    <p className="text-xs text-secondary mt-1 leading-relaxed">
                      Clean paper-white backgrounds with crisp slate typography. High contrast for daylight workspaces and client demos.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* SECTION 2: BUSINESS COLOR THEMES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary tracking-wide uppercase flex items-center gap-2">
                  <span>2. Business Color Accent</span>
                  <span className="text-[10px] font-normal text-muted normal-case">(Professional sales palettes)</span>
                </label>
                <span className="text-xs text-brand-400 font-bold">
                  {ACCENT_THEMES.find((t) => t.id === accent)?.name} Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {ACCENT_THEMES.map((theme) => {
                  const isSelected = accent === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setAccent(theme.id)}
                      className={`p-4 rounded-xl text-left border transition-all active:scale-[0.98] relative flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'border-brand-500 shadow-md ring-2 ring-brand-500/40 bg-brand-500/10'
                          : 'hover:border-slate-400/60 border-theme bg-card text-secondary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Swatch Indicator */}
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-5 h-5 rounded-full shadow-md flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: theme.previewHex }}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-xs font-bold text-primary tracking-tight">
                            {theme.name}
                          </span>
                        </div>

                        {/* Tag */}
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                          style={{
                            color: theme.previewHex,
                            borderColor: `${theme.previewHex}50`,
                            backgroundColor: `${theme.previewHex}18`
                          }}
                        >
                          {theme.tag}
                        </span>
                      </div>

                      <p className="text-[11px] text-secondary leading-snug">
                        {theme.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: REAL-TIME LIVE UI PREVIEW */}
            <div className="p-5 rounded-2xl bg-card border border-theme space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-brand-400" />
                  <h4 className="text-xs font-bold text-primary tracking-wide uppercase">
                    Live Component Preview
                  </h4>
                </div>
                <span className="text-[11px] text-muted">
                  Instant real-time rendering test
                </span>
              </div>

              {/* Sample Opportunity Card */}
              <div className="p-4 rounded-xl bg-card-subtle border border-theme space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/15 text-brand-400 border border-brand-500/30">
                      Upwork
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> 96% Match Fit
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-500">$3,500 Fixed Budget</span>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-primary">
                    Senior AI Workflow Specialist (n8n + Gemini Automation Pipeline)
                  </h5>
                  <p className="text-xs text-secondary mt-1">
                    Seeking an enterprise engineer to integrate multi-agent autonomous lead qualification and email sequences.
                  </p>
                </div>

                <div className="pt-2 border-t border-theme flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[11px] text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                    <span>Decision Maker: VP of Engineering</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-secondary hover:text-primary bg-card border border-theme transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 shadow-md shadow-brand-600/30 transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Demo Pitch</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* QUICK AI AUTO-SETUP MODAL                                    */}
      {/* ============================================================ */}
      {showQuickAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#0d1424] border border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-brand-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Quick AI Auto-Setup
                    <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      1-Click Extraction
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Paste your agency website copy, LinkedIn bio, or pitch deck summary.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAiModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Paste Agency Website or Deck Summary
                </label>
                <button
                  type="button"
                  onClick={loadSampleAgencyText}
                  className="text-[11px] text-brand-400 hover:text-brand-300 font-medium underline flex items-center gap-1"
                >
                  Load Sample Agency (Apex AI)
                </button>
              </div>
              <textarea
                rows={7}
                value={quickAiText}
                onChange={(e) => setQuickAiText(e.target.value)}
                placeholder="Paste your agency 'About Us' page, services catalog, LinkedIn summary, or capabilities deck here... Gemini will automatically extract and configure your company profile, value proposition, services, keywords, and targeting rules in seconds."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500 leading-relaxed font-sans placeholder:text-slate-600"
              />
            </div>

            {/* Alerts */}
            {quickAiError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{quickAiError}</span>
              </div>
            )}
            {quickAiSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>{quickAiSuccess}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuickAiModal(false)}
                disabled={quickAiExtracting}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAiExtract}
                disabled={quickAiExtracting || !quickAiText.trim()}
                className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-md shadow-brand-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {quickAiExtracting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-brand-200" />
                    <span>Analyzing & Extracting...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Extract & Auto-Fill All Sections</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
