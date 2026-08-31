import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function GET() {
    try {
        const store = getStore();
        return NextResponse.json(store.searchHistory);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
