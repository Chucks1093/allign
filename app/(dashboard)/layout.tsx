"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatHeader from "@/components/chat/ChatHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
   const [sidebarOpen, setSidebarOpen] = useState(false);
   const { ready } = usePrivy();

   if (!ready) {
      return (
         <div className="flex h-dvh items-center justify-center bg-[#0d0d0d]">
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
         </div>
      );
   }

   return (
      <TooltipProvider>
         <div className="flex h-dvh overflow-hidden">
            <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
            <div
               className="flex flex-col flex-1 overflow-hidden relative"
               style={{
                  background:
                     "linear-gradient(to bottom, rgba(37,99,235,0.4) 0%, rgba(37,99,235,0.15) 35%, #0d0d0d 65%)",
               }}
            >
               <div
                  className="absolute inset-0 pointer-events-none opacity-[0.3] z-0"
                  style={{ backgroundImage: "url('/images/noise.png')" }}
               />
               <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
                  <ChatHeader onMenuClick={() => setSidebarOpen(true)} />
                  <div className="flex-1 min-h-0 overflow-hidden">
                     {children}
                  </div>
               </div>
            </div>
         </div>
      </TooltipProvider>
   );
}
