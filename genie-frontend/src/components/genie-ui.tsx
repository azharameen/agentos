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
import {
	Sidebar,
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
			setOpenLeftSidebar(false);
			setOpenRightSidebar(false);
		} else {
			setOpenLeftSidebar(true);
			setOpenRightSidebar(false);
		}
	}, [isMobile]);

	return (
		<TooltipProvider>
			<div className="flex h-screen bg-background text-foreground">
				{/* Left Sidebar */}
				<Sidebar
					side="left"
					isOpen={openLeftSidebar}
					setIsOpen={setOpenLeftSidebar}
					isMobile={isMobile}
				>
					<SidebarHeader>
						<div className="flex items-center gap-2 p-1">
							<AgenticaIcon className="size-7" />
							<h1 className="text-lg font-semibold truncate">Agentica</h1>
						</div>
						<Button
							onClick={handleNewChat}
							variant="ghost"
							size="sm"
							className="w-full justify-start"
						>
							<MessageSquarePlus className="mr-2 size-4" />
							<span className="truncate">New Chat</span>
						</Button>
					</SidebarHeader>
					<Separator />
					<SidebarContent className="p-2">
						<ScrollArea className="h-full">
							<SidebarMenu>
								{conversations.map((c) => (
									<SidebarMenuItem key={c.id}>
										<SidebarMenuButton
											isActive={c.id === activeConversationId}
											onClick={() => setActiveConversationId(c.id)}
											className="justify-start"
											aria-label={c.summary}
										>
											<span className="truncate">{c.summary}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</ScrollArea>
					</SidebarContent>
				</Sidebar>

				{/* Main Content */}
				<div className="flex flex-1 flex-col overflow-hidden">
					{/* Header */}
					<header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm">
						<div className="flex items-center gap-2">
							<SidebarTrigger onClick={() => setOpenLeftSidebar((v) => !v)} />
							<h2 className="truncate font-semibold">
								{activeConversation?.summary || "Agentica AI Chat"}
							</h2>
						</div>
						<SidebarTrigger onClick={() => setOpenRightSidebar((v) => !v)}>
							<PanelRight />
						</SidebarTrigger>
					</header>

					{/* Chat Area */}
					<main className="flex-1 overflow-y-auto">
						<ScrollArea className="h-full" ref={scrollAreaRef}>
							<div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
								{!hasConversations || !hasMessages ? (
									<WelcomeScreen onExamplePrompt={handleExamplePrompt} />
								) : (
									<MessageList messages={activeConversation?.messages ?? []} />
								)}
							</div>
						</ScrollArea>
					</main>

					{/* Chat Footer */}
					<footer className="shrink-0 bg-background">
						<div className="mx-auto w-full max-w-4xl p-4">
							<div className="relative flex items-center rounded-2xl bg-card/70">
								<Button
									variant="ghost"
									size="icon"
									className="shrink-0 text-muted-foreground ml-2"
								>
									<Paperclip className="size-5" />
									<span className="sr-only">Attach File</span>
								</Button>
								<Textarea
									ref={textareaRef}
									value={prompt}
									onChange={handlePromptChange}
									placeholder="Ask me to write, code, or create..."
									className="flex-1 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0 focus:outline-none py-3"
									style={{
										minHeight: "2.5rem",
										maxHeight: "12.5rem",
										overflowY: "auto",
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											handleSubmit(e as any);
										}
									}}
									disabled={isStreaming}
									rows={1}
								/>
								<div className="flex shrink-0 items-center gap-1 self-end p-2">
									{isStreaming ? (
										<Button variant="ghost" size="icon" onClick={handleStop}>
											<Square className="size-5" />
											<span className="sr-only">Stop</span>
										</Button>
									) : (
										<>
											<Button
												variant="ghost"
												size="icon"
												className="text-muted-foreground"
											>
												<Mic className="size-5" />
												<span className="sr-only">Use Microphone</span>
											</Button>
											<Button
												type="submit"
												size="icon"
												onClick={(e) => handleSubmit(e as any)}
												disabled={!prompt.trim()}
												className="bg-primary text-primary-foreground hover:bg-primary/90"
											>
												<Send className="size-4" />
												<span className="sr-only">Send</span>
											</Button>
										</>
									)}
								</div>
							</div>
						</div>
					</footer>
				</div>

				{/* Right Sidebar */}
				<Sidebar
					side="right"
					isOpen={openRightSidebar}
					setIsOpen={setOpenRightSidebar}
					isMobile={isMobile}
				>
					<SidebarHeader>
						<div className="flex items-center gap-2 p-1">
							<h1 className="truncate text-lg font-semibold">Context</h1>
						</div>
					</SidebarHeader>
					<Separator />
					<SidebarContent className="p-4">
						<p className="text-sm text-muted-foreground">
							Contextual information and tools will appear here.
						</p>
					</SidebarContent>
				</Sidebar>
			</div>
		</TooltipProvider>
	);
}
