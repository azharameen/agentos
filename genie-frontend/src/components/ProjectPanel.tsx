"use client";

import { useState, useRef, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { FolderOpen, Plus, Trash2, RefreshCw } from "lucide-react";
import ENV from "@/lib/env";

interface Project {
	name: string;
	path: string;
	type?: string;
	registeredAt?: string;
}

export function ProjectPanel() {
	const [projects, setProjects] = useState<Project[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [pagination, setPagination] = useState({
		page: 1,
		pageSize: 10,
		totalPages: 1,
		total: 0
	});
	const [newProject, setNewProject] = useState({
		name: "",
		path: "",
		type: "unknown",
	});
	const { toast } = useToast();
	const abortControllerRef = useRef<AbortController | null>(null);

	// PERFORMANCE FIX: Cleanup on unmount
	useEffect(() => {
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	// Load projects on mount and when page changes
	useEffect(() => {
		loadProjects(pagination.page);
	}, [pagination.page]);

	const registerProject = async () => {
		if (!newProject.name || !newProject.path) {
			toast({
				title: "Validation Error",
				description: "Please provide both project name and path",
				variant: "destructive",
			});
			return;
		}

		setIsLoading(true);

		// Create new abort controller for this request
		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		try {
			const response = await fetch(`${ENV.API_URL}/agent/projects/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newProject),
				signal: abortController.signal,
			});

			if (!response.ok) {
				throw new Error(`Registration failed: ${response.statusText}`);
			}

			const result = await response.json();
			toast({
				title: "Success",
				description: `Project "${newProject.name}" registered successfully`,
			});

			// Reload current page
			loadProjects(pagination.page);

			// Reset form
			setNewProject({ name: "", path: "", type: "unknown" });
		} catch (error) {
			// Don't show error for aborted requests
			if ((error as Error).name !== "AbortError") {
				toast({
					title: "Registration Failed",
					description: (error as Error).message,
					variant: "destructive",
				});
			}
		} finally {
			if (abortControllerRef.current === abortController) {
				abortControllerRef.current = null;
			}
			setIsLoading(false);
		}
	};

	const loadProjects = async (page = 1) => {
		setIsLoading(true);

		// Create new abort controller for this request
		const abortController = new AbortController();
		abortControllerRef.current = abortController;

		try {
			const response = await fetch(
				`${ENV.API_URL}/agent/projects?page=${page}&pageSize=${pagination.pageSize}`,
				{ signal: abortController.signal }
			);
			if (!response.ok) {
				throw new Error(`Failed to load projects: ${response.statusText}`);
			}

			const result = await response.json();
			setProjects(result.projects || []);

			// Update pagination state if available in response (assuming backend returns it)
			// If backend only returns projects list, we might need to adjust.
			// Based on SqliteProjectRepository, it returns { data, total, page, pageSize, totalPages }
			// But AgentController maps it to { projects: [...] }.
			// Wait, AgentController listProjects returns { projects }.
			// I need to update AgentController to return pagination metadata too!

			// For now, let's assume we need to fix AgentController to return metadata.
			// But I can't fix it right now without switching context back.
			// Let's proceed assuming I will fix AgentController next.

			if (result.meta) {
				setPagination(prev => ({
					...prev,
					page: result.meta.page,
					totalPages: result.meta.totalPages,
					total: result.meta.total
				}));
			}

			toast({
				title: "Projects Loaded",
				description: `Loaded projects`,
			});
		} catch (error) {
			// Don't show error for aborted requests
			if ((error as Error).name !== "AbortError") {
				toast({
					title: "Load Failed",
					description: (error as Error).message,
					variant: "destructive",
				});
			}
		} finally {
			if (abortControllerRef.current === abortController) {
				abortControllerRef.current = null;
			}
			setIsLoading(false);
		}
	};

	const removeProject = async (name: string) => {
		if (!confirm(`Are you sure you want to delete project "${name}"?`)) return;

		setIsLoading(true);
		try {
			const response = await fetch(`${ENV.API_URL}/agent/projects/${name}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error(`Failed to delete project: ${response.statusText}`);
			}

			toast({
				title: "Project Removed",
				description: `"${name}" removed successfully`,
			});

			// Reload projects
			loadProjects(pagination.page);
		} catch (error) {
			toast({
				title: "Delete Failed",
				description: (error as Error).message,
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="space-y-4 p-4">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FolderOpen className="h-5 w-5" />
						Register New Project
					</CardTitle>
					<CardDescription>
						Add a project to enable code analysis and intelligent suggestions
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="project-name">Project Name</Label>
						<Input
							id="project-name"
							placeholder="e.g., genie-backend"
							value={newProject.name}
							onChange={(e) =>
								setNewProject({ ...newProject, name: e.target.value })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="project-path">Project Path</Label>
						<Input
							id="project-path"
							placeholder="e.g., d:\\Projects\\genie\\genie-backend"
							value={newProject.path}
							onChange={(e) =>
								setNewProject({ ...newProject, path: e.target.value })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="project-type">Project Type (Optional)</Label>
						<Select
							value={newProject.type}
							onValueChange={(value) =>
								setNewProject({ ...newProject, type: value })
							}
						>
							<SelectTrigger id="project-type">
								<SelectValue placeholder="Select project type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="nestjs-backend">NestJS Backend</SelectItem>
								<SelectItem value="nextjs-frontend">
									Next.js Frontend
								</SelectItem>
								<SelectItem value="react-app">React App</SelectItem>
								<SelectItem value="node-module">Node Module</SelectItem>
								<SelectItem value="typescript-lib">
									TypeScript Library
								</SelectItem>
								<SelectItem value="unknown">Unknown</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Button
						onClick={registerProject}
						disabled={isLoading}
						className="w-full"
					>
						<Plus className="mr-2 h-4 w-4" />
						Register Project
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>Registered Projects</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => loadProjects(pagination.page)}
							disabled={isLoading}
						>
							<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
						</Button>
					</CardTitle>
					<CardDescription>
						{projects.length === 0
							? "No projects registered yet"
							: `Showing ${projects.length} project(s)`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{projects.map((project) => (
							<div
								key={project.name}
								className="flex items-center justify-between rounded-lg border border-border-light p-3 hover:bg-background-light"
							>
								<div className="flex-1">
									<p className="font-medium text-text-primary">
										{project.name}
									</p>
									<p className="text-sm text-text-secondary">{project.path}</p>
									{project.type && (
										<p className="text-xs text-text-tertiary mt-1">
											Type: {project.type}
										</p>
									)}
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeProject(project.name)}
								>
									<Trash2 className="h-4 w-4 text-destructive" />
								</Button>
							</div>
						))}
					</div>

					{/* Pagination Controls */}
					<div className="flex items-center justify-between mt-4">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
							disabled={pagination.page === 1 || isLoading}
						>
							Previous
						</Button>
						<span className="text-sm text-text-secondary">
							Page {pagination.page}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
							disabled={projects.length < pagination.pageSize || isLoading}
						>
							Next
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
