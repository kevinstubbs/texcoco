// app/page.tsx
'use client';
import { useRouter } from 'next/navigation';

import { useState } from "react";

export default function HomePage() {
  const [prompt, setPrompt] = useState('Generate a contract where users can vote YES or NO on a proposal, and they should only be granted one vote each');
  const router = useRouter();

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ prompt })
    if (prompt.trim()) {
      router.push(`/workbench?prompt=${encodeURIComponent(prompt.trim())}`);
    }
  };

  return (
    <main className="min-h-screen bg-base-100 text-base-content font-sans w-full bg-linear-to-b from-base-100 to-base-200">
      {/* Hero Section */}
      <section className="max-w-[1280px] w-full mx-auto px-6 py-20 text-center ">
        <h1 className="text-5xl font-extrabold mb-4">
          <span>Protovibe Aztec Contracts</span>
        </h1>
        <p className="text-xl text-base-content/70 max-w-2xl mx-auto">
          Instantly create Aztec Contracts with natural language
        </p>
        <div className="mt-8 w-full">
          <textarea 
            className="textarea textarea-bordered w-full bg-base-200" 
            placeholder='Generate a voting contract' 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
          />
        </div>
        <div>
          <button 
            onClick={handleGenerate} 
            disabled={!prompt.trim()} 
            className="btn btn-primary mt-4"
          >
            Generate
          </button>
        </div>
      </section>

      {/* Templates Section */}
      {/* <section className="px-6 py-16 bg-base-100">
        <h2 className="text-3xl font-semibold text-center mb-12">Start From a Template</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {TEMPLATES.map(template => (
            <div key={template.title} className="card bg-base-200 shadow-xs hover:shadow-md transition">
              <figure>
                <Image
                  src={template.image}
                  alt={template.title}
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover"
                />
              </figure>
              <div className="card-body">
                <h3 className="card-title">{template.title}</h3>
                <p className="text-base-content/70">{template.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section> */}
    </main>
  );
}

// const TEMPLATES = [
//   {
//     title: 'Landing Page',
//     description: 'Perfect for product launches and waitlists.',
//     image: '/images/template-landing.png',
//   },
//   {
//     title: 'Dashboard App',
//     description: 'Build internal tools and admin panels easily.',
//     image: '/images/template-dashboard.png',
//   },
//   {
//     title: 'Portfolio Website',
//     description: 'Showcase your work or personal brand.',
//     image: '/images/template-portfolio.png',
//   },
// ];
