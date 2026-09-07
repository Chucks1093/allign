import GiftView from "@/components/gift/GiftView";

export default function GiftPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-6 pt-8 pb-2">
        <h1 className="text-2xl font-bold text-white">Send a Gift</h1>
        <p className="text-sm text-white/40 mt-1">Transfer tokenized stocks to any wallet on Base</p>
      </div>
      <GiftView />
    </div>
  );
}
