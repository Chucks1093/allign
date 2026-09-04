import { Share2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatHeader() {
  return (
    <div className="flex items-center justify-end px-6 py-3 bg-[#0d0d0d] shrink-0">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white hover:bg-white/10 gap-2 text-sm"
        >
          <Share2 size={17} />
          Share
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white hover:bg-white/10 w-9 h-9"
        >
          <MoreHorizontal size={19} />
        </Button>
      </div>
    </div>
  );
}
