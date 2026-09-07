import AgentView from "@/components/agent/AgentView";

export default function AgentPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="px-6 pt-8 pb-2">
        <h1 className="text-2xl font-bold text-white">Agent</h1>
        <p className="text-sm text-white/40 mt-1">Your autonomous trading agent on Base</p>
      </div>
      <AgentView />
    </div>
  );
}
