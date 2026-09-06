"use client";

import { useState } from "react";
import makeBlockie from "ethereum-blockies-base64";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectBaseWallet } from "@/hooks/useConnectBaseWallet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, EyeOff, Settings, LogOut, MoreHorizontal, Copy, Wallet, Loader2 } from "lucide-react";

function Blockie({ address, size = 32 }: { address: string; size?: number }) {
  return (
    <img
      src={makeBlockie(address)}
      alt="wallet avatar"
      width={size}
      height={size}
      className="rounded-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletDropdown() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, isConnecting } = useConnectBaseWallet();

  if (!isConnected || !address) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        className="flex items-center gap-2 bg-[#1c1c1c] hover:bg-[#2a2a2a] rounded-full px-4 py-2 text-sm text-white/70 font-medium transition-colors cursor-pointer disabled:opacity-50"
      >
        {isConnecting
          ? <Loader2 size={15} className="animate-spin text-white/50" />
          : <Wallet size={15} className="text-white/50" />
        }
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  const display = shortAddress(address);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 bg-[#1c1c1c] hover:bg-[#2a2a2a] rounded-full pl-2 pr-4 py-2 transition-colors outline-none cursor-pointer">
        <Blockie address={address} size={26} />
        <span className="text-sm text-white/60 font-medium">{display}</span>
        <MoreHorizontal size={15} className="text-white/40 ml-0.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 bg-[#1a1a1a] border border-white/10 text-white rounded-2xl p-2 shadow-xl"
      >
        <div className="bg-[#2a2a2a] rounded-xl px-3 py-3 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Blockie address={address} size={40} />
            <div>
              <p className="text-sm font-semibold text-white">{display}</p>
              <p className="text-xs text-white/50 mt-0.5">Base Mainnet</p>
            </div>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(address)}
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

        <DropdownMenuItem
          onClick={() => disconnect()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer focus:bg-red-500/10 focus:text-red-300"
        >
          <LogOut size={16} />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
