'use client';

import { useState, useEffect } from 'react';
import { UIConfig } from './interact-interfaces';
import { Wallet } from '@aztec/aztec.js';
import { createPXEClient, PXE } from '@aztec/aztec.js';
import { callContractFunction, generateAccount, readContractFunction } from '../utils/aztec';
import { useAtomValue } from 'jotai';
import { deployedContractAtom, walletsAtom } from '../atoms';
import toast from 'react-hot-toast';

export interface InteractProps {
    config: UIConfig;
    selectedWallet: Wallet | null;
}

export function Interact({ config, selectedWallet }: InteractProps) {
    const [selectedPersona, setSelectedPersona] = useState(config.personas[0]);
    const [wallet, setWallet] = useState<Wallet | null>(selectedWallet);
    const wallets = useAtomValue(walletsAtom);
    const [pxe, setPxe] = useState<PXE | null>(null);
    const [isCreatingWallet, setIsCreatingWallet] = useState(false);
    const deployedContract = useAtomValue(deployedContractAtom);

    useEffect(() => {
        async function initPxe() {
            const client = await createPXEClient('http://localhost:8080');
            setPxe(client);
        }
        initPxe();
    }, []);

    useEffect(() => {
        if (wallet == null && wallets?.length) {
            setWallet(wallets[0]);
        }
    }, [wallet, wallets])

    useEffect(() => {
        console.log({ wallet, wallets, deployedContract }, deployedContract?.address.toString())
        if (wallet != null && wallets?.length && deployedContract) {
            readContractFunction(deployedContract, wallet, 'get_yes_count', [wallet.getAddress()]).then((balance) => {
                console.log({ balance })
                toast.success(`get_yes_count: ${balance}}`)
            }).catch((error) => {
                console.error(error);
            });
            readContractFunction(deployedContract, wallet, 'get_no_count', [wallet.getAddress()]).then((balance) => {
                console.log({ balance })
                toast.success(`get_no_count: ${balance}}`)
            }).catch((error) => {
                console.error(error);
            });
        }
    }, [wallet, wallets, deployedContract])

    console.log({ config })

    const handleCreateWallet = async () => {
        if (!pxe) return;

        setIsCreatingWallet(true);
        try {
            setWallet(await generateAccount(pxe));
        } catch (error) {
            console.error('Failed to create wallet:', error);
        } finally {
            setIsCreatingWallet(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Wallet Management */}
            <div className="card bg-base-200">
                <div className="card-body">
                    <h3 className="card-title">Wallet</h3>
                    <div className="space-y-4">
                        <div className="form-control w-full">
                            <label className="label">
                                <span className="label-text">Select Wallet</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={wallet?.getAddress().toString() || ''}
                                onChange={(e) => {
                                    const selectedWallet = wallets.find(
                                        w => w.getAddress().toString() === e.target.value
                                    );
                                    if (selectedWallet) setWallet(selectedWallet);
                                }}
                            >
                                <option value="">No wallet selected</option>
                                {wallets.map((w, index) => (
                                    <option key={w.getAddress().toString()} value={w.getAddress().toString()}>
                                        Wallet {index + 1} ({w.getAddress().toString().slice(0, 6)}...)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            className="btn btn-primary w-full"
                            onClick={handleCreateWallet}
                            disabled={isCreatingWallet || !pxe}
                        >
                            {isCreatingWallet ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    Creating Wallet...
                                </>
                            ) : (
                                'Create New Wallet'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Persona Selector */}
            <div className="form-control w-full">
                <label className="label">
                    <span className="label-text">Select Persona</span>
                </label>
                <select
                    className="select select-bordered w-full"
                    value={selectedPersona.id}
                    onChange={(e) => {
                        const persona = config.personas.find(p => p.id === e.target.value);
                        if (persona) setSelectedPersona(persona);
                    }}
                >
                    {config.personas.map(persona => (
                        <option key={persona.id} value={persona.id}>
                            {persona.displayName}
                        </option>
                    ))}
                </select>
            </div>

            {/* Dynamic Screens */}
            <div className="space-y-4">
                {selectedPersona.screens.map(screen => {
                    switch (screen.type) {
                        // case 'connect_wallet':
                        //     return (
                        //         <div key={screen.id} className="card bg-base-200">
                        //             <div className="card-body">
                        //                 <h3 className="card-title">{screen.props.prompt}</h3>
                        //                 <button
                        //                     className="btn btn-primary"
                        //                     disabled={!wallet}
                        //                 >
                        //                     {wallet ? 'Wallet Connected' : 'No Wallet Selected'}
                        //                 </button>
                        //             </div>
                        //         </div>
                        //     );

                        case 'panel':
                            return (
                                <div key={screen.id} className="card bg-base-200">
                                    <div className="card-body">
                                        <h3 className="card-title">{screen.title}</h3>
                                        <div className="space-y-4">
                                            {screen.components.map(component => {
                                                switch (component.type) {
                                                    case 'button':
                                                        // Skip deployContract actions and constructor function calls
                                                        if (component.action.type === 'deployContract' ||
                                                            (component.action.type === 'invokeFunction' &&
                                                                component.action.function === 'constructor')) {
                                                            return null;
                                                        }
                                                        return (
                                                            <button
                                                                key={component.id}
                                                                className="btn btn-primary w-full"
                                                                disabled={!wallet}
                                                                onClick={() => {
                                                                    if (component.action.type === 'invokeFunction') {
                                                                        console.log('Invoking function:', component.action.function);
                                                                    }
                                                                }}
                                                            >
                                                                {component.label}
                                                            </button>
                                                        );

                                                    case 'numeric_display':
                                                        return (
                                                            <div key={component.id} className="stat">
                                                                <div className="stat-title">{component.label}</div>
                                                                <div className="stat-value">0</div>
                                                            </div>
                                                        );

                                                    case 'toggle':
                                                        return (
                                                            <div key={component.id} className="form-control">
                                                                <label className="label cursor-pointer">
                                                                    <span className="label-text">{component.label}</span>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="toggle toggle-primary"
                                                                        defaultChecked={component.default}
                                                                    />
                                                                </label>
                                                            </div>
                                                        );

                                                    default:
                                                        return null;
                                                }
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );

                        case 'form':
                            return (
                                <div key={screen.id} className="card bg-base-200">
                                    <div className="card-body">
                                        <h3 className="card-title">{screen.title}</h3>
                                        <div className="space-y-4">
                                            {screen.components.map(component => {
                                                switch (component.type) {
                                                    case 'choice_selector':
                                                        return (
                                                            <div key={component.id} className="form-control">
                                                                <label className="label">
                                                                    <span className="label-text">{component.label}</span>
                                                                </label>
                                                                <select className="select select-bordered w-full">
                                                                    {component.options.map(option => (
                                                                        <option key={option.value} value={option.value}>
                                                                            {option.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        );

                                                    case 'button':
                                                        // Skip deployContract actions and constructor function calls
                                                        if (component.action.type === 'deployContract' ||
                                                            (component.action.type === 'invokeFunction' &&
                                                                component.action.function === 'constructor')) {
                                                            return null;
                                                        }
                                                        return (
                                                            <button
                                                                key={component.id}
                                                                className="btn btn-primary w-full"
                                                                disabled={!wallet}
                                                                onClick={() => {
                                                                    if (component.action.type === 'invokeFunction') {
                                                                        console.log('Invoking function:', component.action.function)

                                                                        if (!deployedContract) {
                                                                            toast.error('No contract deployed');
                                                                            return;
                                                                        } else if (!wallet) {
                                                                            toast.error('No wallet selected');
                                                                            return;
                                                                        }

                                                                        callContractFunction(deployedContract, wallet, component.action.function, [0]).then(() => {
                                                                            toast.success('Function invoked');
                                                                        }).catch((error) => {
                                                                            toast.error('Failed to invoke function');
                                                                            console.error(error);
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                {component.label} 237
                                                            </button>
                                                        );

                                                    default:
                                                        return null;
                                                }
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );

                        case 'dashboard':
                            return (
                                <div key={screen.id} className="card bg-base-200">
                                    <div className="card-body">
                                        <h3 className="card-title">{screen.title}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {screen.components.map(component => {
                                                switch (component.type) {
                                                    case 'numeric_display':
                                                        return (
                                                            <div key={component.id} className="stat bg-base-100 rounded-box">
                                                                <div className="stat-title">{component.label}</div>
                                                                <div className="stat-value">0</div>
                                                            </div>
                                                        );

                                                    case 'bar_chart':
                                                        return (
                                                            <div key={component.id} className="col-span-2">
                                                                <div className="h-32 bg-base-100 rounded-box flex items-end justify-around p-4">
                                                                    <div className="w-1/3 h-1/2 bg-primary rounded-t"></div>
                                                                    <div className="w-1/3 h-1/4 bg-secondary rounded-t"></div>
                                                                </div>
                                                            </div>
                                                        );

                                                    default:
                                                        return null;
                                                }
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );

                        case 'screen':
                            return (
                                <div key={screen.id} className="card bg-base-200">
                                    <div className="card-body">
                                        <h3 className="card-title">{screen.title}</h3>
                                        <div className="space-y-4">
                                            {screen.components.map(component => {
                                                switch (component.type) {
                                                    case 'text':
                                                        return (
                                                            <p key={component.id}>{component.content}</p>
                                                        );

                                                    case 'tx_details':
                                                        return (
                                                            <div key={component.id} className="bg-base-100 p-4 rounded-box">
                                                                <pre className="text-sm">Transaction details will appear here</pre>
                                                            </div>
                                                        );

                                                    default:
                                                        return null;
                                                }
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );

                        case 'link_list':
                            return (
                                <div key={screen.id} className="card bg-base-200">
                                    <div className="card-body">
                                        <h3 className="card-title">{screen.title}</h3>
                                        <div className="space-y-2">
                                            {screen.items.map((item, index) => (
                                                <a
                                                    key={index}
                                                    href={item.urlTemplate.replace('{{contractAddress}}', '0x123...')}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="link link-primary block"
                                                >
                                                    {item.label}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );

                        default:
                            return null;
                    }
                })}
            </div>
        </div>
    );
}