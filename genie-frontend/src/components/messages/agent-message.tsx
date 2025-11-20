"use client";
// Custom code block renderer for markdown
import { CopyToClipboard } from "react-copy-to-clipboard";

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

import type { Message } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkEmoji from "remark-emoji";
import { Bot, Copy, Bookmark } from "lucide-react";

type AgentMessageProps = {
	message: Message;
};

export const AgentMessage = ({ message }: AgentMessageProps) => {
	const timestamp = message.createdAt
		? new Date(message.createdAt).toLocaleTimeString()
		: new Date().toLocaleTimeString();

	const handleCopy = () => {
		navigator.clipboard.writeText(message.content);
	};

	const handleSaveAsKnowledge = () => {
		// Placeholder: Implement save as knowledge logic
		alert("Save as knowledge triggered!");
	};

	const renderers = {
		code: MarkdownCodeBlock,
	};

	return (
		<div className="flex items-start gap-3 group">
      <div className="flex-shrink-0 size-8 bg-muted-blue-500 rounded-full text-white flex items-center justify-center">
        <Bot size={20} />
      </div>
      <div className="flex flex-1 flex-col gap-1 items-start">
        <div className="text-text-light text-xs font-medium">{timestamp}</div>
        <div className="relative">
          <div className="text-base font-normal leading-relaxed block max-w-full rounded-lg rounded-bl-none px-4 py-2 bg-background-light text-text-main shadow-sm border border-border-light markdown-message">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
              rehypePlugins={[[rehypeHighlight, { detect: true }], rehypeKatex]}
              components={renderers}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && <span className="animate-pulse">▍</span>}
          </div>
          <div className="absolute bottom-0 right-0 mb-2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
            <button
              title="Copy"
              className="p-1 rounded-md hover:bg-background-dark text-text-light"
              onClick={handleCopy}
            >
              <Copy size={14} />
            </button>
            <button
              title="Save as Knowledge"
              className="p-1 rounded-md hover:bg-background-dark text-text-light"
              onClick={handleSaveAsKnowledge}
            >
              <Bookmark size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
	);
};
