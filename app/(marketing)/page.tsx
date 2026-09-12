import Link from "next/link";
import Image from "next/image";
import { Gift } from "lucide-react";
import { Manrope } from "next/font/google";
import { GradientBackground } from "@/components/GradientBackground";

const manrope = Manrope({
   subsets: ["latin"],
   weight: ["400", "500", "600", "700", "800"],
});

export default function LandingPage() {
   return (
      <div
         className={`min-h-screen bg-transparent text-white flex flex-col overflow-hidden ${manrope.className} justify-center`}
      >
         <GradientBackground />
         {/* Noise texture overlay */}
         <div
            className="fixed inset-0 pointer-events-none opacity-[0.3]"
            style={{ backgroundImage: "url('/images/noise.png')" }}
         />

         {/* Top-left logo + name */}
         <div className="fixed top-6 left-6 z-20 flex items-center gap-2">
            <Image
               src="/logo.svg"
               className="invert-20"
               alt="allign"
               width={25}
               height={25}
            />
            <span
               className={`text-white/90 font-semibold font-space-grotesk text-xl tracking-tight `}
            >
               Allign
            </span>
         </div>

         <div className="relative z-10 flex flex-col items-center text-center px-6 bottom-8 ">
            {/* Logo icon */}
            <div
               className="w-16 h-16 rounded-2xl bg-[#ffffff] flex items-center justify-center shadow-lg mb-12 animate-fade-up"
               style={{ animationDelay: "0ms" }}
            >
               <Image
                  src="/logo.svg"
                  className="invert"
                  alt="allign"
                  width={36}
                  height={36}
               />
            </div>

            {/* Social proof badge */}
            <div
               className="inline-flex items-center gap-3 bg-[#141414] border border-white/10 rounded-full pl-2 pr-2 py-1.5 mb-4 animate-fade-up"
               style={{ animationDelay: "100ms" }}
            >
               {/* Avatar stack */}
               <div className="flex -space-x-2">
                  {[
                     "/icons/stocks/nvidia.svg",
                     "/icons/stocks/apple.svg",
                     "/icons/stocks/amazon.svg",
                     "/icons/stocks/google.svg",
                  ].map((src) => (
                     <div
                        key={src}
                        className="w-9 h-9 rounded-full bg-white border-2 border-[#141414] flex items-center justify-center overflow-hidden"
                     >
                        <Image src={src} alt="" width={24} height={24} />
                     </div>
                  ))}
                  <div className="w-9 h-9 rounded-full bg-white border-2 border-[#141414] flex items-center justify-center">
                     <span className="text-black text-xs font-bold">+9</span>
                  </div>
               </div>
               <Link
                  href="/claim"
                  className="flex items-center gap-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm px-4 py-1.5 rounded-full transition-colors"
               >
                  Claim Gift <Gift size={13} />
               </Link>
            </div>

            {/* Headline */}
            <h1
               style={{ animationDelay: "200ms" }}
               className={`text-[3.5rem] font-medum leading-[1.2] tracking-tight mb-6 max-w-4xl font-manrope animate-fade-up`}
            >
               Make smart investment decisions without watching the market.
            </h1>

            {/* Subtitle */}
            <p
               className="text-base md:text-lg text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up"
               style={{ animationDelay: "300ms" }}
            >
               Buy tokenized stocks, send them to friends, earn them as rewards,
               and set AI agents to manage your investment strategy.
            </p>

            {/* CTAs */}
            <div
               className="animate-fade-up"
               style={{ animationDelay: "400ms" }}
            >
               <Link
                  href="/claim"
                  className="flex items-center gap-2 bg-white hover:bg-white/90 text-black font-bold px-12 py-3.5 rounded-xl text-lg transition-colors font-space-grotesk "
               >
                  Start investing
               </Link>
            </div>
         </div>
      </div>
   );
}
