import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Navbar } from "./components/navbar";
import ExtensionErrorFilter from "./components/extension-error-filter";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });
const bebasNeue = Bebas_Neue({ 
    weight: '400',
    subsets: ['latin'],
    variable: '--font-bebas-neue',
});

export const metadata: Metadata = {
  title: "Texcoco",
  description: "Texcoco - Aztec Sandbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${inter.className} ${bebasNeue.variable}`}>
        <div className="min-h-screen bg-base-100 flex flex-col">
          <ExtensionErrorFilter />
          <Navbar />
          <div className="flex-1 flex">{children}</div>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
