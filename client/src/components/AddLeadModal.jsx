import React, { useState, useEffect } from 'react';
import { X, Sparkles, Plus, FileText, Check } from 'lucide-react';
import axios from 'axios';
import CustomSelect from './CustomSelect.jsx';

const PLATFORM_OPTIONS = [
  { value: 'upwork', label: 'Upwork' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'ycombinator', label: 'Y Combinator' },
  { value: 'apollo', label: 'Apollo' },
  { value: 'remoteok', label: 'RemoteOK' },
  { value: 'manual', label: 'Manual / Direct' }
];

export default function AddLeadModal({ isOpen, onClose, onLeadCreated }) {
  if (!isOpen) return null;

  const [mode, setMode] = useState('paste'); // 'paste' | 'manual'
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('upwork');
  const [sourceUrl, setSourceUrl] = useState('');
  const [clientName, setClientName] = useState('');
  const [company, setCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [budgetType, setBudgetType] = useState('unspecified');
  const [skills, setSkills] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleParseRawText = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    try {
      const res = await axios.post('/api/leads/paste-parse', { rawText });
      const data = res.data;
      if (data) {
        setTitle(data.title || '');
        setClientName(data.clientName || '');
        setCompany(data.company || '');
        setClientEmail(data.email || '');
        setPlatform(data.platform || 'manual');
        setBudgetAmount(data.budgetAmount || 0);
        setBudgetType(data.budgetType || 'unspecified');
        setSkills(Array.isArray(data.skills) ? data.skills.join(', ') : '');
        setDescription(data.cleanDescription || rawText);
        setMode('manual'); // Switch to review & submit
      }
    } catch (err) {
      console.error('Error parsing text:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const skillsArray = skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
      await onLeadCreated({
        title,
        platform,
        sourceUrl,
        clientInfo: {
          name: clientName || 'Hiring Lead',
          company,
          email: clientEmail
        },
        budget: {
          amount: Number(budgetAmount) || 0,
          type: budgetType,
          currency: 'USD'
        },
        skillsRequired: skillsArray,
        description,
        stage: 'discovered'
      });
      onClose();
    } catch (err) {
      console.error('Failed to create lead:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-theme rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-theme flex items-center justify-between bg-card">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-primary">Add New Opportunity</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-secondary hover:text-primary rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-theme bg-card-subtle text-xs font-semibold px-4">
          <button
            onClick={() => setMode('paste')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              mode === 'paste'
                ? 'border-brand-500 text-brand-400 font-bold'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Quick AI Paste
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              mode === 'manual'
                ? 'border-brand-500 text-brand-400 font-bold'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-muted" />
            Manual Fields
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {mode === 'paste' ? (
            <div className="space-y-3">
              <p className="text-xs text-secondary dark:text-slate-400">
                Paste any job posting description, client email, or platform post. Gemini will parse it into a clean structured lead for your operations pipeline.
              </p>
              <textarea
                rows={9}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste job description or email here..."
                className="w-full bg-card-subtle dark:bg-slate-900 border border-theme rounded-xl p-3 text-xs text-primary placeholder:text-muted focus:outline-none focus:border-brand-500 font-sans leading-relaxed"
              />
              <button
                type="button"
                onClick={handleParseRawText}
                disabled={isParsing || !rawText.trim()}
                className="w-full py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isParsing ? 'Parsing with Gemini...' : 'Extract & Populate Fields'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-secondary dark:text-slate-400 block mb-1">
                  Job / Project Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AI Workflow Specialist (n8n + OpenAI) needed"
                  className="w-full bg-card-subtle dark:bg-slate-900 border border-theme rounded-lg px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-secondary dark:text-slate-400 block mb-1">Platform</label>
                  <CustomSelect
                    value={platform}
                    onChange={setPlatform}
                    options={PLATFORM_OPTIONS}
                    className="w-full"
                    buttonClassName="w-full bg-card-subtle dark:bg-slate-900 border-theme py-2 text-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-secondary dark:text-slate-400 block mb-1">Source URL</label>
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-card-subtle dark:bg-slate-900 border border-theme rounded-lg px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-secondary dark:text-slate-400 block mb-1">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full bg-card-subtle dark:bg-slate-900 border border-theme rounded-lg px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-secondary dark:text-slate-400 block mb-1">Company</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Inc"
                    className="w-full bg-card-subtle dark:bg-slate-900 border border-theme rounded-lg px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-secondary dark:text-slate-400 block mb-1">Client Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="alex@acme.com"
                    className="w-full bg-card-subtle dark:bg-slate-900 border border-theme rounded-lg px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-secondary dark:text-slate-400 block mb-1">Budget ($)</label>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="w-full bg-card-subtle dark:bg-slate-900 border border-theme rounded-lg px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-secondary dark:text-slate-400 block mb-1">Skills (comma separated)</label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="React, AI, n8n, Node"
                    className="w-full bg-card-subtle dark:bg-slate-900 border border-theme rounded-lg px-3 py-2 text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-secondary dark:text-slate-400 block mb-1">Description *</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Paste or write job requirements..."
                  className="w-full bg-card-subtle dark:bg-slate-900 border border-theme rounded-lg p-3 text-primary placeholder:text-muted focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-md shadow-brand-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Lead to Discovered'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
