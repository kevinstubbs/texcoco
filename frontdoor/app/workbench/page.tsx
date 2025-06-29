'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useMemo, useRef } from 'react';
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
import { useAtom } from 'jotai';
import { walletsAtom, selectedWalletAtom } from '../atoms';
import { AIChatCard } from '../components/AIChatCard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { FaCopy } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { CompilationResult, CompileCard } from './compile-card';
import { generateReactComponent } from '../actions/claude';

const GeneratedReactCard = ({ contract, uiConfig }: { contract: string | null, uiConfig: UIConfig | null }) => {
    const [reactCode, setReactCode] = useState<string>(`<div>
</div>`);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasGeneratedRef = useRef(false);

    useEffect(() => {
        async function generate() {
            if (!contract || !uiConfig || hasGeneratedRef.current) return;

            setGenerating(true);
            setError(null);

            try {
                const result = await generateReactComponent(contract, uiConfig);
                if (result.success && result.code) {
                    setReactCode(result.code);
                    hasGeneratedRef.current = true;
                } else {
                    setError(result.error || 'Failed to generate React component');
                }
            } catch (err) {
                setError('Failed to generate React component');
            } finally {
                setGenerating(false);
            }
        }

        generate();
    }, [contract, uiConfig]);

    return (
        <div className="card bg-base-100 shadow-xl mt-4">
            <div className="card-body">
                <h3 className="card-title">Generated React Component</h3>
                <div>Implemented with <Link className='link underline hover:text-primary' href="https://www.npmjs.com/package/@nemi-fi/wallet-sdk" target="_blank">Nemi Wallet SDK</Link> which is compatible with <Link className='link underline hover:text-primary' href="https://obsidion.xyz/" target="_blank">Obsidion</Link> and <Link className='link underline hover:text-primary' href="https://azguardwallet.io/" target="_blank">Azguard</Link> wallets.</div>
                {generating ? (
                    <div className="flex items-center gap-2">
                        <span className="loading loading-spinner loading-sm"></span>
                        <span>Generating React component...</span>
                    </div>
                ) : error ? (
                    <div className="alert alert-error">
                        <span>{error}</span>
                    </div>
                ) : (
                    <div className="bg-base-300 rounded-lg overflow-hidden">
                        <Editor
                            value={reactCode}
                            onValueChange={() => { }}
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
                )}
            </div>
        </div>
    );
};

const ArtifactsCard = ({ artifacts }: { artifacts: Record<string, string> }) => {
    const [selectedArtifact, setSelectedArtifact] = useState(Object.keys(artifacts)[0]);

    return (
        <div className="card bg-base-100 shadow-xl mt-4">
            <div className="card-body">
                <div className="flex justify-between items-center">
                    <h3 className="card-title">Generated Artifacts</h3>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                            navigator.clipboard.writeText(artifacts[selectedArtifact]);
                            toast.success(`${selectedArtifact} copied to clipboard!`);
                        }}
                    >
                        <FaCopy className="h-4 w-4" />
                    </button>
                </div>
                <div className="tabs tabs-boxed mb-4">
                    {Object.keys(artifacts).map((filename) => (
                        <button
                            key={filename}
                            className={`tab ${selectedArtifact === filename ? 'tab-active' : ''}`}
                            onClick={() => setSelectedArtifact(filename)}
                        >
                            {filename}
                        </button>
                    ))}
                </div>
                <div className="bg-base-300 rounded-lg overflow-hidden overflow-y-scroll max-h-[500px]">
                    <Editor
                        value={artifacts[selectedArtifact]}
                        onValueChange={() => { }}
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

const WorkbenchContent = () => {
    const searchParams = useSearchParams();
    const prompt = useMemo(() => searchParams.get('prompt'), [searchParams]);
    const [contract, setContract] = useState<string | null | undefined>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [compiling, setCompiling] = useState(false);
    const [wallets] = useAtom(walletsAtom);
    const [selectedWallet] = useAtom(selectedWalletAtom);
    const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
    const [uiConfig, setUIConfig] = useState<UIConfig | null>(null);
    const [generatingUIConfig, setGeneratingUIConfig] = useState(false);
    const [showArtifacts, setShowArtifacts] = useState(false);
    const [activeTab, setActiveTab] = useState('interact');
    const [contractTab, setContractTab] = useState('main.nr');
    const hasGeneratedRef = useRef(false);

    const nargoToml = `[package]
name = "dynamic_contract"
authors = [""]
compiler_version = ">=0.25.0"
type = "contract"

[dependencies]
aztec = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/aztec" }
value_note = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/value-note"}
easy_private_state = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/easy-private-state"}
uint_note = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/uint-note"}
compressed_string = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/compressed-string"}
authwit = { git="https://github.com/AztecProtocol/aztec-packages/", tag="v0.82.3", directory="noir-projects/aztec-nr/authwit"}
`;

    useEffect(() => {
        async function generate() {
            if (!prompt) {
                setLoading(false);
                return;
            }


            if (hasGeneratedRef.current) return;
            hasGeneratedRef.current = true;

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

                <AIChatCard
                    contractCode={contract || undefined}
                    seedPrompt={prompt || undefined}
                />
            </div>
            <div className="h-full flex flex-col items-center flex-1">
                <div className="text-center w-full max-w-4xl">
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
                                            navigator.clipboard.writeText(contractTab === 'main.nr' ? contract : nargoToml);
                                            toast.success(`${contractTab} copied to clipboard!`);
                                        }}
                                    >
                                        <FaCopy className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="tabs tabs-boxed mb-4">
                                    <button
                                        className={`tab ${contractTab === 'main.nr' ? 'tab-active' : ''}`}
                                        onClick={() => setContractTab('main.nr')}
                                    >
                                        src/main.nr
                                    </button>
                                    <div className="divider divider-horizontal"></div>
                                    <button
                                        className={`tab ${contractTab === 'Nargo.toml' ? 'tab-active' : ''}`}
                                        onClick={() => setContractTab('Nargo.toml')}
                                    >
                                        Nargo.toml
                                    </button>
                                </div>
                                <div className="bg-base-300 rounded-lg overflow-hidden">
                                    <Editor
                                        value={contractTab === 'main.nr' ? contract : nargoToml}
                                        onValueChange={code => contractTab === 'main.nr' ? setContract(code) : null}
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
                {contract && <CompileCard {...{ contract, compiling, compilationResult, handleCompile }} />}
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
                                    <GeneratedReactCard contract={contract || null} uiConfig={uiConfig} />
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
            </div>
        </div>
    );
};

export default function Workbench() {
    return (
        <WorkbenchContent />
    );
}
