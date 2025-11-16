import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

interface Document {
  id: string;
  name: string;
  content: string;
}

export const KnowledgeBasePanel: React.FC = () => {
  const [searchValue, setSearchValue] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newDocumentContent, setNewDocumentContent] = useState("");
  const [newDocumentName, setNewDocumentName] = useState("");
  const [isAddSourceOpen, setAddSourceOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3001/rag/documents");
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const data = await response.json();
      // Transform the array of strings into an array of Document objects
      const formattedDocuments = data.documents.map((docName: string, index: number) => ({
        id: `${docName}-${index}`, // Create a unique ID
        name: docName,
        content: '', // Content is not provided by this endpoint
      }));
      setDocuments(formattedDocuments);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleSearch = async () => {
    if (!searchValue) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const response = await fetch("http://localhost:3001/rag/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchValue }),
      });
      if (!response.ok) {
        throw new Error("Failed to perform search");
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleAddSource = async () => {
    if (!newDocumentContent || !newDocumentName) return;
    try {
      const response = await fetch("http://localhost:3001/rag/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: [newDocumentContent],
          metadata: [{ source: newDocumentName }],
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to add source");
      }
      setNewDocumentContent("");
      setNewDocumentName("");
      await fetchDocuments(); // Refresh the document list
      setTimeout(() => {
        setAddSourceOpen(false); // Close the dialog
      }, 500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-light">
          search
        </span>
        <input
          className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main focus:outline-0 focus:ring-1 focus:ring-primary border-border-light bg-background-dark h-10 placeholder:text-text-light pl-10 text-sm font-normal leading-normal"
          placeholder="Search knowledge base..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>
      <Dialog open={isAddSourceOpen} onOpenChange={setAddSourceOpen}>
        <DialogTrigger asChild>
          <Button className="w-full flex items-center justify-center gap-2 rounded-lg bg-muted-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-muted-blue-500/90">
            <span className="material-symbols-outlined">add</span>
            Add Source
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Source</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Source Name (e.g., my_document.txt)"
              value={newDocumentName}
              onChange={(e) => setNewDocumentName(e.target.value)}
            />
            <Textarea
              placeholder="Paste document content here..."
              value={newDocumentContent}
              onChange={(e) => setNewDocumentContent(e.target.value)}
              rows={10}
            />
            <Button onClick={handleAddSource}>Add Source</Button>
          </div>
        </DialogContent>
      </Dialog>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {isSearching && <p>Searching...</p>}
      
      {searchResults.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Search Results</h3>
          {searchResults.map((result, index) => (
            <div key={index} className="p-2 rounded-lg bg-background-dark border border-border-light text-xs">
              <p>{result.pageContent}</p>
              <p className="text-text-light text-right">{result.metadata.source}</p>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && searchResults.length === 0 && (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => (
            <div key={doc.id} className="p-2 rounded-lg bg-background-dark border border-border-light text-xs">
              <p>{doc.name}</p>
            </div>
          ))}
        </div>
      )}
      {!loading && documents.length === 0 && searchResults.length === 0 && (
        <p className="text-text-light text-sm p-2 text-center">
          No active sources.
        </p>
      )}
    </div>
  );
};
