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
                source: 'LinkedIn',
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
                source: 'LinkedIn',
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
                source: 'LinkedIn',
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

export class GoogleSearchProvider implements SearchProvider {
    async search(query: string, country: string, industry: string) {
        // In a real app, this would call Google Custom Search API
        // For MVP without API keys, we'll fall back to DemoSearchProvider or mock
        console.log('GoogleSearchProvider called. Falling back to Demo for safety/lack of API key.');
        return new DemoSearchProvider().search(query, country, industry);
    }
}
