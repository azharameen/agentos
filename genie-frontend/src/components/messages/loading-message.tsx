"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { LoadingMessage as LoadingMessageType } from "@/lib/types";

type LoadingMessageProps = {
	message: LoadingMessageType;
};

export const LoadingMessage = ({ message }: LoadingMessageProps) => {
	return (
		<div className="my-4 flex items-center justify-center gap-4">
			<Card className="w-full max-w-md bg-card/80 backdrop-blur-sm">
				<CardContent className="p-3">
					<div className="flex items-center gap-3">
						<div className="flex-shrink-0 rounded-full bg-primary/10 p-1.5">
							<Loader2 className="size-5 animate-spin text-primary" />
						</div>
						<div className="flex-1 text-sm">
							<p className="font-semibold text-foreground">
								{message.content || "Agent is thinking..."}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
