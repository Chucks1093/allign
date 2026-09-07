import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <ChatHeader />
          <ScrollArea className="flex-1 min-h-0">{children}</ScrollArea>
        </div>
      </div>
    </TooltipProvider>
  );
}
