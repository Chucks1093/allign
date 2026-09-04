"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ChatHeader from "./ChatHeader";
import EmptyChat from "./EmptyChat";
import ChatMessages from "./ChatMessages";

export default function ChatArea() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";
  const hasMessages = messages.length > 0;

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0d0d0d] overflow-hidden">
      <ChatHeader />
      {hasMessages ? (
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
        />
      ) : (
        <EmptyChat
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
        />
      )}
    </div>
  );
}
