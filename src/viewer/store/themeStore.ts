import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  // Theme mode
  theme: 'light' | 'dark';
  
  // Actions
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'dark', // Default to dark theme
      
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
        
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'agent-monitor-theme', // localStorage key
    }
  )
);