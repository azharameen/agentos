"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  content: string;
  metadata: Record<string, any>;
  createdAt: string; // ISO string from API
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export function KnowledgeBase() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = API_URL ? `${API_URL}/rag/documents` : "/rag/documents";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("files", file);
    }

    try {
      const url = API_URL ? `${API_URL}/rag/documents` : "/rag/documents";
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload documents");
      }

      toast({
        title: "Success",
        description: "Documents uploaded successfully.",
      });
      fetchDocuments(); // Refresh the document list
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input type="search" placeholder="Search in RAG sources..." aria-label="Search RAG sources" />
        <div>
          <input
            ref={inputRef}
            id="file-upload"
            type="file"
            multiple
            className="sr-only"
            onChange={handleFileUpload}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} aria-controls="file-upload">
            Upload
          </Button>
        </div>
      </div>
      <ScrollArea className="h-48">
        {isLoading && <p>Loading documents...</p>}
        {error && <p className="text-destructive">{error}</p>}
        {!isLoading && !error && (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="text-sm p-2 rounded-md bg-muted">
                {doc.metadata?.source || doc.id}
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
