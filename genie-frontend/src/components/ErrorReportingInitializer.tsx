"use client";

import { useEffect } from "react";
import { errorReportingService } from "@/lib/error-reporting";

/**
 * Initializes error reporting service on app mount
 * Place this in the root layout to initialize once
 */
export function ErrorReportingInitializer() {
	useEffect(() => {
		errorReportingService.initialize({
			environment: process.env.NODE_ENV,
			// dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, // Uncomment when Sentry is configured
		});
	}, []);

	return null;
}
