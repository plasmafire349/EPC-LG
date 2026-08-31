# EPC LG — EPC LinkedIn Intelligence

EPC LG helps EPC professionals monitor publicly indexed LinkedIn posts related to EPC projects and business opportunities.

**DO NOT use AI for searching, discovering, filtering, scoring, or monitoring posts.**
The application relies on a rule-based engine and Google Search API to discover and filter information. AI is strictly optional and only used to help the user draft responses via the "Ask AI" button.

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Environment Configuration:
   Copy `.env.example` to `.env.local` and fill in your keys (optional for Demo mode).
   ```bash
   cp .env.example .env.local
   ```
   - `OPENAI_API_KEY`: Used strictly for the AI Response Assistant feature.
   - `GOOGLE_SEARCH_API_KEY`: Used for fetching real LinkedIn search results (the app falls back to Demo mode if not configured).

3. Start the development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## Architecture & Features

### What Works Without AI
- **Search Engine**: Discovery of public LinkedIn posts uses standard API calls (Google Search) or mock demo data.
- **Relevance Scoring**: A deterministic, rule-based scoring engine (0-100) ranks results based on keywords (e.g., EPC, Tender, FEED).
- **Filtering & UI**: The entire dashboard, filtering, saving, and search history functionality.
- **Notifications/Alerts**: Alerts are triggered purely by rule-based matches (relevance score thresholds, keyword matches).

### What AI Does
- AI is strictly an **Optional Response-Writing Assistant**.
- When viewing a result, clicking "Ask AI" sends the available post context to the AI Provider to draft three response options (Professional, Business Development, Short).
- AI does not judge relevance, invent missing information, or automatically interact with LinkedIn.

### What Remains for Production
- **Actual Database**: Replace the in-memory JSON store (`src/lib/store.ts`) with PostgreSQL/Supabase.
- **Google Search Integration**: Implement the actual `googleapiclient` call in `GoogleSearchProvider` using `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID`.
- **OpenAI Integration**: Uncomment and connect the actual `openai` SDK call in `src/app/api/ai/route.ts`.
- **Authentication**: Add NextAuth/Clerk for user login and protecting the dashboard.
- **CRON Jobs**: Set up background workers to periodically run saved searches and trigger alerts.
