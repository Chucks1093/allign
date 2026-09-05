import PortfolioView from "@/components/portfolio/PortfolioView";

export default function PortfolioPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-6 pt-8 pb-2">
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <p className="text-sm text-white/40 mt-1">Your tokenized stock holdings on Base</p>
      </div>
      <PortfolioView />
    </div>
  );
}
