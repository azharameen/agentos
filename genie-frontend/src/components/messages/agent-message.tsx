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
		<div className="flex flex-1 flex-col gap-1 items-start relative group">
			<div className="text-text-light text-xs font-medium">{timestamp}</div>
			<div className="text-base font-normal leading-relaxed block max-w-full rounded-lg rounded-bl-none px-4 py-2 bg-background-light text-text-main shadow-sm border border-border-light markdown-message relative">
				<ReactMarkdown
					remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
					rehypePlugins={[[rehypeHighlight, { detect: true }], rehypeKatex]}
					components={renderers}
				>
					{message.content}
				</ReactMarkdown>
				{message.isStreaming && <span className="animate-pulse">�</span>}
			</div>
			{/* Toolbar below and left-aligned, appears on hover */}
			<div className="flex gap-2 rounded-lg rounded-tl-none bg-background-light text-text-main shadow-sm border border-border-light transition-opacity duration-200 pointer-events-auto z-10 justify-start">
				<button
					title="Copy"
					className="inline-flex items-center justify-center rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					onClick={handleCopy}
				>
					Copy
				</button>
				<button
					title="Save as Knowledge"
					className="inline-flex items-center justify-center rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					onClick={handleSaveAsKnowledge}
				>
					Save
				</button>
			</div>
		</div>
	);
};
