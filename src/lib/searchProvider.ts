import { SearchResult } from './store';


const MAJOR_COUNTRIES = ["USA","United States","America","UK","United Kingdom","Australia","Israel","Germany","France","Spain","Italy","Canada","Brazil","India","China","Japan","South Korea","Sweden","Norway","Denmark","Poland","Netherlands","Belgium","Switzerland","Austria","Saudi Arabia","UAE","United Arab Emirates","Qatar","Oman","Egypt","South Africa","Nigeria","Kenya","Mexico","Chile","Argentina","Colombia","Peru","Vietnam","Thailand","Malaysia","Indonesia","Philippines","Singapore","New Zealand","Ireland","Portugal","Greece","Turkey","Russia","Ukraine","Estonia","Latvia","Lithuania","Finland","Morocco"];

export function cleanLinkedInText(text: string): string {
    if (!text) return '';
    let cleaned = text;

    // Replace HTML entities
    cleaned = cleaned.replace(/&#x20;/g, ' ')
                     .replace(/&nbsp;/g, ' ')
                     .replace(/&amp;/g, '&')
                     .replace(/&quot;/g, '"')
                     .replace(/&apos;/g, "'")
                     .replace(/&lt;/g, '<')
                     .replace(/&gt;/g, '>');

    // Remove typical LinkedIn UI noise
    const noisePatterns = [
        /(\d+,?\d*)\s*(followers|following)/gi,
        /Report this post/gi,
        /Report this comment/gi,
        /\bLike\b\s*·?\s*\bComment\b\s*·?\s*\bShare\b/gi,
        /\bLike\b\s*·?\s*\bComment\b/gi,
        /\bLike\b\s*·?\s*\bReply\b/gi,
        /Sign in to view more/gi,
        /Sign in to view/gi,
        /\b\d+\s+comments?\b/gi,
        /\b\d+\s+reactions?\b/gi,
        /\b\d+\s+likes?\b/gi,
        /\[…\]/g,
        /\[\.\.\.\]/g,
        /Others named.*/gi,
        /View profile/gi,
        /Join now/gi,
        /Sign in/gi,
        /See more/gi,
        /View full post/gi,
        /Follow/gi,
        /Connect/gi,
    ];

    noisePatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });

    // Remove duplicate consecutive lines
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const uniqueLines: string[] = [];
    for (const line of lines) {
        if (uniqueLines.length === 0 || uniqueLines[uniqueLines.length - 1] !== line) {
            uniqueLines.push(line);
        }
    }

    // Re-join with proper spacing
    cleaned = uniqueLines.join('\n\n');

    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\s{3,}/g, '  ');

    return cleaned.trim();
}

