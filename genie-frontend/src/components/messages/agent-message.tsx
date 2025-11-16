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
	const code = children;
	return (
		<div style={{ position: "relative" }}>
			<pre className={className} {...props}>
				<code>{code}</code>
			</pre>
			<CopyToClipboard text={code}>
				<button
					style={{ position: "absolute", top: 8, right: 8, zIndex: 2 }}
					className="text-xs px-2 py-1 rounded bg-border-light hover:bg-border-dark"
					title="Copy code"
				>
					Copy
				</button>
			</CopyToClipboard>
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
		<div className="flex flex-1 flex-col gap-1 items-start relative">
			<div className="text-text-light text-xs font-medium">{timestamp}</div>
			<div className="text-base font-normal leading-relaxed block max-w-full rounded-lg rounded-bl-none px-4 py-2 bg-background-light text-text-main shadow-sm border border-border-light markdown-message">
				<ReactMarkdown
					remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
					rehypePlugins={[[rehypeHighlight, { detect: true }], rehypeKatex]}
					components={renderers}
				>
					{message.content}
				</ReactMarkdown>
				{message.isStreaming && <span className="animate-pulse">�</span>}
			</div>
			<div className="absolute top-0 right-0 flex gap-1 p-1">
				<button
					title="Copy"
					className="text-xs px-2 py-1 rounded bg-border-light hover:bg-border-dark"
					onClick={handleCopy}
				>
					Copy
				</button>
				<button
					title="Save as Knowledge"
					className="text-xs px-2 py-1 rounded bg-border-light hover:bg-border-dark"
					onClick={handleSaveAsKnowledge}
				>
					Save
				</button>
			</div>
		</div>
	);
};
