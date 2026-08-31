'use client';

import { useState } from 'react';

export default function Page() {
  const [query, setQuery] = useState('EPC');
  const [country, setCountry] = useState('Finland');
  const [industry, setIndustry] = useState('Energy');
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // search, saved, history, settings

  const [aiResponses, setAiResponses] = useState<Record<string, any>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);

  const [minRelevance, setMinRelevance] = useState(0);

  const [searchMode, setSearchMode] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setSearchMode(null);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, country, industry })
      });
      const data = await res.json();
      setResults(data.results);
      if (data.results && data.results.length > 0) {
          setSearchMode(data.results[0].isDemo ? 'Demo Mode' : (data.providerUsed || 'Live Search'));
      } else {
          setSearchMode(data.providerUsed || 'Demo Mode');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async (id: string) => {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchResultId: id, action: 'save' })
    });
    alert('Saved!');
  };

  const handleDismiss = async (id: string) => {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchResultId: id, action: 'dismiss' })
    });
    setResults(results.filter(r => r.id !== id));
  };

  const handleAskAi = async (result: any, modifier?: string) => {
    setLoadingAi(result.id);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultInfo: result, modifier })
      });
      const data = await res.json();
      setAiResponses({ ...aiResponses, [result.id]: data });
    } catch (e) {
      console.error(e);
      setAiResponses({ ...aiResponses, [result.id]: { error: 'Gemini request failed', message: 'Try again.' } });
    }
    setLoadingAi(null);
  };

  const filteredResults = results.filter(r => r.relevanceScore >= minRelevance);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">EPC LG</h1>
          <p className="text-sm text-slate-400 mt-1">EPC LinkedIn Intelligence</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab('search')} className={`w-full text-left px-4 py-2 rounded-md transition-colors ${activeTab === 'search' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Dashboard / Search</button>
          <button onClick={() => setActiveTab('saved')} className={`w-full text-left px-4 py-2 rounded-md transition-colors ${activeTab === 'saved' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Saved Signals</button>
          <button onClick={() => setActiveTab('history')} className={`w-full text-left px-4 py-2 rounded-md transition-colors ${activeTab === 'history' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Search History</button>
          <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-4 py-2 rounded-md transition-colors ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Settings</button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'search' && (
          <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">LinkedIn Signals</h2>
              {searchMode && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold tracking-wide ${searchMode === 'Demo Mode' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {searchMode}
                </span>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Keywords</label>
                  <input type="text" value={query} onChange={e => setQuery(e.target.value)} className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location / Country</label>
                  <input type="text" value={country} onChange={e => setCountry(e.target.value)} className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                  <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} className="w-full border border-slate-300 rounded-md p-2 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <button onClick={handleSearch} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-6 rounded-md transition-colors disabled:opacity-50">
                  {loading ? 'Searching...' : 'Search LinkedIn Signals'}
                </button>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-500">Min Relevance:</span>
                  <input type="number" min="0" max="100" value={minRelevance} onChange={e => setMinRelevance(Number(e.target.value))} className="w-16 border border-slate-300 rounded-md p-1 text-center" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {filteredResults.map((result) => (
                <div key={result.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
                  {result.isDemo && (
                    <div className="bg-amber-100 text-amber-800 text-xs font-semibold px-4 py-1 text-center uppercase tracking-wider">
                      DEMO DATA — Not a real LinkedIn post
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${result.relevanceScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                            SEARCH RELEVANCE: {result.relevanceScore} / 100
                          </span>
                          {result.resultType && (
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700 uppercase">
                              {result.resultType}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">{result.title}</h3>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                          Open LinkedIn ↗
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 text-sm text-slate-600 mb-4">
                      <div><strong className="text-slate-900">Company:</strong> {result.company || 'Not available'}</div>
                      <div><strong className="text-slate-900">Date:</strong> {result.date || 'Not available'}</div>
                      <div><strong className="text-slate-900">Location:</strong> {country}</div>
                      <div><strong className="text-slate-900">Industry:</strong> {industry}</div>
                      <div className="col-span-2"><strong className="text-slate-900">Source:</strong> {result.source || 'LinkedIn'}</div>
                    </div>

                    <div className="mb-4">
                      <strong className="block text-sm text-slate-900 mb-1">Matching keywords:</strong>
                      <div className="text-sm text-slate-600">{result.matchingKeywords || 'None'}</div>
                    </div>

                    {result.searchQueries && result.searchQueries.length > 0 && (
                      <div className="mb-4">
                        <strong className="block text-sm text-slate-900 mb-1">Found via search queries:</strong>
                        <div className="text-sm text-slate-600">{result.searchQueries.join(', ')}</div>
                      </div>
                    )}

                    <div className="bg-slate-50 p-4 rounded border border-slate-100 mb-6">
                      <strong className="block text-sm text-slate-900 mb-1">Google snippet:</strong>
                      <p className="text-sm text-slate-700">{result.snippet}</p>
                      <p className="text-xs text-slate-400 mt-2 italic">Limited public information</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="flex space-x-3">
                        <button onClick={() => handleSave(result.id)} className="text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded px-4 py-1.5 hover:bg-slate-50 transition-colors">
                          Save
                        </button>
                        <button onClick={() => handleDismiss(result.id)} className="text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 px-4 py-1.5 transition-colors">
                          Dismiss
                        </button>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-slate-500">Need help responding?</span>
                        <button 
                          onClick={() => handleAskAi(result)}
                          disabled={loadingAi === result.id}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-4 rounded transition-colors disabled:opacity-50 flex items-center"
                        >
                          {loadingAi === result.id ? 'Thinking...' : 'Ask AI'}
                        </button>
                      </div>
                    </div>

                    {/* AI Response Section */}
                    {aiResponses[result.id] && (
                      <div className="mt-6 border-t border-slate-200 pt-6">
                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">AI Response Assistant</h4>
                        {aiResponses[result.id].error ? (
                          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                            <p className="text-red-700 font-bold mb-1">{aiResponses[result.id].error}</p>
                            <p className="text-red-600 text-sm mb-3">{aiResponses[result.id].message}</p>
                            {aiResponses[result.id].error === 'Gemini request failed' && (
                                <button onClick={() => handleAskAi(result)} className="text-xs bg-red-100 hover:bg-red-200 text-red-800 font-bold py-1.5 px-4 rounded transition-colors">
                                    Try again
                                </button>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              <div className="border border-slate-200 rounded-md p-4 flex flex-col">
                                <h5 className="font-semibold text-slate-800 mb-2 border-b pb-2">Professional</h5>
                                <p className="text-sm text-slate-700 mb-4 flex-1">{aiResponses[result.id].professional}</p>
                                <button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 py-1.5 rounded w-full font-medium transition-colors" onClick={() => {navigator.clipboard.writeText(aiResponses[result.id].professional); alert('Copied!');}}>Copy</button>
                              </div>

                              <div className="border border-slate-200 rounded-md p-4 flex flex-col">
                                <h5 className="font-semibold text-slate-800 mb-2 border-b pb-2">Business Development</h5>
                                <p className="text-sm text-slate-700 mb-4 flex-1">{aiResponses[result.id].businessDevelopment}</p>
                                <button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 py-1.5 rounded w-full font-medium transition-colors" onClick={() => {navigator.clipboard.writeText(aiResponses[result.id].businessDevelopment); alert('Copied!');}}>Copy</button>
                              </div>

                              <div className="border border-slate-200 rounded-md p-4 flex flex-col">
                                <h5 className="font-semibold text-slate-800 mb-2 border-b pb-2">Short</h5>
                                <p className="text-sm text-slate-700 mb-4 flex-1">{aiResponses[result.id].short}</p>
                                <button className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 py-1.5 rounded w-full font-medium transition-colors" onClick={() => {navigator.clipboard.writeText(aiResponses[result.id].short); alert('Copied!');}}>Copy</button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4 items-center">
                              {loadingAi === result.id && <span className="text-xs text-slate-500 font-medium mr-2">Thinking...</span>}
                              <button disabled={loadingAi === result.id} onClick={() => handleAskAi(result)} className="text-xs text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline">Regenerate</button>
                              <span className="text-slate-300">•</span>
                              <button disabled={loadingAi === result.id} onClick={() => handleAskAi(result, "Make the responses shorter and more concise")} className="text-xs text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline">Make shorter</button>
                              <span className="text-slate-300">•</span>
                              <button disabled={loadingAi === result.id} onClick={() => handleAskAi(result, "Make the responses more professional and formal")} className="text-xs text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline">Make more professional</button>
                              <span className="text-slate-300">•</span>
                              <button disabled={loadingAi === result.id} onClick={() => handleAskAi(result, "Make the responses more conversational and friendly")} className="text-xs text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline">Make more conversational</button>
                              <span className="text-slate-300">•</span>
                              <button disabled={loadingAi === result.id} onClick={() => handleAskAi(result, "Make the responses less sales-focused and more informative")} className="text-xs text-blue-600 hover:underline disabled:opacity-50 disabled:no-underline">Make less sales-focused</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {!loading && results.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-slate-200">
                  <p className="text-slate-500">No signals found. Try running a search.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="p-8 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Saved Signals</h2>
            <p className="text-slate-600">You have no saved signals yet.</p>
            {/* The API fetch for saved results can be implemented here */}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-8 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Search History</h2>
            <p className="text-slate-600">Search history implementation goes here.</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-8 max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Settings</h2>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 max-w-2xl">
              <h3 className="text-lg font-bold mb-4">API Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Google Custom Search API Key</label>
                  <input type="password" placeholder="AI/Google APIs are kept server-side in .env" disabled className="w-full border border-slate-200 bg-slate-50 rounded-md p-2 text-sm text-slate-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gemini API Key</label>
                  <input type="password" placeholder="AI/Google APIs are kept server-side in .env" disabled className="w-full border border-slate-200 bg-slate-50 rounded-md p-2 text-sm text-slate-500" />
                  <p className="text-xs text-slate-500 mt-1">Configure these in your .env file.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
