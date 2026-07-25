import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
})

// Attach JWT on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('efg_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 (expired token) and 403 (suspended account)
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('efg_user')
      localStorage.removeItem('efg_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
