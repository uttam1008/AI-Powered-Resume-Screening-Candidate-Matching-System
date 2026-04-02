/**
 * src/store/index.ts
 * Zustand global UI store (non-server state).
 * Server state is managed by React Query.
 */
import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void

  selectedJobId: string | null
  setSelectedJobId: (id: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  selectedJobId: null,
  setSelectedJobId: (id) => set({ selectedJobId: id }),
}))
