import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Header from './components/Header.jsx';
import PipelineView from './components/PipelineView.jsx';
import PriorityInbox from './components/PriorityInbox.jsx';
import LeadModal from './components/LeadModal.jsx';
import AddLeadModal from './components/AddLeadModal.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import CustomSelect from './components/CustomSelect.jsx';
import AuthPage from './components/AuthPage.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { SettingsSkeleton, PipelineSkeleton, PriorityInboxSkeleton } from './components/Skeletons.jsx';
import { Search, Filter, RefreshCw, AlertCircle, X } from 'lucide-react';

const PLATFORM_FILTER_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'upwork', label: 'Upwork' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'ycombinator', label: 'Y Combinator' },
  { value: 'apollo', label: 'Apollo' },
  { value: 'remoteok', label: 'RemoteOK' },
  { value: 'weworkremotely', label: 'WeWorkRemotely' },
  { value: 'manual', label: 'Manual / Webhook' }
];

export default function App() {
  const { isAuthenticated, isLoading: authLoading, company } = useAuth();

  const [activeView, setActiveView] = useState('pipeline'); // 'pipeline' | 'inbox' | 'settings'
  const [leads, setLeads] = useState([]);
  const [stageCounts, setStageCounts] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Actions loading
  const [isScanning, setIsScanning] = useState(false);
  const [isCooldownRunning, setIsCooldownRunning] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [bannerNotice, setBannerNotice] = useState('');
  const bannerTimeoutRef = useRef(null);

  const showBannerNotice = (message, duration = 4500) => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = null;
    }
    setBannerNotice(message);
    if (duration > 0) {
      bannerTimeoutRef.current = setTimeout(() => {
        setBannerNotice('');
        bannerTimeoutRef.current = null;
      }, duration);
    }
  };

  const handleDismissBanner = () => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = null;
    }
    setBannerNotice('');
  };

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      window.__refreshLeads = fetchLeads;
      fetchLeads();
    }
  }, [isAuthenticated, company?._id, platformFilter, searchQuery]);

  const fetchLeads = async () => {
    try {
      const params = {};
      if (platformFilter !== 'all') params.platform = platformFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await axios.get('/api/leads', { params });
      setLeads(res.data.leads || []);
      setStageCounts(res.data.stageCounts || {});

      // Keep selected lead in sync if drawer is open
      if (selectedLead) {
        const updated = (res.data.leads || []).find((l) => l._id === selectedLead._id);
        if (updated) setSelectedLead(updated);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run AI Audit & Demo Prep
  const handleRunAudit = async (leadId) => {
    setIsAuditing(true);
    try {
      const res = await axios.post(`/api/leads/${leadId}/audit`);
      setSelectedLead(res.data);
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.error || 'AI Audit failed. Check Gemini API key in Settings.');
    } finally {
      setIsAuditing(false);
    }
  };

  // Submit recorded demo video
  const handleSubmitVideo = async (leadId, demoVideoUrl) => {
    try {
      const res = await axios.post(`/api/leads/${leadId}/video`, { demoVideoUrl });
      setSelectedLead(res.data);
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to link demo video');
    }
  };

  // Generate / Regenerate pitch
  const handleGeneratePitch = async (leadId) => {
    try {
      const res = await axios.post(`/api/leads/${leadId}/generate-pitch`);
      setSelectedLead(res.data);
      fetchLeads();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate pitch');
    }
  };

  // Send Pitch (via SMTP, Resend, or 1-Click Clipboard/Mailto)
  const handleSendPitch = async (leadId, payload) => {
    setIsSending(true);
    try {
      const res = await axios.post(`/api/leads/${leadId}/send`, payload);
      setSelectedLead(res.data.lead);
      fetchLeads();
      return res.data;
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to dispatch pitch');
    } finally {
      setIsSending(false);
    }
  };

  // Client Replied
  const handleClientReplied = async (leadId) => {
    try {
      const res = await axios.post(`/api/leads/${leadId}/client-replied`);
      setSelectedLead(res.data);
      fetchLeads();
      setBannerNotice('Client response recorded! All follow-up sequences halted.');
      setTimeout(() => setBannerNotice(''), 4000);
    } catch (err) {
      console.error('Failed to mark client replied:', err);
    }
  };

  // Update stage manually
  const handleUpdateStage = async (leadId, stage) => {
    try {
      const res = await axios.patch(`/api/leads/${leadId}/stage`, { stage });
      setSelectedLead(res.data);
      fetchLeads();
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  // Daily Lead Finder manual trigger
  const handleRunScanner = async () => {
    setIsScanning(true);
    try {
      const res = await axios.post('/api/scheduler/run-lead-finder');
      fetchLeads();
      showBannerNotice(`Lead Finder finished! Found ${res.data?.newLeadsCount || 0} new leads.`);
    } catch (err) {
      alert('Error running lead finder: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsScanning(false);
    }
  };

  // Cooldown tracker manual trigger
  const handleRunCooldown = async () => {
    setIsCooldownRunning(true);
    try {
      const res = await axios.post('/api/scheduler/run-cooldown');
      fetchLeads();
      showBannerNotice(`Cooldown Tracker updated ${res.data?.updatedCount || 0} follow-ups.`);
    } catch (err) {
      alert('Error checking cooldowns: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsCooldownRunning(false);
    }
  };

  // Create Lead
  const handleLeadCreated = async (newLeadData) => {
    const res = await axios.post('/api/leads', newLeadData);
    fetchLeads();
    setSelectedLead(res.data);
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-surface flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        <span className="text-xs text-muted font-medium">Loading Workspace...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="h-screen max-h-screen bg-canvas text-primary flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        stageCounts={stageCounts}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenSettingsModal={() => setActiveView('settings')}
        onRunScanner={handleRunScanner}
        onRunCooldown={handleRunCooldown}
        isScanning={isScanning}
        isCooldownRunning={isCooldownRunning}
      />

      {/* Dynamic Toast / Notice with manual cross dismissal and error-free timed fade */}
      {bannerNotice && (
        <div className="bg-brand-500/10 dark:bg-brand-500/15 border-b border-brand-500/25 px-4 sm:px-6 py-2.5 text-xs text-brand-700 dark:text-brand-300 font-medium flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex-1 flex items-center justify-center gap-2 text-center">
            <span className="w-2 h-2 rounded-full bg-brand-500 ring-2 ring-brand-500/30 animate-pulse flex-shrink-0" />
            <span className="font-semibold">{bannerNotice}</span>
          </div>
          <button
            type="button"
            onClick={handleDismissBanner}
            className="p-1 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-brand-500/15 rounded-md transition-colors flex-shrink-0 cursor-pointer"
            title="Dismiss notice"
            aria-label="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar (Visible on Pipeline and Inbox) */}
      {activeView !== 'settings' && (
        <div className="px-6 py-3 border-b border-theme bg-surface flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads, skills, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-theme rounded-lg pl-9 pr-3 py-1.5 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Platform Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-muted flex-shrink-0" />
            <CustomSelect
              value={platformFilter}
              onChange={setPlatformFilter}
              options={PLATFORM_FILTER_OPTIONS}
              size="sm"
              align="right"
              buttonClassName="min-w-[145px]"
            />
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {loading ? (
          activeView === 'settings' ? (
            <SettingsSkeleton />
          ) : activeView === 'inbox' ? (
            <PriorityInboxSkeleton />
          ) : (
            <PipelineSkeleton />
          )
        ) : activeView === 'settings' ? (
          <SettingsPage onBackToPipeline={() => setActiveView('pipeline')} />
        ) : activeView === 'pipeline' ? (
          <PipelineView
            leads={leads}
            selectedLead={selectedLead}
            onSelectLead={(lead) => setSelectedLead(lead)}
            onAdvanceStage={handleUpdateStage}
          />
        ) : (
          <PriorityInbox
            leads={leads}
            onSelectLead={(lead) => setSelectedLead(lead)}
            onUpdateStage={handleUpdateStage}
          />
        )}
      </main>

      {/* Extra-Large Modal for Selected Lead */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          company={company}
          onClose={() => setSelectedLead(null)}
          onUpdateStage={handleUpdateStage}
          onRunAudit={handleRunAudit}
          onSubmitVideo={handleSubmitVideo}
          onGeneratePitch={handleGeneratePitch}
          onSendPitch={handleSendPitch}
          onClientReplied={handleClientReplied}
          isAuditing={isAuditing}
          isSending={isSending}
        />
      )}

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onLeadCreated={handleLeadCreated}
      />
    </div>
  );
}
