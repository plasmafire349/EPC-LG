import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { resultInfo } = body;

        // In a real application, you would call OpenAI API here.
        // For example:
        /*
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: "You are an AI assistant helping a business development professional respond to a LinkedIn post. The user wants three options: Professional, Business Development, and Short. Do not invent facts." },
                { role: "user", content: `Here is the post info: ${JSON.stringify(resultInfo)}` }
            ]
        });
        */

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            // Simulated response when no API key is present
            return NextResponse.json({
                professional: "Congratulations on the project milestone. This looks like an excellent initiative for the region.",
                businessDevelopment: "Interesting development. We would be pleased to explore how our expertise could support this project's success.",
                short: "Congratulations on this exciting news!"
            });
        }

        // Mock response if API key is present but we don't want to actually call it in this demo
        return NextResponse.json({
            professional: `Congratulations to the team on this ${resultInfo.type || 'project'} milestone. This is a great step forward for ${resultInfo.country || 'the region'}.`,
            businessDevelopment: `Interesting development at ${resultInfo.company || 'your company'}. We at EPC LG would be pleased to explore how our EPC expertise could support this initiative.`,
            short: "Congratulations on this exciting news!"
        });
        
    } catch (error) {
        console.error('AI error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
