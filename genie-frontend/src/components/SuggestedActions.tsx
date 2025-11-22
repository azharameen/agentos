"use client";

import React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Code, FileEdit, Sparkles } from "lucide-react";

interface SuggestedAction {
	id: string;
	type: string;
	description: string;
	canExecute: boolean;
}

interface SuggestedActionsProps {
	actions: SuggestedAction[];
	onActionClick?: (action: SuggestedAction) => void;
}

const getActionIcon = (type: string) => {
	switch (type) {
		case "code_generation":
			return <Code className="h-4 w-4" />;
		case "code_modification":
		case "code_refactoring":
			return <FileEdit className="h-4 w-4" />;
		case "analysis":
			return <Sparkles className="h-4 w-4" />;
		default:
			return <Lightbulb className="h-4 w-4" />;
	}
};

const getActionColor = (type: string) => {
	switch (type) {
		case "code_generation":
			return "bg-green-100 text-green-800 border-green-200";
		case "code_modification":
		case "code_refactoring":
			return "bg-blue-100 text-blue-800 border-blue-200";
		case "analysis":
			return "bg-purple-100 text-purple-800 border-purple-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
};

/**
 * PERFORMANCE: Memoized to prevent re-renders when actions haven't changed
 */
export const SuggestedActions = React.memo<SuggestedActionsProps>(
	function SuggestedActions({ actions, onActionClick }) {
		if (!actions || actions.length === 0) {
			return null;
		}

		return (
			<Card className="mt-4 border-l-4 border-l-primary">
				<CardHeader className="pb-3">
					<CardTitle className="text-base flex items-center gap-2">
						<Lightbulb className="h-4 w-4" />
						Suggested Actions
					</CardTitle>
					<CardDescription>
						{actions.length} suggestion{actions.length > 1 ? "s" : ""} based on
						your query
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					{actions.map((action) => (
						<div
							key={action.id}
							className="flex items-start gap-3 p-3 rounded-lg border bg-background-light hover:bg-background-dark transition-colors"
						>
							<div className="mt-0.5">{getActionIcon(action.type)}</div>
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-1">
									<Badge
										variant="outline"
										className={`text-xs ${getActionColor(action.type)}`}
									>
										{action.type.replace(/_/g, " ")}
									</Badge>
								</div>
								<p className="text-sm text-text-primary">
									{action.description}
								</p>
							</div>
							{action.canExecute && onActionClick && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => onActionClick(action)}
								>
									Apply
								</Button>
							)}
						</div>
					))}
				</CardContent>
			</Card>
		);
	},
	(prevProps, nextProps) => {
		// PERFORMANCE: Only re-render if actions array length or individual action ids change
		if (prevProps.actions.length !== nextProps.actions.length) return false;

		// Quick check: compare action ids
		for (let i = 0; i < prevProps.actions.length; i++) {
			if (prevProps.actions[i].id !== nextProps.actions[i].id) return false;
		}

		return true;
	}
);
