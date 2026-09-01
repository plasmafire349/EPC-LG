'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Bookmark, Clock, Bell, Settings, ChevronRight,
  ExternalLink, X, Copy, RefreshCw, TrendingUp, AlertCircle,
  CheckCircle2, ArrowRight, Zap, Menu, BarChart3, Eye,
  Sparkles, Filter, BookmarkPlus, Trash2, RotateCcw
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS — Deterministic, no AI
   ═══════════════════════════════════════════════════════════════════════════ */

type StageInfo = { label: string; color: string; bg: string; border: string; dot: string };

function getStageInfo(resultType: string): StageInfo {
  const t = (resultType || '').toLowerCase();
  if (t.includes('tender') || t.includes('rfp')) return { label: 'Tender', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-500' };
  if (t.includes('award')) return { label: 'EPC Award', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' };
  if (t.includes('feed')) return { label: 'FEED', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' };
  if (t.includes('construction')) return { label: 'Construction', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500' };
  if (t.includes('commissioning')) return { label: 'Commissioning', color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300', dot: 'bg-gray-600' };
  if (t.includes('epc project')) return { label: 'EPC Project', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' };
  return { label: 'Early Signal', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' };
}

function getRelevanceInfo(score: number) {
  if (score >= 90) return { label: 'Critical', color: 'text-red-700', bg: 'bg-red-50', bar: 'bg-red-500' };
  if (score >= 75) return { label: 'High', color: 'text-orange-700', bg: 'bg-orange-50', bar: 'bg-orange-500' };
  if (score >= 60) return { label: 'Medium', color: 'text-amber-700', bg: 'bg-amber-50', bar: 'bg-amber-500' };
  return { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-50', bar: 'bg-slate-400' };
}

function getCommercialSignal(result: any): string {
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  const kw = (result.matchingKeywords || '').toLowerCase();
  if (text.includes('tender') || text.includes('rfp') || text.includes('rfq')) return 'Tender / RFP';
  if (text.includes('award') && (text.includes('contract') || text.includes('epc'))) return 'EPC award';
  if (text.includes('epc') && text.includes('contractor')) return 'EPC contractor sought';
  if (text.includes('feed') && (text.includes('study') || text.includes('phase'))) return 'FEED activity';
  if (text.includes('fid') || text.includes('investment decision')) return 'Investment decision';
  if (text.includes('construction') && text.includes('start')) return 'Construction started';
  if (kw.includes('procurement') || text.includes('procurement')) return 'Procurement activity';
  if (text.includes('expansion') || text.includes('expand')) return 'Expansion';
  if (text.includes('project') && (text.includes('announced') || text.includes('new'))) return 'Project announced';
  return 'General project activity';
}

function getWhyThisMatters(result: any, country: string, industry: string): string[] {
  const reasons: string[] = [];
  const kw = (result.matchingKeywords || '').toLowerCase();
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  if (kw.includes('epc') || text.includes('epc')) reasons.push('EPC activity detected');
  if (kw.includes(country.toLowerCase())) reasons.push(`${country} match`);
  if (kw.includes(industry.toLowerCase())) reasons.push(`${industry}-sector match`);
  if (kw.includes('tender') || kw.includes('rfp')) reasons.push('Tender / RFP language detected');
  if (kw.includes('procurement')) reasons.push('Procurement language detected');
  if (kw.includes('contract') || kw.includes('award')) reasons.push('Contract / award language detected');
  if (kw.includes('feed')) reasons.push('FEED stage detected');
  if (kw.includes('construction')) reasons.push('Construction activity detected');
  if (kw.includes('investment') || kw.includes('capex')) reasons.push('Investment / CAPEX detected');
  if (kw.includes('project')) reasons.push('Project reference detected');
  if (result.relevanceScore >= 60) reasons.push('Project appears commercially active');
  return reasons;
}

const PIPELINE_STAGES = ['Early Signal', 'FEED', 'Tender', 'EPC Award', 'Construction', 'Commissioning'] as const;
const STAGE_COLORS: Record<string, string> = {
  'Early Signal': 'bg-emerald-500', 'FEED': 'bg-blue-500', 'Tender': 'bg-orange-500',
  'EPC Award': 'bg-red-500', 'Construction': 'bg-purple-500', 'Commissioning': 'bg-gray-500'
};

function mapToStage(resultType: string): string {
  return getStageInfo(resultType).label;
}

const QUICK_SEARCHES = [
  { label: 'Finland + Energy', q: 'EPC', c: 'Finland', i: 'Energy' },
  { label: 'Finland + Hydrogen', q: 'EPC', c: 'Finland', i: 'Hydrogen' },
  { label: 'Finland + BESS', q: 'EPC', c: 'Finland', i: 'BESS' },
  { label: 'Finland + Wind', q: 'EPC', c: 'Finland', i: 'Wind' },
  { label: 'Finland + Solar', q: 'EPC', c: 'Finland', i: 'Solar' },
  { label: 'Finland + Data Centers', q: 'EPC', c: 'Finland', i: 'Data Centers' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function Page() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [query, setQuery] = useState('EPC');
  const [country, setCountry] = useState('Finland');
  const [industry, setIndustry] = useState('Energy');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [searchMode, setSearchMode] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [aiResponses, setAiResponses] = useState<Record<string, any>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);
  const [minRelevance, setMinRelevance] = useState(0);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [savedResults, setSavedResults] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [expandedSnippets, setExpandedSnippets] = useState<Set<string>>(new Set());

  const toggleSnippet = (id: string, e: any) => {
    e.stopPropagation(); // prevent triggering the card click if it's inside one
    setExpandedSnippets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Data Fetching ---
  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch('/api/save');
      const data = await res.json();
      setSavedResults(data);
      setSavedIds(new Set(data.map((s: any) => s.searchResultId)));
    } catch (e) { console.error(e); }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setSearchHistory(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchSaved(); fetchHistory(); }, [fetchSaved, fetchHistory]);

  // --- Search ---
  const handleSearch = async (q?: string, c?: string, i?: string) => {
    const sq = q || query;
    const sc = c || country;
    const si = i || industry;
    if (q) setQuery(q);
    if (c) setCountry(c);
    if (i) setIndustry(i);
    setActiveTab('search');
    setLoading(true);
    setSearchError(null);
    setSearchMode(null);
    setLoadingStep('Finding EPC signals...');
    try {
      setTimeout(() => setLoadingStep('Checking public sources...'), 800);
      setTimeout(() => setLoadingStep('Scoring opportunities...'), 1800);
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sq, country: sc, industry: si })
      });
      const data = await res.json();
      if (data.error) {
        setSearchError(data.error);
        setResults([]);
      } else {
        setResults(data.results || []);
        if (data.results?.length > 0) {
          setSearchMode(data.results[0].isDemo ? 'Demo Mode' : (data.providerUsed || 'Live Search'));
        } else {
          setSearchMode(data.providerUsed || 'Demo Mode');
        }
      }
      fetchHistory();
    } catch (e) {
      console.error(e);
      setSearchError('Search request failed. Please try again.');
    }
    setLoading(false);
    setLoadingStep('');
  };

  // --- Save / Dismiss ---
  const handleSave = async (id: string) => {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchResultId: id, action: 'save' })
    });
    setSavedIds(prev => new Set([...prev, id]));
    fetchSaved();
  };

  const handleDismiss = async (id: string) => {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchResultId: id, action: 'dismiss' })
    });
    setResults(results.filter(r => r.id !== id));
    if (selectedResult?.id === id) setSelectedResult(null);
  };

  const handleRemoveSaved = async (id: string) => {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchResultId: id, action: 'dismiss' })
    });
    setSavedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    fetchSaved();
  };

  // --- AI ---
  const handleAskAi = async (result: any, modifier?: string) => {
    setLoadingAi(result.id);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultInfo: result, modifier })
      });
      const data = await res.json();
      setAiResponses(prev => ({ ...prev, [result.id]: data }));
    } catch (e) {
      console.error(e);
      setAiResponses(prev => ({ ...prev, [result.id]: { error: 'Gemini request failed', message: 'Please try again.' } }));
    }
    setLoadingAi(null);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- Derived ---
  const filteredResults = results
    .filter(r => r.relevanceScore >= minRelevance)
    .filter(r => stageFilter === 'all' || mapToStage(r.resultType) === stageFilter);

  const highPriorityResults = results.filter(r => r.relevanceScore >= 75);
  const tenderResults = results.filter(r => {
    const t = (r.resultType || '').toLowerCase();
    return t.includes('tender') || t.includes('rfp') || t.includes('award');
  });

  const pipelineCounts = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = results.filter(r => mapToStage(r.resultType) === stage).length;
    return acc;
  }, {} as Record<string, number>);

  const notifications = results
    .filter(r => r.relevanceScore >= 75)
    .slice(0, 20)
    .map(r => ({
      ...r,
      notifType: r.relevanceScore >= 90 ? 'critical' : 'high',
      timeAgo: 'Today',
    }));

  // --- Navigation Items ---
  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'saved', label: 'Saved', icon: Bookmark, count: savedIds.size },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: notifications.length },
    { id: 'history', label: 'History', icon: Clock },
  ];

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    overview: { title: 'Overview', subtitle: 'Monitor EPC activity and identify commercial opportunities' },
    search: { title: 'Search', subtitle: 'Find publicly indexed EPC signals' },
    saved: { title: 'Saved Opportunities', subtitle: 'Your tracked opportunities and signals' },
    notifications: { title: 'Notifications', subtitle: 'High-priority signals requiring attention' },
    history: { title: 'Search History', subtitle: 'Previous searches and their results' },
    settings: { title: 'Settings', subtitle: 'API configuration and provider status' },
  };

  const currentPage = tabTitles[activeTab] || tabTitles.overview;

  /* ═════════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* ── Mobile overlay ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col
        transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="px-6 pt-7 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">EPC LG</h1>
              <p className="text-xs text-slate-400 mt-0.5 tracking-wide">EPC LinkedIn Intelligence</p>
            </div>
            <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-6 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${activeTab === item.id
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <span className="flex items-center gap-3">
                <item.icon size={18} strokeWidth={activeTab === item.id ? 2 : 1.5} />
                {item.label}
              </span>
              {item.count !== undefined && item.count > 0 && (
                <span className="bg-white/15 text-[11px] font-semibold px-2 py-0.5 rounded-full">{item.count}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 space-y-0.5">
          <button
            onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Settings size={18} strokeWidth={1.5} />
            Settings
          </button>
          {/* Provider status */}
          <div className="px-3 py-3 mt-2 border-t border-white/10">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${searchMode && searchMode !== 'Demo Mode' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-xs text-slate-400">{searchMode || 'No search yet'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-500 hover:text-slate-900 -ml-1" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <div>
              <h2 className="text-base font-semibold text-slate-900 leading-tight">{currentPage.title}</h2>
              <p className="text-xs text-slate-500 hidden sm:block">{currentPage.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('search')} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
              <Search size={18} />
            </button>
            <button onClick={() => setActiveTab('notifications')} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors relative">
              <Bell size={18} />
              {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

            {/* ═══════════ OVERVIEW ═══════════ */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Greeting */}
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}</h3>
                  <p className="text-base text-slate-500 mt-1">Your EPC opportunity monitor</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'New signals', value: results.length, sub: results.length > 0 ? `From last search` : 'Run a search', icon: Zap, accent: 'text-blue-600' },
                    { label: 'High priority', value: highPriorityResults.length, sub: highPriorityResults.length > 0 ? 'Requires attention' : 'None yet', icon: AlertCircle, accent: 'text-orange-600' },
                    { label: 'EPC / Tender signals', value: tenderResults.length, sub: tenderResults.length > 0 ? 'Potential commercial activity' : 'None detected', icon: TrendingUp, accent: 'text-emerald-600' },
                    { label: 'Saved', value: savedIds.size, sub: 'Tracked opportunities', icon: Bookmark, accent: 'text-purple-600' },
                  ].map((kpi, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-500">{kpi.label}</span>
                        <kpi.icon size={18} className={kpi.accent} strokeWidth={1.5} />
                      </div>
                      <div className="text-3xl font-bold text-slate-900">{kpi.value}</div>
                      <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Pipeline */}
                {results.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-4">Opportunity pipeline</h4>
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {PIPELINE_STAGES.map(stage => (
                          <button
                            key={stage}
                            onClick={() => { setStageFilter(stage); setActiveTab('search'); }}
                            className="text-center p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                          >
                            <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${STAGE_COLORS[stage]}`} />
                            <div className="text-2xl font-bold text-slate-900">{pipelineCounts[stage]}</div>
                            <div className="text-xs text-slate-500 group-hover:text-slate-700 mt-0.5">{stage}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Priority Opportunities */}
                {highPriorityResults.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-slate-900">Priority opportunities</h4>
                      <button onClick={() => setActiveTab('search')} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                        View all <ChevronRight size={14} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {highPriorityResults.slice(0, 5).map(r => {
                        const stage = getStageInfo(r.resultType);
                        const rel = getRelevanceInfo(r.relevanceScore);
                        return (
                          <button
                            key={r.id}
                            onClick={() => { setSelectedResult(r); setActiveTab('search'); }}
                            className="w-full bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-slate-300 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${stage.bg} ${stage.color} ${stage.border} border`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                                    {stage.label}
                                  </span>
                                                                    <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1"><span className="text-[10px]">🌍</span> Project: {r.projectLocation || 'Unknown'}</span>
                                  <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1"><span className="text-[10px]">🏢</span> Company: {r.companyLocation || 'Unknown'}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${r.confidence === 'High' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : r.confidence === 'Medium' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{r.confidence || 'Low'} Confidence</span>
                                </div>
                                <h5 className="text-base font-semibold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug line-clamp-2">{r.title}</h5>
                                <p className="text-sm text-slate-500 mt-1 line-clamp-1">{getCommercialSignal(r)}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className={`text-2xl font-bold ${rel.color}`}>{r.relevanceScore}</div>
                                <div className={`text-xs font-medium ${rel.color}`}>{rel.label}</div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Empty state for overview */
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                    <Search size={36} className="mx-auto text-slate-300 mb-4" strokeWidth={1.5} />
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No opportunities yet</h4>
                    <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Run your first search to discover EPC signals and populate your opportunity dashboard.</p>
                    <button onClick={() => setActiveTab('search')} className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors">
                      Search opportunities
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ SEARCH ═══════════ */}
            {activeTab === 'search' && (
              <div className="space-y-6">
                {/* Search Form */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Find EPC opportunities</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Keywords</label>
                      <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="EPC" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                      <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Finland" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Industry</label>
                      <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Energy" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-base focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-shadow" />
                    </div>
                  </div>
                  <button
                    onClick={() => handleSearch()}
                    disabled={loading}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-8 rounded-lg transition-colors disabled:opacity-50 text-base w-full sm:w-auto"
                  >
                    {loading ? loadingStep || 'Searching...' : 'Search opportunities'}
                  </button>

                  {/* Quick Searches */}
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Quick searches</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_SEARCHES.map(qs => (
                        <button
                          key={qs.label}
                          onClick={() => handleSearch(qs.q, qs.c, qs.i)}
                          disabled={loading}
                          className="text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg px-3.5 py-1.5 transition-colors disabled:opacity-50 hover:bg-slate-50"
                        >
                          EPC + {qs.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-slate-200 mx-auto mb-4" />
                      <p className="text-base font-medium text-slate-700">{loadingStep || 'Searching...'}</p>
                      <p className="text-sm text-slate-400 mt-1">This does not use AI</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {searchError && !loading && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle size={28} className="mx-auto text-red-400 mb-3" />
                    <h4 className="text-base font-semibold text-red-800 mb-1">Live search unavailable</h4>
                    <p className="text-sm text-red-600 mb-4">{searchError}</p>
                    <button onClick={() => handleSearch()} className="text-sm bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-5 rounded-lg transition-colors">Try again</button>
                  </div>
                )}

                {/* Results Header */}
                {!loading && results.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${searchMode === 'Demo Mode' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                        <span className={`w-2 h-2 rounded-full ${searchMode === 'Demo Mode' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {searchMode}
                      </span>
                      <span className="text-sm text-slate-500 font-medium">{filteredResults.length} signals found</span>
                    </div>
                    {/* Filters */}
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-slate-400" />
                      <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none">
                        <option value="all">All stages</option>
                        {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select value={minRelevance} onChange={e => setMinRelevance(Number(e.target.value))} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none">
                        <option value={0}>All relevance</option>
                        <option value={90}>Critical (90+)</option>
                        <option value={75}>High (75+)</option>
                        <option value={60}>Medium (60+)</option>
                      </select>
                      {(stageFilter !== 'all' || minRelevance > 0) && (
                        <button onClick={() => { setStageFilter('all'); setMinRelevance(0); }} className="text-xs text-slate-500 hover:text-slate-700 underline">Clear</button>
                      )}
                    </div>
                  </div>
                )}

                {/* Demo Mode Warning */}
                {searchMode === 'Demo Mode' && !loading && results.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Using Demo Mode</p>
                      <p className="text-sm text-amber-700 mt-0.5">The live search provider was unavailable. Showing demo signals. Configure a search provider in Settings to see real results.</p>
                    </div>
                  </div>
                )}

                {/* Result Cards */}
                {!loading && (
                  <div className="space-y-3">
                    {filteredResults.map(result => {
                      const stage = getStageInfo(result.resultType);
                      const rel = getRelevanceInfo(result.relevanceScore);
                      const signal = getCommercialSignal(result);
                      const isSaved = savedIds.has(result.id);
                      return (
                        <div key={result.id} className={`bg-white rounded-xl border transition-all ${selectedResult?.id === result.id ? 'border-slate-400 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                          {result.isDemo && (
                            <div className="bg-amber-50 border-b border-amber-100 text-amber-700 text-xs font-medium px-5 py-1.5 text-center">DEMO SIGNAL — Not a real LinkedIn post</div>
                          )}
                          <div className="p-5 sm:p-6">
                            <div className="flex items-start gap-4">
                              {/* Main content */}
                              <div className="flex-1 min-w-0">
                                {/* Stage + tags */}
                                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${stage.bg} ${stage.color} ${stage.border}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                                    {stage.label}
                                  </span>
                                                                    <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1"><span className="text-[10px]">🌍</span> Project: {result.projectLocation || 'Unknown'}</span>
                                  <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1"><span className="text-[10px]">🏢</span> Company: {result.companyLocation || 'Unknown'}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${result.confidence === 'High' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : result.confidence === 'Medium' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{result.confidence || 'Low'} Confidence</span>
                                  {isSaved && <span className="text-xs text-purple-600 font-medium">★ Saved</span>}
                                </div>
                                {/* Title */}
                                <h4
                                  className="text-lg font-semibold text-slate-900 leading-snug mb-1.5 cursor-pointer hover:text-blue-700 transition-colors line-clamp-2"
                                  onClick={() => setSelectedResult(selectedResult?.id === result.id ? null : result)}
                                >
                                  {result.title}
                                </h4>
                                {/* Commercial signal */}
                                <p className="text-sm text-slate-500 mb-3">{signal}</p>
                                {/* Snippet */}
                                <div className="mt-1">
                                  <p className={`text-sm text-slate-600 leading-relaxed ${expandedSnippets.has(result.id) ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                                    {result.snippet}
                                  </p>
                                  {result.snippet && result.snippet.length > 140 && (
                                    <button 
                                      onClick={(e) => toggleSnippet(result.id, e)} 
                                      className="text-blue-600 text-xs font-semibold mt-1.5 hover:underline focus:outline-none"
                                    >
                                      {expandedSnippets.has(result.id) ? 'Show less' : 'Show more'}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {/* Relevance */}
                              <div className="flex-shrink-0 text-right hidden sm:block">
                                <div className={`text-3xl font-bold ${rel.color}`}>{result.relevanceScore}</div>
                                <div className={`text-xs font-semibold ${rel.color} mb-2`}>{rel.label}</div>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${rel.bar}`} style={{ width: `${result.relevanceScore}%` }} />
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                  <ExternalLink size={14} /> Open source
                                </a>
                                <span className="text-slate-200">|</span>
                                {!isSaved ? (
                                  <button onClick={() => handleSave(result.id)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
                                    <BookmarkPlus size={14} /> Save
                                  </button>
                                ) : (
                                  <span className="text-sm text-purple-500 font-medium">Saved</span>
                                )}
                                <span className="text-slate-200">|</span>
                                <button onClick={() => handleDismiss(result.id)} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-red-500 transition-colors">
                                  <Trash2 size={13} /> Dismiss
                                </button>
                              </div>
                              <button
                                onClick={() => handleAskAi(result)}
                                disabled={loadingAi === result.id}
                                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <Sparkles size={14} />
                                {loadingAi === result.id ? 'Thinking...' : 'Ask AI'}
                              </button>
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {selectedResult?.id === result.id && (
                            <div className="border-t border-slate-200 p-5 sm:p-6 bg-slate-50/50">
                              {/* Why this matters */}
                              <div className="mb-5">
                                <h5 className="text-sm font-semibold text-slate-900 mb-2">Why this matters</h5>
                                <ul className="space-y-1">
                                  {getWhyThisMatters(result, country, industry).map((r, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" /> {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {/* Structured info */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                                <div>
                                  <p className="text-xs text-slate-400 font-medium mb-0.5">Stage</p>
                                  <p className="text-sm font-semibold text-slate-900">{stage.label}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400 font-medium mb-0.5">Location</p>
                                  <p className="text-sm font-semibold text-slate-900">{country}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400 font-medium mb-0.5">Sector</p>
                                  <p className="text-sm font-semibold text-slate-900">{industry}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400 font-medium mb-0.5">Signal type</p>
                                  <p className="text-sm font-semibold text-slate-900">{signal}</p>
                                </div>
                              </div>
                              {/* Source */}
                              <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                                <p className="text-xs text-slate-400 font-medium mb-1">Source: {result.source || 'LinkedIn'}</p>
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.snippet}</p>
                              </div>
                              <a href={result.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                                <ExternalLink size={14} /> Open original post ↗
                              </a>
                            </div>
                          )}

                          {/* AI Response Panel */}
                          {aiResponses[result.id] && (
                            <div className="border-t border-slate-200 p-5 sm:p-6 bg-blue-50/30">
                              <div className="flex items-center justify-between mb-1">
                                <h5 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                  <Sparkles size={14} className="text-blue-600" /> Response assistant
                                </h5>
                                <button onClick={() => setAiResponses(prev => { const next = { ...prev }; delete next[result.id]; return next; })} className="text-slate-400 hover:text-slate-600">
                                  <X size={16} />
                                </button>
                              </div>
                              <p className="text-xs text-slate-500 mb-4">Draft a response based only on the available public signal. AI is used only for drafting your response.</p>

                              {aiResponses[result.id].error ? (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
                                  <AlertCircle size={24} className="mx-auto text-red-400 mb-2" />
                                  <p className="text-sm font-semibold text-red-800 mb-1">{aiResponses[result.id].error}</p>
                                  <p className="text-sm text-red-600 mb-3">{aiResponses[result.id].message}</p>
                                  {aiResponses[result.id].error === 'Gemini request failed' && (
                                    <button onClick={() => handleAskAi(result)} className="text-sm bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-5 rounded-lg transition-colors">Try again</button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {[
                                      { key: 'professional', label: 'Professional' },
                                      { key: 'businessDevelopment', label: 'Business Development' },
                                      { key: 'short', label: 'Short' },
                                    ].map(({ key, label }) => (
                                      <div key={key} className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col">
                                        <h6 className="text-sm font-semibold text-slate-800 mb-2">{label}</h6>
                                        <p className="text-sm text-slate-700 leading-relaxed flex-1 mb-3">{aiResponses[result.id][key]}</p>
                                        <button
                                          onClick={() => handleCopy(aiResponses[result.id][key], `${result.id}-${key}`)}
                                          className="inline-flex items-center justify-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-medium transition-colors w-full"
                                        >
                                          {copiedId === `${result.id}-${key}` ? <><CheckCircle2 size={12} className="text-emerald-500" /> Copied</> : <><Copy size={12} /> Copy</>}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Modifier buttons */}
                                  <div className="flex flex-wrap gap-2 mt-4">
                                    {[
                                      { label: 'Regenerate', mod: undefined, icon: RefreshCw },
                                      { label: 'Make shorter', mod: 'Make the responses shorter and more concise' },
                                      { label: 'Make more professional', mod: 'Make the responses more professional and formal' },
                                      { label: 'Make warmer', mod: 'Make the responses more conversational and friendly' },
                                    ].map(btn => (
                                      <button
                                        key={btn.label}
                                        disabled={loadingAi === result.id}
                                        onClick={() => handleAskAi(result, btn.mod)}
                                        className="text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 flex items-center gap-1.5 hover:bg-slate-50"
                                      >
                                        {btn.icon && <btn.icon size={12} />}
                                        {btn.label}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty search state */}
                {!loading && results.length === 0 && !searchError && (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                    <Eye size={36} className="mx-auto text-slate-300 mb-4" strokeWidth={1.5} />
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No opportunities found</h4>
                    <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">Run a search above or try one of the quick searches to discover EPC signals.</p>
                    <p className="text-xs text-slate-400">Try: broader keywords · another industry · another country</p>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ SAVED ═══════════ */}
            {activeTab === 'saved' && (
              <div className="space-y-6">
                {savedResults.length > 0 ? (
                  <div className="space-y-3">
                    {savedResults.map((saved: any) => {
                      const r = saved.result;
                      if (!r) return null;
                      const stage = getStageInfo(r.resultType);
                      const rel = getRelevanceInfo(r.relevanceScore);
                      return (
                        <div key={saved.id} className="bg-white rounded-xl border border-slate-200 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${stage.bg} ${stage.color} ${stage.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />{stage.label}
                                </span>
                                                                  <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1"><span className="text-[10px]">🌍</span> Project: {r.projectLocation || 'Unknown'}</span>
                                  <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1"><span className="text-[10px]">🏢</span> Company: {r.companyLocation || 'Unknown'}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${r.confidence === 'High' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : r.confidence === 'Medium' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>{r.confidence || 'Low'} Confidence</span>
                                  <span className="text-xs text-slate-400 ml-auto">Saved {new Date(saved.createdAt).toLocaleDateString()}</span>
                              </div>
                              <h4 className="text-base font-semibold text-slate-900 leading-snug mb-1">{r.title}</h4>
                              <div className="mt-1">
                                <p className={`text-sm text-slate-500 ${expandedSnippets.has(r.id) ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                                  {r.snippet}
                                </p>
                                {r.snippet && r.snippet.length > 140 && (
                                  <button 
                                    onClick={(e) => toggleSnippet(r.id, e)} 
                                    className="text-blue-600 text-xs font-semibold mt-1.5 hover:underline focus:outline-none"
                                  >
                                    {expandedSnippets.has(r.id) ? 'Show less' : 'Show more'}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className={`text-2xl font-bold ${rel.color}`}>{r.relevanceScore}</div>
                              <div className={`text-xs font-semibold ${rel.color}`}>{rel.label}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"><ExternalLink size={14} /> Open</a>
                            <span className="text-slate-200">|</span>
                            <button onClick={() => handleRemoveSaved(r.id)} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-red-500"><Trash2 size={13} /> Remove</button>
                            <span className="text-slate-200">|</span>
                            <button onClick={() => { handleAskAi(r); setActiveTab('search'); setSelectedResult(r); }} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium"><Sparkles size={13} /> Ask AI</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                    <Bookmark size={36} className="mx-auto text-slate-300 mb-4" strokeWidth={1.5} />
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No saved opportunities</h4>
                    <p className="text-sm text-slate-500 mb-5">Save opportunities from search results to track them here.</p>
                    <button onClick={() => setActiveTab('search')} className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors">Search opportunities</button>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ NOTIFICATIONS ═══════════ */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                {notifications.length > 0 ? (
                  <div className="space-y-2">
                    {notifications.map((n, idx) => (
                      <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.notifType === 'critical' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                            {n.notifType === 'critical' ? <Zap size={16} /> : <TrendingUp size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-slate-400 uppercase">{n.notifType === 'critical' ? '🔥 Critical signal' : '📌 High-priority signal'}</span>
                              <span className="text-xs text-slate-400">{n.timeAgo}</span>
                            </div>
                            <h4 className="text-base font-semibold text-slate-900 leading-snug mb-1 line-clamp-2">{n.title}</h4>
                            <p className="text-sm text-slate-500 line-clamp-1">{getCommercialSignal(n)} · {getStageInfo(n.resultType).label}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => handleSave(n.id)} className="p-2 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-50 transition-colors" title="Save">
                              <BookmarkPlus size={16} />
                            </button>
                            <button onClick={() => { setSelectedResult(n); setActiveTab('search'); }} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-colors" title="Open">
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                    <Bell size={36} className="mx-auto text-slate-300 mb-4" strokeWidth={1.5} />
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No notifications</h4>
                    <p className="text-sm text-slate-500 mb-5">High-priority signals will appear here when detected. Run a search to generate notifications.</p>
                    <button onClick={() => setActiveTab('search')} className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors">Search opportunities</button>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ HISTORY ═══════════ */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                {searchHistory.length > 0 ? (
                  <div className="space-y-2">
                    {[...searchHistory].reverse().map(h => (
                      <div key={h.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="text-base font-semibold text-slate-900">{h.query} · {h.country} · {h.industry}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span>{h.resultsCount} results</span>
                            <span>·</span>
                            <span>{new Date(h.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSearch(h.query, h.country, h.industry)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg px-4 py-2 transition-colors hover:bg-slate-50 flex-shrink-0"
                        >
                          <RotateCcw size={14} /> Run again
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                    <Clock size={36} className="mx-auto text-slate-300 mb-4" strokeWidth={1.5} />
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No search history</h4>
                    <p className="text-sm text-slate-500 mb-5">Your previous searches will appear here.</p>
                    <button onClick={() => setActiveTab('search')} className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors">Search opportunities</button>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════ SETTINGS ═══════════ */}
            {activeTab === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                {/* Provider Status */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-base font-semibold text-slate-900 mb-4">Search Provider Status</h4>
                  <div className="space-y-3">
                    {[
                      { name: 'Tavily Search', env: 'TAVILY_API_KEY', desc: 'Free tier (1,000/month), no credit card required' },
                      { name: 'Serper Search', env: 'SERPER_API_KEY', desc: 'Free tier (2,500 queries), no credit card required' },
                      { name: 'Google Custom Search', env: 'GOOGLE_SEARCH_API_KEY', desc: 'Requires Google Cloud project' },
                    ].map(p => (
                      <div key={p.name} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.desc}</p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${searchMode?.toLowerCase().includes(p.name.split(' ')[0].toLowerCase()) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {searchMode?.toLowerCase().includes(p.name.split(' ')[0].toLowerCase()) ? 'Active' : 'Configure in .env'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* API Config */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-base font-semibold text-slate-900 mb-4">API Configuration</h4>
                  <div className="space-y-4">
                    {[
                      { label: 'Search API Key', placeholder: 'TAVILY_API_KEY / SERPER_API_KEY' },
                      { label: 'Gemini API Key', placeholder: 'GEMINI_API_KEY' },
                    ].map(field => (
                      <div key={field.label}>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{field.label}</label>
                        <input type="password" disabled placeholder={field.placeholder} className="w-full border border-slate-200 bg-slate-50 rounded-lg px-4 py-2.5 text-sm text-slate-400" />
                      </div>
                    ))}
                    <p className="text-xs text-slate-400">API keys are configured server-side in your <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">.env.local</code> file. They are never sent to the browser.</p>
                  </div>
                </div>

                {/* About */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h4 className="text-base font-semibold text-slate-900 mb-2">About EPC LG</h4>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">EPC LinkedIn Intelligence — Monitor publicly indexed LinkedIn signals related to EPC projects and business opportunities. AI is used only for drafting responses, never for discovery or scoring.</p>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>Search: Rule-based discovery via public web search APIs</p>
                    <p>Scoring: Deterministic keyword-based relevance (0–100)</p>
                    <p>AI: Optional response assistant (Gemini) — only when you click &quot;Ask AI&quot;</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
