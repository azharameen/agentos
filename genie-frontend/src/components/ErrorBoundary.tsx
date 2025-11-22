"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorReportingService } from "@/lib/error-reporting";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	context?: string;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors and prevent app crashes
 * Wraps the application to provide graceful error handling
 */
export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		// Update state so the next render will show the fallback UI
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Log error details for debugging
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		// Report to error tracking service
		errorReportingService.logError(error, {
			component: this.props.context || "ErrorBoundary",
			componentStack: errorInfo.componentStack,
		});

		this.setState({
			error,
			errorInfo,
		});
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	handleReload = () => {
		window.location.reload();
	};

	render() {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<div className="flex min-h-screen items-center justify-center bg-background p-4">
					<div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/20 bg-card p-6 shadow-lg">
						<div className="flex items-center gap-3">
							<div className="rounded-full bg-destructive/10 p-3">
								<AlertTriangle className="h-6 w-6 text-destructive" />
							</div>
							<div>
								<h2 className="text-xl font-semibold">Something went wrong</h2>
								<p className="text-sm text-muted-foreground">
									We encountered an unexpected error
								</p>
							</div>
						</div>

						{process.env.NODE_ENV === "development" && this.state.error && (
							<div className="rounded-md bg-muted p-4">
								<p className="text-sm font-mono text-destructive break-all">
									{this.state.error.toString()}
								</p>
								{this.state.errorInfo && (
									<details className="mt-2">
										<summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
											Stack trace
										</summary>
										<pre className="mt-2 max-h-48 overflow-auto text-xs text-muted-foreground">
											{this.state.errorInfo.componentStack}
										</pre>
									</details>
								)}
							</div>
						)}

						<div className="flex gap-3">
							<Button
								onClick={this.handleReset}
								variant="outline"
								className="flex-1"
							>
								Try Again
							</Button>
							<Button
								onClick={this.handleReload}
								variant="default"
								className="flex-1"
							>
								Reload Page
							</Button>
						</div>

						<p className="text-center text-xs text-muted-foreground">
							If the problem persists, please contact support
						</p>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
