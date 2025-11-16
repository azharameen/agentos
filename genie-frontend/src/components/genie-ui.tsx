"use client";

import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import React, { useEffect, useRef, useState, useTransition } from "react";
// ...existing imports...
import type { AnyMessage, Conversation } from "@/lib/types";
import { MessageList } from "./MessageList";
import { handleAgentEvent } from "@/lib/event-handlers";
import { SessionPanel } from "./session-panel";
import { MemoryPanel } from "./memory-panel";
import { KnowledgeBasePanel } from "./knowledge-base-panel";
import { ContextPanel } from "./context-panel";

/**
 * Simulates generating a summary for a new conversation.
 * @param text The first prompt of a conversation.
 * @returns A short summary string.
 */
function getSummaryForPrompt(text: string): string {
	if (text.length < 40) {
		return text;
	}
	return text.split(" ").slice(0, 5).join(" ") + "...";
}

export function GenieUI() {
	// Add missing New Chat handler
	const handleNewChat = () => {
		const newConversationId = `conv_${Date.now()}`;
		const newConversation: Conversation = {
			id: newConversationId,
			summary: "New Agentic Chat",
			messages: [],
		};
		setConversations([newConversation, ...conversations]);
		setActiveConversationId(newConversationId);
		setPrompt("");
	};
	const { toast } = useToast();
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [activeConversationId, setActiveConversationId] = useState<
		string | null
	>(null);
	const [prompt, setPrompt] = useState("");
	const [isPending, startTransition] = useTransition();
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const isMobile = useIsMobile();
	const [leftPanelOpen, setLeftPanelOpen] = useState(true);
	const [rightPanelOpen, setRightPanelOpen] = useState(false);
	const [activeLeftPanel, setActiveLeftPanel] = useState("sessions");

	const activeConversation = conversations.find(
		(c) => c.id === activeConversationId
	);
	const hasConversations = conversations.length > 0;
	const hasMessages = (activeConversation?.messages?.length ?? 0) > 0;
	const isStreaming = !!activeConversation?.messages.some(
		(m) => "isStreaming" in m && (m as any).isStreaming
	);
	// Example prompt handler
	const handleExamplePrompt = (examplePrompt: string) => {
		setPrompt(examplePrompt);
		handleSubmit(undefined, examplePrompt);
	};

	const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setPrompt(e.target.value);
	};

	const handleSubmit = (
		e?: React.FormEvent<HTMLFormElement>,
		customPrompt?: string
	) => {
		e?.preventDefault();
		const currentPrompt = customPrompt || prompt;
		if (!currentPrompt.trim() || isPending) return;

		handleStop(); // Abort any existing streams

		let conversationId = activeConversationId;
		const userMessageId = `msg_${Date.now()}`;
		const user = {
			name: "Azhar Ameen",
			avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
		};
		const newUserMessage: AnyMessage = {
			id: userMessageId,
			role: "user",
			type: "text",
			content: currentPrompt,
			name: user.name,
			avatarUrl: user.avatarUrl,
			createdAt: new Date().toISOString(),
		};

		// Synchronously add user message and clear input before streaming
		if (
			!activeConversationId ||
			!conversations.some((c) => c.id === activeConversationId)
		) {
			conversationId = `conv_${Date.now()}`;
			const newConversation: Conversation = {
				id: conversationId,
				summary: getSummaryForPrompt(currentPrompt),
				messages: [newUserMessage],
			};
			setConversations((prev) => [newConversation, ...prev]);
			setActiveConversationId(conversationId);
		} else {
			conversationId = activeConversationId;
			setConversations((prev) =>
				prev.map((c) =>
					c.id === conversationId
						? { ...c, messages: [...c.messages, newUserMessage] }
						: c
				)
			);
		}
		setPrompt("");

		startTransition(async () => {
			// Create abort controller for stream cancellation
			const abortController = new AbortController();
			abortControllerRef.current = abortController;

			const model = "gpt-4";
			const url = `http://localhost:3001/agent/execute`;
			const payload = {
				prompt: currentPrompt,
				model,
			};

			let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

			try {
				const response = await fetch(url, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
					signal: abortController.signal,
				});

				if (!response.ok) {
					throw new Error(
						`HTTP ${response.status}: Failed to get agent response`
					);
				}

				if (!response.body) {
					throw new Error("Response body is null");
				}

				reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";

				while (true) {
					const { value, done } = await reader.read();

					if (done) {
						if (buffer.trim()) {
							try {
								const event = JSON.parse(buffer.trim());
								handleAgentEvent(event, {
									conversationId,
									setConversations,
								});
							} catch (err) {
								console.warn("Failed to parse final buffer:", buffer);
							}
						}
						break;
					}

					if (value) {
						buffer += decoder.decode(value, { stream: true });
						const lines = buffer.split("\n");
						buffer = lines.pop() || "";

						for (const line of lines) {
							const trimmedLine = line.trim();
							if (!trimmedLine) continue;

							try {
								const event = JSON.parse(trimmedLine);
								handleAgentEvent(event, {
									conversationId,
									setConversations,
								});
							} catch (err) {
								console.warn("Failed to parse event:", trimmedLine, err);
							}
						}
					}
				}
			} catch (err: any) {
				if (err.name === "AbortError") {
					console.log("Stream aborted by user");
					return;
				}

				console.error("Stream error:", err);
				toast({
					variant: "destructive",
					title: "Error",
					description: err?.message || "An unknown error occurred.",
				});
				setConversations((prev) =>
					prev.map((c) => {
						if (c.id === conversationId) {
							const errorMessage: import("@/lib/types").ErrorMessage = {
								id: `error-${Date.now()}`,
								role: "assistant",
								type: "error",
								content: err?.message || "An unknown error occurred.",
							};
							return {
								...c,
								messages: [
									...c.messages.filter((m) => m.type !== "loading"),
									errorMessage,
								],
							};
						}
						return c;
					})
				);
			} finally {
				if (reader) {
					try {
						reader.releaseLock();
					} catch (e) {}
				}
				if (abortControllerRef.current === abortController) {
					abortControllerRef.current = null;
				}
			}
		});
	};

	const handleStop = () => {
		// Abort the fetch request if it's in progress
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}

		// Mark all streaming messages as complete
		setConversations((prev) =>
			prev.map((c) => {
				if (c.id === activeConversationId) {
					return {
						...c,
						messages: c.messages
							.filter((m) => m.type !== "loading")
							.map((m) =>
								"isStreaming" in m && (m as any).isStreaming
									? { ...m, isStreaming: false }
									: m
							),
					};
				}
				return c;
			})
		);
	};

	// Auto-scroll only when a new message is added

	// Ensure scrollAreaRef is attached to the actual scrollable container (not a wrapper)
	useEffect(() => {
		if (scrollAreaRef.current) {
			// Use double requestAnimationFrame to ensure scroll after DOM update
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					scrollAreaRef.current?.scrollTo({
						top: scrollAreaRef.current.scrollHeight,
						behavior: "smooth",
					});
				});
			});
		}
	}, [activeConversation?.messages]);

	useEffect(() => {
		if (isMobile) {
			setLeftPanelOpen(false);
			setRightPanelOpen(false);
		} else {
			setLeftPanelOpen(true);
			setRightPanelOpen(false);
		}
	}, [isMobile]);

	return (
		<div className="relative flex h-screen w-full flex-col overflow-hidden">
			<div className="flex h-full flex-1">
				<aside className="flex h-full flex-col border-r border-border-light bg-background-light p-2 z-20 shrink-0">
					<div className="flex flex-col items-center gap-2">
						<button
							className={`flex items-center justify-center rounded-lg p-2.5 ${
								activeLeftPanel === "sessions"
									? "text-white bg-muted-blue-500"
									: "text-text-light hover:bg-background-dark"
							}`}
							onClick={() => {
								setLeftPanelOpen(true);
								setActiveLeftPanel("sessions");
							}}
						>
							<span className="material-symbols-outlined text-2xl">forum</span>
						</button>
						<button
							className={`flex items-center justify-center rounded-lg p-2.5 ${
								activeLeftPanel === "memory"
									? "text-white bg-muted-blue-500"
									: "text-text-light hover:bg-background-dark"
							}`}
							onClick={() => {
								setLeftPanelOpen(true);
								setActiveLeftPanel("memory");
							}}
						>
							<span className="material-symbols-outlined text-2xl">memory</span>
						</button>
						<button
							className={`flex items-center justify-center rounded-lg p-2.5 ${
								activeLeftPanel === "kb"
									? "text-white bg-muted-blue-500"
									: "text-text-light hover:bg-background-dark"
							}`}
							onClick={() => {
								setLeftPanelOpen(true);
								setActiveLeftPanel("kb");
							}}
						>
							<span className="material-symbols-outlined text-2xl">
								import_contacts
							</span>
						</button>
					</div>
					<div className="mt-auto flex flex-col items-center gap-2 pt-4">
						<button className="flex items-center justify-center rounded-lg p-2.5 text-text-light hover:bg-background-dark">
							<span className="material-symbols-outlined text-2xl">
								settings
							</span>
						</button>
						<button className="flex items-center justify-center rounded-lg p-2.5 text-text-light hover:bg-background-dark">
							<span className="material-symbols-outlined text-2xl">
								account_circle
							</span>
						</button>
					</div>
				</aside>
				<div
					className={`border-r border-border-light bg-background-light transition-all duration-300 ease-in-out ${
						leftPanelOpen ? "w-64" : "w-0"
					}`}
				>
					<div className="flex h-full flex-col p-4 w-64">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-lg font-semibold text-text-main">
								{activeLeftPanel === "sessions"
									? "Sessions"
									: activeLeftPanel === "memory"
									? "Memory"
									: "Knowledge Base"}
							</h2>
						</div>
						<div className="flex-1 overflow-y-auto">
							{activeLeftPanel === "sessions" && (
								<SessionPanel
									conversations={conversations}
									activeConversationId={activeConversationId}
									setActiveConversationId={setActiveConversationId}
									handleNewChat={handleNewChat}
								/>
							)}
							{activeLeftPanel === "memory" && <MemoryPanel />}
							{activeLeftPanel === "kb" && <KnowledgeBasePanel />}
						</div>
					</div>
				</div>
				<main className="relative flex flex-1 flex-col bg-soft-cream">
					<div className="flex-1 overflow-y-auto p-6">
						<div className="flex flex-col gap-6 max-w-3xl mx-auto">
							<MessageList messages={activeConversation?.messages ?? []} />
						</div>
					</div>
					<div className="border-t border-border-light bg-background-light p-4">
						<div className="max-w-3xl mx-auto">
							<div className="flex items-center gap-2 rounded-xl bg-background-light p-2 shadow-sm border border-border-light focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
								<button className="shrink-0 flex items-center justify-center size-9 rounded-lg hover:bg-background-dark text-text-light">
									<span className="material-symbols-outlined text-xl">mic</span>
								</button>
								<Textarea
									ref={textareaRef}
									value={prompt}
									onChange={handlePromptChange}
									placeholder="Type your message..."
									className="form-textarea w-full resize-none border-0 bg-transparent p-2 text-text-main placeholder:text-text-light focus:ring-0"
									rows={1}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											handleSubmit(e as any);
										}
									}}
									disabled={isStreaming}
								/>
								<div className="relative group">
									<button className="shrink-0 flex items-center justify-center size-9 rounded-lg hover:bg-background-dark text-text-light">
										<span className="material-symbols-outlined text-xl">
											more_vert
										</span>
									</button>
									<div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-border-light hidden group-focus-within:block group-hover:block">
										<a
											className="flex items-center gap-3 px-4 py-2 text-sm text-text-main hover:bg-background-dark"
											href="#"
										>
											<span className="material-symbols-outlined text-xl">
												attach_file
											</span>
											<span>Attach Files</span>
										</a>
										<a
											className="flex items-center gap-3 px-4 py-2 text-sm text-text-main hover:bg-background-dark"
											href="#"
										>
											<span className="material-symbols-outlined text-xl">
												upload_file
											</span>
											<span>Upload Files</span>
										</a>
									</div>
								</div>
								<button
									className="shrink-0 flex items-center justify-center size-9 rounded-lg bg-muted-blue-500 text-white hover:bg-muted-blue-500/90 disabled:bg-primary/50 disabled:cursor-not-allowed"
									onClick={(e) => handleSubmit(e as any)}
									disabled={!prompt.trim()}
								>
									<span className="material-symbols-outlined text-xl">
										send
									</span>
								</button>
							</div>
						</div>
					</div>
				</main>
				<div
					className={`absolute inset-y-0 right-0 w-80 bg-background-light border-l border-border-light shadow-xl z-30 transition-transform duration-300 ease-in-out ${
						rightPanelOpen ? "translate-x-0" : "translate-x-full"
					}`}
				>
					<ContextPanel setRightPanelOpen={setRightPanelOpen} />
				</div>
				<div className="absolute right-4 top-1/2 -translate-y-1/2 z-40">
					<button
						className="flex items-center justify-center size-10 rounded-full bg-background-light text-text-main shadow-lg hover:bg-background-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 border border-border-light"
						onClick={() => setRightPanelOpen(!rightPanelOpen)}
					>
						<span className="material-symbols-outlined">
							{rightPanelOpen ? "close" : "menu_open"}
						</span>
					</button>
				</div>
			</div>
		</div>
	);
}
