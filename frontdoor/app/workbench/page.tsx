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

const testConfig = {
    "personas": [
        {
            "id": "admin",
            "displayName": "Admin / Deployer",
            "permissions": {
                "read": ["get_yes_count", "get_no_count"],
                "write": ["constructor"]
            },
            "screens": [
                {
                    "id": "connect_wallet",
                    "type": "connect_wallet",
                    "props": {
                        "prompt": "Connect your deployer key"
                    }
                },
                {
                    "id": "deploy_initialize",
                    "type": "panel",
                    "title": "Deploy & Initialize",
                    "components": [
                        {
                            "type": "button",
                            "id": "deploy_contract",
                            "label": "Deploy OneTimeVote",
                            "action": {
                                "type": "deployContract"
                            }
                        },
                        {
                            "type": "button",
                            "id": "run_constructor",
                            "label": "Run constructor()",
                            "action": {
                                "type": "invokeFunction",
                                "function": "constructor"
                            },
                            "requiresConfirmation": true,
                            "confirmationMessage": "This will zero both tallies."
                        }
                    ]
                },
                {
                    "id": "storage_snapshot",
                    "type": "panel",
                    "title": "Storage Snapshot",
                    "components": [
                        {
                            "type": "numeric_display",
                            "id": "yes_count",
                            "label": "Yes Count",
                            "dataSource": {
                                "function": "get_yes_count"
                            },
                            "autoRefreshBoundTo": "auto_refresh_toggle"
                        },
                        {
                            "type": "numeric_display",
                            "id": "no_count",
                            "label": "No Count",
                            "dataSource": {
                                "function": "get_no_count"
                            },
                            "autoRefreshBoundTo": "auto_refresh_toggle"
                        },
                        {
                            "type": "toggle",
                            "id": "auto_refresh_toggle",
                            "label": "Auto-refresh",
                            "default": true
                        }
                    ]
                }
            ]
        },
        {
            "id": "voter",
            "displayName": "Voter",
            "permissions": {
                "read": ["get_yes_count", "get_no_count"],
                "write": ["cast_vote"]
            },
            "screens": [
                {
                    "id": "connect_wallet",
                    "type": "connect_wallet",
                    "props": {
                        "prompt": "Connect your voting key"
                    }
                },
                {
                    "id": "vote_form",
                    "type": "form",
                    "title": "Cast Your Vote",
                    "components": [
                        {
                            "type": "choice_selector",
                            "id": "vote_choice",
                            "label": "Select your choice",
                            "options": [
                                { "label": "Yes", "value": 1 },
                                { "label": "No", "value": 0 }
                            ],
                            "singleSelect": true
                        },
                        {
                            "type": "button",
                            "id": "submit_vote",
                            "label": "Cast Vote",
                            "action": {
                                "type": "invokeFunction",
                                "function": "cast_vote",
                                "args": {
                                    "choice": "vote_choice.value"
                                }
                            },
                            "disabledBoundTo": "hasVoted",
                            "statusFlows": [
                                {
                                    "status": "initiating",
                                    "label": "Generating proof…"
                                },
                                {
                                    "status": "submitting",
                                    "label": "Submitting…"
                                },
                                {
                                    "status": "success",
                                    "nextScreen": "vote_confirmation"
                                }
                            ]
                        }
                    ]
                },
                {
                    "id": "vote_confirmation",
                    "type": "screen",
                    "title": "Vote Confirmation",
                    "components": [
                        {
                            "type": "text",
                            "id": "confirmation_message",
                            "content": "Your vote has been recorded on-chain. You cannot vote again."
                        },
                        {
                            "type": "tx_details",
                            "id": "cast_vote_tx",
                            "dataSource": {
                                "function": "cast_vote",
                                "fetch": "lastTransaction"
                            }
                        }
                    ]
                },
                {
                    "id": "current_tally",
                    "type": "panel",
                    "title": "Current Tally",
                    "components": [
                        {
                            "type": "numeric_display",
                            "id": "yes_count",
                            "label": "Yes Count",
                            "dataSource": {
                                "function": "get_yes_count"
                            }
                        },
                        {
                            "type": "numeric_display",
                            "id": "no_count",
                            "label": "No Count",
                            "dataSource": {
                                "function": "get_no_count"
                            }
                        }
                    ]
                }
            ]
        },
        {
            "id": "observer",
            "displayName": "Observer",
            "permissions": {
                "read": ["get_yes_count", "get_no_count"],
                "write": []
            },
            "screens": [
                {
                    "id": "results_dashboard",
                    "type": "dashboard",
                    "title": "Results Overview",
                    "components": [
                        {
                            "type": "numeric_display",
                            "id": "yes_count",
                            "label": "Yes",
                            "dataSource": {
                                "function": "get_yes_count"
                            }
                        },
                        {
                            "type": "numeric_display",
                            "id": "no_count",
                            "label": "No",
                            "dataSource": {
                                "function": "get_no_count"
                            }
                        },
                        {
                            "type": "bar_chart",
                            "id": "yes_no_distribution",
                            "dataSource": {
                                "type": "functionResults",
                                "functions": ["get_yes_count", "get_no_count"]
                            }
                        }
                    ]
                },
                {
                    "id": "live_updates",
                    "type": "toggle",
                    "label": "Live updates",
                    "default": false
                },
                {
                    "id": "explorer_links",
                    "type": "link_list",
                    "title": "Explorer Links",
                    "items": [
                        {
                            "label": "View contract on Aztec explorer",
                            "urlTemplate": "https://explorer.aztec.network/contracts/{{contractAddress}}"
                        },
                        {
                            "label": "See all transaction history",
                            "urlTemplate": "https://explorer.aztec.network/contracts/{{contractAddress}}/transactions"
                        }
                    ]
                }
            ]
        }
    ]
}


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
