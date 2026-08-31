import { NextResponse } from 'next/server';
import { DemoSearchProvider, GoogleSearchProvider } from '@/lib/searchProvider';
import { addSearchResults, addSearchHistory } from '@/lib/store';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { query, country, industry, useDemo = true } = body;

        if (!query || !country || !industry) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const provider = useDemo ? new DemoSearchProvider() : new GoogleSearchProvider();
        const rawResults = await provider.search(query, country, industry);
        
        const searchId = Math.random().toString(36).substring(7);
        
        const results = rawResults.map(r => ({
            ...r,
            id: Math.random().toString(36).substring(7),
            searchId,
            createdAt: new Date().toISOString()
        }));

        addSearchResults(results);
        addSearchHistory({ query, country, industry, resultsCount: results.length });

        return NextResponse.json({ searchId, results });
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
