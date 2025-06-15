import { useAtom } from "jotai";
import { useState } from "react";
import { deployedContractAtom } from "../atoms";
import { deployContract, getPXEClient } from "../utils/aztec";


const compilerVersions = [
    { version: '0.82.3', label: '0.82.3' }
] as const;

export interface CompilationResult {
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: string;
    timestamp?: number;
    duration?: number;
    artifacts?: Record<string, string>;
}

export const CompileCard = ({ contract, compiling, compilationResult, handleCompile }: { contract: string | null | undefined, compiling: boolean, compilationResult: CompilationResult | null, handleCompile: () => void }) => {
    const [activeTab, setActiveTab] = useState('compile');
    const [selectedCompiler, setSelectedCompiler] = useState(compilerVersions[0].version);

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
