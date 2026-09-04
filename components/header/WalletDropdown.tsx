"use client";

import makeBlockie from "ethereum-blockies-base64";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, EyeOff, Settings, LogOut, MoreHorizontal, Copy } from "lucide-react";

const MOCK_ADDRESS = "0x37f4b3a9c2e1d056f78a9b3c4e2f1d056f78a9b3";
const SHORT_ADDRESS = "0x37...d325";
const ETH_BALANCE = "0 ETH";

function Blockie({ address, size = 32 }: { address: string; size?: number }) {
  const src = makeBlockie(address);
  return (
    <img
      src={src}
      alt="wallet avatar"
      width={size}
      height={size}
      className="rounded-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}


function copyAddress() {
  navigator.clipboard.writeText(MOCK_ADDRESS);
}

export default function WalletDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 bg-[#1c1c1c] hover:bg-[#2a2a2a] rounded-full pl-2 pr-4 py-2 transition-colors outline-none cursor-pointer">
        <Blockie address={MOCK_ADDRESS} size={26} />
        <span className="text-sm text-white/60 font-medium">{SHORT_ADDRESS}</span>
        <MoreHorizontal size={15} className="text-white/40 ml-0.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 bg-[#1a1a1a] border border-white/10 text-white rounded-2xl p-2 shadow-xl"
      >
        {/* Wallet info card */}
        <div className="bg-[#2a2a2a] rounded-xl px-3 py-3 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Blockie address={MOCK_ADDRESS} size={40} />
            <div>
              <p className="text-sm font-semibold text-white">{SHORT_ADDRESS}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-white/50">{ETH_BALANCE}</span>
              </div>
            </div>
          </div>
          <button
            onClick={copyAddress}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <Copy size={13} />
          </button>
        </div>

        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white">
          <User size={16} className="text-white/50" />
          My Profile
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white">
          <EyeOff size={16} className="text-white/50" />
          Hide Balances
        </DropdownMenuItem>

        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white">
          <Settings size={16} className="text-white/50" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10 my-1" />

        <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer focus:bg-red-500/10 focus:text-red-300">
          <LogOut size={16} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
