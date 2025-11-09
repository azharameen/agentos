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
	GitBranch,
	Share2,
	ToyBrick,
} from "lucide-react";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { AgenticaIcon } from "./icons";
import { Card, CardContent } from "./ui/card";
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
import type { AgentStreamEvent } from "@/lib/contracts";
import type { AnyMessage, Conversation } from "@/lib/types";
import { UserMessage } from "./messages/user-message";
import { AgentMessage } from "./messages/agent-message";
import { ToolCallMessage } from "./messages/tool-call-message";

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
	const { toast } = useToast();
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [activeConversationId, setActiveConversationId] = useState<
		string | null
	>(null);
	const [prompt, setPrompt] = useState("");
	const [isPending, startTransition] = useTransition();
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const eventSourceRef = useRef<EventSource | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const isMobile = useIsMobile();
	const [openLeftSidebar, setOpenLeftSidebar] = useState(!isMobile);
	const [openRightSidebar, setOpenRightSidebar] = useState(false);

	// Read NEXT_PUBLIC_USE_MOCK_API and NEXT_PUBLIC_API_BASE_URL from environment
	const useMockApi =
		typeof globalThis.window !== "undefined"
			? (process.env.NEXT_PUBLIC_USE_MOCK_API ??
					(globalThis as any).NEXT_PUBLIC_USE_MOCK_API ??
					(globalThis as any).env?.NEXT_PUBLIC_USE_MOCK_API) === "true"
			: false;
	const apiBaseUrl =
		typeof globalThis.window !== "undefined"
			? process.env.NEXT_PUBLIC_API_BASE_URL ??
			  (globalThis as any).NEXT_PUBLIC_API_BASE_URL ??
			  (globalThis as any).env?.NEXT_PUBLIC_API_BASE_URL
			: "";

	const activeConversation = conversations.find(
		(c) => c.id === activeConversationId
	);

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

	const handleExamplePrompt = (examplePrompt: string) => {
		setPrompt(examplePrompt);
		handleSubmit(undefined, examplePrompt);
	};

	const handleStop = () => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}
		// After stopping, find the streaming message and mark it as complete
		setConversations((prev) =>
			prev.map((c) => {
				if (c.id === activeConversationId) {
					return {
						...c,
						messages: c.messages.map((m) =>
							m.isStreaming ? { ...m, isStreaming: false } : m
						),
					};
				}
				return c;
			})
		);
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

		// Hardcoded user for demonstration purposes
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

		startTransition(() => {
			if (
				!activeConversationId ||
				!conversations.some((c) => c.id === activeConversationId)
			) {
				conversationId = `conv_${Date.now()}`;
				const newConversation: Conversation = {
					id: conversationId,
					summary: "New Agentic Chat", // This will be updated after the first response
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

			// --- Streaming Logic ---
			// Always include a valid model parameter for backend
			const model = "gpt-4"; // Default, could be made user-selectable
			let url = "";
			if (useMockApi) {
				url = `/api/agent/stream?prompt=${encodeURIComponent(
					currentPrompt
				)}&model=${encodeURIComponent(model)}`;
			} else {
				url = `${apiBaseUrl}/agent/stream?prompt=${encodeURIComponent(
					currentPrompt
				)}&model=${encodeURIComponent(model)}`;
			}
			const eventSource = new EventSource(url);
			eventSourceRef.current = eventSource;

			eventSource.onopen = () => {
				// Connection opened
			};

			eventSource.onmessage = (event) => {
				const eventData = JSON.parse(event.data) as AgentStreamEvent;

				setConversations((prev) =>
					prev.map((c) => {
						if (c.id !== conversationId) return c;

						const newMessages = [...c.messages];
						let summary = c.summary;

						switch (eventData.type) {
							case "TEXT_MESSAGE_CONTENT": {
								const lastMessage = newMessages.at(-1);
								if (
									lastMessage &&
									lastMessage.type === "text" &&
									lastMessage.isStreaming
								) {
									(lastMessage as any).content += eventData.data.delta;
								} else {
									newMessages.push({
										id: `msg_${Date.now()}`,
										role: "assistant",
										type: "text",
										content: eventData.data.delta,
										isStreaming: true,
									});
								}
								break;
							}
							case "TOOL_CALL_START": {
								newMessages.push({
									id: `tool_${Date.now()}`,
									role: "assistant",
									type: "tool-call",
									toolName: eventData.data.name,
									status: "started",
									result: null,
									isStreaming: true,
								});
								break;
							}
							case "TOOL_CALL_END": {
								const toolCallMessage = newMessages.find(
									(m) =>
										m.type === "tool-call" && (m as any).status === "started"
								);
								if (toolCallMessage) {
									(toolCallMessage as any).status = "ended";
									(toolCallMessage as any).result = eventData.data.result;
									(toolCallMessage as any).isStreaming = false;
								}
								break;
							}
							case "RUN_FINISHED": {
								handleStop();
								const lastMessage = newMessages.at(-1);
								if (lastMessage && (lastMessage as any).isStreaming) {
									(lastMessage as any).isStreaming = false;
								}
								if (c.messages.length <= 2 && c.messages[0].type === "text") {
									summary = getSummaryForPrompt((c.messages[0] as any).content);
								}
								break;
							}
							case "RUN_ERROR": {
								handleStop();
								toast({
									variant: "destructive",
									title: "Error",
									description:
										eventData.data.error ||
										"An unknown streaming error occurred.",
								});
								break;
							}
						}
						return { ...c, summary, messages: newMessages };
					})
				);
			};

			eventSource.onerror = (err) => {
				console.error("EventSource failed:", err);
				handleStop();
				toast({
					variant: "destructive",
					title: "Connection Error",
					description: "Failed to connect to the streaming service.",
				});
			};
		});
	};

	const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setPrompt(e.target.value);
	};

	useEffect(() => {
		if (scrollAreaRef.current) {
			scrollAreaRef.current.scrollTo({
				top: scrollAreaRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [activeConversation?.messages, isPending]);

	// Close sidebars on mobile by default
	useEffect(() => {
		if (isMobile) {
			setOpenLeftSidebar(false);
			setOpenRightSidebar(false);
		} else {
			setOpenLeftSidebar(true);
			setOpenRightSidebar(false);
		}
	}, [isMobile]);

	const hasConversations = conversations.length > 0;
	const hasMessages = (activeConversation?.messages?.length ?? 0) > 0;
	const isStreaming = !!activeConversation?.messages.some((m) => m.isStreaming);

	return (
		<TooltipProvider>
			<div className="flex h-screen bg-background text-foreground">
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

				<div className="flex flex-1 flex-col overflow-hidden">
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

					<main className="flex-1 overflow-y-auto">
						<ScrollArea className="h-full" ref={scrollAreaRef}>
							<div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
								{!hasConversations || !hasMessages ? (
									<WelcomeScreen onExamplePrompt={handleExamplePrompt} />
								) : (
									<>
										{activeConversation?.messages.map((message) => {
											switch (message.type) {
												case "text":
													if (message.role === "user") {
														return (
															<UserMessage key={message.id} message={message} />
														);
													}
													return (
														<AgentMessage key={message.id} message={message} />
													);
												case "tool-call":
													return (
														<ToolCallMessage
															key={message.id}
															message={message}
														/>
													);
												default:
													return null;
											}
										})}
									</>
								)}
							</div>
						</ScrollArea>
					</main>

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

const examplePrompts = [
	{
		icon: GitBranch,
		text: "Explain your composable architecture",
	},
	{
		icon: Share2,
		text: "How do you handle real-time UI integration?",
	},
	{
		icon: ToyBrick,
		text: "What is the AGUI Protocol and why is it useful?",
	},
];

const WelcomeScreen = ({
	onExamplePrompt,
}: {
	onExamplePrompt: (prompt: string) => void;
}) => (
	<div className="flex h-full flex-col items-center justify-center py-12 text-center">
		<div className="rounded-full border-8 border-background bg-primary/10 p-4 shadow-lg">
			<AgenticaIcon className="size-12 text-primary drop-shadow-[0_2px_4px_hsl(var(--primary)/0.4)]" />
		</div>
		<h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
			Agentica AI
		</h1>
		<p className="mt-2 max-w-lg text-md text-muted-foreground">
			Your expert assistant for building agentic applications.
		</p>
		<div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
			{examplePrompts.map((prompt, i) => (
				<Card
					key={i}
					className="group cursor-pointer transition-colors hover:bg-secondary"
					onClick={() => onExamplePrompt(prompt.text)}
				>
					<CardContent className="flex items-center gap-3 p-3">
						<div className="rounded-md bg-primary/10 p-1.5 transition-colors group-hover:bg-primary/20">
							<prompt.icon className="size-5 text-primary" />
						</div>
						<p className="text-left text-sm font-medium">{prompt.text}</p>
					</CardContent>
				</Card>
			))}
		</div>
	</div>
);
