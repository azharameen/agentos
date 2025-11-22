"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
	children: ReactNode;
	onReset?: () => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

/**
 * Specialized Error Boundary for chat components
 * Provides chat-specific fallback UI and recovery options
 */
export class ChatErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Log to error reporting service
		console.error("ChatErrorBoundary caught an error:", error, errorInfo);

		// TODO: Send to error tracking service (e.g., Sentry)
		// errorReportingService.logError(error, errorInfo);
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
		});

		// Call parent reset handler if provided
		this.props.onReset?.();
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex h-full items-center justify-center p-8">
					<div className="max-w-md space-y-4 text-center">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
							<MessageCircle className="h-8 w-8 text-destructive" />
						</div>
						<div>
							<h3 className="text-lg font-semibold">Chat Error</h3>
							<p className="text-sm text-muted-foreground">
								The chat component encountered an error. Your conversation is
								safe.
							</p>
						</div>
						{process.env.NODE_ENV === "development" && this.state.error && (
							<div className="rounded-md bg-muted p-3 text-left">
								<p className="text-xs font-mono text-destructive break-all">
									{this.state.error.toString()}
								</p>
							</div>
						)}
						<Button
							onClick={this.handleReset}
							variant="outline"
							className="w-full"
						>
							<RefreshCw className="mr-2 h-4 w-4" />
							Retry
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
