import React, { useState } from "react";

interface ContextPanelProps {
  setRightPanelOpen: (open: boolean) => void;
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  setRightPanelOpen,
}) => {
  const [searchValue, setSearchValue] = useState("");
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-main">Context Panel</h2>
        <button
          className="text-text-light hover:text-text-main"
          onClick={() => setRightPanelOpen(false)}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
        <details
          className="group flex flex-col rounded-lg bg-background-dark border border-border-light"
          open
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-text-light">
                manage_search
              </span>
              <p className="text-text-main text-sm font-medium leading-normal">
                RAG
              </p>
            </div>
            <span className="material-symbols-outlined text-text-light transition-transform duration-200 group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="px-3 pb-3">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-light">
                  search
                </span>
                <input
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-text-main focus:outline-0 focus:ring-1 focus:ring-primary border-border-light bg-background-light h-10 placeholder:text-text-light pl-10 text-sm font-normal leading-normal"
                  placeholder="Search in RAG sources..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4 px-2 py-2 justify-between rounded-lg hover:bg-background-light">
                  <div className="flex items-center gap-3">
                    <div className="text-text-light flex items-center justify-center rounded-lg bg-background-light shrink-0 size-10 border border-border-light">
                      <span className="material-symbols-outlined">
                        description
                      </span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-text-main text-sm font-medium leading-normal line-clamp-1">
                        Onboarding_Guide_v2.pdf
                      </p>
                      <p className="text-text-light text-xs font-normal leading-normal line-clamp-1">
                        ...relevant document content appears here...
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-2 py-2 justify-between rounded-lg hover:bg-background-light">
                  <div className="flex items-center gap-3">
                    <div className="text-text-light flex items-center justify-center rounded-lg bg-background-light shrink-0 size-10 border border-border-light">
                      <span className="material-symbols-outlined">
                        description
                      </span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-text-main text-sm font-medium leading-normal line-clamp-1">
                        API_Documentation.docx
                      </p>
                      <p className="text-text-light text-xs font-normal leading-normal line-clamp-1">
                        Snippet of the relevant document...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>
        <details className="group flex flex-col rounded-lg bg-background-dark border border-border-light">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-text-light">
                import_contacts
              </span>
              <p className="text-text-main text-sm font-medium leading-normal">
                Knowledge Base
              </p>
            </div>
            <span className="material-symbols-outlined text-text-light transition-transform duration-200 group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="px-3 pb-3">
            <p className="text-text-light text-sm font-normal leading-normal">
              Knowledge base content will appear here.
            </p>
          </div>
        </details>
        <details className="group flex flex-col rounded-lg bg-background-dark border border-border-light">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 p-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-text-light">
                memory
              </span>
              <p className="text-text-main text-sm font-medium leading-normal">
                Memory
              </p>
            </div>
            <span className="material-symbols-outlined text-text-light transition-transform duration-200 group-open:rotate-180">
              expand_more
            </span>
          </summary>
          <div className="px-3 pb-3">
            <div className="flex border-b border-border-light mb-4">
              <button className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary">
                Short-term
              </button>
              <button className="px-4 py-2 text-sm font-medium text-text-light hover:text-text-main">
                Long-term
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-lg bg-background-light border border-border-light">
                <p className="text-xs font-medium text-text-light uppercase mb-1">
                  Current Topic
                </p>
                <p className="text-sm text-text-main">Onboarding Guide v2</p>
              </div>
              <div className="p-3 rounded-lg bg-background-light border border-border-light">
                <p className="text-xs font-medium text-text-light uppercase mb-1">
                  User Goal
                </p>
                <p className="text-sm text-text-main">
                  Summarize key document points
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background-light border border-border-light">
                <p className="text-xs font-medium text-text-light uppercase mb-1">
                  Mentioned Files
                </p>
                <p className="text-sm text-text-main">
                  Onboarding_Guide_v2.pdf
                </p>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
