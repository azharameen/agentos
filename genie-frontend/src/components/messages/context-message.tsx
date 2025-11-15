"use client";

import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import type { ContextMessage as ContextMessageType } from "@/lib/types";

type ContextMessageProps = {
	message: ContextMessageType;
};

export const ContextMessage = ({ message }: ContextMessageProps) => {
	return (
		<div className="my-4 flex items-center justify-center gap-4">
			<Card className="w-full max-w-2xl bg-blue-500/10 backdrop-blur-sm border-blue-500/20">
				<CardContent className="p-3">
					<div className="flex items-start gap-3">
						<div className="flex-shrink-0 rounded-full bg-blue-500/10 p-1.5">
							<FileText className="size-5 text-blue-500" />
						</div>
						<div className="flex-1 text-sm">
							<p className="font-semibold text-foreground mb-1">
								{message.source
									? `Context from ${message.source}`
									: "Retrieved Context"}
							</p>
							<p className="text-muted-foreground text-xs whitespace-pre-wrap line-clamp-3">
								{message.content}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
