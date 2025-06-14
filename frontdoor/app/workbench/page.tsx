'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { generateContract, generateUIConfig } from '../actions/claude';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-rust';
import 'prismjs/themes/prism-dark.css';
import { compileContract } from '../actions/compile';
import { Interact } from './interact';
import { UIConfig } from './interact-interfaces';
import { FaGear } from "react-icons/fa6";
import { useAtom } from 'jotai';
import { walletsAtom, selectedWalletAtom } from '../atoms';
import { Wallet } from '@aztec/aztec.js';
import { AIChatCard } from '../components/AIChatCard';
import { ErrorBoundary } from '../components/ErrorBoundary';

const compilerVersions = [
    { version: '0.82.3', label: '0.82.3' }
] as const;

interface CompilationResult {
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: string;
    timestamp?: number;
    duration?: number;
}

export default function Workbench() {
    const searchParams = useSearchParams();
    const prompt = searchParams.get('prompt');
    const [contract, setContract] = useState<string | null | undefined>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [compiling, setCompiling] = useState(false);
    const [selectedCompiler, setSelectedCompiler] = useState(compilerVersions[0].version);
    const [wallets] = useAtom(walletsAtom);
    const [selectedWallet] = useAtom(selectedWalletAtom);
    const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
    const [uiConfig, setUIConfig] = useState<UIConfig | null>(null);
    const [generatingUIConfig, setGeneratingUIConfig] = useState(false);

    useEffect(() => {
        async function generate() {
            if (!prompt) {
                setLoading(false);
                return;
            }

            try {
                const result = await generateContract(prompt);
                if (result.success) {
                    setContract(result.code);
                    console.log(result.code);
                } else {
                    setError(result.error || 'Failed to generate contract');
                }
            } catch (err) {
                setError('Failed to generate contract');
            } finally {
                setLoading(false);
            }
        }

        generate();
    }, [prompt]);

    const handleCompile = async () => {
        if (!contract) return;
        setCompiling(true);
        setCompilationResult(null);
        setUIConfig(null);
        const startTime = Date.now();
        let result;

        try {
            result = await compileContract(contract);
            setCompilationResult({
                ...result,
                timestamp: Date.now(),
                duration: Date.now() - startTime
            });
        } catch (err) {
            setCompilationResult({
                success: false,
                error: err instanceof Error ? err.message : 'Failed to compile contract',
                timestamp: Date.now(),
                duration: Date.now() - startTime
            });
            return;
        } finally {
            setCompiling(false);
        }

        // Generate UI config if compilation was successful
        if (result.success) {
            setGeneratingUIConfig(true);
            try {
                const uiResult = await generateUIConfig(contract);
                if (uiResult.success) {
                    setUIConfig(uiResult.config);
                } else {
                    console.error('Failed to generate UI config:', uiResult.error);
                }
            } catch (err) {
                console.error('Error generating UI config:', err);
            } finally {
                setGeneratingUIConfig(false);
            }
        }
    };

    return (
        <div className="p-4 flex-1 bg-base-200 flex flex-row max-w-full">
            <div className="w-1/3 p-4">
                <h1 className="text-5xl font-bold mb-6">Workbench</h1>
                <CompileCard {...{ contract, compiling, selectedCompiler, compilationResult, handleCompile }} />
                {compilationResult?.success && !generatingUIConfig && uiConfig ? (
                    <InteractionCard wallets={wallets} selectedWallet={selectedWallet} config={uiConfig} />
                ) : generatingUIConfig ? (
                    <div className="card bg-base-100 shadow-xl mt-4">
                        <div className="card-body">
                            <div className="flex items-center gap-2">
                                <span className="loading loading-spinner loading-sm"></span>
                                <span>Generating UI...</span>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
            <div className="h-full flex flex-col items-center">
                <div className="text-center w-full max-w-4xl">

                    <div className="card bg-base-100 shadow-xl mb-8">
                        <div className="card-body">
                            <h2 className="card-title">Seed Prompt</h2>
                            <p className="text-left">{prompt || 'No prompt provided'}</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    ) : error ? (
                        <div className="alert alert-error">
                            <span>{error}</span>
                        </div>
                    ) : contract ? (
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title">Generated Contract</h2>
                                <div className="bg-base-300 rounded-lg overflow-hidden">
                                    <Editor
                                        value={contract}
                                        onValueChange={code => setContract(code)}
                                        highlight={code => highlight(code, languages.rust)}
                                        padding={16}
                                        style={{
                                            fontFamily: '"Fira code", "Fira Mono", monospace',
                                            fontSize: 14,
                                            minHeight: '400px',
                                            backgroundColor: 'hsl(var(--b3))',
                                        }}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex gap-4 justify-center mt-8">
                    <a href="/sandbox"
                        className="btn btn-primary">
                        Start on a new idea?
                    </a>
                </div>
            </div>
            <div className="w-1/3 p-4">
                <AIChatCard
                    contractCode={contract || undefined}
                    seedPrompt={prompt || undefined}
                />
            </div>
        </div >
    );
}

const CompileCard = ({ contract, compiling, selectedCompiler, compilationResult, handleCompile }: { contract: string | null | undefined, compiling: boolean, selectedCompiler: string, compilationResult: CompilationResult | null, handleCompile: () => void }) => {
    return <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
            <div className="flex gap-2 items-center justify-between mb-2">
                <h3 className="card-title">Compile</h3>

                <select
                    className="select select-bordered w-32"
                    value={selectedCompiler}
                    disabled
                >
                    {compilerVersions.map(compiler => (
                        <option key={compiler.version} value={compiler.version}>
                            {compiler.label}
                        </option>
                    ))}
                </select>
            </div>

            <button
                className='btn btn-primary'
                disabled={!contract?.length || compiling}
                onClick={handleCompile}
            >
                {compiling ? (
                    <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Compiling...
                    </>
                ) : (
                    'Compile'
                )}
            </button>

            <div className="mt-0">
                {compilationResult && (
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Compilation Output</h4>
                        {compilationResult.timestamp && (
                            <span
                                className="text-sm text-base-content/70 cursor-help"
                                title={`${new Date(compilationResult.timestamp).toLocaleTimeString()}\nCompilation took ${(compilationResult.duration || 0) / 1000}s`}
                            >
                                Last compiled: {new Date(compilationResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} in {(compilationResult.duration || 0) / 1000}s
                            </span>
                        )}
                    </div>
                )}
                {compilationResult && (
                    <div className="space-y-4">
                        {compilationResult.stdout && (
                            <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
                                <code>{compilationResult.stdout}</code>
                            </pre>
                        )}
                        {compilationResult.stderr && (
                            <>
                                {compilationResult.stderr.includes('Aborting due') && (
                                    <div className="alert alert-error mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div>
                                            <h3 className="font-bold">Compilation Failed</h3>
                                            <div className="text-xs">The contract could not be compiled - see full compiler output below.</div>
                                        </div>
                                    </div>
                                )}
                                <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
                                    <code>
                                        {compilationResult.stderr.split('\n').reduce((acc: { lines: string[], color: string }[], line) => {
                                            if (line.startsWith('warning:')) {
                                                acc.push({ lines: [line], color: 'text-warning' });
                                            } else if (line.startsWith('error:') || line.startsWith('Aborting due')) {
                                                acc.push({ lines: [line], color: 'text-error' });
                                            } else if (line.trim() === '') {
                                                // Empty line starts a new block
                                                acc.push({ lines: [line], color: 'text-success' });
                                            } else if (acc.length > 0 && acc[acc.length - 1].color !== 'text-success') {
                                                // Continue the current block's color
                                                acc[acc.length - 1].lines.push(line);
                                            } else {
                                                // Start a new success block
                                                acc.push({ lines: [line], color: 'text-success' });
                                            }
                                            return acc;
                                        }, []).map((block, blockIndex) => (
                                            <div key={blockIndex} className={block.color}>
                                                {block.lines.map((line, lineIndex) => (
                                                    <div key={`${blockIndex}-${lineIndex}`}>{line}</div>
                                                ))}
                                            </div>
                                        ))}
                                    </code>
                                </pre>
                            </>
                        )}
                        {/* {compilationResult.error && (
                        <div className="alert alert-error">
                            <span>{compilationResult.error}</span>
                        </div>
                    )} */}
                    </div>
                )}
            </div>
        </div>
    </div>
}

const InteractionCard = ({ wallets, selectedWallet, config }: { wallets: Wallet[], selectedWallet: Wallet, config: UIConfig }) => {
    return <div className="card bg-base-100 shadow-xl mt-4">
        <div className="card-body">
            <div className="flex justify-between items-center mb-4">
                <h3 className="card-title">Interact</h3>
                {wallets.length === 0 && (
                    <div className="text-sm text-warning">
                        No wallets found. <a href="/settings" className="link link-primary">Create one</a>
                    </div>
                )}
            </div>
            <ErrorBoundary>
                <Interact config={config} selectedWallet={selectedWallet} />
            </ErrorBoundary>
        </div>
    </div>
}
