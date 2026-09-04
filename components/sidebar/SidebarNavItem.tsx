"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  href?: string;
}

export default function SidebarNavItem({ icon: Icon, label, href }: SidebarNavItemProps) {
  const pathname = usePathname();
  const active = href ? pathname === href : false;

  const classes = cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left cursor-pointer",
    active ? "bg-white/15 text-white" : "text-white hover:bg-white/10"
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        <Icon size={16} className="shrink-0 opacity-80" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button className={classes}>
      <Icon size={16} className="shrink-0 opacity-80" />
      <span>{label}</span>
    </button>
  );
}
