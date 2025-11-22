"use client";

import { Suspense, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PanelErrorBoundary } from "./PanelErrorBoundary";
import { PanelLoader } from "./loading/ComponentLoader";
import dynamic from "next/dynamic";

const ContextPanel = dynamic(
    () => import("./context-panel").then((mod) => ({ default: mod.ContextPanel })),
    {
        loading: () => <PanelLoader message="Loading context..." />,
        ssr: false,
    }
);

const ContentSafetyPanel = dynamic(
    () => import("./ContentSafetyPanel").then((mod) => ({ default: mod.ContentSafetyPanel })),
    {
        loading: () => <PanelLoader message="Loading safety..." />,
        ssr: false,
    }
);

interface RightPanelContentProps {
    setRightPanelOpen: (open: boolean) => void;
}

export function RightPanelContent({ setRightPanelOpen }: RightPanelContentProps) {
    const [activeTab, setActiveTab] = useState("context");

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="context">Context</TabsTrigger>
                <TabsTrigger value="safety">Safety</TabsTrigger>
            </TabsList>

            <TabsContent value="context" className="flex-1 mt-0 overflow-auto">
                <PanelErrorBoundary panelName="Context Panel">
                    <Suspense fallback={<PanelLoader message="Loading context..." />}>
                        <ContextPanel setRightPanelOpen={setRightPanelOpen} />
                    </Suspense>
                </PanelErrorBoundary>
            </TabsContent>

            <TabsContent value="safety" className="flex-1 mt-0 overflow-auto">
                <PanelErrorBoundary panelName="Content Safety">
                    <Suspense fallback={<PanelLoader message="Loading safety..." />}>
                        <ContentSafetyPanel />
                    </Suspense>
                </PanelErrorBoundary>
            </TabsContent>
        </Tabs>
    );
}
