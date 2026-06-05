import axios from "axios"
import API_URL from "../config"

const api = axios.create({ baseURL: API_URL })

// Attach JWT to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export default api
