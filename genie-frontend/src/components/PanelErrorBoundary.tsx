"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
	children: ReactNode;
	panelName: string;
}

interface State {
	hasError: boolean;
}

/**
 * Lightweight Error Boundary for sidebar panels
 * Shows minimal error UI without disrupting the entire application
 */
export class PanelErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
		};
	}

	static getDerivedStateFromError(): Partial<State> {
		return { hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error(
			`PanelErrorBoundary (${this.props.panelName}) caught an error:`,
			error,
			errorInfo
		);

		// TODO: Send to error tracking service
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex h-full items-center justify-center p-4">
					<div className="max-w-sm space-y-2 text-center">
						<AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">
							{this.props.panelName} unavailable
						</p>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
