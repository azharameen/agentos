"use client";

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import type { ErrorMessage as ErrorMessageType } from "@/lib/types";

type ErrorMessageProps = {
	message: ErrorMessageType;
};

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
	return (
		<div className="my-4 flex items-center justify-center gap-4">
			<Card className="w-full max-w-md bg-red-500/10 backdrop-blur-sm border-red-500/20">
				<CardContent className="p-3">
					<div className="flex items-center gap-3">
						<div className="flex-shrink-0 rounded-full bg-red-500/10 p-1.5">
							<AlertCircle className="size-5 text-red-500" />
						</div>
						<div className="flex-1 text-sm">
							<p className="font-semibold text-foreground">Error</p>
							<p className="text-muted-foreground">{message.content}</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
