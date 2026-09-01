import { NextResponse } from 'next/server';
import { getSearchHistory } from '@/lib/store';

export async function GET() {
    try {
        const history = await getSearchHistory();
        return NextResponse.json(history);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
