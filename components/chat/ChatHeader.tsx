import { Bell } from "lucide-react";
import WalletDropdown from "@/components/header/WalletDropdown";

export default function ChatHeader() {
  return (
    <div className="flex items-center justify-end gap-2 px-5 py-3 bg-[#0d0d0d] shrink-0">
      {/* Bell pill */}
      <button className="relative flex items-center justify-center bg-[#1c1c1c] rounded-full w-10 h-10 hover:bg-[#2a2a2a] transition-colors cursor-pointer">
        <Bell size={20} className="text-white/70" />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      </button>

      {/* Wallet pill */}
      <WalletDropdown />
    </div>
  );
}
