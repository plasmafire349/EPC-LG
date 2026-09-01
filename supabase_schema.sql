-- Supabase Schema for EPC LG

-- Table: search_results
-- Stores all opportunities fetched from Search Providers.
CREATE TABLE IF NOT EXISTS search_results (
    id TEXT PRIMARY KEY,
    search_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    snippet TEXT NOT NULL,
    date TEXT,
    author TEXT,
    company TEXT,
    source TEXT NOT NULL,
    matching_keywords TEXT,
    relevance_score INTEGER NOT NULL,
    result_type TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    search_queries JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: saved_results
-- Stores opportunities explicitly saved by the user.
CREATE TABLE IF NOT EXISTS saved_results (
    id TEXT PRIMARY KEY,
    search_result_id TEXT NOT NULL REFERENCES search_results(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'New',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(search_result_id)
);

-- Table: search_history
-- Stores all executed searches for the history page.
CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    query TEXT NOT NULL,
    country TEXT NOT NULL,
    industry TEXT NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_results_score ON search_results(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_results_created_at ON saved_results(created_at DESC);