export function calculateRelevance(text: string, country: string, industry: string): { score: number, matchingKeywords: string[], type: string, projectLocation: string, companyLocation: string, confidence: string } {
    let score = 0;
    const matchingKeywords = new Set<string>();
    const lowerText = text.toLowerCase();
    const lowerCountry = country.toLowerCase();

    const check = (keyword: string, points: number) => {
        if (lowerText.includes(keyword.toLowerCase())) {
            score += points;
            matchingKeywords.add(keyword);
        }
    };

    // Base topic checking
    check('EPC', 15);
    check('EPCM', 10);
    check('FEED', 10);
    check('Tender', 5);
    check('Award', 5);
    check(industry, 5);

    let projectLocation = 'Unknown';
    let companyLocation = 'Unknown';
    let countryMentioned = lowerText.includes(lowerCountry);

    // Regex heuristics for target country
    const projectInCountryRegex = new RegExp(`(in\\s+\\b${lowerCountry}\\b|\\b${lowerCountry}\\b\\s+(project|plant|farm|facility|site|development)|project\\s+in\\s+\\b${lowerCountry}\\b)`, 'i');
    const tenderInCountryRegex = new RegExp(`(tender\\s+in\\s+\\b${lowerCountry}\\b|rfp\\s+in\\s+\\b${lowerCountry}\\b|\\b${lowerCountry}\\b\\s+(tender|rfp))`, 'i');
    const companyInCountryRegex = new RegExp(`(company\\s+in\\s+\\b${lowerCountry}\\b|based\\s+in\\s+\\b${lowerCountry}\\b|\\b${lowerCountry}\\b\\s+company)`, 'i');
    
    // Educational article
    const educationalRegex = /(guide to|what is|how to|webinar|course|training|tutorial|learn about|what does epc mean|difference between)/i;
    // Generic company page
    const genericRegex = /(our services|contact us|we provide|years of experience|leading provider|about us|we are a)/i;

    let isOutside = false;
    let outsideCountry = '';

    // Check for other countries explicitly getting the project
    for (const c of MAJOR_COUNTRIES) {
        if (c.toLowerCase() === lowerCountry) continue;
        const explicitOutside = new RegExp(`(in\\s+\\b${c.toLowerCase()}\\b|\\b${c.toLowerCase()}\\b\\s+(project|plant|farm|facility|site|development)|project\\s+in\\s+\\b${c.toLowerCase()}\\b)`, 'i');
        const companyOutside = new RegExp(`(company\\s+in\\s+\\b${c.toLowerCase()}\\b|based\\s+in\\s+\\b${c.toLowerCase()}\\b|\\b${c.toLowerCase()}\\b\\s+company)`, 'i');
        
        if (explicitOutside.test(lowerText)) {
            isOutside = true;
            outsideCountry = c;
            // Don't break, keep evaluating so we catch everything, but outside country for project is prioritized
        }
        
        if (companyOutside.test(lowerText) && companyLocation === 'Unknown') {
            companyLocation = c;
        }
    }
    
    // Fallback: if no explicit project match, but another country is mentioned and target is NOT mentioned
    if (!isOutside && !countryMentioned) {
        for (const c of MAJOR_COUNTRIES) {
            if (c.toLowerCase() === lowerCountry) continue;
            const otherCountryMatch = new RegExp(`\\b${c.toLowerCase()}\\b`, 'i');
            if (otherCountryMatch.test(lowerText)) {
                isOutside = true;
                outsideCountry = c;
                break;
            }
        }
    }

    if (isOutside) {
        score -= 40;
        projectLocation = outsideCountry;
        matchingKeywords.add('Outside Location');
    } else if (projectInCountryRegex.test(lowerText)) {
        score += 40;
        projectLocation = country;
        matchingKeywords.add('Target Country Project');
    } else if (tenderInCountryRegex.test(lowerText)) {
        score += 30;
        projectLocation = country;
        matchingKeywords.add('Target Country Tender');
    } else if (countryMentioned) {
        score += 3;
        matchingKeywords.add(country);
    }
    
    if (companyInCountryRegex.test(lowerText)) {
        score += 15;
        companyLocation = country;
        matchingKeywords.add('Target Country Company');
    }

    if (educationalRegex.test(lowerText)) {
        score -= 30;
        matchingKeywords.add('Educational');
    }

    if (genericRegex.test(lowerText)) {
        score -= 20;
        matchingKeywords.add('Generic Corporate');
    }

    // Determine type
    let type = 'General industry news';
    if (lowerText.includes('tender') || lowerText.includes('rfp') || lowerText.includes('rfq')) type = 'Tender / RFP';
    else if (lowerText.includes('award') || lowerText.includes('contract')) type = 'Project award';
    else if (lowerText.includes('epc') && lowerText.includes('project')) type = 'EPC project';
    else if (lowerText.includes('feed')) type = 'FEED';
    else if (lowerText.includes('construction')) type = 'Construction';

    // Confidence
    let confidence = 'Low';
    if (score >= 60) confidence = 'High';
    else if (score >= 30) confidence = 'Medium';

    return { 
        score: Math.max(Math.min(score, 100), -100), 
        matchingKeywords: Array.from(matchingKeywords), 
        type,
        projectLocation,
        companyLocation,
        confidence
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
            const cleanedSnippet = cleanLinkedInText(item.snippet);
            const textToScore = `${item.title} ${cleanedSnippet}`;
            const { score, matchingKeywords, type, projectLocation, companyLocation, confidence } = calculateRelevance(textToScore, country, industry);
            
            formattedResults.push({
                title: item.title,
                url: item.url,
                snippet: cleanedSnippet,
                date: item.date,
                author: item.author,
                company: item.company,
                source: item.source,
                matchingKeywords: matchingKeywords.join(' · '),
                relevanceScore: score,
                resultType: type,
                projectLocation,
                companyLocation,
                confidence,
                isDemo: item.isDemo || false,
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
            const cleanedSnippet = cleanLinkedInText(item.snippet);
            const textToScore = `${item.title} ${cleanedSnippet}`;
            const { score, matchingKeywords, type, projectLocation, companyLocation, confidence } = calculateRelevance(textToScore, country, industry);
            
            formattedResults.push({
                title: item.title,
                url: item.url,
                snippet: cleanedSnippet,
                date: item.date,
                author: item.author,
                company: item.company,
                source: item.source,
                matchingKeywords: matchingKeywords.join(' · '),
                relevanceScore: score,
                resultType: type,
                projectLocation,
                companyLocation,
                confidence,
                isDemo: item.isDemo || false,
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
            const cleanedSnippet = cleanLinkedInText(item.snippet);
            const textToScore = `${item.title} ${cleanedSnippet}`;
            const { score, matchingKeywords, type, projectLocation, companyLocation, confidence } = calculateRelevance(textToScore, country, industry);
            
            formattedResults.push({
                title: item.title,
                url: item.url,
                snippet: cleanedSnippet,
                date: item.date,
                author: item.author,
                company: item.company,
                source: item.source,
                matchingKeywords: matchingKeywords.join(' · '),
                relevanceScore: score,
                resultType: type,
                projectLocation,
                companyLocation,
                confidence,
                isDemo: item.isDemo || false,
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
