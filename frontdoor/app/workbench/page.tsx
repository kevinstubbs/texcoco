'use client';

import { useSearchParams } from 'next/navigation';

export default function Workbench() {
    const searchParams = useSearchParams();
    const prompt = searchParams.get('prompt');

    return (
        <div className="p-4 flex-1 bg-base-200">
            <div className="h-full flex flex-col items-center">
                <div className="text-center">
                    <h1 className="text-5xl font-bold mb-6">Workbench</h1>

                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <h2 className="card-title">Seed Prompt</h2>
                            <p className="text-left">{prompt || 'No prompt provided'}</p>
                        </div>
                    </div>
                </div>

                <div className='flex-1'>
                    
                </div>

                <div className="flex gap-4 justify-center mt-8">
                    <a href="/sandbox"
                        className="btn btn-primary">
                        Start on a new idea?
                    </a>
                </div>
            </div>
        </div >
    );
}
