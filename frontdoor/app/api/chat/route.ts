import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages.mjs';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatRequest {
    messages: Message[];
    contractCode?: string;
    seedPrompt?: string;
}

// Create an Anthropic API client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

export async function POST(req: Request) {
    const { messages, contractCode, seedPrompt } = await req.json() as ChatRequest;

    // Convert messages to Claude format
    const claudeMessages = messages.map((msg: Message): MessageParam => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
    }));

    // Create context-aware system message
    const systemContent = `You are an AI assistant specialized in Aztec Protocol smart contract development. 
    You help users write, debug, and understand Noir smart contracts. 
    You can explain concepts, suggest improvements, and help with error messages.
    Always be concise and focus on practical solutions.

    ${contractCode ? `Current contract code:\n\`\`\`noir\n${contractCode}\n\`\`\`` : ''}
    ${seedPrompt ? `User's original request: ${seedPrompt}` : ''}`;

    // Ask Claude for a streaming chat completion
    const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        stream: true,
        max_tokens: 1000,
        system: systemContent,
        messages: claudeMessages,
    });

    // Convert the response into a friendly text-stream
    const stream = new ReadableStream({
        async start(controller) {
            for await (const chunk of response) {
                if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
                    controller.enqueue(chunk.delta.text);
                }
            }
            controller.close();
        },
    });

    // Return a streaming response
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
} 