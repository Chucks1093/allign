import Link from "next/link";
import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"], weight: ["700", "800"] });

export default function LandingPage() {
  return (
    <div className={`min-h-screen bg-[#0d0d0d] text-white flex flex-col ${manrope.className}`}>
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-8">
        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
          US stocks.
          <br />
          <span className="text-[#a8ff78]">Onchain. For everyone.</span>
        </h1>

        <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed font-normal">
          Buy tokenized US equities with AI on Base. No broker. No paperwork. Just a wallet.
        </p>

        <Link
          href="/app"
          className="bg-[#a8ff78] hover:bg-[#96f060] text-black font-bold px-8 py-3.5 rounded-full text-base transition-colors"
        >
          Start Investing
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-8 py-5 text-center">
        <span className="text-xs text-white/20">Available to non-US users only · Built on Base · Powered by Coinbase</span>
      </footer>
    </div>
  );
}
