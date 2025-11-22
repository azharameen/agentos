"use client";

import dynamic from "next/dynamic";
import { PageLoader } from "@/components/loading/ComponentLoader";

/**
 * PERFORMANCE: Lazy load GenieUI to reduce initial bundle size
 * GenieUI is the main chat interface - can be loaded after critical path
 */
const GenieUI = dynamic(
	() =>
		import("@/components/genie-ui").then((mod) => ({ default: mod.GenieUI })),
	{
		loading: () => <PageLoader message="Loading Genie..." />,
		ssr: false, // Client-only component with hooks
	}
);

export default function Home() {
	return (
		<div className="h-screen overflow-hidden">
			<GenieUI />
		</div>
	);
}
