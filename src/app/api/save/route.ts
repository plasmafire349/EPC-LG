import { NextResponse } from 'next/server';
import { saveResult, getSavedResults, dismissResult } from '@/lib/store';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { searchResultId, action } = body;

        if (action === 'save') {
            saveResult(searchResultId);
        } else if (action === 'dismiss') {
            dismissResult(searchResultId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const results = getSavedResults();
        return NextResponse.json(results);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
