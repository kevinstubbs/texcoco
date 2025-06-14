import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "./components/navbar";
import ExtensionErrorFilter from "./components/extension-error-filter";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <div className="min-h-screen bg-base-100 flex flex-col">
          <ExtensionErrorFilter />
          <Navbar />
          <div className="flex-1 flex">{children}</div>
        </div>
      </body>
    </html>
  );
}
