import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post('/auth/login', { email, password })
          const { user, token } = res.data
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          set({ user, token, isLoading: false })
          return { success: true }
        } catch (err) {
          const msg = err.response?.data?.message || 'Login failed'
          set({ error: msg, isLoading: false })
          return { success: false, error: msg }
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post('/auth/register', { name, email, password })
          const { user, token } = res.data
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          set({ user, token, isLoading: false })
          return { success: true }
        } catch (err) {
          const msg = err.response?.data?.message || 'Registration failed'
          set({ error: msg, isLoading: false })
          return { success: false, error: msg }
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization']
        set({ user: null, token: null })
      },

      initAuth: () => {
        const { token } = get()
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
      },
    }),
    {
      name: 'mac-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)

export default useAuthStore
