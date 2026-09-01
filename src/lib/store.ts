import { supabase } from './supabase';

export type SearchResult = {
  id: string;
  searchId: string;
  title: string;
  url: string;
  snippet: string;
  date: string | null;
  author: string | null;
  company: string | null;
  source: string;
  matchingKeywords: string;
  relevanceScore: number;
  resultType: string;
  projectLocation?: string;
  companyLocation?: string;
  confidence?: string;
  isDemo: boolean;
  searchQueries?: string[];
  createdAt: string;
};

export type SavedResult = {
  id: string;
  searchResultId: string;
  status: string; // New, Reviewing, Contact later, Contacted, Not relevant
  notes: string | null;
  createdAt: string;
};

export type SearchHistory = {
  id: string;
  query: string;
  country: string;
  industry: string;
  createdAt: string;
  resultsCount: number;
};

function ensureSupabase() {
    if (!supabase) {
        throw new Error('Supabase is not configured. Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
}

function toDbSearchResult(r: SearchResult) {
  return {
    id: r.id,
    search_id: r.searchId,
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    date: r.date,
    author: r.author,
    company: r.company,
    source: r.source,
    matching_keywords: r.matchingKeywords,
    relevance_score: r.relevanceScore,
    result_type: r.resultType,
    project_location: r.projectLocation,
    company_location: r.companyLocation,
    confidence: r.confidence,
    is_demo: r.isDemo,
    search_queries: r.searchQueries,
    created_at: r.createdAt
  };
}

function fromDbSearchResult(row: any): SearchResult {
  return {
    id: row.id,
    searchId: row.search_id,
    title: row.title,
    url: row.url,
    snippet: row.snippet,
    date: row.date,
    author: row.author,
    company: row.company,
    source: row.source,
    matchingKeywords: row.matching_keywords,
    relevanceScore: row.relevance_score,
    resultType: row.result_type,
    projectLocation: row.project_location,
    companyLocation: row.company_location,
    confidence: row.confidence,
    isDemo: row.is_demo,
    searchQueries: row.search_queries,
    createdAt: row.created_at
  };
}

export async function addSearchResults(results: SearchResult[]) {
    ensureSupabase();
    if (!results || results.length === 0) return;
    
    // We only insert. If they exist, we do nothing to avoid overwriting newer status if they were somehow modified
    // Upsert is safer for simple insert without erroring on duplicates
    const dbResults = results.map(toDbSearchResult);
    const { error } = await supabase!.from('search_results').upsert(dbResults, { onConflict: 'id' });
    if (error) console.error('Error adding search results:', error);
}

export async function saveResult(searchResultId: string) {
    ensureSupabase();
    const { data, error: fetchErr } = await supabase!
        .from('saved_results')
        .select('id')
        .eq('search_result_id', searchResultId)
        .maybeSingle();
    
    if (!data) {
        const { error } = await supabase!.from('saved_results').insert({
            id: Math.random().toString(36).substring(7),
            search_result_id: searchResultId,
            status: 'New',
            notes: null,
            created_at: new Date().toISOString()
        });
        if (error) console.error('Error saving result:', error);
    }
}

export async function dismissResult(searchResultId: string) {
    ensureSupabase();
    // Delete from saved_results and search_results to fully dismiss it
    const { error: err1 } = await supabase!.from('saved_results').delete().eq('search_result_id', searchResultId);
    const { error: err2 } = await supabase!.from('search_results').delete().eq('id', searchResultId);
    if (err1) console.error('Error removing from saved:', err1);
    if (err2) console.error('Error removing from search:', err2);
}

export async function getSavedResults() {
    ensureSupabase();
    const { data, error } = await supabase!
        .from('saved_results')
        .select('*, search_results(*)');
        
    if (error) {
        console.error('Error fetching saved results:', error);
        return [];
    }
    
    return data.map(row => ({
        id: row.id,
        searchResultId: row.search_result_id,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
        result: row.search_results ? fromDbSearchResult(row.search_results) : null
    }));
}

export async function addSearchHistory(history: Omit<SearchHistory, 'id' | 'createdAt'>) {
    ensureSupabase();
    const { error } = await supabase!.from('search_history').insert({
        id: Math.random().toString(36).substring(7),
        query: history.query,
        country: history.country,
        industry: history.industry,
        results_count: history.resultsCount,
        created_at: new Date().toISOString()
    });
    if (error) console.error('Error adding history:', error);
}

export async function getSearchHistory() {
    ensureSupabase();
    const { data, error } = await supabase!
        .from('search_history')
        .select('*')
        .order('created_at', { ascending: true });
        
    if (error) {
        console.error('Error fetching history:', error);
        return [];
    }
    
    return data.map(row => ({
        id: row.id,
        query: row.query,
        country: row.country,
        industry: row.industry,
        resultsCount: row.results_count,
        createdAt: row.created_at
    }));
}
