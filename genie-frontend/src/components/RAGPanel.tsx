"use client";

import { useState, useEffect } from "react";
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, Database, Search } from "lucide-react";
import ENV from "@/lib/env";

interface Document {
    id: string;
    content: string;
    metadata?: Record<string, any>;
}

export function RAGPanel() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [newDocContent, setNewDocContent] = useState("");
    const [newDocMetadata, setNewDocMetadata] = useState("");
    const [query, setQuery] = useState("");
    const [queryResults, setQueryResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            const response = await fetch(`${ENV.API_URL}/rag/documents`);
            if (response.ok) {
                const data = await response.json();
                setDocuments(data.documents || []);
            }
        } catch (error) {
            console.error("Failed to load documents", error);
        }
    };

    const addDocument = async () => {
        if (!newDocContent.trim()) {
            toast({
                title: "Validation Error",
                description: "Document content cannot be empty",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            let metadata = {};
            if (newDocMetadata.trim()) {
                try {
                    metadata = JSON.parse(newDocMetadata);
                } catch (e) {
                    toast({
                        title: "Invalid Metadata",
                        description: "Metadata must be valid JSON",
                        variant: "destructive",
                    });
                    setLoading(false);
                    return;
                }
            }

            const response = await fetch(`${ENV.API_URL}/rag/documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    documents: [
                        {
                            pageContent: newDocContent,
                            metadata,
                        },
                    ],
                }),
            });

            if (!response.ok) throw new Error("Failed to add document");

            toast({
                title: "Success",
                description: "Document added successfully",
            });

            setNewDocContent("");
            setNewDocMetadata("");
            loadDocuments();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to add document",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const clearDocuments = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${ENV.API_URL}/rag/documents`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Failed to clear documents");

            toast({
                title: "Success",
                description: "All documents cleared",
            });

            setDocuments([]);
            setShowClearDialog(false);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to clear documents",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const queryKnowledgeBase = async () => {
        if (!query.trim()) {
            toast({
                title: "Validation Error",
                description: "Query cannot be empty",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(
                `${ENV.API_URL}/rag/query?query=${encodeURIComponent(query)}&topK=5`
            );

            if (!response.ok) throw new Error("Query failed");

            const data = await response.json();
            setQueryResults(data.results || []);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to query knowledge base",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 p-4 h-full flex flex-col overflow-hidden">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        RAG Document Management
                    </CardTitle>
                    <CardDescription>
                        Manage knowledge base documents ({documents.length} document
                        {documents.length !== 1 ? "s" : ""})
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Document Content</Label>
                        <Textarea
                            placeholder="Enter document content (max 25,000 chars)..."
                            value={newDocContent}
                            onChange={(e) => setNewDocContent(e.target.value)}
                            rows={4}
                            maxLength={25000}
                        />
                        <div className="text-xs text-muted-foreground text-right">
                            {newDocContent.length} / 25,000
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Metadata (Optional JSON)</Label>
                        <Input
                            placeholder='{"source": "manual", "category": "tech"}'
                            value={newDocMetadata}
                            onChange={(e) => setNewDocMetadata(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={addDocument} disabled={loading}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Document
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => setShowClearDialog(true)}
                            disabled={loading || documents.length === 0}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear All
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Search className="h-4 w-4" />
                        Query Knowledge Base
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Search knowledge base..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && queryKnowledgeBase()}
                        />
                        <Button onClick={queryKnowledgeBase} disabled={loading}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>

                    {queryResults.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-auto">
                            {queryResults.map((result, idx) => (
                                <Card key={idx} className="p-3">
                                    <div className="text-xs text-muted-foreground mb-1">
                                        Score: {result.score?.toFixed(4) || "N/A"}
                                    </div>
                                    <div className="text-sm">{result.pageContent}</div>
                                    {result.metadata && Object.keys(result.metadata).length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {JSON.stringify(result.metadata)}
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear All Documents?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete all {documents.length} documents from
                            the knowledge base. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={clearDocuments}>
                            Clear All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
