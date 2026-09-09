import { ScrollArea } from "@/components/ui/scroll-area";
import AgentView from "@/components/agent/AgentView";

export default function ActivityPage() {
  return (
    <ScrollArea className="h-full">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <AgentView />
      </div>
    </ScrollArea>
  );
}
