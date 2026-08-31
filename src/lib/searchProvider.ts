import { SearchResult } from './store';

const EPC_KEYWORDS = ['EPC', 'EPCM', 'Engineering Procurement Construction', 'FEED', 'engineering', 'procurement', 'construction', 'contractor', 'contract', 'tender', 'RFP', 'RFQ', 'project', 'project award', 'commissioning', 'CAPEX', 'investment', 'construction start'];

const ENERGY_KEYWORDS = ['energy', 'renewable', 'wind', 'offshore wind', 'solar', 'hydrogen', 'Power-to-X', 'battery', 'battery plant', 'nuclear', 'bioenergy', 'grid', 'energy storage', 'district heating', 'waste-to-energy'];

export function calculateRelevance(text: string, country: string, industry: string): { score: number, matchingKeywords: string[], type: string } {
    let score = 0;
    const matchingKeywords = new Set<string>();
    const lowerText = text.toLowerCase();

    const check = (keyword: string, points: number) => {
        if (lowerText.includes(keyword.toLowerCase())) {
            score += points;
            matchingKeywords.add(keyword);
        }
    };

    check('EPC', 20);
    check('EPCM', 15);
    check('Project', 10);
    check(country, 15);
    check(industry, 10);
    check('Tender', 10);
    check('RFP', 10);
    check('RFQ', 10);
    check('Contract', 10);
    check('Award', 10);
    check('FEED', 10);
    check('Procurement', 5);
    check('Construction', 5);
    check('Commissioning', 5);
    check('Investment', 5);
    check('CAPEX', 5);

    // Determine type
    let type = 'General industry news';
    if (lowerText.includes('tender') || lowerText.includes('rfp')) type = 'Tender / RFP';
    else if (lowerText.includes('award') || lowerText.includes('contract')) type = 'Project award';
    else if (lowerText.includes('epc') && lowerText.includes('project')) type = 'EPC project';
    else if (lowerText.includes('feed')) type = 'FEED';
    else if (lowerText.includes('construction')) type = 'Construction';

    return { 
        score: Math.min(score, 100), 
        matchingKeywords: Array.from(matchingKeywords), 
        type 
    };
}

export interface SearchProvider {
    search(query: string, country: string, industry: string): Promise<Omit<SearchResult, 'id' | 'searchId' | 'createdAt'>[]>;
}

export class DemoSearchProvider implements SearchProvider {
    async search(query: string, country: string, industry: string) {
        // Generate mock demo data
        const mockResults: Omit<SearchResult, 'id' | 'searchId' | 'createdAt'>[] = [
            {
                title: 'New €500M Hydrogen Plant EPC Contract Awarded in Finland',
                url: 'https://linkedin.com/posts/demo-1',
                snippet: 'We are thrilled to announce that we have been selected as the main EPC contractor for the new green hydrogen facility in Oulu, Finland. The project includes full FEED and construction.',
                date: '2023-10-15',
                author: 'Jane Doe',
                company: 'Demo EPC Corp',
                source: 'LinkedIn (Demo)',
                matchingKeywords: '',
                relevanceScore: 0,
                resultType: '',
                isDemo: true
            },
            {
                title: 'Upcoming Offshore Wind Tender - Finland',
                url: 'https://linkedin.com/posts/demo-2',
                snippet: 'The Finnish government is preparing the RFP for the new offshore wind farm. We expect strong competition among European EPC contractors. #renewable #energy',
                date: '2023-11-02',
                author: 'John Smith',
                company: 'Wind Energy Insights',
                source: 'LinkedIn (Demo)',
                matchingKeywords: '',
                relevanceScore: 0,
                resultType: '',
                isDemo: true
            },
            {
                title: 'Battery Manufacturing Plant - Construction Start',
                url: 'https://linkedin.com/posts/demo-3',
                snippet: 'Construction has officially started on the new battery plant in Vaasa, Finland. Great effort by the engineering and procurement teams to get this CAPEX project off the ground.',
                date: 'Not available',
                author: 'Not available',
                company: 'Battery Tech Ltd',
                source: 'LinkedIn (Demo)',
                matchingKeywords: '',
                relevanceScore: 0,
                resultType: '',
                isDemo: true
            }
        ];

        return mockResults.map(result => {
            const textToScore = `${result.title} ${result.snippet}`;
            const { score, matchingKeywords, type } = calculateRelevance(textToScore, country, industry);
            return {
                ...result,
                relevanceScore: score,
                matchingKeywords: matchingKeywords.join(' · '),
                resultType: type
            };
        });
    }
}

/**
 * 1. Tavily Search Provider (Primary Alternative)
 * Free tier: 1,000 requests/month, NO credit card / NO billing required
 */
