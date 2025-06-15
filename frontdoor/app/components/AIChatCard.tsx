import { useEffect, useRef, useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIChatCardProps {
    contractCode?: string;
    seedPrompt?: string;
}

export function AIChatCard({ contractCode, seedPrompt }: AIChatCardProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Add seed prompt as first message when provided
    useEffect(() => {
        if (seedPrompt && messages.length === 0) {
            setMessages([{ role: 'user', content: seedPrompt }]);
        }
    }, [seedPrompt, messages.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMessage }],
                    contractCode,
                    seedPrompt,
                }),
            });

            if (!response.ok) throw new Error('Failed to get response');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            let assistantMessage = '';
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = new TextDecoder().decode(value);
                assistantMessage += text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = assistantMessage;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const markdownComponents: Components = {
        code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
                <SyntaxHighlighter
                    style={dracula as any}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        },
        p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
        br: () => <br />,
    };

    return (
        <div className="flex flex-col min-h-128 border border-base-content/10 rounded-lg">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`ai-chat-message flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={` rounded-lg p-3 ${message.role === 'user'
                                    ? 'max-w-[80%] bg-primary text-primary-foreground'
                                    : 'w-full bg-base-100 card'
                                }`}
                        >
                            {message.role === 'assistant' ? (
                                <ReactMarkdown
                                    components={markdownComponents}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            ) : (
                                <div className="whitespace-pre-wrap">{message.content}</div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your contract..."
                        className="flex-1 px-3 py-2 rounded-md border bg-background"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        <FaPaperPlane />
                    </button>
                </div>
            </form>
        </div>
    );
} 