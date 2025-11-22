/**
 * Session Management Service
 * Handles session persistence, loading, and synchronization with backend
 * With automatic retry logic for failed requests
 */

import type { Conversation } from "./types";
import ENV from "./env";
import { fetchWithRetry, RetryPresets } from "./retry";

export interface SessionMetadata {
  sessionId: string;
  summary: string;
  messageCount: number;
  createdAt: string;
  lastUpdated: string;
}

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, Conversation> = new Map();
  private activeSessions: Set<string> = new Set();

  private constructor() {
    this.loadFromLocalStorage();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Load sessions from localStorage on init
   */
  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem("genie-sessions");
      if (stored) {
        const parsed = JSON.parse(stored);
        this.sessions = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error("Failed to load sessions from localStorage:", error);
    }
  }

  /**
   * Save sessions to localStorage
   */
  private saveToLocalStorage() {
    try {
      const obj = Object.fromEntries(this.sessions);
      localStorage.setItem("genie-sessions", JSON.stringify(obj));
    } catch (error) {
      console.error("Failed to save sessions to localStorage:", error);
    }
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Conversation[] {
    return Array.from(this.sessions.values()).sort((a, b) => {
      const lastA = a.messages[a.messages.length - 1];
      const lastB = b.messages[b.messages.length - 1];
      const aTime = (lastA && 'createdAt' in lastA) ? lastA.createdAt : a.id;
      const bTime = (lastB && 'createdAt' in lastB) ? lastB.createdAt : b.id;
      return (bTime || '').localeCompare(aTime || '');
    });
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): Conversation | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Create a new session
   */
  createSession(summary: string): Conversation {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const conversation: Conversation = {
      id: sessionId,
      summary,
      messages: []
    };
    this.sessions.set(sessionId, conversation);
    this.activeSessions.add(sessionId);
    this.saveToLocalStorage();
    return conversation;
  }

  /**
   * Update session
   */
  updateSession(sessionId: string, updates: Partial<Conversation>) {
    const session = this.sessions.get(sessionId);
    if (session) {
      const updated = { ...session, ...updates };
      this.sessions.set(sessionId, updated);
      this.saveToLocalStorage();
    }
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string) {
    this.sessions.delete(sessionId);
    this.activeSessions.delete(sessionId);
    this.saveToLocalStorage();
  }

  /**
   * Rename session
   */
  renameSession(sessionId: string, newSummary: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.summary = newSummary;
      this.saveToLocalStorage();
    }
  }

  /**
   * Load sessions from backend
   * PERFORMANCE FIX: Now supports request cancellation and retry logic
   */
  async loadFromBackend(signal?: AbortSignal): Promise<SessionMetadata[]> {
    try {
      const response = await fetchWithRetry(
        `${ENV.API_URL}/memory/sessions`,
        { signal },
        {
          ...RetryPresets.standard,
          onRetry: (attempt, error) => {
            console.warn(`Retrying session load (attempt ${attempt}):`, error.message);
          },
        },
      );
      const data = await response.json();
      return data.sessions || [];
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Failed to load sessions from backend:", error);
      }
      return [];
    }
  }

  /**
   * Clear a session from backend
   * PERFORMANCE FIX: Now supports request cancellation and retry logic
   */
  async clearSessionOnBackend(sessionId: string, signal?: AbortSignal): Promise<void> {
    try {
      await fetchWithRetry(
        `${ENV.API_URL}/memory/sessions/${sessionId}`,
        {
          method: "DELETE",
          signal,
        },
        {
          ...RetryPresets.standard,
          onRetry: (attempt, error) => {
            console.warn(`Retrying session clear (attempt ${attempt}):`, error.message);
          },
        },
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Failed to clear session on backend:", error);
        throw error;
      }
    }
  }

  /**
   * Export all sessions
   */
  exportSessions(): string {
    const data = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      sessions: Array.from(this.sessions.values())
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import sessions
   */
  importSessions(jsonData: string) {
    try {
      const data = JSON.parse(jsonData);
      if (data.sessions && Array.isArray(data.sessions)) {
        for (const session of data.sessions as Conversation[]) {
          this.sessions.set(session.id, session);
        }
        this.saveToLocalStorage();
      }
    } catch (error) {
      console.error("Failed to import sessions:", error);
      throw error;
    }
  }

  /**
   * Clear all sessions
   */
  clearAll() {
    this.sessions.clear();
    this.activeSessions.clear();
    this.saveToLocalStorage();
  }
}

export const sessionManager = SessionManager.getInstance();