export class TavilySearchProvider implements SearchProvider {
    async search(query: string, country: string, industry: string) {
        const tavilyKey = process.env.TAVILY_API_KEY;
        if (!tavilyKey) return [];

        const queries = [
            `site:linkedin.com/posts EPC ${country} ${industry}`,
            `site:linkedin.com/posts "EPC project" ${country} ${industry}`,
            `site:linkedin.com/posts "EPC contract" ${country}`,
            `site:linkedin.com/posts tender EPC ${country}`,
            `site:linkedin.com/posts FEED ${country} ${industry}`,
            `site:linkedin.com/posts procurement ${country} ${industry}`,
            `site:linkedin.com/posts hydrogen ${country} EPC`,
            `site:linkedin.com/posts battery ${country} EPC`,
            `site:linkedin.com/posts renewable energy ${country} EPC`,
            `site:linkedin.com/posts nuclear ${country} project`,
            `site:linkedin.com/posts ${query} ${country} ${industry}`
        ];

        const uniqueQueries = Array.from(new Set(queries));
        const allResultsMap = new Map<string, any>();

        const promises = uniqueQueries.map(async (q) => {
            try {
                const res = await fetch('https://api.tavily.com/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: tavilyKey,
                        query: q,
                        include_domains: ['linkedin.com'],
                        search_depth: 'basic',
                        max_results: 10
                    })
                });
                
                if (!res.ok) {
                    console.error(`Tavily search returned status ${res.status} for query: ${q}`);
                    return;
                }

                const data = await res.json();
                if (data.results) {
                    for (const item of data.results) {
                        if (!allResultsMap.has(item.url)) {
                            allResultsMap.set(item.url, {
                                title: item.title || 'LinkedIn Post',
                                url: item.url,
                                snippet: item.content || '',
                                date: 'Not available',
                                author: 'Not available',
                                company: 'Not available',
                                source: 'LinkedIn via Tavily',
                                queriesMatched: [q]
                            });
                        } else {
                            const existing = allResultsMap.get(item.url);
                            if (!existing.queriesMatched.includes(q)) {
                                existing.queriesMatched.push(q);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`Tavily search failed for query: ${q}`, err);
            }
        });

        await Promise.allSettled(promises);

        if (allResultsMap.size === 0) return [];

        const formattedResults: Omit<SearchResult, 'id' | 'searchId' | 'createdAt'>[] = [];
        for (const [link, item] of allResultsMap.entries()) {
            const textToScore = `${item.title} ${item.snippet}`;
            const { score, matchingKeywords, type } = calculateRelevance(textToScore, country, industry);
            formattedResults.push({
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                date: item.date,
                author: item.author,
                company: item.company,
                source: item.source,
                matchingKeywords: matchingKeywords.join(' · '),
                relevanceScore: score,
                resultType: type,
                isDemo: false,
                searchQueries: item.queriesMatched
            });
        }

        return formattedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
}

/**
 * 2. Serper Search Provider (Secondary Alternative)
 * Free tier: 2,500 requests, NO credit card required
 */
export class SerperSearchProvider implements SearchProvider {
    async search(query: string, country: string, industry: string) {
        const serperKey = process.env.SERPER_API_KEY;
        if (!serperKey) return [];

        const queries = [
            `site:linkedin.com/posts EPC ${country} ${industry}`,
            `site:linkedin.com/posts "EPC project" ${country} ${industry}`,
            `site:linkedin.com/posts "EPC contract" ${country}`,
            `site:linkedin.com/posts tender EPC ${country}`,
            `site:linkedin.com/posts FEED ${country} ${industry}`,
            `site:linkedin.com/posts procurement ${country} ${industry}`,
            `site:linkedin.com/posts hydrogen ${country} EPC`,
            `site:linkedin.com/posts battery ${country} EPC`,
            `site:linkedin.com/posts renewable energy ${country} EPC`,
            `site:linkedin.com/posts nuclear ${country} project`,
            `site:linkedin.com/posts ${query} ${country} ${industry}`
        ];

        const uniqueQueries = Array.from(new Set(queries));
        const allResultsMap = new Map<string, any>();

        const promises = uniqueQueries.map(async (q) => {
            try {
                const res = await fetch('https://google.serper.dev/search', {
                    method: 'POST',
                    headers: {
                        'X-API-KEY': serperKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ q, num: 10 })
                });
                
                if (!res.ok) {
                    console.error(`Serper search returned status ${res.status} for query: ${q}`);
                    return;
                }

                const data = await res.json();
                if (data.organic) {
                    for (const item of data.organic) {
                        if (!allResultsMap.has(item.link)) {
                            allResultsMap.set(item.link, {
                                title: item.title || 'LinkedIn Post',
                                url: item.link,
                                snippet: item.snippet || '',
                                date: item.date || 'Not available',
                                author: 'Not available',
                                company: 'Not available',
                                source: 'LinkedIn via Serper (Google)',
                                queriesMatched: [q]
                            });
                        } else {
                            const existing = allResultsMap.get(item.link);
                            if (!existing.queriesMatched.includes(q)) {
                                existing.queriesMatched.push(q);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`Serper search failed for query: ${q}`, err);
            }
        });

        await Promise.allSettled(promises);

        if (allResultsMap.size === 0) return [];

        const formattedResults: Omit<SearchResult, 'id' | 'searchId' | 'createdAt'>[] = [];
        for (const [link, item] of allResultsMap.entries()) {
            const textToScore = `${item.title} ${item.snippet}`;
            const { score, matchingKeywords, type } = calculateRelevance(textToScore, country, industry);
            formattedResults.push({
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                date: item.date,
                author: item.author,
                company: item.company,
                source: item.source,
                matchingKeywords: matchingKeywords.join(' · '),
                relevanceScore: score,
                resultType: type,
                isDemo: false,
                searchQueries: item.queriesMatched
            });
        }

        return formattedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
}

/**
 * 3. Google Custom Search Provider
 */
export class GoogleSearchProvider implements SearchProvider {
    async search(query: string, country: string, industry: string) {
        const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
        const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

        if (!apiKey || !cx) return [];

        const queries = [
            `site:linkedin.com/posts EPC ${country} ${industry}`,
            `site:linkedin.com/posts "EPC project" ${country} ${industry}`,
            `site:linkedin.com/posts "EPC contract" ${country}`,
            `site:linkedin.com/posts tender EPC ${country}`,
            `site:linkedin.com/posts FEED ${country} ${industry}`,
            `site:linkedin.com/posts procurement ${country} ${industry}`,
            `site:linkedin.com/posts hydrogen ${country} EPC`,
            `site:linkedin.com/posts battery ${country} EPC`,
            `site:linkedin.com/posts renewable energy ${country} EPC`,
            `site:linkedin.com/posts nuclear ${country} project`,
            `site:linkedin.com/posts ${query} ${country} ${industry}`
        ];

        const uniqueQueries = Array.from(new Set(queries));
        const allResultsMap = new Map<string, any>();

        for (const q of uniqueQueries) {
            try {
                const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
                searchUrl.searchParams.append('key', apiKey);
                searchUrl.searchParams.append('cx', cx);
                searchUrl.searchParams.append('q', q);
                searchUrl.searchParams.append('num', '5');

                const res = await fetch(searchUrl.toString());
                const data = await res.json();

                if (data.error) {
                    console.error(`Google API error for query: ${q}`, data.error);
                }

                if (data.items) {
                    for (const item of data.items) {
                        if (!allResultsMap.has(item.link)) {
                            allResultsMap.set(item.link, {
                                title: item.title,
                                url: item.link,
                                snippet: item.snippet || '',
                                date: 'Not available',
                                author: 'Not available',
                                company: 'Not available',
                                source: 'LinkedIn via Google',
                                queriesMatched: [q]
                            });
                        } else {
                            const existing = allResultsMap.get(item.link);
                            if (!existing.queriesMatched.includes(q)) {
                                existing.queriesMatched.push(q);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`Google search failed for query: ${q}`, err);
            }
        }

        const formattedResults: Omit<SearchResult, 'id' | 'searchId' | 'createdAt'>[] = [];

        for (const [link, item] of allResultsMap.entries()) {
            const textToScore = `${item.title} ${item.snippet}`;
            const { score, matchingKeywords, type } = calculateRelevance(textToScore, country, industry);
            
            formattedResults.push({
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                date: item.date,
                author: item.author,
                company: item.company,
                source: item.source,
                matchingKeywords: matchingKeywords.join(' · '),
                relevanceScore: score,
                resultType: type,
                isDemo: false,
                searchQueries: item.queriesMatched
            });
        }

        return formattedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
}

/**
 * Priority Hierarchy:
 * 1. Tavily — if TAVILY_API_KEY exists -> "Tavily Live Search"
 * 2. Serper — if SERPER_API_KEY exists -> "Serper Live Search"
 * 3. Google Custom Search — only if it actually works -> "Google Live Search"
 * 4. Demo Mode — final fallback -> "Demo Mode"
 */
export async function executeSearch(query: string, country: string, industry: string): Promise<{ results: Omit<SearchResult, 'id' | 'searchId' | 'createdAt'>[], providerUsed: string }> {
    // 1. Tavily (Priority #1)
    if (process.env.TAVILY_API_KEY) {
        console.log('Attempting Tavily Search Provider...');
        const tavilyProvider = new TavilySearchProvider();
        const results = await tavilyProvider.search(query, country, industry);
        if (results.length > 0) {
            return { results, providerUsed: 'Tavily Live Search' };
        }
    }

    // 2. Serper (Priority #2)
    if (process.env.SERPER_API_KEY) {
        console.log('Attempting Serper Search Provider...');
        const serperProvider = new SerperSearchProvider();
        const results = await serperProvider.search(query, country, industry);
        if (results.length > 0) {
            return { results, providerUsed: 'Serper Live Search' };
        }
    }

    // 3. Google Custom Search (Priority #3)
    if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
        console.log('Attempting Google Custom Search Provider...');
        const googleProvider = new GoogleSearchProvider();
        const results = await googleProvider.search(query, country, industry);
        if (results.length > 0) {
            return { results, providerUsed: 'Google Live Search' };
        }
    }

    // 4. Demo Mode (Final Fallback)
    console.log('Using DemoSearchProvider as final fallback...');
    const demoProvider = new DemoSearchProvider();
    const results = await demoProvider.search(query, country, industry);
    return { results, providerUsed: 'Demo Mode' };
}
