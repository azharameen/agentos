"use client";

import React from "react";
import { Wrench, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { ToolCallBlock as ToolCallBlockType } from "@/lib/types";

type ToolCallBlockProps = {
	block: ToolCallBlockType;
};

/**
 * ToolCallBlock - Inline tool execution display
 * Shows tool name, status, and result inline with text content
 * GitHub Copilot style - compact, status-aware, no bubbles
 */
export const ToolCallBlock: React.FC<ToolCallBlockProps> = ({ block }) => {
	const { toolName, status, result, duration } = block;

	// Status styling
	const getStatusColor = () => {
		switch (status) {
			case "started":
				return "text-blue-500 bg-blue-50 border-blue-200";
			case "running":
				return "text-blue-500 bg-blue-50 border-blue-200";
			case "completed":
				return "text-green-600 bg-green-50 border-green-200";
			case "error":
				return "text-red-600 bg-red-50 border-red-200";
			default:
				return "text-gray-500 bg-gray-50 border-gray-200";
		}
	};

	const getStatusIcon = () => {
		switch (status) {
			case "started":
			case "running":
				return <Loader2 size={14} className="animate-spin" />;
			case "completed":
				return <CheckCircle size={14} />;
			case "error":
				return <XCircle size={14} />;
			default:
				return <Wrench size={14} />;
		}
	};

	const getStatusText = () => {
		switch (status) {
			case "started":
				return "Starting...";
			case "running":
				return "Running...";
			case "completed":
				return duration ? `Completed (${duration}ms)` : "Completed";
			case "error":
				return "Failed";
			default:
				return "Unknown";
		}
	};

	return (
		<div
			className={`inline-block px-3 py-2 rounded-lg border ${getStatusColor()} max-w-full`}
		>
			<div className="flex items-center gap-2">
				<Wrench size={14} className="flex-shrink-0" />
				<div className="flex-1 min-w-0">
					<div className="text-sm font-medium truncate">{toolName}</div>
					<div className="flex items-center gap-1 text-xs">
						{getStatusIcon()}
						<span>{getStatusText()}</span>
					</div>
				</div>
			</div>
			{result && status === "completed" && (
				<div className="mt-2 text-xs text-gray-700 whitespace-pre-wrap border-t border-current/20 pt-2">
					{result}
				</div>
			)}
			{result && status === "error" && (
				<div className="mt-2 text-xs text-red-700 whitespace-pre-wrap border-t border-current/20 pt-2">
					Error: {result}
				</div>
			)}
		</div>
	);
};
