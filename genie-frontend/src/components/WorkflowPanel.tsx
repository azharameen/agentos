"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Play, Loader2, GitBranch, RefreshCw } from "lucide-react";
import ENV from "@/lib/env";

interface Workflow {
    name: string;
    versions: string[];
}

export function WorkflowPanel() {
    const [workflows, setWorkflows] = useState<string[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState<string>("");
    const [versions, setVersions] = useState<string[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<string>("");
    const { toast } = useToast();
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        loadWorkflows();
    }, []);

    useEffect(() => {
        if (selectedWorkflow) {
            loadVersions(selectedWorkflow);
        }
    }, [selectedWorkflow]);

    const loadWorkflows = async () => {
        try {
            const response = await fetch(`${ENV.API_URL}/workflow/workflows`);
            if (response.ok) {
                const data = await response.json();
                setWorkflows(data);
            }
        } catch (error) {
            console.error("Failed to load workflows", error);
        }
    };

    const loadVersions = async (name: string) => {
        try {
            const response = await fetch(`${ENV.API_URL}/workflow/workflows/${name}/versions`);
            if (response.ok) {
                const data = await response.json();
                setVersions(data.map((v: any) => String(v.version)));
            }
        } catch (error) {
            console.error("Failed to load versions", error);
        }
    };

    const executeWorkflow = async () => {
        if (!selectedWorkflow || !prompt) {
            toast({
                title: "Validation Error",
                description: "Please select a workflow and enter a prompt",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        setOutput("");
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(
                `${ENV.API_URL}/workflow/workflows/${selectedWorkflow}/execute/stream`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt,
                        version: selectedVersion || undefined,
                    }),
                    signal: abortControllerRef.current.signal,
                }
            );

            if (!response.ok) throw new Error("Execution failed");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n").filter((line) => line.trim() !== "");

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line);
                        if (json.type === "chunk") {
                            setOutput((prev) => prev + json.content);
                        } else if (json.type === "RUN_ERROR") {
                            throw new Error(json.data.error);
                        }
                    } catch (e) {
                        // If not JSON, just append text (fallback)
                        console.warn("Failed to parse chunk", line);
                    }
                }
            }
        } catch (error: any) {
            if (error.name === "AbortError") {
                toast({ title: "Cancelled", description: "Workflow execution cancelled" });
            } else {
                toast({
                    title: "Error",
                    description: error.message || "Failed to execute workflow",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const stopExecution = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    return (
        <div className="space-y-4 p-4 h-full flex flex-col">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5" />
                        Workflow Execution
                    </CardTitle>
                    <CardDescription>
                        Execute and monitor agent workflows
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Workflow</Label>
                            <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select workflow..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {workflows.map((w) => (
                                        <SelectItem key={w} value={w}>
                                            {w}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Version (Optional)</Label>
                            <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Latest" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Latest</SelectItem>
                                    {versions.map((v) => (
                                        <SelectItem key={v} value={v}>
                                            {v}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Prompt</Label>
                        <Textarea
                            placeholder="Enter your prompt for the workflow..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        {loading ? (
                            <Button variant="destructive" onClick={stopExecution}>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Stop
                            </Button>
                        ) : (
                            <Button onClick={executeWorkflow} disabled={!selectedWorkflow || !prompt}>
                                <Play className="mr-2 h-4 w-4" />
                                Execute
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Output</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-4 pt-0">
                    <div className="bg-muted p-4 rounded-lg h-full overflow-auto font-mono text-sm whitespace-pre-wrap">
                        {output || "Waiting for execution..."}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
