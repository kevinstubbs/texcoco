// app/page.tsx
'use client';

import { useState } from "react";

export default function HomePage() {
  const [prompt, setPrompt] = useState('Generate a contract where users can vote YES or NO on a proposal, and they should only be granted one vote each');

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Hero Section */}
      <section className="max-w-[1280px] w-full mx-auto px-6 py-20 text-center bg-gradient-to-b from-white to-gray-50">
        <h1 className="text-5xl font-extrabold mb-4">
          <span>Protovibe Aztec Contracts</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Instantly create Aztec Contracts with natural language
        </p>
        <div className="mt-8 w-full">
          <textarea className="w-full" placeholder='Generate a voting contract' value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>
        <div>
          <button className="btn btn-soft btn-primary">Generate</button>
        </div>
      </section>

      {/* Templates Section */}
      {/* <section className="px-6 py-16 bg-white">
        <h2 className="text-3xl font-semibold text-center mb-12">Start From a Template</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {TEMPLATES.map(template => (
            <div key={template.title} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition">
              <Image
                src={template.image}
                alt={template.title}
                width={600}
                height={400}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-bold text-lg">{template.title}</h3>
                <p className="text-sm text-gray-500">{template.description}</p>
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
//     image: '/images/template-landing.png', // You should create placeholder images or use real ones
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
