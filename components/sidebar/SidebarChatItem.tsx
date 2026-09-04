"use client";

import { cn } from "@/lib/utils";

interface SidebarChatItemProps {
  title: string;
  active?: boolean;
  onClick?: () => void;
}

export default function SidebarChatItem({ title, active, onClick }: SidebarChatItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors cursor-pointer",
        active
          ? "bg-white/15 text-white font-medium"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      {title}
    </button>
  );
}
