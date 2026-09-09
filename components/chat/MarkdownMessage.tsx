"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="w-full py-0.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="text-base font-medium leading-relaxed text-white mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic text-white">{children}</em>,
          h1: ({ children }) => <p className="text-lg font-semibold text-white mt-5 mb-2">{children}</p>,
          h2: ({ children }) => <p className="text-[17px] font-semibold text-white mt-5 mb-2">{children}</p>,
          h3: ({ children }) => <p className="text-base font-semibold text-white mt-4 mb-1.5">{children}</p>,
          ul: ({ children }) => <ul className="text-base font-medium text-white mb-3 last:mb-0 pl-5 space-y-1.5 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="text-base font-medium text-white mb-3 last:mb-0 pl-5 space-y-1.5 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="text-base font-medium text-white leading-relaxed">{children}</li>,
          code: ({ children, className }) =>
            className?.includes("language-")
              ? <code className="block text-sm font-mono text-white bg-white/6 border border-white/8 rounded-lg px-3 py-2 my-2 overflow-x-auto whitespace-pre">{children}</code>
              : <code className="text-sm font-mono text-white bg-white/10 px-1.5 py-0.5 rounded">{children}</code>,
          pre: ({ children }) => <div className="my-2 w-full overflow-hidden">{children}</div>,
          hr: () => <div className="border-t border-white/10 my-3" />,
          a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">{children}</a>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
