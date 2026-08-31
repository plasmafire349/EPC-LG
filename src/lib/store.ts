import fs from 'fs';
import path from 'path';

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
  isDemo: boolean;
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

export type StoreData = {
  searchResults: SearchResult[];
  savedResults: SavedResult[];
  searchHistory: SearchHistory[];
};

const defaultData: StoreData = {
  searchResults: [],
  savedResults: [],
  searchHistory: [],
};

const getStorePath = () => path.join(process.cwd(), 'data.json');

export function getStore(): StoreData {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf-8'));
  } catch (e) {
    return defaultData;
  }
}

export function updateStore(data: StoreData) {
  fs.writeFileSync(getStorePath(), JSON.stringify(data, null, 2));
}

export function addSearchResults(results: SearchResult[]) {
  const store = getStore();
  store.searchResults.push(...results);
  updateStore(store);
}

export function saveResult(searchResultId: string) {
  const store = getStore();
  if (!store.savedResults.find((r) => r.searchResultId === searchResultId)) {
    store.savedResults.push({
      id: Math.random().toString(36).substring(7),
      searchResultId,
      status: 'New',
      notes: null,
      createdAt: new Date().toISOString(),
    });
    updateStore(store);
  }
}

export function dismissResult(searchResultId: string) {
    // Optionally remove from searchResults or add to a dismissed list
    // For now we just remove it
    const store = getStore();
    store.searchResults = store.searchResults.filter(r => r.id !== searchResultId);
    store.savedResults = store.savedResults.filter(r => r.searchResultId !== searchResultId);
    updateStore(store);
}

export function getSavedResults() {
  const store = getStore();
  return store.savedResults.map((s) => ({
    ...s,
    result: store.searchResults.find((r) => r.id === s.searchResultId),
  }));
}

export function addSearchHistory(history: Omit<SearchHistory, 'id' | 'createdAt'>) {
    const store = getStore();
    store.searchHistory.push({
        id: Math.random().toString(36).substring(7),
        ...history,
        createdAt: new Date().toISOString()
    });
    updateStore(store);
}
