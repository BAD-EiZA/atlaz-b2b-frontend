// lib/api.ts
import axios from "axios"

// helper ambil accessToken dari cookie (client-side)
const getAccessToken = () => {
  if (typeof document === "undefined") return null

  const tokenCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("accessToken="))

  if (!tokenCookie) return null

  return tokenCookie.split("=")[1] || null
}

// instance axios utama
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4002",
  withCredentials: true, // kalau masih pakai cookie lain (refreshToken, dll)
})

// interceptor untuk auto-attach Authorization header
api.interceptors.request.use((config) => {
  const token = getAccessToken()

  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`
  }

  return config
})

export default api
