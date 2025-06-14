'use client';

import { useAtom } from 'jotai';
import { walletsAtom, selectedWalletAtom } from '../atoms';
import { FaTrash, FaPlus } from 'react-icons/fa';
import { generateAccount } from '../utils/aztec';
import { createPXEClient } from '@aztec/aztec.js';
import { useState } from 'react';

export default function SettingsPage() {
    const [wallets, setWallets] = useAtom(walletsAtom);
    const [selectedWallet, setSelectedWallet] = useAtom(selectedWalletAtom);
    const [isGenerating, setIsGenerating] = useState(false);

    const deleteWallet = (index: number) => {
        const newWallets = wallets.filter((_, i) => i !== index);
        setWallets(newWallets);
        if (selectedWallet === wallets[index]) {
            setSelectedWallet(newWallets[0] || null);
        }
    };

    const clearAllWallets = () => {
        setWallets([]);
        setSelectedWallet(null);
    };

    const handleGenerateWallet = async () => {
        try {
            setIsGenerating(true);
            const pxe = createPXEClient(process.env.NEXT_PUBLIC_PXE_URL || 'http://localhost:8080');
            const newWallet = await generateAccount(pxe);
            setWallets([...wallets, newWallet]);
            setSelectedWallet(newWallet);
        } catch (error) {
            console.error('Failed to generate wallet:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Wallet Settings</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleGenerateWallet}
                        disabled={isGenerating}
                        className="btn btn-primary btn-sm"
                    >
                        {isGenerating ? (
                            <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                            <>
                                <FaPlus className="mr-2" />
                                New Wallet
                            </>
                        )}
                    </button>
                    {wallets.length > 0 && (
                        <button
                            onClick={clearAllWallets}
                            className="btn btn-error btn-sm"
                        >
                            Clear All Wallets
                        </button>
                    )}
                </div>
            </div>

            {wallets.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                    No wallets found. Click "New Wallet" to generate one.
                </div>
            ) : (
                <div className="space-y-4">
                    {wallets.map((wallet, index) => (
                        <div
                            key={index}
                            className="card bg-base-200 shadow-xl"
                        >
                            <div className="card-body">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h2 className="card-title">
                                            Wallet {index + 1}
                                            {wallet === selectedWallet && (
                                                <span className="badge badge-primary ml-2">Selected</span>
                                            )}
                                        </h2>
                                        <p className="font-mono text-sm opacity-70">
                                            {wallet.getAddress().toString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => deleteWallet(index)}
                                        className="btn btn-ghost btn-sm text-error hover:text-error"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
