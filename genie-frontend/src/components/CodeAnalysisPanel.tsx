"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Code, FileCode, Network, Search } from "lucide-react";
import ENV from "@/lib/env";

interface Project {
    name: string;
    path: string;
}

export function CodeAnalysisPanel() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [filePath, setFilePath] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const response = await fetch(`${ENV.API_URL}/agent/projects?pageSize=100`);
            if (response.ok) {
                const data = await response.json();
                setProjects(data.projects || []);
            }
        } catch (error) {
            console.error("Failed to load projects", error);
        }
    };

    const analyzeFile = async () => {
        if (!selectedProject || !filePath) {
            toast({
                title: "Validation Error",
                description: "Please select a project and enter a file path",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${ENV.API_URL}/agent/analyze/file`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectName: selectedProject,
                    path: filePath,
                    detailed: true,
                }),
            });

            if (!response.ok) throw new Error("Analysis failed");

            const data = await response.json();
            setResult(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to analyze file",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const analyzeModule = async () => {
        if (!selectedProject || !filePath) {
            toast({
                title: "Validation Error",
                description: "Please select a project and enter a module path",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${ENV.API_URL}/agent/analyze/module`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectName: selectedProject,
                    path: filePath,
                }),
            });

            if (!response.ok) throw new Error("Analysis failed");

            const data = await response.json();
            setResult(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to analyze module",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const getDependencies = async () => {
        if (!selectedProject) {
            toast({
                title: "Validation Error",
                description: "Please select a project",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${ENV.API_URL}/agent/analyze/dependencies?projectName=${selectedProject}`
            );

            if (!response.ok) throw new Error("Failed to get dependencies");

            const data = await response.json();
            setResult(data);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to get dependencies",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Code Analysis Tools
                    </CardTitle>
                    <CardDescription>
                        Analyze files, modules, and dependencies in your registered projects
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Select Project</Label>
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a project..." />
                            </SelectTrigger>
                            <SelectContent>
                                {projects.map((p) => (
                                    <SelectItem key={p.name} value={p.name}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Tabs defaultValue="file" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="file">File Analysis</TabsTrigger>
                            <TabsTrigger value="module">Module Analysis</TabsTrigger>
                            <TabsTrigger value="deps">Dependencies</TabsTrigger>
                        </TabsList>

                        <TabsContent value="file" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>File Path (relative to project root)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="src/app.module.ts"
                                        value={filePath}
                                        onChange={(e) => setFilePath(e.target.value)}
                                    />
                                    <Button onClick={analyzeFile} disabled={loading}>
                                        <FileCode className="mr-2 h-4 w-4" />
                                        Analyze
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="module" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Module Path (directory)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="src/modules/auth"
                                        value={filePath}
                                        onChange={(e) => setFilePath(e.target.value)}
                                    />
                                    <Button onClick={analyzeModule} disabled={loading}>
                                        <Code className="mr-2 h-4 w-4" />
                                        Analyze
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="deps" className="space-y-4 mt-4">
                            <div className="flex justify-end">
                                <Button onClick={getDependencies} disabled={loading}>
                                    <Network className="mr-2 h-4 w-4" />
                                    Generate Graph
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>Analysis Result</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-muted p-4 rounded-lg overflow-auto max-h-[600px]">
                            <pre className="text-xs font-mono">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
