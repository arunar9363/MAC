import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: null, // null = follow system

      // Apply theme to <html>
      _apply: (t) => {
        const root = document.documentElement
        root.classList.remove('dark', 'light')
        root.classList.add(t)
        root.setAttribute('data-theme', t)
      },

      // Initialise on app mount
      init: () => {
        const stored = get().theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const resolved = stored || (prefersDark ? 'dark' : 'light')
        get()._apply(resolved)

        // Listen for OS preference changes (only when theme is null / system)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (!get().theme) {
            get()._apply(e.matches ? 'dark' : 'light')
          }
        })
      },

      toggle: () => {
        const root = document.documentElement
        const isDark = root.classList.contains('dark')
        const next = isDark ? 'light' : 'dark'
        get()._apply(next)
        set({ theme: next })
      },

      setTheme: (t) => {
        if (t === 'system') {
          set({ theme: null })
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          get()._apply(prefersDark ? 'dark' : 'light')
        } else {
          get()._apply(t)
          set({ theme: t })
        }
      },

      isDark: () => document.documentElement.classList.contains('dark'),
    }),
    {
      name: 'mac-theme',
      partialize: (s) => ({ theme: s.theme }),
    }
  )
)

export default useThemeStore
