"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
	MessageSquarePlus,
	Send,
	Paperclip,
	Mic,
	Square,
	PanelRight,
} from "lucide-react";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { AgenticaIcon } from "./icons";
// ...existing imports...
import { WelcomeScreen } from "./WelcomeScreen";
import { Header } from "@/components/layout/header";
import { LeftSidebar } from "@/components/layout/left-sidebar";
import { MainLayout } from "@/components/layout/main-layout";
import { ChatUI } from "@/components/layout/chat-ui";
import { RightSidebar } from "@/components/layout/right-sidebar";
import {
	SidebarHeader,
	SidebarContent,
	SidebarTrigger,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Separator } from "./ui/separator";
import { TooltipProvider } from "./ui/tooltip";
import type { AnyMessage, Conversation } from "@/lib/types";
import { MessageList } from "./MessageList";
import { handleAgentEvent } from "@/lib/event-handlers";
import { mockStreamResponse } from "@/mocks/api";

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

	const handleConversationDelete = (id: string) => {
		setConversations((prev) => prev.filter((c) => c.id !== id));
		if (activeConversationId === id) {
			setActiveConversationId(null);
		}
	};

	const handleConversationRename = (id: string, newName: string) => {
		setConversations((prev) =>
			prev.map((c) => (c.id === id ? { ...c, summary: newName } : c))
		);
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
	const [openLeftSidebar, setOpenLeftSidebar] = useState(!isMobile);
	const [openRightSidebar, setOpenRightSidebar] = useState(false);

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
			name: "Alex",
			avatarUrl: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
		};
		const newUserMessage: AnyMessage = {
			id: userMessageId,
			role: "user",
			type: "text",
			content: currentPrompt,
			name: user.name,
			avatarUrl: user.avatarUrl,
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
				if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true") {
					const write = (chunk: string) => {
						if (abortController.signal.aborted) {
							// Stop further processing if the stream has been aborted
							throw new DOMException("Aborted", "AbortError");
						}
						try {
							const event = JSON.parse(chunk);
							handleAgentEvent(event, {
								conversationId,
								setConversations,
							});
						} catch (err) {
							console.warn("Failed to parse mock event chunk:", chunk, err);
						}
					};
					await mockStreamResponse(currentPrompt, write);
				} else {
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

	return (
		<MainLayout
			leftSidebarOpen={openLeftSidebar}
			setLeftSidebarOpen={setOpenLeftSidebar}
			rightSidebarOpen={openRightSidebar}
			setRightSidebarOpen={setOpenRightSidebar}
			leftSidebar={
				<LeftSidebar
					conversations={conversations}
					activeConversationId={activeConversationId}
					onNewChat={handleNewChat}
					onConversationSelect={setActiveConversationId}
					onConversationDelete={handleConversationDelete}
					onConversationRename={handleConversationRename}
				/>
			}
			rightSidebar={<RightSidebar />}
		>
			<div className="flex flex-1 flex-col overflow-hidden">
				<Header
					activeConversation={activeConversation}
					onLeftSidebarToggle={() => setOpenLeftSidebar((v) => !v)}
					onRightSidebarToggle={() => setOpenRightSidebar((v) => !v)}
				/>

				<ChatUI
					messages={activeConversation?.messages ?? []}
					scrollAreaRef={scrollAreaRef}
					hasConversations={hasConversations}
					hasMessages={hasMessages}
					onExamplePrompt={handleExamplePrompt}
					prompt={prompt}
					onPromptChange={handlePromptChange}
					onSubmit={handleSubmit}
					isStreaming={isStreaming}
					onStop={handleStop}
				/>
			</div>
		</MainLayout>
	);
}
