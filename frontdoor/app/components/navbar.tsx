'use client'

import { useEffect, useState } from "react";
import { getNodeInfo } from "../utils/aztec";
import Link from "next/link";
import { FaHeartbeat } from "react-icons/fa";
import { FaGear } from "react-icons/fa6";
import classNames from "classnames";

export const Navbar = () => {
    const [nodeInfo, setNodeInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getNodeInfo().then(result => {
            setNodeInfo(result);
            setLoading(false);
        });
    }, []);

    const connectionStatus = loading ? 'Loading...' : nodeInfo?.status === 'connected' ? 'Connected' : 'Disconnected';

    return (
        <div className="navbar bg-base-100 shadow-lg">
            <div className="flex-1">
                <Link href="/" className="btn btn-ghost text-xl font-bebas-neue">Texcoco</Link>
            </div>
            <div className="flex flex-row flex-none gap-2">
                {nodeInfo?.status === 'connected' ?
                    <div className="flex items-center gap-4 pr-2">
                        <div className="text-sm font-mono">
                            Chain ID: {nodeInfo.l1ChainId}
                        </div>
                    </div> : null}

                <div className={classNames("flex flex-row gap-2 items-center ring-2 rounded-lg px-2 w-40 items-center justify-center", {
                    "ring-red-400": nodeInfo?.status === 'disconnected',
                    "ring-green-400": nodeInfo?.status === 'connected',
                    "ring-grey-200": nodeInfo?.status === 'loading',
                })}>
                    <div className="inline-grid *:[grid-area:1/1]">
                        <div className={classNames("status", {
                            "status-error animate-ping": nodeInfo?.status === 'disconnected',
                            "status-success animate-ping": nodeInfo?.status === 'connected',
                            "status-neutral": nodeInfo?.status === 'loading',
                        })}></div>
                        <div className={classNames("status", {
                            "status-error": nodeInfo?.status === 'disconnected',
                            "status-success": nodeInfo?.status === 'connected',
                            "status-neutral": nodeInfo?.status === 'loading',
                        })}></div>
                    </div>
                    <div>{connectionStatus}</div>
                </div>

                <div className="flex gap-2">
                    <a
                        href="/health"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm hover:text-red-500"
                    >
                        <FaHeartbeat className="text-xl" />
                    </a>
                    <a
                        href="/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm hover:text-primary"
                    >
                        <FaGear className="text-xl" />
                    </a>
                </div>
            </div>
        </div>
    );
}
