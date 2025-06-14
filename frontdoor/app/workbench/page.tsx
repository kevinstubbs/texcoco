'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { generateContract } from '../actions/claude';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-rust';
import 'prismjs/themes/prism.css';
import { compileContract } from '../actions/compile';

export default function Workbench() {
    const searchParams = useSearchParams();
    const prompt = searchParams.get('prompt');
    const [contract, setContract] = useState<string | null | undefined>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [compiling, setCompiling] = useState(false);
    const [compilationResult, setCompilationResult] = useState<{
        success: boolean;
        stdout?: string;
        stderr?: string;
        error?: string;
    } | null>(null);

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

        try {
            const result = await compileContract(contract);
            setCompilationResult(result);
        } catch (err) {
            setCompilationResult({
                success: false,
                error: err instanceof Error ? err.message : 'Failed to compile contract'
            });
        } finally {
            setCompiling(false);
        }
    };

    return (
        <div className="p-4 flex-1 bg-base-200 flex flex-row">
            <div className="h-full flex flex-col items-center">
                <div className="text-center w-full max-w-4xl">
                    <h1 className="text-5xl font-bold mb-6">Workbench</h1>

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
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h3 className="card-title">Compile</h3>

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

                        <div className="mt-4">
                            <h4 className="font-semibold mb-2">Output</h4>
                            {compilationResult && (
                                <div className="space-y-4">
                                    {compilationResult.stdout && (
                                        <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm">
                                            <code>{compilationResult.stdout}</code>
                                        </pre>
                                    )}
                                    {compilationResult.stderr && (
                                        <pre className="bg-base-300 p-4 rounded-lg overflow-x-auto text-sm text-error">
                                            <code>{compilationResult.stderr}</code>
                                        </pre>
                                    )}
                                    {compilationResult.error && (
                                        <div className="alert alert-error">
                                            <span>{compilationResult.error}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="card bg-base-100 shadow-xl mt-4">
                    <div className="card-body">
                        <h3 className="card-title">Interact</h3>
                    </div>
                </div>
            </div>
        </div>
    );
}
