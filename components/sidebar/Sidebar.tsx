"use client";

import {
   MessageCircle,
   Globe,
   Gift,
   BriefcaseBusiness,
   Clock5,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import SidebarNavItem from "./SidebarNavItem";

const NAV_ITEMS = [
   { icon: MessageCircle, label: "Chat", href: "/app" },
   { icon: Globe, label: "Stocks", href: "/app/explore" },
   { icon: BriefcaseBusiness, label: "Portfolio", href: "/app/portfolio" },
   { icon: Gift, label: "Gifts", href: "/app/gift" },
   { icon: Clock5, label: "Activity", href: "/app/activity" },
];

export default function Sidebar() {
   return (
      <aside className="flex flex-col w-[260px] shrink-0 h-full bg-[#0d0d0d] border-r border-white/10">
         <Link
            href="/app"
            className="flex items-center gap-2.5 px-3.5 pt-6 pb-6"
         >
            <div className="w-9 h-9 rounded-md bg-white/90 flex items-center justify-center shrink-0">
               <Image
                  src="/logo.svg"
                  alt="allign"
                  width={22}
                  height={22}
                  className="invert"
               />
            </div>
            <span
               className={`font-montserrat text-white/90 font-semibold text-[1.6rem] tracking-tight`}
            >
               Allign
            </span>
         </Link>

         <nav className="px-3 mt-1 space-y-1">
            {NAV_ITEMS.map((item) => (
               <SidebarNavItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
               />
            ))}
         </nav>

         <div className="flex-1" />

         <div className="px-3 py-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center space-y-2.5">
               <Image src="/icons/gift.svg" alt="Gift" width={67} height={67} />
               <p className="text-lg font-semibold text-white font-montserrat">
                  Send Gift
               </p>
               <p className="text-sm text-white/50 leading-relaxed mb-6">
                  Send stocks as gifts to anyone instantly.
               </p>
               <Link
                  href="/app/gift"
                  className="w-full flex items-center justify-center text-xs font-semibold bg-white/80 hover:bg-white/90 text-black py-2 rounded-xl transition-colors"
               >
                  Gift a Stock
               </Link>
            </div>
         </div>
      </aside>
   );
}
