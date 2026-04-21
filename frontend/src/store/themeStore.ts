import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light' | 'auto'
type Language = 'ru' | 'en'

interface ThemeState {
  theme: Theme
  language: Language
  setTheme: (theme: Theme) => void
  setLanguage: (lang: Language) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'ru',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'dchat-theme' }
  )
)