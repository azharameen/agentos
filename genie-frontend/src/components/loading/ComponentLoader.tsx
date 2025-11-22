"use client";

import { Loader2 } from "lucide-react";

interface ComponentLoaderProps {
	message?: string;
}

/**
 * Loading fallback component for lazy-loaded components
 * Shows centered spinner with optional message
 */
export function ComponentLoader({
	message = "Loading...",
}: ComponentLoaderProps) {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<div className="flex flex-col items-center gap-3">
				<Loader2 className="h-8 w-8 animate-spin text-muted-blue-500" />
				<p className="text-sm text-text-light">{message}</p>
			</div>
		</div>
	);
}

/**
 * Minimal loading fallback for panels (smaller)
 */
export function PanelLoader({ message = "Loading..." }: ComponentLoaderProps) {
	return (
		<div className="flex h-32 w-full items-center justify-center">
			<div className="flex flex-col items-center gap-2">
				<Loader2 className="h-6 w-6 animate-spin text-muted-blue-500" />
				<p className="text-xs text-text-light">{message}</p>
			</div>
		</div>
	);
}

/**
 * Full-screen loading fallback for page-level components
 */
export function PageLoader({
	message = "Loading application...",
}: ComponentLoaderProps) {
	return (
		<div className="flex h-screen w-screen items-center justify-center bg-background-main">
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="h-12 w-12 animate-spin text-muted-blue-500" />
				<p className="text-base text-text-main">{message}</p>
			</div>
		</div>
	);
}
