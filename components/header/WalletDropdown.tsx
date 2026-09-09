"use client";

import { useEffect, useState } from "react";
import makeBlockie from "ethereum-blockies-base64";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectBaseWallet } from "@/hooks/useConnectBaseWallet";
import { createPublicClient, http, erc20Abi } from "viem";
import { base } from "viem/chains";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const publicClient = createPublicClient({ chain: base, transport: http() });

function useUsdcBalance(address?: string) {
   const [balance, setBalance] = useState<string | null>(null);

   useEffect(() => {
      if (!address) return;
      publicClient
         .readContract({
            address: USDC,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
         })
         .then((raw) => setBalance((Number(raw) / 1e6).toFixed(2)))
         .catch(() => setBalance(null));
   }, [address]);

   return balance;
}
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
   EyeOff,
   LogOut,
   MoreHorizontal,
   Copy,
   Wallet,
   Loader2,
   ExternalLink,
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

function Blockie({
   address,
   size = 32,
   badgeBorder = "border-[3px]",
}: {
   address: string;
   size?: number;
   badgeBorder?: string;
}) {
   return (
      <div className="relative inline-flex shrink-0">
         <Image
            src={makeBlockie(address)}
            alt="wallet avatar"
            width={size}
            height={size}
            className="rounded-full"
            unoptimized
         />
         <Image
            src="/icons/base.svg"
            alt="Base"
            width={Math.round(size * 0.53)}
            height={Math.round(size * 0.53)}
            className={`absolute -bottom-0.5 -right-0.5 ${badgeBorder} rounded border-white/80`}
         />
      </div>
   );
}

function shortAddress(addr: string) {
   return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletDropdown() {
   const { address, isConnected } = useAccount();
   const { disconnect } = useDisconnect();
   const { connect, isConnecting } = useConnectBaseWallet();
   const usdcBalance = useUsdcBalance(address);

   if (!isConnected || !address) {
      return (
         <button
            onClick={connect}
            disabled={isConnecting}
            className="flex items-center gap-2 bg-[#1c1c1c] hover:bg-[#2a2a2a] rounded-full px-4 py-2 text-sm text-white/70 font-medium transition-colors cursor-pointer disabled:opacity-50"
         >
            {isConnecting ? (
               <Loader2 size={15} className="animate-spin text-white/50" />
            ) : (
               <Wallet size={15} className="text-white/50" />
            )}
            {isConnecting ? "Connecting…" : "Connect Wallet"}
         </button>
      );
   }

   const display = shortAddress(address);

   return (
      <DropdownMenu>
         <DropdownMenuTrigger className="flex items-center gap-2 bg-[#1c1c1c] hover:bg-[#2a2a2a] rounded-full pl-2 pr-4 py-2 transition-colors outline-none cursor-pointer">
            <Blockie address={address} size={26} badgeBorder="border-[2.7px]" />
            <span className="text-sm text-white/60 font-medium">{display}</span>
            <MoreHorizontal size={15} className="text-white/40 ml-0.5" />
         </DropdownMenuTrigger>

         <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-64 bg-[#1a1a1a] border border-white/10 text-white rounded-2xl p-2 shadow-xl"
         >
            <div className="bg-[#2a2a2a] rounded-xl px-3 py-3 mb-2 flex items-center gap-3">
               <Blockie address={address} size={40} />
               <div>
                  <p className="text-sm font-semibold text-white">{display}</p>
                  <p className="text-xs text-white/50 mt-0.5">
                     {usdcBalance !== null
                        ? `$${usdcBalance} USDC`
                        : "Base Mainnet"}
                  </p>
               </div>
            </div>

            <DropdownMenuItem
               onClick={() => {
                  navigator.clipboard.writeText(address);
                  toast.success("Address copied!");
               }}
               className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white"
            >
               <Copy size={16} className="text-white/50" />
               Copy Address
            </DropdownMenuItem>

            <DropdownMenuItem
               onClick={() => {
                  const w = 460,
                     h = 600;
                  const left = window.screenX + (window.innerWidth - w) / 2;
                  const top = window.screenY + (window.innerHeight - h) / 2;
                  window.open(
                     "https://keys.coinbase.com",
                     "CoinbaseWallet",
                     `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`,
                  );
               }}
               className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white"
            >
               <ExternalLink size={16} className="text-white/50" />
               Open Wallet
            </DropdownMenuItem>

            <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white">
               <EyeOff size={16} className="text-white/50" />
               Hide Balances
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
