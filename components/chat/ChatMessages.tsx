"use client";

import { useEffect, useRef } from "react";
import { UIMessage } from "@ai-sdk/react";
import { Plus, Brain, Mic, ArrowUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
}

export default function ChatMessages({
  messages,
  isLoading,
  input,
  onInputChange,
  onSend,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="px-8 py-8 space-y-6 max-w-3xl mx-auto">
          {messages.map((msg) => {
            const text = msg.parts
              .filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("");

            return msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[70%] bg-[#2f2f2f] text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
                  {text}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <p className="max-w-[80%] text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {text}
                </p>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-1 pt-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Persistent input bar */}
      <div className="px-4 pb-6 pt-2 flex justify-center">
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
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ArrowUp size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
