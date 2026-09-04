"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function SidebarNavItem({ icon: Icon, label, active, onClick }: SidebarNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left",
        active
          ? "bg-white/15 text-white"
          : "text-white hover:bg-white/10"
      )}
    >
      <Icon size={16} className="shrink-0 opacity-80" />
      <span>{label}</span>
    </button>
  );
}
