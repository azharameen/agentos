"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUIStore } from "@/store/ui-store";
import { useChat } from "@/hooks/use-chat";
import {
	MessageCircle,
	BrainCircuit,
	Book,
	Settings,
	CircleUserRound,
	Mic,
	Paperclip,
	Send,
	FolderGit2,
	Loader2,
	PanelRight,
	Code,
	GitBranch,
	Shield,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { WelcomeScreen } from "./WelcomeScreen";
import { ChatErrorBoundary } from "./ChatErrorBoundary";
import { PanelErrorBoundary } from "./PanelErrorBoundary";
import { ComponentLoader, PanelLoader } from "./loading/ComponentLoader";
import { ActivityBar, ActivityItem } from "./layout/ActivityBar";
import { SidePanel } from "./layout/SidePanel";
import { RightPanelContent } from "./RightPanelContent";

/**
 * PERFORMANCE: Lazy load heavy components to reduce initial bundle size
 * These components are large and can be loaded on-demand
 */
const MessageList = dynamic(
	() => import("./MessageList").then((mod) => ({ default: mod.MessageList })),
	{
		loading: () => <ComponentLoader message="Loading messages..." />,
		ssr: false,
	}
);

const SessionPanel = dynamic(
	() =>
		import("./session-panel").then((mod) => ({ default: mod.SessionPanel })),
	{
		loading: () => <PanelLoader message="Loading sessions..." />,
		ssr: false,
	}
);

const MemoryPanel = dynamic(
	() => import("./memory-panel").then((mod) => ({ default: mod.MemoryPanel })),
	{
		loading: () => <PanelLoader message="Loading memory..." />,
		ssr: false,
	}
);

const KnowledgeBasePanel = dynamic(
	() =>
		import("./knowledge-base-panel").then((mod) => ({
			default: mod.KnowledgeBasePanel,
		})),
	{
		loading: () => <PanelLoader message="Loading knowledge base..." />,
		ssr: false,
	}
);

const ContextPanel = dynamic(
	() =>
		import("./context-panel").then((mod) => ({ default: mod.ContextPanel })),
	{
		loading: () => <PanelLoader message="Loading context..." />,
		ssr: false,
	}
);

const ContentSafetyPanel = dynamic(
	() =>
		import("./ContentSafetyPanel").then((mod) => ({ default: mod.ContentSafetyPanel })),
	{
		loading: () => <PanelLoader message="Loading safety..." />,
		ssr: false,
	}
);

const ProjectPanel = dynamic(
	() => import("./ProjectPanel").then((mod) => ({ default: mod.ProjectPanel })),
	{
		loading: () => <PanelLoader message="Loading project..." />,
		ssr: false,
	}
);

const CodeAnalysisPanel = dynamic(
	() => import("./CodeAnalysisPanel").then((mod) => ({ default: mod.CodeAnalysisPanel })),
	{
		loading: () => <PanelLoader message="Loading analysis..." />,
		ssr: false,
	}
);

const WorkflowPanel = dynamic(
	() => import("./WorkflowPanel").then((mod) => ({ default: mod.WorkflowPanel })),
	{
		loading: () => <PanelLoader message="Loading workflows..." />,
		ssr: false,
	}
);

import { ChatFooter } from "./ChatFooter";

const SettingsPanel = dynamic(
	() =>
		import("./settings/SettingsSidebar").then((mod) => ({
			default: mod.SettingsSidebar,
		})),
	{
		loading: () => <PanelLoader message="Loading settings..." />,
		ssr: false,
	}
);

const ProfilePanel = dynamic(
	() =>
		import("./ProfilePanel").then((mod) => ({
			default: mod.ProfilePanel,
		})),
	{
		loading: () => <PanelLoader message="Loading profile..." />,
		ssr: false,
	}
);



export function GenieUI() {
	const {
		isLeftSidebarOpen,
		activeLeftPanel,
		isRightPanelOpen,
		toggleLeftSidebar,
		setRightPanelOpen,
	} = useUIStore();

	const {
		conversations,
		activeConversationId,
		setActiveConversationId,
		handleSubmit,
		handleNewChat,
		activeConversation,
		handleDeleteSession,
		handleRenameSession,
	} = useChat();

	// Alias for consistency with UI naming
	const activeSessionId = activeConversationId;
	const setActiveSessionId = setActiveConversationId;

	const isMobile = useIsMobile();

	useEffect(() => {
		if (isMobile) {
			setRightPanelOpen(false);
		}
	}, [isMobile, setRightPanelOpen]);

	const handleSheetOpenChange = (open: boolean) => {
		if (open) {
			toggleLeftSidebar(activeLeftPanel);
		} else {
			toggleLeftSidebar();
		}
	};

	const leftActivityItems: ActivityItem[] = useMemo(
		() => [
			{
				id: "sessions",
				icon: MessageCircle,
				label: "Sessions",
				onClick: () => toggleLeftSidebar("sessions"),
			},
			{
				id: "memory",
				icon: BrainCircuit,
				label: "Memory",
				onClick: () => toggleLeftSidebar("memory"),
			},
			{
				id: "kb",
				icon: Book,
				label: "Knowledge Base",
				onClick: () => toggleLeftSidebar("kb"),
			},
			{
				id: "projects",
				icon: FolderGit2,
				label: "Projects",
				onClick: () => toggleLeftSidebar("projects"),
			},
			{
				id: "analysis",
				icon: Code,
				label: "Code Analysis",
				onClick: () => toggleLeftSidebar("analysis"),
			},
			{
				id: "workflows",
				icon: GitBranch,
				label: "Workflows",
				onClick: () => toggleLeftSidebar("workflows"),
			},
		],
		[toggleLeftSidebar]
	);

	const rightActivityItems: ActivityItem[] = useMemo(
		() => [
			{
				id: "context",
				icon: PanelRight,
				label: "Context",
				onClick: () => setRightPanelOpen(!isRightPanelOpen),
			},
		],
		[isRightPanelOpen, setRightPanelOpen]
	);

	const getPanelTitle = (panel: string | null) => {
		switch (panel) {
			case "sessions":
				return "Sessions";
			case "memory":
				return "Memory";
			case "kb":
				return "Knowledge Base";
			case "projects":
				return "Projects";
			case "analysis":
				return "Code Analysis";
			case "workflows":
				return "Workflows";
			case "settings":
				return "Settings";
			case "profile":
				return "Profile";
			default:
				return "";
		}
	};

	return (
		<div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
			{/* Left Activity Bar */}
			<aside className="z-20 flex flex-col justify-between border-r border-border bg-background">
				<ActivityBar
					items={leftActivityItems}
					activeId={isLeftSidebarOpen ? activeLeftPanel : null}
					className="border-none"
				/>
				<div className="flex flex-col gap-2 p-2">
					<ActivityBar
						items={[
							{
								id: "settings",
								icon: Settings,
								label: "Settings",
								onClick: () => toggleLeftSidebar("settings"),
							},
							{
								id: "profile",
								icon: CircleUserRound,
								label: "Profile",
								onClick: () => toggleLeftSidebar("profile"),
							},
						]}
						className="border-none"
						activeId={isLeftSidebarOpen ? activeLeftPanel : null}
					/>
				</div>
			</aside>

			{/* Left Side Panel */}
			{isMobile ? (
				<Sheet open={isLeftSidebarOpen} onOpenChange={handleSheetOpenChange}>
					<SheetContent side="left" className="p-0 w-80">
						<PanelErrorBoundary panelName="Sidebar">
							<SidebarContent
								conversations={conversations}
								activeSessionId={activeSessionId}
								setActiveSessionId={setActiveSessionId}
								handleNewChat={handleNewChat}
								handleRenameSession={handleRenameSession}
								handleDeleteSession={handleDeleteSession}
							/>
						</PanelErrorBoundary>
					</SheetContent>
				</Sheet>
			) : (
				<SidePanel
					isOpen={isLeftSidebarOpen}
					title={getPanelTitle(activeLeftPanel)}
					position="left"
				>
					<PanelErrorBoundary panelName="Sidebar">
						<SidebarContent
							conversations={conversations}
							activeSessionId={activeSessionId}
							setActiveSessionId={setActiveSessionId}
							handleNewChat={handleNewChat}
							handleRenameSession={handleRenameSession}
							handleDeleteSession={handleDeleteSession}
						/>
					</PanelErrorBoundary>
				</SidePanel>
			)}

			{/* Main Chat Area */}
			<main className="flex flex-1 flex-col overflow-hidden relative">
				<ChatErrorBoundary onReset={handleNewChat}>
					<ChatArea />
				</ChatErrorBoundary>
			</main>

			{/* Right Side Panel */}
			<SidePanel
				isOpen={isRightPanelOpen}
				title="Tools"
				position="right"
			>
				<RightPanelContent setRightPanelOpen={setRightPanelOpen} />
			</SidePanel>

			{/* Right Activity Bar */}
			<aside className="z-20 flex flex-col border-l border-border bg-background">
				<ActivityBar
					items={rightActivityItems}
					activeId={isRightPanelOpen ? "context" : null}
					position="right"
					className="border-none"
				/>
			</aside>
		</div>
	);
}

const SidebarContent = ({
	conversations,
	activeSessionId,
	setActiveSessionId,
	handleNewChat,
	handleRenameSession,
	handleDeleteSession,
}: {
	conversations: any[];
	activeSessionId: string | null;
	setActiveSessionId: (id: string) => void;
	handleNewChat: () => void;
	handleRenameSession: (id: string, newName: string) => void;
	handleDeleteSession: (id: string) => void;
}) => {
	const { activeLeftPanel } = useUIStore();

	return (
		<div className="flex flex-col gap-4 h-full">
			{activeLeftPanel === "sessions" && (
				<PanelErrorBoundary panelName="Sessions">
					<Suspense fallback={<PanelLoader message="Loading sessions..." />}>
						<SessionPanel
							conversations={conversations}
							activeSessionId={activeSessionId}
							setActiveSessionId={setActiveSessionId}
							handleNewChat={handleNewChat}
							handleRename={handleRenameSession}
							handleDelete={handleDeleteSession}
						/>
					</Suspense>
				</PanelErrorBoundary>
			)}
			{activeLeftPanel === "memory" && (
				<PanelErrorBoundary panelName="Memory">
					<Suspense fallback={<PanelLoader message="Loading memory..." />}>
						<MemoryPanel />
					</Suspense>
				</PanelErrorBoundary>
			)}
			{activeLeftPanel === "kb" && (
				<PanelErrorBoundary panelName="Knowledge Base">
					<Suspense
						fallback={<PanelLoader message="Loading knowledge base..." />}
					>
						<KnowledgeBasePanel />
					</Suspense>
				</PanelErrorBoundary>
			)}
			{activeLeftPanel === "projects" && (
				<PanelErrorBoundary panelName="Projects">
					<Suspense fallback={<PanelLoader message="Loading project..." />}>
						<ProjectPanel />
					</Suspense>
				</PanelErrorBoundary>
			)}
			{activeLeftPanel === "analysis" && (
				<PanelErrorBoundary panelName="Code Analysis">
					<Suspense fallback={<PanelLoader message="Loading analysis..." />}>
						<CodeAnalysisPanel />
					</Suspense>
				</PanelErrorBoundary>
			)}
			{activeLeftPanel === "workflows" && (
				<PanelErrorBoundary panelName="Workflows">
					<Suspense fallback={<PanelLoader message="Loading workflows..." />}>
						<WorkflowPanel />
					</Suspense>
				</PanelErrorBoundary>
			)}
			{activeLeftPanel === "settings" && (
				<PanelErrorBoundary panelName="Settings">
					<Suspense fallback={<PanelLoader message="Loading settings..." />}>
						<SettingsPanel />
					</Suspense>
				</PanelErrorBoundary>
			)}
			{activeLeftPanel === "profile" && (
				<PanelErrorBoundary panelName="Profile">
					<Suspense fallback={<PanelLoader message="Loading profile..." />}>
						<ProfilePanel />
					</Suspense>
				</PanelErrorBoundary>
			)}
		</div>
	);
};

const ChatArea = () => {
	const { activeConversation, handleSubmit } = useChat();
	const scrollRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTo({
				top: scrollRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [activeConversation?.messages]);

	return (
		<div className="flex h-full flex-col">
			<div
				ref={scrollRef}
				className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth"
			>
				<div className="mx-auto max-w-3xl flex flex-col gap-6">
					{activeConversation?.messages?.length ? (
						<Suspense
							fallback={<ComponentLoader message="Loading messages..." />}
						>
							<MessageList messages={activeConversation.messages} />
						</Suspense>
					) : (
						<WelcomeScreen onExamplePrompt={handleSubmit} />
					)}
				</div>
			</div>
			<ChatFooter />
		</div>
	);
};
