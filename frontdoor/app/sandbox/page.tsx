'use client';

import { useEffect, useState } from "react";
import { createPXEClient, PXE } from "@aztec/aztec.js";

const { PXE_URL = "http://localhost:8080" } = process.env;

async function showAccounts(pxe: PXE) {
    const accounts = await pxe.getRegisteredAccounts();
    console.log(`User accounts:\n${accounts.map((a) => a.address).join("\n")}`);
    return accounts;
}

async function main() {
    try {
        const pxe = await createPXEClient(PXE_URL);
        const { l1ChainId } = await pxe.getNodeInfo();
        console.log(`Connected to chain ${l1ChainId}`);

        try {
            const accounts = await showAccounts(pxe);
            return { l1ChainId, accounts };
        }
        catch (e) {
            console.error(e);
            return {
                l1ChainId,
                accounts: null
            }
        }

    }
    catch (e) {
        console.error(e);
        return {
            error: 'Aztec Sandbox not connected'
        }
    }
}

export default function Home() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        main().then(result => {
            setData(result);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <div className="hero min-h-screen bg-base-200">
                <div className="hero-content text-center">
                    <div className="max-w-md">
                        <h1 className="text-5xl font-bold">Texcoco</h1>
                        <p className="py-6">Aztec Sandbox Interface</p>
                        
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title">Sandbox Status</h2>
                                <pre className="text-left overflow-x-auto">
                                    {JSON.stringify(data, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <div className="flex gap-4 justify-center mt-8">
                            <a href="https://docs.aztec.network" 
                               className="btn btn-primary"
                               target="_blank"
                               rel="noopener noreferrer">
                                Aztec Docs
                            </a>
                            <a href="https://github.com/AztecProtocol/aztec-packages" 
                               className="btn btn-secondary"
                               target="_blank"
                               rel="noopener noreferrer">
                                GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
