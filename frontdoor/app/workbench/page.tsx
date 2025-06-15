'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { generateContract, generateUIConfig } from '../actions/claude';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-rust';
import 'prismjs/themes/prism-dark.css';
import { compileContract } from '../actions/compile';
import { deployContract, getPXEClient } from '../utils/aztec';
import { Interact } from './interact';
import { UIConfig } from './interact-interfaces';
import { useAtom } from 'jotai';
import { walletsAtom, selectedWalletAtom, deployedContractAtom } from '../atoms';
import { ContractArtifact, Wallet } from '@aztec/aztec.js';
import { AIChatCard } from '../components/AIChatCard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { FaCopy } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Link from 'next/link';

const GeneratedReactCard = () => {
    const [reactCode, setReactCode] = useState(`<div>
</div>`);

    return (
        <div className="card bg-base-100 shadow-xl mt-4">
            <div className="card-body">
                <h3 className="card-title">Generated React Component</h3>
                <div className="bg-base-300 rounded-lg overflow-hidden">
                    <Editor
                        value={reactCode}
                        onValueChange={code => setReactCode(code)}
                        highlight={code => highlight(code, languages.javascript)}
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
    );
};

const ArtifactsCard = ({ artifacts }: { artifacts: Record<string, string> }) => {
    return (
        <div className="card bg-base-100 shadow-xl mt-4">
            <div className="card-body">
                <h3 className="card-title">Generated Artifacts</h3>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>File</th>
                                <th>Content</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(artifacts).map(([filename, content]) => (
                                <tr key={filename}>
                                    <td className="font-mono">{filename}</td>
                                    <td className="font-mono whitespace-pre-wrap">{content}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

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
    artifacts?: Record<string, string>;
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
    const [showArtifacts, setShowArtifacts] = useState(false);
    const [activeTab, setActiveTab] = useState('interact');

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
            <div className="w-1/3 p-4 pt-0">
                <Link href="/" target="_blank">
                    <div className='flex flex-row gap-4 items-center group cursor-pointer pb-4'>
                        <div className="text-6xl font-bold font-bebas-neue transition-all duration-300">WORKBENCH</div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                                className="btn btn-primary hover:btn-secondary">
                                Start on a new idea?
                            </button>
                        </div>
                    </div>
                </Link>
                <CompileCard {...{ contract, compiling, selectedCompiler, compilationResult, handleCompile }} />
                {
                    compilationResult?.success && !generatingUIConfig && uiConfig ? (
                        <div className="card bg-base-100 shadow-xl mt-4">
                            <div className="tabs tabs-boxed">
                                <button
                                    className={`tab ${activeTab === 'interact' ? 'tab-active' : ''}`}
                                    onClick={() => setActiveTab('interact')}
                                >
                                    Interact
                                </button>
                                <div className="divider divider-horizontal"></div>
                                <button
                                    className={`tab ${activeTab === 'artifacts' ? 'tab-active' : ''}`}
                                    onClick={() => setActiveTab('artifacts')}
                                >
                                    Artifacts
                                </button>
                                <div className="divider divider-horizontal"></div>
                                <button
                                    className={`tab ${activeTab === 'react' ? 'tab-active' : ''}`}
                                    onClick={() => setActiveTab('react')}
                                >
                                    React
                                </button>
                            </div>
                            <div className="card-body">
                                {activeTab === 'interact' ? (
                                    <ErrorBoundary>
                                        <Interact config={uiConfig} selectedWallet={selectedWallet} />
                                    </ErrorBoundary>
                                ) : activeTab === 'artifacts' && compilationResult.artifacts ? (
                                    <ArtifactsCard artifacts={compilationResult.artifacts} />
                                ) : activeTab === 'react' ? (
                                    <GeneratedReactCard />
                                ) : null}
                            </div>
                        </div>
                    ) : generatingUIConfig ? (
                        <div className="card bg-base-100 shadow-xl mt-4">
                            <div className="card-body">
                                <div className="flex items-center gap-2">
                                    <span className="loading loading-spinner loading-sm"></span>
                                    <span>Generating UI...</span>
                                </div>
                            </div>
                        </div>
                    ) : null
                }
            </div >
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
                                <div className="flex justify-between items-center">
                                    <h2 className="card-title">Generated Contract</h2>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(contract);
                                            toast.success('Contract copied to clipboard!');
                                        }}
                                    >
                                        <FaCopy className="h-4 w-4" />
                                    </button>
                                </div>
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

const DeployCard = ({ contract, compilationResult }: { contract: string | null | undefined, compilationResult: CompilationResult | null }) => {
    const [deploying, setDeploying] = useState(false);
    const [deploymentResult, setDeploymentResult] = useState<{ success: boolean; error?: string; address?: string } | null>(null);
    const [deployedContract, setDeployedContract] = useAtom(deployedContractAtom);

    const handleDeploy = async () => {
        if (!compilationResult?.artifacts) return;

        setDeploying(true);
        setDeploymentResult(null);

        try {
            // Find the JSON artifact file
            const jsonArtifactKey = Object.keys(compilationResult.artifacts).find(key => key.endsWith('.json'));
            if (!jsonArtifactKey) {
                throw new Error('No JSON artifact found');
            }

            const jsonArtifact = compilationResult.artifacts[jsonArtifactKey];
            const parsedArtifact = JSON.parse(jsonArtifact);
            const result = await deployContract(parsedArtifact, await getPXEClient());
            setDeployedContract(result);
            setDeploymentResult({
                success: true,
                address: result.address.toString()
            });
        } catch (error) {
            setDeploymentResult({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to deploy contract'
            });
        } finally {
            setDeploying(false);
        }
    };

    return (
        <div className="card-body">
            <h3 className="card-title">Deploy Contract</h3>
            <button
                className='btn btn-primary'
                disabled={!compilationResult?.artifacts || deploying}
                onClick={handleDeploy}
            >
                {deploying ? (
                    <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Deploying...
                    </>
                ) : (
                    'Deploy'
                )}
            </button>

            {deployedContract || deploymentResult ? (
                <div className={`alert ${deploymentResult?.success ? 'alert-success' : 'alert-error'} mt-4`}>
                    {deploymentResult?.success ? (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="font-bold">Contract Deployed!</h3>
                                <div className="text-xs">Address: {deployedContract?.address.toString()}</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="font-bold">Deployment Failed</h3>
                                <div className="text-xs">{deploymentResult?.error}</div>
                            </div>
                        </>
                    )}
                </div>
            ) : null}
        </div>
    );
};

const CompileCard = ({ contract, compiling, selectedCompiler, compilationResult, handleCompile }: { contract: string | null | undefined, compiling: boolean, selectedCompiler: string, compilationResult: CompilationResult | null, handleCompile: () => void }) => {
    const [activeTab, setActiveTab] = useState('compile');

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="tabs tabs-boxed">
                <button
                    className={`tab ${activeTab === 'compile' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('compile')}
                >
                    Compile
                </button>
                <div className="divider divider-horizontal"></div>
                <button
                    className={`tab ${activeTab === 'deploy' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('deploy')}
                >
                    Deploy
                </button>
            </div>
            {activeTab === 'compile' ? (
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
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <DeployCard contract={contract} compilationResult={compilationResult} />
            )}
        </div>
    );
};