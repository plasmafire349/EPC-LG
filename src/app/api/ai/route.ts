import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { resultInfo, modifier } = body;

        const apiKey = process.env.GEMINI_API_KEY;
        const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

        if (!apiKey) {
            return NextResponse.json({
                error: 'AI Assistant unavailable',
                message: 'Add GEMINI_API_KEY to enable response generation.'
            }, { status: 503 });
        }

        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `You are an EPC business-development communication assistant.
Help an EPC professional write an appropriate response to a publicly visible LinkedIn post.
You are NOT responsible for determining whether the post is relevant.
Do not calculate the EPC relevance score.
Do not invent project facts, company information, people, dates, values, contracts, or project stages.
Only use facts provided in the supplied result.
If information is limited, write a general response that does not assume missing facts.
The response should sound natural and professional on LinkedIn.
Avoid generic AI language.
Avoid excessive sales language.
Avoid spam.`;

        let prompt = `Here is the LinkedIn post information:
Title: ${resultInfo.title}
Snippet: ${resultInfo.snippet}
URL: ${resultInfo.url}
Date: ${resultInfo.date || 'Not available'}
Source: ${resultInfo.source}
Matching Keywords: ${resultInfo.matchingKeywords}
Search Query: ${resultInfo.searchQueries?.join(', ') || ''}

Generate exactly three responses based on this post:
1. Professional: A credible professional LinkedIn response.
2. Business Development: A subtle response that could naturally open a commercial conversation without sounding like spam.
3. Short: A concise, natural LinkedIn response.`;

        if (modifier) {
             prompt += `\n\nApply the following instruction to modify the generation: ${modifier}.`;
        }

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        professional: { type: "STRING" },
                        businessDevelopment: { type: "STRING" },
                        short: { type: "STRING" }
                    },
                    required: ["professional", "businessDevelopment", "short"]
                }
            }
        });

        const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
             throw new Error("Empty response from Gemini");
        }
        const data = JSON.parse(text);

        return NextResponse.json(data);
        
    } catch (error) {
        console.error('Gemini error:', error);
        return NextResponse.json({ 
            error: 'AI temporarily unavailable.',
            message: 'Please try again in a moment.'
        }, { status: 500 });
    }
}
