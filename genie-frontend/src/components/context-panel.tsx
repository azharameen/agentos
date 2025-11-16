import React, { useState } from "react";
import { X, Search, FileText } from "lucide-react";

interface ContextPanelProps {
  setRightPanelOpen: (open: boolean) => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  setRightPanelOpen,
}) => {
  const [activeTab, setActiveTab] = useState("rag");
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="flex flex-col h-full p-4 bg-background-light border-l border-border-light">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-main">Context Panel</h2>
        <button
          className="text-text-light hover:text-text-main"
          onClick={() => setRightPanelOpen(false)}
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex border-b border-border-light">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "rag"
              ? "text-primary border-b-2 border-primary"
              : "text-text-light hover:text-text-main"
          }`}
          onClick={() => setActiveTab("rag")}
        >
          RAG
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "kb"
              ? "text-primary border-b-2 border-primary"
              : "text-text-light hover:text-text-main"
          }`}
          onClick={() => setActiveTab("kb")}
        >
          Knowledge Base
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "memory"
              ? "text-primary border-b-2 border-primary"
              : "text-text-light hover:text-text-main"
          }`}
          onClick={() => setActiveTab("memory")}
        >
          Memory
        </button>
      </div>
      <div className="flex-1 overflow-y-auto mt-4">
        {activeTab === "rag" && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light"
              />
              <input
                className="form-input w-full pl-10 pr-4 py-2 rounded-lg bg-background-dark border border-border-light focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Search in RAG sources..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-background-dark">
                <div className="flex-shrink-0 size-10 flex items-center justify-center rounded-lg bg-background-dark border border-border-light">
                  <FileText size={20} className="text-text-light" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-main">
                    Onboarding_Guide_v2.pdf
                  </p>
                  <p className="text-xs text-text-light">
                    ...relevant document content...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-2 rounded-lg hover:bg-background-dark">
                <div className="flex-shrink-0 size-10 flex items-center justify-center rounded-lg bg-background-dark border border-border-light">
                  <FileText size={20} className="text-text-light" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-main">
                    API_Documentation.docx
                  </p>
                  <p className="text-xs text-text-light">
                    Snippet of the relevant document...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "kb" && (
          <div>
            <p className="text-text-light">Knowledge base content will appear here.</p>
          </div>
        )}
        {activeTab === "memory" && (
          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg bg-background-dark border border-border-light">
              <p className="text-xs font-medium text-text-light uppercase mb-1">
                Current Topic
              </p>
              <p className="text-sm text-text-main">Onboarding Guide v2</p>
            </div>
            <div className="p-3 rounded-lg bg-background-dark border border-border-light">
              <p className="text-xs font-medium text-text-light uppercase mb-1">
                User Goal
              </p>
              <p className="text-sm text-text-main">Summarize key document points</p>
            </div>
            <div className="p-3 rounded-lg bg-background-dark border border-border-light">
              <p className="text-xs font-medium text-text-light uppercase mb-1">
                Mentioned Files
              </p>
              <p className="text-sm text-text-main">Onboarding_Guide_v2.pdf</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
