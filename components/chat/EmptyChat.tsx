"use client";

import { Plus, Brain, Mic, ArrowUp } from "lucide-react";

interface EmptyChatProps {
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
}

export default function EmptyChat({ input, onInputChange, onSend }: EmptyChatProps) {
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 pb-8">
      <h1 className="text-white text-2xl font-semibold mb-8 tracking-tight">
        What's on your mind today?
      </h1>

      <div className="w-full max-w-2xl bg-[#1a1a1a] rounded-2xl px-4 py-3 flex items-center gap-3">
        <button type="button" className="text-white/50 hover:text-white transition-colors shrink-0">
          <Plus size={20} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Ask anything"
          className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm outline-none"
        />

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs font-medium transition-colors px-1">
            <Brain size={15} />
            <span>Think</span>
          </button>
          <button type="button" className="text-white/50 hover:text-white transition-colors">
            <Mic size={18} />
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ArrowUp size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
