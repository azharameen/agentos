"use client";

import type { Message } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import { CopyToClipboard } from "react-copy-to-clipboard";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkEmoji from "remark-emoji";
import { User } from "lucide-react";

const MarkdownCodeBlock = ({
  node,
  inline,
  className,
  children,
  ...props
}: any) => {
  let code = "";
  if (Array.isArray(children)) {
    code = children
      .map((child) => (typeof child === "string" ? child : ""))
      .join("");
  } else if (typeof children === "string") {
    code = children;
  }
  const language = className ? className.replace("language-", "") : "plaintext";

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${language}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: "relative", marginBottom: "1.5em" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5em",
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 2,
        }}
      >
        <span className="text-xs font-mono bg-border-light px-2 py-1 rounded">
          {language}
        </span>
        <CopyToClipboard text={code}>
          <button
            className="text-xs px-2 py-1 rounded bg-border-light hover:bg-border-dark"
            title="Copy code"
          >
            Copy
          </button>
        </CopyToClipboard>
        <button
          className="text-xs px-2 py-1 rounded bg-border-light hover:bg-border-dark"
          title="Download code"
          onClick={handleDownload}
        >
          Download
        </button>
      </div>
      <pre className={className} {...props} style={{ paddingTop: "2.5em" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

type UserMessageProps = {
  message: Message;
};

export const UserMessage = ({ message }: UserMessageProps) => {
  const timestamp = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <div className="flex items-end gap-3 self-end">
      <div className="flex flex-1 flex-col gap-1 items-end">
        <p className="text-text-light text-xs font-medium">{timestamp}</p>
        <div className="text-base font-normal leading-relaxed block max-w-full rounded-lg rounded-br-none px-4 py-2 bg-muted-blue-500 text-white markdown-message">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
            rehypePlugins={[[rehypeHighlight, { detect: true }], rehypeKatex]}
            components={{ code: MarkdownCodeBlock }}
          >
            {message.content.replaceAll("\n", "  \n")}
          </ReactMarkdown>
        </div>
      </div>
      <div className="flex-shrink-0 size-8 bg-gray-300 rounded-full text-gray-600 flex items-center justify-center">
        <User size={20} />
      </div>
    </div>
  );
};
