import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { Navbar } from "./components/navbar";
import ExtensionErrorFilter from "./components/extension-error-filter";
import { Toaster } from 'react-hot-toast';
import { Providers } from "./components/providers";

const inter = Inter({ subsets: ["latin"] });
const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
});

export const metadata: Metadata = {
  title: "Texcoco",
  description: "Texcoco - Aztec Sandbox",
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon/favicon.ico',
    apple: '/favicon/apple-touch-icon.png',
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/favicon/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/favicon/android-chrome-512x512.png',
      },
    ],
  },
  manifest: '/favicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${inter.className} ${bebasNeue.variable}`}>
        <Providers>
          <div className="min-h-screen bg-base-100 flex flex-col">
            <ExtensionErrorFilter />
            <Navbar />
            <div className="flex-1 flex">{children}</div>
          </div>
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
