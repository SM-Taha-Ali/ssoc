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
  CheckCircle2,
  Globe,
  RefreshCw,
  Inbox,
  Link,
  Send,
  Server,
  ArrowRight
} from 'lucide-react';
import CustomSelect from './CustomSelect.jsx';
import { useTheme, ACCENT_THEMES } from '../context/ThemeContext.jsx';
import { SettingsSkeleton } from './Skeletons.jsx';

const SMTP_PRESETS = [
  { name: 'Gmail / Workspace', host: 'smtp.gmail.com', port: 465, secure: true },
  { name: 'Microsoft 365', host: 'smtp.office365.com', port: 587, secure: false },
  { name: 'Amazon SES', host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false },
  { name: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false }
];

const FEED_PLATFORM_OPTIONS = [
  { value: 'upwork', label: 'Upwork' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'remoteok', label: 'RemoteOK' },
  { value: 'ycombinator', label: 'Y Combinator' },
  { value: 'rss', label: 'Generic RSS' }
];
import axios from 'axios';

// Module-level in-memory cache for instant 0ms Settings page transitions (SWR pattern)
let cachedSettingsData = null;
let cachedSchedulerStatus = null;

export default function SettingsPage({ onBackToPipeline }) {
  const { mode, setMode, accent, setAccent } = useTheme();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(!cachedSettingsData);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Quick AI Setup State
  const [showQuickAiModal, setShowQuickAiModal] = useState(false);
  const [quickAiText, setQuickAiText] = useState('');
  const [quickAiExtracting, setQuickAiExtracting] = useState(false);
  const [quickAiSuccess, setQuickAiSuccess] = useState('');
  const [quickAiError, setQuickAiError] = useState('');

  // Company Profile state (hydrated instantly from cache if available)
  const [company, setCompany] = useState(() => cachedSettingsData?.company || {
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

  const [servicesStr, setServicesStr] = useState(() => cachedSettingsData?.servicesStr || '');
  const [strengthsStr, setStrengthsStr] = useState(() => cachedSettingsData?.strengthsStr || '');
  const [keywordsStr, setKeywordsStr] = useState(() => cachedSettingsData?.keywordsStr || '');
  const [negativeKeywordsStr, setNegativeKeywordsStr] = useState(() => cachedSettingsData?.negativeKeywordsStr || '');
  const [industriesStr, setIndustriesStr] = useState(() => cachedSettingsData?.industriesStr || '');
  const [rolesStr, setRolesStr] = useState(() => cachedSettingsData?.rolesStr || '');
  const [disqualifiersStr, setDisqualifiersStr] = useState(() => cachedSettingsData?.disqualifiersStr || '');

  // Integrations state (hydrated instantly from cache if available)
  const [integrations, setIntegrations] = useState(() => cachedSettingsData?.integrations || {
    geminiApiKey: '',
    geminiModel: 'gemini-3.8-flash',
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
    imap: {
      enabled: false,
      host: 'imap.gmail.com',
      port: 993,
      user: '',
      pass: ''
    },
    inboundWebhookUrl: '',
    inboundWebhookSecret: '',
    freelancer: {
      apiToken: '',
      profileUsername: '',
      enabled: true
    },
    upwork: {
      profileUrl: '',
      agencyName: '',
      searchKeywords: '',
      enabled: true
    },
    linkedin: {
      searchKeywords: '',
      companyPageUrl: '',
      enabled: true
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

  // Live Digital Profile Scraping & Inbound Email States
  const [syncingProfiles, setSyncingProfiles] = useState(false);
  const [profileSyncResult, setProfileSyncResult] = useState(null);
  const [syncingImap, setSyncingImap] = useState(false);
  const [imapSyncResult, setImapSyncResult] = useState(null);
  const [inboundMethod, setInboundMethod] = useState('imap'); // 'imap' or 'webhook'

  useEffect(() => {
    fetchSettings();
    fetchSchedulerStatus();
  }, []);

  const fetchSchedulerStatus = async () => {
    try {
      const res = await axios.get('/api/integrations/scheduler-status');
      setSchedulerStatus(res.data);
      cachedSchedulerStatus = res.data;
    } catch (e) {
      console.error('Failed to fetch scheduler status:', e);
    }
  };

  const fetchSettings = async () => {
    // Only trigger full-screen skeleton if we don't have cached data yet
    if (!cachedSettingsData) {
      setLoading(true);
    }
    try {
      const [compRes, intRes] = await Promise.all([
        axios.get('/api/company-profile'),
        axios.get('/api/integrations')
      ]);

      if (compRes.data) {
        setCompany(compRes.data);
        const sStr = (compRes.data.targetServices || []).join('\n');
        const stStr = (compRes.data.coreStrengths || []).join('\n');
        const kStr = (compRes.data.targetKeywords || []).join(', ');
        const nkStr = (compRes.data.negativeKeywords || []).join(', ');
        const indStr = (compRes.data.idealClientProfile?.industries || []).join(', ');
        const rStr = (compRes.data.idealClientProfile?.targetRoles || []).join(', ');
        const disqStr = (compRes.data.disqualifiers || []).join('\n');

        setServicesStr(sStr);
        setStrengthsStr(stStr);
        setKeywordsStr(kStr);
        setNegativeKeywordsStr(nkStr);
        setIndustriesStr(indStr);
        setRolesStr(rStr);
        setDisqualifiersStr(disqStr);
      }

      if (intRes.data) {
        setIntegrations((prev) => {
          const merged = {
            ...prev,
            ...intRes.data,
            smtpConfig: { ...prev.smtpConfig, ...(intRes.data.smtpConfig || {}) },
            resendConfig: { ...prev.resendConfig, ...(intRes.data.resendConfig || {}) },
            imap: { ...prev.imap, ...(intRes.data.imap || {}) },
            freelancer: { ...prev.freelancer, ...(intRes.data.freelancer || {}) },
            upwork: { ...prev.upwork, ...(intRes.data.upwork || {}) },
            linkedin: { ...prev.linkedin, ...(intRes.data.linkedin || {}) }
          };
          return merged;
        });
        if (intRes.data.imap?.enabled) {
          setInboundMethod('imap');
        } else if (intRes.data.inboundWebhookSecret) {
          setInboundMethod('webhook');
        }
      }

      // Update module-level cache for instant subsequent renders
      cachedSettingsData = {
        company: compRes.data,
        servicesStr: (compRes.data?.targetServices || []).join('\n'),
        strengthsStr: (compRes.data?.coreStrengths || []).join('\n'),
        keywordsStr: (compRes.data?.targetKeywords || []).join(', '),
        negativeKeywordsStr: (compRes.data?.negativeKeywords || []).join(', '),
        industriesStr: (compRes.data?.idealClientProfile?.industries || []).join(', '),
        rolesStr: (compRes.data?.idealClientProfile?.targetRoles || []).join(', '),
        disqualifiersStr: (compRes.data?.disqualifiers || []).join('\n'),
        integrations: intRes.data
      };
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

      cachedSettingsData = {
        company: updatedProfile,
        servicesStr,
        strengthsStr,
        keywordsStr,
        negativeKeywordsStr,
        industriesStr,
        rolesStr,
        disqualifiersStr,
        integrations
      };

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

  const handleSyncProfiles = async () => {
    setSyncingProfiles(true);
    setProfileSyncResult(null);
    try {
      await axios.put('/api/company-profile', company);
      const res = await axios.post('/api/company-profile/sync-profiles');
      if (res.data?.profile) {
        setCompany(res.data.profile);
      }
      setProfileSyncResult({
        success: true,
        message: 'Live digital profiles & case studies successfully scraped! Gemini 3.8 Flash will now use this ground-truth data in pitch generation and profile audits.'
      });
      setTimeout(() => setProfileSyncResult(null), 6000);
    } catch (err) {
      setProfileSyncResult({
        success: false,
        message: err.response?.data?.error || err.message || 'Profile sync failed'
      });
    } finally {
      setSyncingProfiles(false);
    }
  };

  const handleSyncImap = async () => {
    setSyncingImap(true);
    setImapSyncResult(null);
    try {
      await axios.put('/api/integrations', integrations);
      const res = await axios.post('/api/integrations/sync-imap');
      setImapSyncResult(res.data);
      if (typeof window !== 'undefined' && window.__refreshLeads) {
        window.__refreshLeads();
      }
    } catch (err) {
      setImapSyncResult({
        success: false,
        error: err.response?.data?.error || err.message
      });
    } finally {
      setSyncingImap(false);
    }
  };

  const handleCopyWebhook = () => {
    const url = integrations.inboundWebhookUrl || `${window.location.origin}/api/webhooks/email-reply`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
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
    return <SettingsSkeleton />;
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
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 rounded-lg transition-all"
              title="Return to Pipeline Board"
            >
              <span>←</span>
              <span>Back</span>
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
              <h3 className="text-base font-bold text-primary dark:text-white">Company Profile & Sender Details</h3>
              <p className="text-xs text-secondary dark:text-slate-400 mt-1">
                Basic organization details and outbound sender identity used across automated pitches and calendar bookings.
              </p>
            </div>

            {/* Quick AI Auto-Setup Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/20 dark:border-brand-500/30 flex items-center justify-center flex-shrink-0 text-brand-600 dark:text-brand-300 shadow-sm">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary dark:text-white flex items-center gap-2">
                    Quick AI Auto-Setup
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 border border-brand-500/20 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/30">
                      1-Click Extraction
                    </span>
                  </h4>
                  <p className="text-[11px] text-secondary dark:text-slate-300 mt-0.5">
                    Paste your agency website copy or company bio. Gemini will auto-fill your profile, value proposition, and targeting rules.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAiModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-sm shadow-brand-600/20 transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Quick AI Setup</span>
              </button>
            </div>

            {/* Section: Organization Details */}
            {/* Section: Organization Details */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-4 shadow-sm dark:shadow-none">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Building className="w-4 h-4 text-brand-500" />
                Organization Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1.5">
                    Company / Agency Name
                  </label>
                  <input
                    type="text"
                    value={company.name || ''}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    placeholder="e.g. Apex AI & Cloud Engineering"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1.5">Company Tagline</label>
                  <input
                    type="text"
                    value={company.tagline || ''}
                    onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                    placeholder="e.g. Production AI Agents & Scalable Cloud Solutions"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1.5">Website URL</label>
                  <input
                    type="url"
                    value={company.website || ''}
                    onChange={(e) => setCompany({ ...company, website: e.target.value })}
                    placeholder="https://apexsolutions.io"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1.5">
                    Calendar Booking Link (Injected into Pitches)
                  </label>
                  <input
                    type="url"
                    value={company.calendarLink || ''}
                    onChange={(e) => setCompany({ ...company, calendarLink: e.target.value })}
                    placeholder="https://calendly.com/your-name/30min"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[10px] text-muted mt-1">Included in outbound emails and pitch video CTAs</p>
                </div>
              </div>
            </div>

            {/* Section: Sender Profile */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-4 shadow-sm dark:shadow-none">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-500" />
                Sender Profile (Appears on Dispatched Outreach)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-secondary block mb-1">Sender Name</label>
                  <input
                    type="text"
                    value={company.senderName || ''}
                    onChange={(e) => setCompany({ ...company, senderName: e.target.value })}
                    placeholder="Alex Vance"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-secondary block mb-1">Sender Title</label>
                  <input
                    type="text"
                    value={company.senderTitle || ''}
                    onChange={(e) => setCompany({ ...company, senderTitle: e.target.value })}
                    placeholder="Principal Solutions Architect"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-secondary block mb-1">Sender Email</label>
                  <input
                    type="email"
                    value={company.senderEmail || ''}
                    onChange={(e) => setCompany({ ...company, senderEmail: e.target.value })}
                    placeholder="alex@apexsolutions.io"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Section: Live Digital Assets & Profile Sync (Upwork, LinkedIn & Website) */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-4 shadow-sm dark:shadow-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-theme">
                <div>
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Globe className="w-4 h-4 text-brand-500" />
                    Live Digital Assets & Profiles (AI Input Integration)
                  </h4>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Connect your public agency website, Upwork, and LinkedIn. AI scrapes your actual headline, skills, and case studies to power hyper-personalized cold pitches and profile audits.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncProfiles}
                  disabled={syncingProfiles}
                  className="px-4 py-2 text-xs font-semibold !text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-xl transition-all shadow-md shadow-brand-600/20 flex items-center gap-2 flex-shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingProfiles ? 'animate-spin' : ''}`} />
                  <span>{syncingProfiles ? 'Scraping Profiles...' : 'Scrape & Sync Profiles'}</span>
                </button>
              </div>

              {profileSyncResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    profileSyncResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  }`}
                >
                  {profileSyncResult.success ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{profileSyncResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-secondary block mb-1">
                    Agency Website URL
                  </label>
                  <input
                    type="url"
                    value={company.website || ''}
                    onChange={(e) => setCompany({ ...company, website: e.target.value })}
                    placeholder="https://apexsolutions.io"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                  {company.websiteData?.lastScrapedAt && (
                    <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" />
                      Synced {company.websiteData.scrapedCaseStudies?.length || 0} case studies & highlights
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-secondary block mb-1">
                    Upwork Profile or Agency URL
                  </label>
                  <input
                    type="url"
                    value={company.upworkProfileUrl || ''}
                    onChange={(e) => setCompany({ ...company, upworkProfileUrl: e.target.value })}
                    placeholder="https://www.upwork.com/agencies/..."
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                  {company.upworkData?.lastScrapedAt && (
                    <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" />
                      Synced headline & {company.upworkData.skills?.length || 0} skills
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-secondary block mb-1">
                    LinkedIn Profile or Company URL
                  </label>
                  <input
                    type="url"
                    value={company.linkedinProfileUrl || ''}
                    onChange={(e) => setCompany({ ...company, linkedinProfileUrl: e.target.value })}
                    placeholder="https://www.linkedin.com/company/..."
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                  {company.linkedinData?.lastScrapedAt && (
                    <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" />
                      Synced LinkedIn about & positioning
                    </p>
                  )}
                </div>
              </div>

              {/* Scraped Assets Summary Panel */}
              {(company.websiteData?.scrapedTitle || company.upworkData?.headline || company.linkedinData?.headline) && (
                <div className="mt-2 p-3.5 rounded-xl bg-card-subtle border border-theme space-y-2">
                  <div className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                    Live Scraped Ground-Truth Fed into Gemini 3.8 Flash:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-surface border border-theme">
                      <div className="font-semibold text-secondary">Website Title & Copy</div>
                      <div className="text-muted text-[10px] mt-0.5 line-clamp-2">
                        {company.websiteData?.scrapedTitle || 'Title parsed'} - {company.websiteData?.metaDescription || 'No description'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface border border-theme">
                      <div className="font-semibold text-secondary">Upwork Headline & Bio</div>
                      <div className="text-muted text-[10px] mt-0.5 line-clamp-2">
                        {company.upworkData?.headline || company.upworkData?.rawTextSummary?.slice(0, 100) || 'Upwork profile registered'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface border border-theme">
                      <div className="font-semibold text-secondary">LinkedIn Positioning</div>
                      <div className="text-muted text-[10px] mt-0.5 line-clamp-2">
                        {company.linkedinData?.headline || company.linkedinData?.rawTextSummary?.slice(0, 100) || 'LinkedIn profile registered'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: VALUE PROPOSITION & SERVICES (WHAT WE SELL) */}
        {activeTab === 'valueprop' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-primary dark:text-white">Value Proposition & Sales Positioning</h3>
              <p className="text-xs text-secondary dark:text-slate-400 mt-1">
                Define what you sell, your core technical superpowers, and past customer proof. Gemini AI uses this exact data to write personalized pitches and construct 60-second video demo scripts.
              </p>
            </div>

            {/* Quick AI Auto-Setup Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/20 dark:border-brand-500/30 flex items-center justify-center flex-shrink-0 text-brand-600 dark:text-brand-300 shadow-sm">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary dark:text-white flex items-center gap-2">
                    Quick AI Auto-Setup
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 border border-brand-500/20 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/30">
                      1-Click Extraction
                    </span>
                  </h4>
                  <p className="text-[11px] text-secondary dark:text-slate-300 mt-0.5">
                    Paste your company capabilities or sales deck. Gemini will automatically distill your value proposition, services, and proof points.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAiModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-sm shadow-brand-600/20 transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Quick AI Setup</span>
              </button>
            </div>

            {/* Primary Value Proposition */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-3 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  Primary Value Proposition & Transformation
                </label>
                <span className="text-[10px] text-brand-500 font-semibold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                  Core AI Pitch Anchor
                </span>
              </div>
              <textarea
                rows={4}
                value={company.valueProposition || ''}
                onChange={(e) => setCompany({ ...company, valueProposition: e.target.value })}
                placeholder="Describe what unique business outcomes you deliver. E.g.: We build production-ready custom AI agents, automated workflow pipelines (n8n/Zapier), and scalable MERN applications that drive revenue and cut infrastructure bills by 40%."
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 leading-relaxed font-mono text-[11px]"
              />
              <p className="text-[11px] text-muted mt-1">
                This is heavily weighted by the AI when framing your outreach emails and 60-second video demo scripts.
              </p>
            </div>

            {/* Core Services Offered */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-3 shadow-sm dark:shadow-none">
              <label className="text-sm font-semibold text-primary flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-500" />
                Core Services Offered (One per line)
              </label>
              <textarea
                rows={4}
                value={servicesStr}
                onChange={(e) => setServicesStr(e.target.value)}
                placeholder="Autonomous AI Agents & Voice Bots&#10;Workflow Automations (n8n, Zapier, Make, Webhooks)&#10;Full-Stack Web Apps (React, Next.js, Node.js, MERN)&#10;Cloud Infrastructure & AWS Cost Reduction"
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 font-mono text-[11px] leading-relaxed"
              />
              <p className="text-[11px] text-muted mt-1">
                These services are matched against job requirements during lead qualification.
              </p>
            </div>

            {/* Core Technical Strengths */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-3 shadow-sm dark:shadow-none">
              <label className="text-sm font-semibold text-primary flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-500" />
                Technical Strengths & Superpowers (One per line)
              </label>
              <textarea
                rows={4}
                value={strengthsStr}
                onChange={(e) => setStrengthsStr(e.target.value)}
                placeholder="Autonomous AI Agents (LangChain, LlamaIndex, OpenAI, Gemini)&#10;Enterprise Workflow Orchestration (n8n self-hosted, Make, Zapier)&#10;Modern React / Node.js Full-Stack Architecture&#10;High-Volume Database Migrations & API Optimizations"
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 font-mono text-[11px] leading-relaxed"
              />
            </div>

            {/* Proven Case Studies & Client Wins */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-3 shadow-sm dark:shadow-none">
              <label className="text-sm font-semibold text-primary flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                Proven Case Studies, Metrics & Past Wins
              </label>
              <textarea
                rows={4}
                value={company.caseStudies || ''}
                onChange={(e) => setCompany({ ...company, caseStudies: e.target.value })}
                placeholder="1. Automated customer onboarding and Zendesk ticket triaging using custom AI agents, reducing support tickets by 62% for a Series A SaaS.&#10;2. Built multi-tenant n8n & Stripe synchronization pipeline processing $1.2M in annual transactions.&#10;3. Slashed monthly AWS infrastructure bill from $14k to $5.8k."
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 font-mono text-[11px] leading-relaxed"
              />
              <p className="text-[11px] text-muted mt-1">
                Injected as real social proof into your cold pitches and profile optimization tips.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: TARGETING & IDEAL CLIENT (ICP) (WHO WE TARGET) */}
        {activeTab === 'targeting' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-primary dark:text-white">Targeting Rules & Ideal Client Profile (ICP)</h3>
              <p className="text-xs text-secondary dark:text-slate-400 mt-1">
                Set the exact criteria for which opportunities get approved into your pipeline. The single-call LLM batch auditor uses these rules to reject irrelevant jobs and keep your focus on high-ticket leads.
              </p>
            </div>

            {/* Quick AI Auto-Setup Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/20 dark:border-brand-500/30 flex items-center justify-center flex-shrink-0 text-brand-600 dark:text-brand-300 shadow-sm">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-primary dark:text-white flex items-center gap-2">
                    Quick AI Auto-Setup
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 border border-brand-500/20 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/30">
                      1-Click Extraction
                    </span>
                  </h4>
                  <p className="text-[11px] text-secondary dark:text-slate-300 mt-0.5">
                    Auto-generate target industries, decision maker titles, tech keywords, and disqualifiers using AI.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAiModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-sm shadow-brand-600/20 transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Quick AI Setup</span>
              </button>
            </div>

            {/* Section: Ideal Client Profile (ICP) */}
            {/* Section: Ideal Client Profile (ICP) */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-4 shadow-sm dark:shadow-none">
              <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-500" />
                Ideal Client Profile (ICP)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1.5">
                    Target Client Industries (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={industriesStr}
                    onChange={(e) => setIndustriesStr(e.target.value)}
                    placeholder="B2B SaaS, Startups, E-commerce, Digital Agencies, FinTech"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1.5">
                    Target Decision-Maker Roles (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={rolesStr}
                    onChange={(e) => setRolesStr(e.target.value)}
                    placeholder="Founder / CEO, CTO, VP Engineering, Head of Product"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Section: Keywords & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Positive Keywords */}
              <div className="p-5 rounded-xl bg-card border border-theme space-y-2 shadow-sm dark:shadow-none">
                <label className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Positive Tech Keywords (Comma-separated)
                </label>
                <textarea
                  rows={3}
                  value={keywordsStr}
                  onChange={(e) => setKeywordsStr(e.target.value)}
                  placeholder="AI, Agent, n8n, Zapier, React, Node, MERN, Full Stack, Automation, Python, API, RAG, AWS"
                  className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 font-mono text-[11px]"
                />
                <p className="text-[10px] text-muted mt-1">
                  Opportunities must match at least one keyword to pass initial ingestion.
                </p>
              </div>

              {/* Negative Keywords */}
              <div className="p-5 rounded-xl bg-card border border-theme space-y-2 shadow-sm dark:shadow-none">
                <label className="text-sm font-semibold text-primary flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Negative Keywords (Comma-separated)
                </label>
                <textarea
                  rows={3}
                  value={negativeKeywordsStr}
                  onChange={(e) => setNegativeKeywordsStr(e.target.value)}
                  placeholder="unpaid, internship, volunteer, commission only, spanish speaking, german speaking, telemarketer"
                  className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 font-mono text-[11px]"
                />
                <p className="text-[10px] text-muted mt-1">
                  Instantly discarded without consuming LLM credits.
                </p>
              </div>
            </div>

            {/* Strict Disqualifiers */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-2 shadow-sm dark:shadow-none">
              <label className="text-sm font-semibold text-primary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Strict AI Disqualifier Rules (Evaluated in Batch LLM Prompt)
              </label>
              <textarea
                rows={4}
                value={disqualifiersStr}
                onChange={(e) => setDisqualifiersStr(e.target.value)}
                placeholder="Non-tech sales or cold-calling telesales roles&#10;Specific non-English language requirements (e.g. Spanish-only or German-only customer service)&#10;Staffing agency or generic recruiter headhunting listings&#10;Unpaid internships or 100% commission/equity-only without baseline budget&#10;Basic data entry or virtual assistant tasks with zero engineering"
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 font-mono text-[11px] leading-relaxed"
              />
              <p className="text-[11px] text-muted mt-1">
                Jobs matching any of these criteria are rejected during batch AI analysis.
              </p>
            </div>

            {/* Budget & Daily Cap */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-4 shadow-sm dark:shadow-none">
              <h4 className="text-sm font-semibold text-primary">
                Deal Criteria & Discovery Limits
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1.5">
                    Max Discovered Leads Per Run / Day
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={company.maxLeadsPerBatch || 20}
                    onChange={(e) => setCompany({ ...company, maxLeadsPerBatch: parseInt(e.target.value) || 20 })}
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[10px] text-muted mt-1">Prevents pipeline noise (Recommended: 20)</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1.5">
                    Minimum Project Budget ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={company.minBudget || 150}
                    onChange={(e) => setCompany({ ...company, minBudget: parseInt(e.target.value) || 0 })}
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                  <p className="text-[10px] text-muted mt-1">Filters out micro-budget posts</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-secondary block mb-1.5">
                    Geographic Preference
                  </label>
                  <input
                    type="text"
                    value={company.geographicPreference || ''}
                    onChange={(e) => setCompany({ ...company, geographicPreference: e.target.value })}
                    placeholder="Remote Worldwide (US/EU timezones preferred)"
                    className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
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
              <h3 className="text-base font-bold text-primary">Gemini AI Engine Settings</h3>
              <p className="text-xs text-secondary mt-1">
                Configure Google Gemini LLM settings for high-speed single-call candidate filtering, 60-second video demo scripting, and personalized outreach pitches.
              </p>
            </div>

            {/* Model Selection */}
            <div className="p-5 rounded-xl bg-card border border-theme shadow-sm space-y-4">
              <label className="text-xs font-bold text-primary block uppercase tracking-wider">
                Select Gemini Model
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Gemini 3.8 Flash */}
                <label
                  className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    integrations.geminiModel === 'gemini-3.8-flash' || integrations.geminiModel === 'Gemini 3.8 Flash'
                      ? 'bg-brand-500/10 border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                      : 'bg-surface border-theme hover:border-brand-500/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="geminiModel"
                    value="gemini-3.8-flash"
                    checked={
                      integrations.geminiModel === 'gemini-3.8-flash' ||
                      integrations.geminiModel === 'Gemini 3.8 Flash'
                    }
                    onChange={(e) => setIntegrations({ ...integrations, geminiModel: e.target.value })}
                    className="mt-1 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-primary flex items-center justify-between gap-1 flex-wrap">
                      <span>Gemini 3.8 Flash</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider border border-brand-500/30">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-1.5 leading-relaxed">
                      Highest reasoning fidelity for executive pitches, deep technical scoring, and rich 60-second video demo scripts.
                    </p>
                  </div>
                </label>

                {/* Gemini 3.7 Flash */}
                <label
                  className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    integrations.geminiModel === 'gemini-3.7-flash' || integrations.geminiModel === 'Gemini 3.7 Flash'
                      ? 'bg-brand-500/10 border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                      : 'bg-surface border-theme hover:border-brand-500/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="geminiModel"
                    value="gemini-3.7-flash"
                    checked={
                      integrations.geminiModel === 'gemini-3.7-flash' ||
                      integrations.geminiModel === 'Gemini 3.7 Flash'
                    }
                    onChange={(e) => setIntegrations({ ...integrations, geminiModel: e.target.value })}
                    className="mt-1 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-primary flex items-center justify-between gap-1 flex-wrap">
                      <span>Gemini 3.7 Flash</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider border border-indigo-500/30">
                        Balanced
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-1.5 leading-relaxed">
                      Ultra-fast hybrid reasoning. Exceptional precision for qualification, audit breakdowns, and proposal hooks.
                    </p>
                  </div>
                </label>

                {/* Gemini 3.5 Flash Lite */}
                <label
                  className={`p-4 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                    integrations.geminiModel === 'gemini-3.5-flash-lite' || integrations.geminiModel === 'Gemini 3.5 Flash Lite'
                      ? 'bg-brand-500/10 border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                      : 'bg-surface border-theme hover:border-brand-500/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="geminiModel"
                    value="gemini-3.5-flash-lite"
                    checked={
                      integrations.geminiModel === 'gemini-3.5-flash-lite' ||
                      integrations.geminiModel === 'Gemini 3.5 Flash Lite'
                    }
                    onChange={(e) => setIntegrations({ ...integrations, geminiModel: e.target.value })}
                    className="mt-1 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-primary flex items-center justify-between gap-1 flex-wrap">
                      <span>Gemini 3.5 Flash Lite</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider border border-emerald-500/30">
                        High Speed
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary mt-1.5 leading-relaxed">
                      Fastest response time and lowest token cost. Ideal for rapid high-volume lead qualification and filtering.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Gemini API Key */}
            <div className="p-5 rounded-xl bg-card border border-theme shadow-sm space-y-3">
              <label className="text-xs font-bold text-primary block">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={integrations.geminiApiKey || ''}
                onChange={(e) => setIntegrations({ ...integrations, geminiApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 font-mono"
              />
              <p className="text-[11px] text-secondary">
                You can obtain an API key for free at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-500 hover:underline font-semibold"
                >
                  Google AI Studio
                </a>
                . Keys saved here or in <code className="bg-surface px-1 py-0.5 rounded border border-theme text-primary font-mono text-[10px]">server/.env</code> are securely encrypted.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: DELIVERY & EMAIL CHANNELS */}
        {activeTab === 'email' && (
          <div className="space-y-8">
            {/* Page Header with Flow Pipeline Context */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-theme pb-5">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <Mail className="w-5 h-5 text-brand-500 flex-shrink-0" />
                  <span>Email Delivery & Response Infrastructure</span>
                </h3>
                <p className="text-xs text-secondary mt-1">
                  End-to-end pipeline for sending automated proposals and detecting incoming prospect replies.
                </p>
              </div>

              {/* Visual Workflow Journey Badge */}
              <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface border border-theme text-[11px] text-secondary flex-shrink-0 whitespace-nowrap shadow-sm">
                <span className="flex items-center gap-1.5 font-medium text-primary whitespace-nowrap flex-shrink-0">
                  <Send className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  <span className="whitespace-nowrap">1. Dispatch</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                <span className="flex items-center gap-1.5 font-medium text-primary whitespace-nowrap flex-shrink-0">
                  <Inbox className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="whitespace-nowrap">2. Reply Sync</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Auto-Halt</span>
                </span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* STAGE 1: OUTBOUND SENDING ENGINE                                          */}
            {/* ========================================================================= */}
            <div className="p-6 rounded-2xl bg-card border border-theme shadow-sm space-y-6">
              {/* Step Header */}
              <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-theme">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-xs">
                    01
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      Outbound Sending Engine
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                        Pitches & Follow-ups
                      </span>
                    </h4>
                    <p className="text-xs text-secondary mt-0.5">
                      Select and authenticate the mail service used to deliver cold outreach pitches, follow-ups, and calendar links.
                    </p>
                  </div>
                </div>
              </div>

              {/* Provider Selector Cards (Sleek, integrated side-by-side) */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                  Select Sending Infrastructure
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SMTP Card */}
                  <button
                    type="button"
                    onClick={() => setIntegrations({ ...integrations, deliveryProvider: 'smtp' })}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                      integrations.deliveryProvider === 'smtp'
                        ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-500/5 shadow-sm'
                        : 'border-theme bg-surface hover:border-brand-500/40 text-secondary'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-primary">Google Workspace / Custom SMTP</h5>
                          <span className="text-[10px] text-muted">Standard SMTP · TLS/SSL Direct</span>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          integrations.deliveryProvider === 'smtp'
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-theme'
                        }`}
                      >
                        {integrations.deliveryProvider === 'smtp' && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-secondary leading-relaxed">
                      Direct outbound delivery with authentication. Ideal for Gmail, Google Workspace, Microsoft 365, Amazon SES, and private mail servers.
                    </p>
                  </button>

                  {/* Resend API Card */}
                  <button
                    type="button"
                    onClick={() => setIntegrations({ ...integrations, deliveryProvider: 'resend' })}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                      integrations.deliveryProvider === 'resend'
                        ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-500/5 shadow-sm'
                        : 'border-theme bg-surface hover:border-brand-500/40 text-secondary'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-primary">Resend API</h5>
                          <span className="text-[10px] text-muted">Developer REST API · Managed DKIM/SPF</span>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          integrations.deliveryProvider === 'resend'
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-theme'
                        }`}
                      >
                        {integrations.deliveryProvider === 'resend' && <Check className="w-2.5 h-2.5" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-secondary leading-relaxed">
                      Enterprise transactional mail infrastructure. Built-in domain authentication, high reputation deliverability, and click/open tracking.
                    </p>
                  </button>
                </div>
              </div>

              {/* Provider Details Form (Smoothly nested in Stage 1) */}
              {integrations.deliveryProvider === 'smtp' && (
                <div className="p-5 rounded-xl bg-surface border border-theme space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h5 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-brand-500" />
                      SMTP Server Authentication
                    </h5>
                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted font-medium mr-1">Quick Presets:</span>
                      {SMTP_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() =>
                            setIntegrations({
                              ...integrations,
                              smtpConfig: {
                                ...integrations.smtpConfig,
                                host: p.host,
                                port: p.port,
                                secure: p.secure
                              }
                            })
                          }
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-card hover:bg-card-subtle border border-theme text-secondary hover:text-primary transition-all cursor-pointer"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="text-[11px] font-semibold text-secondary block mb-1">SMTP Host</label>
                      <input
                        type="text"
                        placeholder="smtp.gmail.com"
                        value={integrations.smtpConfig?.host || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            smtpConfig: { ...integrations.smtpConfig, host: e.target.value }
                          })
                        }
                        className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">SMTP Port</label>
                      <input
                        type="number"
                        placeholder="465"
                        value={integrations.smtpConfig?.port || 465}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            smtpConfig: { ...integrations.smtpConfig, port: parseInt(e.target.value) || 465 }
                          })
                        }
                        className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">
                        Account Email / Username
                      </label>
                      <input
                        type="email"
                        placeholder="alex@apexsolutions.io"
                        value={integrations.smtpConfig?.user || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            smtpConfig: { ...integrations.smtpConfig, user: e.target.value }
                          })
                        }
                        className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-secondary">
                          App Password / Secret
                        </label>
                        <span className="text-[10px] text-muted">16-char Google App Password</span>
                      </div>
                      <input
                        type="password"
                        placeholder="••••••••••••••••"
                        value={integrations.smtpConfig?.pass || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            smtpConfig: { ...integrations.smtpConfig, pass: e.target.value }
                          })
                        }
                        className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary font-mono placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-secondary block mb-1">
                      From Display Header (Display Name & Sender Email)
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
                      className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                    />
                    <p className="text-[10px] text-muted mt-1">
                      This exact string will appear in the recipient's "From" field. Use a friendly name with your domain email.
                    </p>
                  </div>
                </div>
              )}

              {integrations.deliveryProvider === 'resend' && (
                <div className="p-5 rounded-xl bg-surface border border-theme space-y-4">
                  <h5 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-brand-500" />
                    Resend API Credentials
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">Resend API Key</label>
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
                        className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary font-mono placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">
                        Verified Domain Sender Email
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
                        className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted">
                    Sender email must use a domain that is verified with DKIM and SPF records in your Resend account.
                  </p>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* STAGE 2: INBOUND REPLY TRACKING & LEAD SYNC                               */}
            {/* ========================================================================= */}
            <div className="p-6 rounded-2xl bg-card border border-theme shadow-sm space-y-6">
              {/* Step Header */}
              <div className="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-theme">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs">
                    02
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      Inbound Reply Detection & Auto-Halt
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Lead Status Sync
                      </span>
                    </h4>
                    <p className="text-xs text-secondary mt-0.5">
                      Automatically detect prospect email replies. SSOC will immediately tag the lead as <span className="text-primary font-semibold">Replied</span> and halt all pending follow-up sequences.
                    </p>
                  </div>
                </div>
              </div>

              {/* Method Selector Segmented Control (NO UGLY BOXES IN BOXES!) */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-secondary uppercase tracking-wider block">
                  Choose Reply Detection Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1 rounded-xl bg-surface border border-theme">
                  <button
                    type="button"
                    onClick={() => setInboundMethod('imap')}
                    className={`p-3 rounded-lg text-left transition-all flex items-center gap-3 cursor-pointer ${
                      inboundMethod === 'imap'
                        ? 'bg-card text-primary shadow-sm border border-theme font-semibold'
                        : 'text-secondary hover:text-primary hover:bg-card/50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        inboundMethod === 'imap' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface text-muted'
                      }`}
                    >
                      <Inbox className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        Direct Mailbox Sync (IMAP)
                        {integrations.imap?.enabled && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <div className="text-[10px] text-muted truncate">Automated 30-min background inbox scan</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInboundMethod('webhook')}
                    className={`p-3 rounded-lg text-left transition-all flex items-center gap-3 cursor-pointer ${
                      inboundMethod === 'webhook'
                        ? 'bg-card text-primary shadow-sm border border-theme font-semibold'
                        : 'text-secondary hover:text-primary hover:bg-card/50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        inboundMethod === 'webhook' ? 'bg-brand-500/10 text-brand-500' : 'bg-surface text-muted'
                      }`}
                    >
                      <Link className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold">Real-Time Inbound Webhook</div>
                      <div className="text-[10px] text-muted truncate">Instant stream for Resend, SendGrid, Zapier, n8n</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* DYNAMIC PANEL: DIRECT IMAP */}
              {inboundMethod === 'imap' && (
                <div className="p-5 rounded-xl bg-surface border border-theme space-y-4">
                  {/* Top Control Bar with Modern Toggle Switch & Test Button */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-theme">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">Automated Mailbox Polling Daemon</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            integrations.imap?.enabled
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-muted/10 text-muted border-theme'
                          }`}
                        >
                          {integrations.imap?.enabled ? 'Active · Every 30 mins' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-[11px] text-secondary mt-0.5">
                        Automatically connects to your inbox every 30 minutes to check if active prospects replied.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Modern iOS-Style Toggle Switch (NOT a raw checkbox!) */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={integrations.imap?.enabled || false}
                        onClick={() =>
                          setIntegrations({
                            ...integrations,
                            imap: { ...(integrations.imap || {}), enabled: !integrations.imap?.enabled }
                          })
                        }
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <div
                          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 flex items-center ${
                            integrations.imap?.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                              integrations.imap?.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                        <span className="text-xs font-semibold text-primary">
                          {integrations.imap?.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>

                      {/* Check Inbox Now Action Button */}
                      <button
                        type="button"
                        onClick={handleSyncImap}
                        disabled={syncingImap}
                        className="px-3.5 py-1.5 text-xs font-semibold !text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm shadow-emerald-600/20 disabled:opacity-50 whitespace-nowrap"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingImap ? 'animate-spin' : ''}`} />
                        <span>{syncingImap ? 'Scanning Mailbox...' : 'Check Inbox Now'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Sync Result Alert */}
                  {imapSyncResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                        imapSyncResult.success
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                      }`}
                    >
                      {imapSyncResult.success ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>
                        {imapSyncResult.success
                          ? `Mailbox synced: scanned ${imapSyncResult.processedCount || 0} messages, matched & updated ${imapSyncResult.matchedLeadsCount || 0} prospect replies!`
                          : `IMAP Connection Error: ${imapSyncResult.error || 'Connection failed'}`}
                      </span>
                    </div>
                  )}

                  {/* IMAP Credentials Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">IMAP Host</label>
                      <input
                        type="text"
                        placeholder="imap.gmail.com"
                        value={integrations.imap?.host || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            imap: { ...(integrations.imap || {}), host: e.target.value }
                          })
                        }
                        className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">IMAP Port</label>
                      <input
                        type="number"
                        placeholder="993"
                        value={integrations.imap?.port || 993}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            imap: { ...(integrations.imap || {}), port: Number(e.target.value) || 993 }
                          })
                        }
                        className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">Email / Username</label>
                      <input
                        type="email"
                        placeholder="alex@apexsolutions.io"
                        value={integrations.imap?.user || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            imap: { ...(integrations.imap || {}), user: e.target.value }
                          })
                        }
                        className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">App Password</label>
                      <input
                        type="password"
                        placeholder="••••••••••••••••"
                        value={integrations.imap?.pass || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            imap: { ...(integrations.imap || {}), pass: e.target.value }
                          })
                        }
                        className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary font-mono placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted">
                    For Google Workspace or Gmail accounts, use an App Password with IMAP enabled in your Gmail settings.
                  </p>
                </div>
              )}

              {/* DYNAMIC PANEL: REAL-TIME WEBHOOK */}
              {inboundMethod === 'webhook' && (
                <div className="p-5 rounded-xl bg-surface border border-theme space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-theme">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">Inbound Reply Webhook Receiver</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                          Instant Streaming
                        </span>
                      </div>
                      <p className="text-[11px] text-secondary mt-0.5">
                        Incoming emails sent to this endpoint immediately mark the lead as <span className="font-semibold text-primary">Replied</span> without polling delays.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted">
                      <span>Compatible with:</span>
                      <span className="px-1.5 py-0.5 rounded bg-card border border-theme font-medium text-secondary">Resend</span>
                      <span className="px-1.5 py-0.5 rounded bg-card border border-theme font-medium text-secondary">SendGrid</span>
                      <span className="px-1.5 py-0.5 rounded bg-card border border-theme font-medium text-secondary">Zapier</span>
                      <span className="px-1.5 py-0.5 rounded bg-card border border-theme font-medium text-secondary">n8n</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-secondary block mb-1">
                      Your Inbound Webhook Endpoint URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={integrations.inboundWebhookUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/email-reply`}
                        className="min-w-0 flex-1 bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary font-mono select-all focus:outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={handleCopyWebhook}
                        className="px-3.5 py-2 text-xs font-semibold !text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm shadow-brand-600/20 whitespace-nowrap"
                      >
                        {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedWebhook ? 'Copied!' : 'Copy Endpoint'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-secondary block mb-1">
                      Optional Webhook Secret Token (Cryptographic Signature)
                    </label>
                    <input
                      type="password"
                      placeholder="e.g. whsec_secret_key_123"
                      value={integrations.inboundWebhookSecret || ''}
                      onChange={(e) =>
                        setIntegrations({
                          ...integrations,
                          inboundWebhookSecret: e.target.value
                        })
                      }
                      className="w-full bg-card border border-theme rounded-lg px-3 py-2 text-xs text-primary font-mono placeholder:text-muted focus:outline-none focus:border-brand-500"
                    />
                    <p className="text-[10px] text-muted mt-1">
                      When set, incoming HTTP POST webhooks must provide this secret token either in header <code className="text-primary font-mono">x-webhook-secret</code> or query parameter <code className="text-primary font-mono">?secret=...</code>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LEAD SOURCES & PLATFORM CHANNELS */}
        {activeTab === 'feeds' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-primary">Lead Discovery Sources & Platform Channels</h3>
              <p className="text-xs text-secondary mt-1">
                Automated discovery engines, platform profiles, RSS feeds, and inbound webhook connectors.
              </p>
            </div>

            {/* Sourcing Platforms & Active Engines */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider">
                Discovery Engines & Platform Integrations
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* LinkedIn Jobs Engine */}
                <div className="p-4 rounded-xl bg-card border border-theme shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-primary text-sm flex items-center gap-1.5">
                        <span>LinkedIn Jobs Engine</span>
                      </div>
                      <div className="text-[11px] text-muted">Public guest search & live job parser</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20">
                      Active Sourcing
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-theme">
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">
                        Sourcing Search Keywords
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Full Stack Developer, AI Engineer, React"
                        value={integrations.linkedin?.searchKeywords || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            linkedin: { ...(integrations.linkedin || {}), searchKeywords: e.target.value }
                          })
                        }
                        className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">
                        Company Page URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/company/your-agency"
                        value={integrations.linkedin?.companyPageUrl || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            linkedin: { ...(integrations.linkedin || {}), companyPageUrl: e.target.value }
                          })
                        }
                        className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Freelancer.com Projects */}
                <div className="p-4 rounded-xl bg-card border border-theme shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-primary text-sm">Freelancer.com Projects</div>
                      <div className="text-[11px] text-muted">Live project search & optional 1-click Bidding API</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      Active API
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-theme">
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">
                        Company Freelancer Username
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ephlux_solutions"
                        value={integrations.freelancer?.profileUsername || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            freelancer: { ...(integrations.freelancer || {}), profileUsername: e.target.value }
                          })
                        }
                        className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">
                        Personal API Token (Optional for automated bidding)
                      </label>
                      <input
                        type="password"
                        placeholder="Enter token from freelancer.com/developers..."
                        value={integrations.freelancer?.apiToken || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            freelancer: { ...(integrations.freelancer || {}), apiToken: e.target.value }
                          })
                        }
                        className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary font-mono placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Upwork Sourcing & RSS */}
                <div className="p-4 rounded-xl bg-card border border-theme shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-primary text-sm">Upwork Proposals & RSS</div>
                      <div className="text-[11px] text-muted">Live Upwork RSS feed ingestion & guided web dispatch</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-theme">
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">
                        Target Search Keywords
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Next.js, Node.js, AI Agent, Python"
                        value={integrations.upwork?.searchKeywords || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            upwork: { ...(integrations.upwork || {}), searchKeywords: e.target.value }
                          })
                        }
                        className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-secondary block mb-1">
                        Upwork Agency / Profile URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://www.upwork.com/ag/your-agency"
                        value={integrations.upwork?.profileUrl || ''}
                        onChange={(e) =>
                          setIntegrations({
                            ...integrations,
                            upwork: { ...(integrations.upwork || {}), profileUrl: e.target.value }
                          })
                        }
                        className="w-full bg-surface border border-theme rounded-lg px-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* RemoteOK Tech API */}
                <div className="p-4 rounded-xl bg-card border border-theme shadow-sm flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-primary text-sm">RemoteOK Tech API</div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                        Active Feed
                      </span>
                    </div>
                    <div className="text-[11px] text-muted">
                      Direct REST API connection pulling verified remote developer and AI engineering roles.
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-secondary bg-surface p-2 rounded-lg border border-theme">
                    Auto-polled during scheduled discovery rounds.
                  </div>
                </div>

                {/* WeWorkRemotely RSS Feed */}
                <div className="p-4 rounded-xl bg-card border border-theme shadow-sm flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-primary text-sm">WeWorkRemotely Feed</div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                        Active Feed
                      </span>
                    </div>
                    <div className="text-[11px] text-muted">
                      Official full-stack and backend programming category feed with escrow contract verification.
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-secondary bg-surface p-2 rounded-lg border border-theme">
                    Auto-polled during scheduled discovery rounds.
                  </div>
                </div>

                {/* Y Combinator & Hacker News API */}
                <div className="p-4 rounded-xl bg-card border border-theme shadow-sm flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-primary text-sm">Y Combinator & Hacker News</div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                        Active Feed
                      </span>
                    </div>
                    <div className="text-[11px] text-muted">
                      Firebase API connection monitoring monthly Who is Hiring threads and early startup founder requests.
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-secondary bg-surface p-2 rounded-lg border border-theme">
                    Auto-polled during scheduled discovery rounds.
                  </div>
                </div>
              </div>
            </div>

            {/* Apollo.io Configuration */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-3 shadow-sm">
              <div>
                <h4 className="text-xs font-bold text-primary">Apollo.io Direct B2B Prospecting</h4>
                <p className="text-[11px] text-secondary mt-0.5">
                  Search and pull decision-makers (Founders, CTOs, VPs) matching your target keywords.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-secondary block mb-1">
                  Apollo.io API Key
                </label>
                <input
                  type="password"
                  placeholder="Enter Apollo API Key or keep in server/.env..."
                  value={integrations.apolloApiKey || ''}
                  onChange={(e) => setIntegrations({ ...integrations, apolloApiKey: e.target.value })}
                  className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-xs text-primary font-mono placeholder:text-muted focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Inbound Webhook Card */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-3 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-primary">Inbound Lead Webhook URL</h4>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Connect Make, Zapier, n8n, Typeform, or custom scrapers to send leads directly to SSOC.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyWebhookUrl}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-all shadow-sm cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Copied' : 'Copy Webhook URL'}</span>
                </button>
              </div>

              <div className="p-3 rounded-lg bg-surface border border-theme text-[11px] font-mono text-secondary break-all select-all">
                {window.location.origin}/api/integrations/inbound-webhook
              </div>
            </div>

            {/* Custom RSS Feeds */}
            <div className="p-5 rounded-xl bg-card border border-theme space-y-3 shadow-sm">
              <h4 className="text-xs font-bold text-primary">Custom RSS Feeds</h4>
              <div className="space-y-2">
                {(integrations.rssFeeds || []).map((feed) => (
                  <div
                    key={feed.id}
                    className="flex items-center justify-between p-3 bg-surface border border-theme rounded-lg text-xs"
                  >
                    <div>
                      <span className="font-semibold text-primary">{feed.name}</span>
                      <span className="ml-2 text-[10px] text-muted font-mono uppercase">({feed.platform})</span>
                      <div className="text-[11px] text-secondary truncate max-w-md">{feed.url}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="p-1.5 text-muted hover:text-rose-500 transition-colors cursor-pointer"
                      title="Remove feed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Feed Form */}
              <form onSubmit={handleAddFeed} className="pt-3 border-t border-theme space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Feed Name (e.g. Upwork AI Jobs)"
                    value={newFeedName}
                    onChange={(e) => setNewFeedName(e.target.value)}
                    className="bg-surface border border-theme rounded-lg px-3 py-2 text-primary text-xs placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                  <CustomSelect
                    value={newFeedPlatform}
                    onChange={setNewFeedPlatform}
                    options={FEED_PLATFORM_OPTIONS}
                    size="sm"
                    className="w-full"
                    buttonClassName="w-full bg-surface border-theme text-primary"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                  >
                    Add Feed
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="https://feed-url..."
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="w-full bg-surface border border-theme rounded-lg px-3 py-2 text-primary text-xs placeholder:text-muted focus:outline-none focus:border-brand-500"
                />
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: AUTOMATIONS & DATABASE */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-primary">Automations, Cron Schedules & Maintenance</h3>
              <p className="text-xs text-secondary mt-1">
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
            <div className="p-5 rounded-xl bg-card border border-theme shadow-sm space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary">Daily Lead Finder Cron Job</h4>
                    <p className="text-[11px] text-secondary">
                      Schedule:{' '}
                      <span className="text-brand-500 font-mono font-semibold">
                        {schedulerStatus?.leadFinderSchedule || '0 8 * * *'}
                      </span>{' '}
                      ({schedulerStatus?.leadFinderHuman || 'Every day at 8:00 AM'})
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Configured & Active
                </span>
              </div>

              <p className="text-[11px] text-secondary leading-relaxed">
                Crawls RemoteOK, Freelancer, YC/HN, and RSS feeds. Runs high-efficiency single-call LLM batch evaluation against your company profile, strictly rejecting non-tech roles and bounding discoveries to {company.maxLeadsPerBatch || 20} leads.
              </p>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-theme">
                <div className="text-[11px] text-secondary">
                  Target Bound: <span className="text-primary font-semibold">{company.maxLeadsPerBatch || 20} leads / run</span>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerFinder}
                  disabled={triggeringFinder}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 active:scale-95 !text-white rounded-lg text-xs font-semibold shadow-sm shadow-brand-600/20 transition-all disabled:opacity-50"
                >
                  <Play className={`w-3.5 h-3.5 ${triggeringFinder ? 'animate-spin' : ''}`} />
                  {triggeringFinder ? 'Running Batch Discovery...' : 'Run Lead Finder Now'}
                </button>
              </div>
            </div>

            {/* Follow-Up Tracker Automation Card */}
            <div className="p-5 rounded-xl bg-card border border-theme shadow-sm space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary">Daily Follow-Up & Lost Lead Tracker</h4>
                    <p className="text-[11px] text-secondary">
                      Schedule:{' '}
                      <span className="text-purple-600 dark:text-purple-400 font-mono font-semibold">
                        {schedulerStatus?.cooldownSchedule || '0 9 * * *'}
                      </span>{' '}
                      ({schedulerStatus?.cooldownHuman || 'Every day at 9:00 AM'})
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Configured & Active
                </span>
              </div>

              <p className="text-[11px] text-secondary leading-relaxed">
                Scans contacted prospects and progresses follow-up sequences automatically past Day 7, Day 21, and monthly check-ins for 4 months. Unreplied leads are automatically moved to <strong>9. Lost</strong>. Sequences halt the instant a client replies.
              </p>

              <div className="flex items-center justify-end pt-2 border-t border-theme">
                <button
                  type="button"
                  onClick={handleTriggerCooldown}
                  disabled={triggeringCooldown}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface hover:bg-card-subtle active:scale-95 text-primary border border-theme rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
                >
                  <Play className={`w-3.5 h-3.5 ${triggeringCooldown ? 'animate-spin text-purple-500' : ''}`} />
                  {triggeringCooldown ? 'Checking Follow-ups...' : 'Check Follow-ups Now'}
                </button>
              </div>
            </div>

            {/* Database Pipeline Reset Card */}
            <div className="p-5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">Database Pipeline Reset</h4>
                    <p className="text-[11px] text-secondary">
                      Current Leads in Pipeline:{' '}
                      <span className="text-primary font-bold">{schedulerStatus?.totalLeadsInDb ?? 0}</span>
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-secondary leading-relaxed">
                Clearing the database wipes out all leads from the pipeline while safely preserving your company profile, targeting rules, and integration credentials.
              </p>

              <div className="flex items-center justify-end pt-2 border-t border-rose-500/20">
                <button
                  type="button"
                  onClick={handleResetDatabase}
                  disabled={resettingDb}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 !text-white rounded-lg text-xs font-semibold transition-all shadow-sm shadow-rose-600/20 disabled:opacity-50"
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
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <Palette className="w-4 h-4 text-brand-500" />
                Appearance & Visual Theme
              </h3>
              <p className="text-xs text-secondary mt-1">
                Customize your visual environment for maximum readability, fast lead skimming, and comfortable viewing during extended outreach sessions.
              </p>
            </div>

            {/* SECTION 1: INTERFACE MODE (LIGHT VS DARK) */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-primary tracking-wide uppercase flex items-center gap-2">
                <span>1. Interface Mode</span>
                <span className="text-[10px] font-normal text-muted normal-case">(Optimized for day & night viewing)</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-card border border-theme rounded-2xl p-6 shadow-2xl relative space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-theme">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-brand-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    Quick AI Auto-Setup
                    <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30">
                      1-Click Extraction
                    </span>
                  </h3>
                  <p className="text-[11px] text-secondary">
                    Paste your agency website copy, LinkedIn bio, or pitch deck summary.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAiModal(false)}
                className="text-secondary hover:text-primary p-1 rounded-lg hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-primary">
                  Paste Agency Website or Deck Summary
                </label>
                <button
                  type="button"
                  onClick={loadSampleAgencyText}
                  className="text-[11px] text-brand-500 hover:text-brand-600 font-medium underline flex items-center gap-1 cursor-pointer"
                >
                  Load Sample Agency (Apex AI)
                </button>
              </div>
              <textarea
                rows={7}
                value={quickAiText}
                onChange={(e) => setQuickAiText(e.target.value)}
                placeholder="Paste your agency 'About Us' page, services catalog, LinkedIn summary, or capabilities deck here... Gemini will automatically extract and configure your company profile, value proposition, services, keywords, and targeting rules in seconds."
                className="w-full bg-surface border border-theme rounded-xl p-3 text-xs text-primary focus:outline-none focus:border-brand-500 leading-relaxed font-sans placeholder:text-muted"
              />
            </div>

            {/* Alerts */}
            {quickAiError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{quickAiError}</span>
              </div>
            )}
            {quickAiSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
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
                className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQuickAiExtract}
                disabled={quickAiExtracting || !quickAiText.trim()}
                className="px-5 py-2 text-xs font-semibold !text-white bg-brand-600 hover:bg-brand-500 active:scale-95 rounded-lg shadow-md shadow-brand-600/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {quickAiExtracting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
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
