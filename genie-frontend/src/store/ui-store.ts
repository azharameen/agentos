import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type LeftPanelType = 'sessions' | 'memory' | 'kb' | 'projects' | 'settings' | 'profile';

interface UIState {
  // Left sidebar
  isLeftSidebarOpen: boolean;
  activeLeftPanel: LeftPanelType;

  // Right panel
  isRightPanelOpen: boolean;

  // Actions
  toggleLeftSidebar: (panel?: LeftPanelType) => void;
  setLeftSidebarOpen: (isOpen: boolean) => void;
  setActiveLeftPanel: (panel: LeftPanelType) => void;
  setRightPanelOpen: (isOpen: boolean) => void;
  toggleRightPanel: () => void;
}

/**
 * ZUSTAND STORE: UI State Management
 * 
 * Manages all UI-related state (sidebars, panels, modals).
 * Persisted to localStorage for consistent UX across sessions.
 */
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isLeftSidebarOpen: true,
        activeLeftPanel: 'sessions',
        isRightPanelOpen: false,

        // Actions
        toggleLeftSidebar: (panel?) => {
          const { isLeftSidebarOpen, activeLeftPanel } = get();

          if (panel) {
            // If clicking same panel, toggle sidebar
            if (panel === activeLeftPanel) {
              set({ isLeftSidebarOpen: !isLeftSidebarOpen });
            } else {
              // If clicking different panel, switch panel and ensure sidebar is open
              set({ activeLeftPanel: panel, isLeftSidebarOpen: true });
            }
          } else {
            // No panel specified, just toggle
            set({ isLeftSidebarOpen: !isLeftSidebarOpen });
          }
        },

        setLeftSidebarOpen: (isOpen) => set({ isLeftSidebarOpen: isOpen }),

        setActiveLeftPanel: (panel) => set({ activeLeftPanel: panel }),

        setRightPanelOpen: (isOpen) => set({ isRightPanelOpen: isOpen }),

        toggleRightPanel: () =>
          set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          isLeftSidebarOpen: state.isLeftSidebarOpen,
          activeLeftPanel: state.activeLeftPanel,
          isRightPanelOpen: state.isRightPanelOpen,
        }),
      }
    ),
    { name: 'UIStore' }
  )
);
