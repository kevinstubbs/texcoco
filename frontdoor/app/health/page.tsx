'use client';

import { useEffect, useState } from "react";
import { getNodeInfo } from "../utils/aztec";


export default function SandboxHealth() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getNodeInfo().then(result => {
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
            <div className="hero min-h-screen">
                <div className="hero-content text-center text-primary">
                    <div className="max-w-md">
                        <h1 className="text-5xl font-bold">Sandbox Health</h1>
                        <p className="py-6">Aztec Node Status</p>
                        
                        <div className="card bg-base-100 shadow-xl">
                            <div className="card-body">
                                <h2 className="card-title">Connection Status</h2>
                                <div className="stats shadow">
                                    <div className="stat">
                                        <div className="stat-title">Status</div>
                                        <div className={`stat-value ${data.status === 'connected' ? 'text-success' : 'text-error'}`}>
                                            {data.status}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {data.status === 'connected' && (
                            <>
                                <div className="card bg-base-100 shadow-xl mt-4">
                                    <div className="card-body">
                                        <h2 className="card-title">Node Info</h2>
                                        <div className="stats shadow">
                                            <div className="stat">
                                                <div className="stat-title">Chain ID</div>
                                                <div className="stat-value">{data.l1ChainId}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card bg-base-100 shadow-xl mt-4">
                                    <div className="card-body">
                                        <h2 className="card-title">Connected Accounts</h2>
                                        {data.accounts ? (
                                            <div className="overflow-x-auto">
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th>Address</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {data.accounts.map((account: any, index: number) => (
                                                            <tr key={index}>
                                                                <td className="font-mono">
                                                                    {typeof account.address === 'object' 
                                                                        ? JSON.stringify(account.address)
                                                                        : account.address}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-error">No accounts found</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {data.status === 'error' && (
                            <div className="alert alert-error mt-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{data.error}</span>
                            </div>
                        )}

                        <div className="flex gap-4 justify-center mt-8">
                            <a href="/" 
                               className="btn btn-primary">
                               Start building something
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
