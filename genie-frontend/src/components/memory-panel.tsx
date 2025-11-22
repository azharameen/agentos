import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw, Eye, Trash2 } from "lucide-react";
import ENV from "@/lib/env";
import { useToast } from "@/hooks/use-toast";

interface SessionSummary {
  sessionId: string;
  messageCount: number;
  lastUpdated: string;
  createdAt: string;
}

interface SessionDetails {
  messages: Array<{
    role: string;
    content: string;
    created_at: string;
  }>;
}

export const MemoryPanel: React.FC = () => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const { toast } = useToast();

  const loadSessions = async (page = 1) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pagination.limit;
      const response = await fetch(
        `${ENV.API_URL}/memory/sessions?limit=${pagination.limit}&offset=${offset}`
      );

      if (!response.ok) throw new Error("Failed to fetch sessions");

      const data = await response.json();
      setSessions(data.sessions || []);
      setPagination(prev => ({
        ...prev,
        page,
        total: data.total || 0
      }));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${ENV.API_URL}/memory/sessions/${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch details");

      const data = await response.json();

      // Handle different response structures
      if (Array.isArray(data)) {
        // If data is directly an array of messages
        setSessionDetails({ messages: data });
      } else if (data.messages && Array.isArray(data.messages)) {
        // If data has a messages property that's an array
        setSessionDetails({ messages: data.messages });
      } else {
        // Fallback: empty array
        setSessionDetails({ messages: [] });
        console.warn('Unexpected session details structure:', data);
      }

      setSelectedSession(sessionId);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      setSessionDetails({ messages: [] }); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions(pagination.page);
  }, [pagination.page]);

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-4 p-4">
      {selectedSession ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Session Details</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedSession(null)}>
                Back to List
              </Button>
            </CardTitle>
            <CardDescription>{selectedSession}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {sessionDetails?.messages && Array.isArray(sessionDetails.messages) && sessionDetails.messages.length > 0 ? (
                sessionDetails.messages.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-secondary/10 mr-8'
                    }`}>
                    <p className="text-xs font-bold mb-1 uppercase">{msg.role}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center p-4">
                  No messages found in this session
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Memory Sessions</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadSessions(pagination.page)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </CardTitle>
            <CardDescription>
              {pagination.total} total sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between rounded-lg border border-border-light p-3 hover:bg-background-light"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {session.sessionId}
                    </p>
                    <div className="flex gap-4 text-xs text-text-secondary mt-1">
                      <span>{session.messageCount} messages</span>
                      <span>Updated: {new Date(session.lastUpdated).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadSessionDetails(session.sessionId)}
                  >
                    <Eye className="h-4 w-4" />
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
                disabled={pagination.page === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-sm text-text-secondary">
                Page {pagination.page} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
