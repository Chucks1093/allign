"use client";

import { usePathname } from "next/navigation";
import {
   MessageCircle,
   Globe,
   BriefcaseBusiness,
   Gift,
   Clock5,
   Menu,
   type LucideIcon,
} from "lucide-react";
import WalletDropdown from "@/components/header/WalletDropdown";
import AgentStatusBadge from "@/components/header/AgentStatusBadge";

const ROUTES: Record<string, { title: string; icon: LucideIcon }> = {
   "/app": { title: "Chat", icon: MessageCircle },
   "/app/explore": { title: "Stocks", icon: Globe },
   "/app/portfolio": { title: "Portfolio", icon: BriefcaseBusiness },
   "/app/activity": { title: "Activity", icon: Clock5 },
   "/app/gift": { title: "Gift", icon: Gift },
};

function usePageInfo() {
   const pathname = usePathname();
   if (ROUTES[pathname]) return ROUTES[pathname];
   const match = Object.keys(ROUTES)
      .sort((a, b) => b.length - a.length)
      .find((key) => pathname.startsWith(key + "/"));
   return match ? ROUTES[match] : { title: "", icon: MessageCircle };
}

export default function ChatHeader({ onMenuClick }: { onMenuClick?: () => void }) {
   const { title, icon: Icon } = usePageInfo();

   return (
      <div className="flex items-center justify-between gap-2 px-5 py-3 bg-transparent shrink-0">
         <div className="flex items-center gap-2">
            {/* Hamburger — mobile only */}
            <button
               onClick={onMenuClick}
               className="md:hidden text-white/60 hover:text-white transition-colors cursor-pointer mr-1"
            >
               <Menu size={22} />
            </button>
            <Icon size={20} className="text-white" />
            <span className="text-white font-bold text-xl font-manrope">{title}</span>
         </div>

         <div className="flex items-center gap-2">
            <AgentStatusBadge />
            <WalletDropdown />
         </div>
      </div>
   );
}
