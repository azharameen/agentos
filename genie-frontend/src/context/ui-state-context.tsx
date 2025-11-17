"use client";

import React, { createContext, useState, useContext } from "react";

interface UIStateContextType {
  isLeftSidebarOpen: boolean;
  activeLeftPanel: string;
  isRightPanelOpen: boolean;
  toggleLeftSidebar: (panel?: string) => void;
  setRightPanelOpen: (isOpen: boolean) => void;
  setActiveLeftPanel: (panel: string) => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export const UIStateProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [activeLeftPanel, setActiveLeftPanel] = useState("sessions");
  const [isRightPanelOpen, setRightPanelOpen] = useState(false);

  const toggleLeftSidebar = (panel?: string) => {
    if (panel && activeLeftPanel === panel && isLeftSidebarOpen) {
      setIsLeftSidebarOpen(false);
    } else if (panel) {
      setActiveLeftPanel(panel);
      setIsLeftSidebarOpen(true);
    } else {
      setIsLeftSidebarOpen(!isLeftSidebarOpen);
    }
  };

  return (
    <UIStateContext.Provider
      value={{
        isLeftSidebarOpen,
        activeLeftPanel,
        isRightPanelOpen,
        toggleLeftSidebar,
        setRightPanelOpen,
        setActiveLeftPanel,
      }}
    >
      {children}
    </UIStateContext.Provider>
  );
};

export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (context === undefined) {
    throw new Error("useUIState must be used within a UIStateProvider");
  }
  return context;
};
