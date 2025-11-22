import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuCheckboxItem,
	DropdownMenuTrigger,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Paperclip, Mic, Square, Send, Loader2, ChevronUp, Plus, Settings2 } from "lucide-react";
import { useChat } from "@/hooks/use-chat";

export function ChatFooter() {
	const {
		prompt,
		setPrompt,
		handleSubmit,
		handleStop,
		isPending,
		activeConversation,
		selectedModel,
		setSelectedModel,
		selectedAgent,
		setSelectedAgent,
		selectedTools,
		setSelectedTools,
	} = useChat();

	const textareaRef = React.useRef<HTMLTextAreaElement>(null);

	// Check if any message is currently streaming
	const isStreaming =
		activeConversation?.messages.some(
			(m: any) => "isStreaming" in m && m.isStreaming
		) || false;

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	return (
		<footer className="shrink-0 bg-background border-t border-border p-4">
			<div className="mx-auto w-full max-w-3xl flex flex-col gap-2">
				{/* Selectors Row */}
				<div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
					<Select value={selectedModel} onValueChange={setSelectedModel}>
						<SelectTrigger className="h-8 w-[140px] text-xs bg-background border-border focus:ring-0 focus:ring-offset-0">
							<SelectValue placeholder="Model" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="gpt-4">GPT-4</SelectItem>
							<SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
							<SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
							<SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
						</SelectContent>
					</Select>

					<Select value={selectedAgent} onValueChange={setSelectedAgent}>
						<SelectTrigger className="h-8 w-[140px] text-xs bg-background border-border focus:ring-0 focus:ring-offset-0">
							<SelectValue placeholder="Agent" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="default">General Assistant</SelectItem>
							<SelectItem value="coder">Code Expert</SelectItem>
							<SelectItem value="writer">Writer</SelectItem>
							<SelectItem value="researcher">Researcher</SelectItem>
						</SelectContent>
					</Select>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="h-8 text-xs border-border">
								Tools {selectedTools.length > 0 && `(${selectedTools.length})`}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<DropdownMenuLabel>Available Tools</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem
								checked={selectedTools.includes("web_search")}
								onCheckedChange={(checked) => {
									if (checked) setSelectedTools([...selectedTools, "web_search"]);
									else setSelectedTools(selectedTools.filter((t) => t !== "web_search"));
								}}
							>
								Web Search
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={selectedTools.includes("code_interpreter")}
								onCheckedChange={(checked) => {
									if (checked) setSelectedTools([...selectedTools, "code_interpreter"]);
									else setSelectedTools(selectedTools.filter((t) => t !== "code_interpreter"));
								}}
							>
								Code Interpreter
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={selectedTools.includes("file_system")}
								onCheckedChange={(checked) => {
									if (checked) setSelectedTools([...selectedTools, "file_system"]);
									else setSelectedTools(selectedTools.filter((t) => t !== "file_system"));
								}}
							>
								File System
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Input Area */}
				<div className="relative flex items-end gap-2 rounded-xl border border-input bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
					<Button
						variant="ghost"
						size="icon"
						className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
						aria-label="Attach File"
					>
						<Plus size={20} />
					</Button>

					<Textarea
						ref={textareaRef}
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						placeholder="Message Genie..."
						className="min-h-[20px] w-full resize-none border-0 bg-transparent p-2 shadow-none focus-visible:ring-0 text-base"
						rows={1}
						onKeyDown={handleKeyDown}
						disabled={isPending}
						style={{ maxHeight: "200px" }}
					/>

					<div className="flex items-center gap-1 pb-1">
						{isStreaming ? (
							<Button
								size="icon"
								className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
								onClick={handleStop}
							>
								<Square size={14} fill="currentColor" />
							</Button>
						) : (
							<Button
								size="icon"
								className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
								onClick={() => handleSubmit()}
								disabled={!prompt.trim() || isPending}
							>
								{isPending ? (
									<Loader2 size={16} className="animate-spin" />
								) : (
									<ChevronUp size={20} />
								)}
							</Button>
						)}
					</div>
				</div>

				<div className="text-center">
					<span className="text-[10px] text-muted-foreground">
						Genie can make mistakes. Check important info.
					</span>
				</div>
			</div>
		</footer>
	);
}
