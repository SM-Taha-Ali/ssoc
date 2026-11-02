import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Search,
  UserPlus,
  Send,
  Globe,
  Building2,
  Clock,
  Trash2,
  Mail,
  MessageSquare,
  CheckCircle2,
  SlidersHorizontal,
  X
} from 'lucide-react';

function Linkedin({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

// Module-level SWR cache for instant zero-flicker tab switching
let cachedFoundersList = null;

function formatRelativeRecency(dateStr) {
  if (!dateStr) return 'Recent';
  const diffMs = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function FounderOutreachView() {
  const [founders, setFounders] = useState(() => cachedFoundersList || []);
  const [loading, setLoading] = useState(() => !cachedFoundersList);
  const [discovering, setDiscovering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('smart');
  const [discoverKeywords, setDiscoverKeywords] = useState('AI SaaS Startup');
  const [toastMessage, setToastMessage] = useState(null);

  // Per-card local edits and active message tab ('dm' | 'note')
  const [editedMessages, setEditedMessages] = useState({});
  const [editedNotes, setEditedNotes] = useState({});
  const [activeMessageMode, setActiveMessageMode] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);

  // Add Custom Founder Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingFounder, setAddingFounder] = useState(false);
  const [newFounder, setNewFounder] = useState({
    name: '',
    role: 'Founder & CEO',
    company: '',
    linkedinUrl: '',
    email: '',
    signal: ''
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const fetchFounders = async (silent = false) => {
    if (!silent && !cachedFoundersList) setLoading(true);
    try {
      const res = await axios.get('/api/founders', {
        params: { sort: sortBy }
      });
      const list = res.data?.founders || [];
      cachedFoundersList = list;
      setFounders(list);
    } catch (err) {
      console.error('Failed to fetch founders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFounders(Boolean(cachedFoundersList));
  }, [sortBy]);

  const handleDiscoverMore = async (resetExisting = false) => {
    setDiscovering(true);
    try {
      const res = await axios.post('/api/founders/discover', {
        keywords: discoverKeywords || 'AI Automation SaaS',
        reset: Boolean(resetExisting)
      });
      await fetchFounders(true);
      showToast(
        res.data?.addedCount > 0
          ? `Discovered ${res.data.addedCount} verified Founders with AI outreach messages!`
          : 'Verified founder list refreshed with latest live signals.'
      );
    } catch (err) {
      showToast('Error discovering founders: ' + (err.response?.data?.error || err.message));
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddFounder = async (e) => {
    e.preventDefault();
    if (!newFounder.name && !newFounder.linkedinUrl) return;
    setAddingFounder(true);
    try {
      const res = await axios.post('/api/founders', newFounder);
      const created = res.data;
      const updated = [created, ...founders];
      cachedFoundersList = updated;
      setFounders(updated);
      setShowAddModal(false);
      setNewFounder({
        name: '',
        role: 'Founder & CEO',
        company: '',
        linkedinUrl: '',
        email: '',
        signal: ''
      });
      showToast(`Added ${created.name} and generated personalized AI outreach!`);
    } catch (err) {
      showToast('Failed to add founder: ' + (err.response?.data?.error || err.message));
    } finally {
      setAddingFounder(false);
    }
  };

  const getMessageText = (founder) => {
    const mode = activeMessageMode[founder._id] || 'dm';
    if (mode === 'note') {
      return editedNotes[founder._id] !== undefined
        ? editedNotes[founder._id]
        : founder.connectionNote || (founder.outreachMessage || '').slice(0, 260);
    }
    return editedMessages[founder._id] !== undefined
      ? editedMessages[founder._id]
      : founder.outreachMessage || '';
  };

  const handleTextChange = (founder, val) => {
    const mode = activeMessageMode[founder._id] || 'dm';
    if (mode === 'note') {
      setEditedNotes((prev) => ({ ...prev, [founder._id]: val }));
    } else {
      setEditedMessages((prev) => ({ ...prev, [founder._id]: val }));
    }
  };

  const handleRegenerate = async (founder, angle = '') => {
    setRegeneratingId(founder._id);
    try {
      const res = await axios.post(`/api/founders/${founder._id}/regenerate`, {
        customAngle: angle
      });
      const updatedFounder = res.data;
      setEditedMessages((prev) => {
        const next = { ...prev };
        delete next[founder._id];
        return next;
      });
      setEditedNotes((prev) => {
        const next = { ...prev };
        delete next[founder._id];
        return next;
      });
      setFounders((prev) => {
        const next = prev.map((f) => (f._id === founder._id ? { ...f, ...updatedFounder } : f));
        cachedFoundersList = next;
        return next;
      });
      showToast(`AI regenerated ${angle ? `"${angle}"` : 'personalized'} message for ${founder.name}.`);
    } catch (err) {
      showToast('Could not regenerate message: ' + (err.response?.data?.error || err.message));
    } finally {
      setRegeneratingId(null);
    }
  };

  /**
   * Primary Action: Copies the personalized AI message to clipboard, opens LinkedIn right away,
   * saves any inline edits, and marks the founder as Contacted.
   */
  const handleOpenLinkedInAndSend = async (founder) => {
    const textToCopy = getMessageText(founder);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(founder._id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (_) {}

    const targetUrl =
      founder.linkedinUrl ||
      founder.profileUrl ||
      `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
        `${founder.name} ${founder.company}`
      )}`;

    window.open(targetUrl, '_blank', 'noopener,noreferrer');

    showToast(
      `Message copied to clipboard! LinkedIn opened for ${founder.name} — just paste (Ctrl+V / Cmd+V) and send.`
    );

    try {
      const payload = {
        status: 'contacted',
        outreachMessage:
          editedMessages[founder._id] !== undefined ? editedMessages[founder._id] : founder.outreachMessage,
        connectionNote:
          editedNotes[founder._id] !== undefined ? editedNotes[founder._id] : founder.connectionNote
      };
      const res = await axios.patch(`/api/founders/${founder._id}`, payload);
      setFounders((prev) => {
        const next = prev.map((f) => (f._id === founder._id ? { ...f, ...res.data } : f));
        cachedFoundersList = next;
        return next;
      });
    } catch (_) {}
  };

  const handleCopyOnly = async (founder) => {
    const textToCopy = getMessageText(founder);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(founder._id);
      setTimeout(() => setCopiedId(null), 2500);
      showToast(`Copied outreach message for ${founder.name} to clipboard.`);
    } catch (_) {}
  };

  const handleDirectEmailSend = async (founder) => {
    if (!founder.email) return;
    setSendingEmailId(founder._id);
    try {
      const messageBody = getMessageText(founder);
      await axios.post(`/api/founders/${founder._id}/send-email`, {
        subject: founder.emailSubject || `Quick idea for ${founder.company}`,
        messageBody
      });
      setFounders((prev) => {
        const next = prev.map((f) => (f._id === founder._id ? { ...f, status: 'contacted' } : f));
        cachedFoundersList = next;
        return next;
      });
      showToast(`Direct email sent to ${founder.name} (${founder.email})!`);
    } catch (err) {
      showToast('Direct email error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleDeleteFounder = async (id) => {
    setFounders((prev) => {
      const next = prev.filter((f) => f._id !== id);
      cachedFoundersList = next;
      return next;
    });
    try {
      await axios.delete(`/api/founders/${id}`);
    } catch (_) {}
  };

  const filteredFounders = useMemo(() => {
    const nowMs = Date.now();
    const list = founders.filter((f) => {
      if (platformFilter !== 'all' && f.platform !== platformFilter) return false;
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${f.name} ${f.role} ${f.company} ${f.signal} ${f.bio} ${f.industry}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'match') {
        return (b.matchScore || 0) - (a.matchScore || 0);
      }
      if (sortBy === 'newest') {
        return new Date(b.postedAt || b.createdAt || 0) - new Date(a.postedAt || a.createdAt || 0);
      }
      // Default: Smart Rank (Match % + Recency decay)
      const ageA = Math.max(0, (nowMs - new Date(a.postedAt || a.createdAt || nowMs).getTime()) / 86400000);
      const ageB = Math.max(0, (nowMs - new Date(b.postedAt || b.createdAt || nowMs).getTime()) / 86400000);
      const scoreA = (a.matchScore || 85) - Math.min(35, ageA * 2.5);
      const scoreB = (b.matchScore || 85) - Math.min(35, ageB * 2.5);
      return scoreB - scoreA;
    });
  }, [founders, platformFilter, statusFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-5">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-card border border-indigo-500/40 text-primary px-4 py-3 rounded-xl shadow-2xl max-w-md animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-xs font-medium leading-relaxed">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="text-muted hover:text-primary ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Executive Banner & Controls */}
      <div className="bg-card border border-theme rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-theme">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
                <Linkedin className="w-4 h-4" />
              </div>
              <h2 className="text-base font-semibold text-primary tracking-tight">
                Founder &amp; Decision-Maker Social Outreach
              </h2>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap">
                {filteredFounders.length} Verified Founders
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              Discover verified startup Founders, Co-Founders, CEOs &amp; CTOs with direct personal LinkedIn profiles. AI writes the outreach message—edit inline if needed, then click <span className="text-primary font-semibold">Open LinkedIn &amp; Send</span> to auto-copy and launch their profile immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-surface border border-theme rounded-lg overflow-hidden">
              <input
                type="text"
                value={discoverKeywords}
                onChange={(e) => setDiscoverKeywords(e.target.value)}
                placeholder="Target niche (e.g. AI Agents, FinTech)..."
                className="bg-transparent text-xs text-primary px-3 py-2 w-44 focus:outline-none"
              />
              <button
                onClick={() => handleDiscoverMore(false)}
                disabled={discovering}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${discovering ? 'animate-spin' : ''}`} />
                <span>{discovering ? 'Scouting Founders...' : 'Scout Founders'}</span>
              </button>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-card-subtle hover:bg-slate-200/60 dark:hover:bg-slate-800 text-primary border border-theme rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-500" />
              <span>+ Add Founder / LinkedIn URL</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search founder, company, role, signal..."
                className="pl-8 pr-3 py-1.5 bg-surface border border-theme rounded-lg text-xs text-primary placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-64"
              />
            </div>

            <div className="flex items-center bg-surface p-0.5 rounded-lg border border-theme">
              {[
                { id: 'all', label: 'All Verified' },
                { id: 'linkedin', label: 'LinkedIn Direct' },
                { id: 'ycombinator', label: 'YC Founders' },
                { id: 'apollo', label: 'Apollo' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPlatformFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    platformFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface p-0.5 rounded-lg border border-theme">
              {[
                { id: 'all', label: 'All' },
                { id: 'discovered', label: 'To Contact' },
                { id: 'contacted', label: 'Contacted' }
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === st.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-surface border border-theme rounded-lg px-2.5 py-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-secondary" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs text-primary focus:outline-none cursor-pointer"
              >
                <option value="smart" className="bg-card text-primary">Rank: Match % + Recency</option>
                <option value="match" className="bg-card text-primary">Highest Match %</option>
                <option value="newest" className="bg-card text-primary">Newest Signal First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-card border border-theme rounded-xl p-5 space-y-4 animate-pulse"
            >
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-44 bg-card-subtle rounded" />
                  <div className="h-3 w-32 bg-card-subtle rounded" />
                </div>
                <div className="h-6 w-20 bg-card-subtle rounded-full" />
              </div>
              <div className="h-12 bg-card-subtle rounded-lg" />
              <div className="h-28 bg-card-subtle rounded-lg" />
              <div className="h-9 bg-card-subtle rounded-lg" />
            </div>
          ))}
        </div>
      ) : filteredFounders.length === 0 ? (
        <div className="bg-card border border-theme rounded-xl p-12 text-center">
          <Linkedin className="w-8 h-8 text-indigo-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-sm font-semibold text-primary">No Founders Matching Filter</h3>
          <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
            Click &ldquo;Scout Founders&rdquo; above to discover verified startup Founders &amp; Decision Makers with pre-written AI outreach messages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredFounders.map((founder) => {
            const mode = activeMessageMode[founder._id] || 'dm';
            const currentText = getMessageText(founder);
            const charCount = currentText.length;
            const isCopied = copiedId === founder._id;
            const isRegenerating = regeneratingId === founder._id;

            return (
              <div
                key={founder._id}
                className="bg-card border border-theme hover:border-indigo-500/40 rounded-xl p-5 flex flex-col justify-between transition-all shadow-sm"
              >
                <div>
                  {/* Card Header: Founder Identity & Match + Recency Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-500 font-semibold text-sm shrink-0">
                        {(founder.name || 'F')
                          .split(' ')
                          .map((p) => p[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-primary truncate">
                            {founder.name}
                          </h3>
                          {founder.linkedinUrl && founder.linkedinUrl.includes('/in/') && (
                            <a
                              href={founder.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-500 border border-sky-500/25 hover:bg-sky-500/20 transition-colors whitespace-nowrap"
                              title={founder.linkedinUrl}
                            >
                              <Linkedin className="w-2.5 h-2.5" />
                              <span>Verified Profile</span>
                            </a>
                          )}
                          {founder.status === 'contacted' && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 whitespace-nowrap">
                              Contacted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-secondary mt-0.5 flex-wrap">
                          <span className="text-indigo-500 font-medium">{founder.role}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <Building2 className="w-3 h-3 text-muted" />
                            {founder.company}
                          </span>
                          {founder.companyUrl && (
                            <a
                              href={founder.companyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted hover:text-indigo-500 transition-colors"
                              title="Open Company Website / Page"
                            >
                              <Globe className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Badges: Match %, Recency, Dismiss */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 whitespace-nowrap">
                        {founder.matchScore || 90}% Match
                      </span>
                      <span
                        className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-card-subtle text-secondary border border-theme whitespace-nowrap"
                        title="Signal Recency (used in Smart Rank)"
                      >
                        <Clock className="w-2.5 h-2.5 text-sky-500 shrink-0" />
                        <span>{formatRelativeRecency(founder.postedAt || founder.createdAt)}</span>
                      </span>
                      <button
                        onClick={() => handleDeleteFounder(founder._id)}
                        className="p-1 text-muted hover:text-rose-500 rounded-md transition-colors cursor-pointer"
                        title="Dismiss founder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Buying Signal & AI Fit Reasoning (Theme-Adaptive Surface — No Dark/Light Mode Clash) */}
                  <div className="mt-3.5 p-3 rounded-lg bg-card-subtle border border-theme space-y-1">
                    {founder.signal && (
                      <p className="text-xs text-primary font-medium leading-snug">
                        <span className="text-indigo-500 font-semibold mr-1.5">Signal:</span>
                        {founder.signal}
                      </p>
                    )}
                    {founder.matchReasoning && (
                      <p className="text-[11px] text-secondary leading-relaxed">
                        {founder.matchReasoning}
                      </p>
                    )}
                  </div>

                  {/* AI Outreach Message Composer */}
                  <div className="mt-3.5">
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1 bg-surface p-0.5 rounded-lg border border-theme">
                        <button
                          onClick={() =>
                            setActiveMessageMode((prev) => ({ ...prev, [founder._id]: 'dm' }))
                          }
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            mode === 'dm'
                              ? 'bg-indigo-600 text-white'
                              : 'text-secondary hover:text-primary'
                          }`}
                        >
                          LinkedIn Direct Message
                        </button>
                        <button
                          onClick={() =>
                            setActiveMessageMode((prev) => ({ ...prev, [founder._id]: 'note' }))
                          }
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            mode === 'note'
                              ? 'bg-indigo-600 text-white'
                              : 'text-secondary hover:text-primary'
                          }`}
                        >
                          Connection Note (&lt;280 chars)
                        </button>
                      </div>

                      {/* Quick AI Tone / Angle Regenerator */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { label: 'Short', angle: 'Ultra-short 45-word punchy founder DM' },
                          { label: 'AI Agent Angle', angle: 'Focus on shipping custom AI agents & workflow automation' },
                          { label: 'MVP Sprint', angle: 'Focus on rapid full-stack product & MVP delivery' }
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => handleRegenerate(founder, preset.angle)}
                            disabled={isRegenerating}
                            className="px-2 py-0.5 text-[10px] font-medium rounded bg-card-subtle hover:bg-indigo-500/10 text-secondary hover:text-primary border border-theme transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            title={`Regenerate with ${preset.label} angle`}
                          >
                            {preset.label}
                          </button>
                        ))}
                        <button
                          onClick={() => handleRegenerate(founder, '')}
                          disabled={isRegenerating}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/30 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          title="Regenerate message with AI"
                        >
                          <Sparkles className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                          <span>{isRegenerating ? 'Writing...' : 'AI Rewrite'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={mode === 'note' ? 3 : 5}
                        value={currentText}
                        onChange={(e) => handleTextChange(founder, e.target.value)}
                        className="w-full bg-surface border border-theme focus:border-indigo-500 rounded-lg p-3 text-xs text-primary leading-relaxed focus:outline-none resize-y font-sans"
                        placeholder="AI personalized outreach message..."
                      />
                      <span
                        className={`absolute bottom-2 right-2.5 text-[10px] ${
                          mode === 'note' && charCount > 280 ? 'text-rose-500 font-semibold' : 'text-muted'
                        }`}
                      >
                        {mode === 'note' ? `${charCount}/280 chars` : `${charCount} chars`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Footer: 1-Click Copy + Open LinkedIn */}
                <div className="mt-4 pt-3 border-t border-theme flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenLinkedInAndSend(founder)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Linkedin className="w-3.5 h-3.5" />
                      <span>Open LinkedIn &amp; Send</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </button>

                    <button
                      onClick={() => handleCopyOnly(founder)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-card-subtle hover:bg-indigo-500/10 text-primary border border-theme rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-secondary" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {founder.email && (
                      <button
                        onClick={() => handleDirectEmailSend(founder)}
                        disabled={sendingEmailId === founder._id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                        title={`1-Click Direct Email to ${founder.email}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{sendingEmailId === founder._id ? 'Sending...' : '1-Click Email'}</span>
                      </button>
                    )}

                    {founder.twitterUrl && (
                      <a
                        href={founder.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleCopyOnly(founder)}
                        className="px-2.5 py-2 bg-card-subtle hover:bg-indigo-500/10 text-secondary hover:text-primary border border-theme rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                        title="Auto-copy message & open X / Twitter profile"
                      >
                        X / DM
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Custom Founder / LinkedIn URL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-theme rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-theme">
              <div className="flex items-center gap-2">
                <Linkedin className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-primary">
                  Add Founder / LinkedIn Profile
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFounder} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">
                  LinkedIn Profile URL *
                </label>
                <input
                  type="url"
                  value={newFounder.linkedinUrl}
                  onChange={(e) => setNewFounder({ ...newFounder, linkedinUrl: e.target.value })}
                  placeholder="https://www.linkedin.com/in/founder-name"
                  className="w-full px-3 py-2 bg-surface border border-theme rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">
                    Founder Name
                  </label>
                  <input
                    type="text"
                    value={newFounder.name}
                    onChange={(e) => setNewFounder({ ...newFounder, name: e.target.value })}
                    placeholder="e.g. Sam Altman"
                    className="w-full px-3 py-2 bg-surface border border-theme rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={newFounder.role}
                    onChange={(e) => setNewFounder({ ...newFounder, role: e.target.value })}
                    placeholder="Founder & CEO"
                    className="w-full px-3 py-2 bg-surface border border-theme rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={newFounder.company}
                    onChange={(e) => setNewFounder({ ...newFounder, company: e.target.value })}
                    placeholder="e.g. Acme AI"
                    className="w-full px-3 py-2 bg-surface border border-theme rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-secondary mb-1">
                    Email (Optional for 1-Click Send)
                  </label>
                  <input
                    type="email"
                    value={newFounder.email}
                    onChange={(e) => setNewFounder({ ...newFounder, email: e.target.value })}
                    placeholder="founder@company.com"
                    className="w-full px-3 py-2 bg-surface border border-theme rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-secondary mb-1">
                  Context / Buying Signal (AI uses this to personalize message)
                </label>
                <textarea
                  rows={2}
                  value={newFounder.signal}
                  onChange={(e) => setNewFounder({ ...newFounder, signal: e.target.value })}
                  placeholder="e.g. Just raised Seed round, building AI workflow automation for healthcare..."
                  className="w-full px-3 py-2 bg-surface border border-theme rounded-lg text-xs text-primary focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 bg-card-subtle text-secondary hover:text-primary border border-theme rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingFounder}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{addingFounder ? 'Generating AI Message...' : 'Add & Generate Outreach'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
