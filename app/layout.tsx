import type { Metadata } from "next";
import { Inter, Manrope, Space_Grotesk, Montserrat } from "next/font/google";
import WagmiProvider from "@/components/providers/WagmiProvider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Allign — AI-powered stock trading on Base",
  description: "Buy tokenized US stocks with AI. Available to non-US users on Base.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${spaceGrotesk.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0d0d0d] text-white font-[var(--font-inter)]">
        <WagmiProvider>
          {children}
        </WagmiProvider>
        <Toaster position="bottom-center" toastOptions={{ style: { background: "#1a1a1a", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" } }} />
      </body>
    </html>
  );
}
