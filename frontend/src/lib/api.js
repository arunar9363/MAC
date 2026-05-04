import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 min for AI processing
})

// Request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('mac-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) {
        config.headers['Authorization'] = `Bearer ${state.token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mac-auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
