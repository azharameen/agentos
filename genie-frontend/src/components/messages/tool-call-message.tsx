"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader, CheckCircle2 } from "lucide-react";
import type { ToolCallMessage as ToolCallMessageType } from "@/lib/types";

type ToolCallMessageProps = {
	message: ToolCallMessageType;
};

export const ToolCallMessage = ({ message }: ToolCallMessageProps) => {
	const isStarted = message.status === "started";
	const durationText = message.duration
		? `${(message.duration / 1000).toFixed(2)}s`
		: null;

	return (
		<div className="my-4 flex items-center justify-center gap-4">
			<Card className="w-full max-w-md bg-card/80 backdrop-blur-sm">
				<CardContent className="p-3">
					<div className="flex items-center gap-3">
						<div
							className={cn(
								"flex-shrink-0 rounded-full p-1.5",
								isStarted ? "bg-amber-500/10" : "bg-green-500/10"
							)}
						>
							{isStarted ? (
								<Loader className="size-5 animate-spin text-amber-500" />
							) : (
								<CheckCircle2 className="size-5 text-green-500" />
							)}
						</div>
						<div className="flex-1 text-sm">
							<p className="font-semibold text-foreground">
								{isStarted ? "Using Tool" : "Tool Used"}
							</p>
							<p className="text-muted-foreground">{message.toolName}</p>
							{durationText && !isStarted && (
								<p className="text-xs text-muted-foreground/70">
									{durationText}
								</p>
							)}
						</div>
						{!isStarted && message.result && (
							<p className="rounded-md bg-secondary/50 px-2 py-1 text-xs text-muted-foreground">
								{message.result}
							</p>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
