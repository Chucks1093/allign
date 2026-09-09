import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatHeader from "@/components/chat/ChatHeader";

export default function DashboardLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <TooltipProvider>
         <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div
               className="flex flex-col flex-1 overflow-hidden relative"
               style={{
                  background:
                     "linear-gradient(to bottom, rgba(37,99,235,0.4) 0%, rgba(37,99,235,0.15) 35%, #0d0d0d 65%)",
               }}
            >
               {/* Noise overlay */}
               <div
                  className="absolute inset-0 pointer-events-none opacity-[0.3] z-0"
                  style={{ backgroundImage: "url('/images/noise.png')" }}
               />
               <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
                  <ChatHeader />
                  <div className="flex-1 min-h-0 overflow-hidden">
                     {children}
                  </div>
               </div>
            </div>
         </div>
      </TooltipProvider>
   );
}
