import axios from 'axios'

// Using relative baseURL so Vite proxy routes requests to http://127.0.0.1:8000
// seamlessly without any cross-origin restrictions in the browser.
const baseURL = import.meta.env.VITE_API_URL || ''

const client = axios.create({
  baseURL,
  // timeout: 80000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    console.warn('[ORCA API]', err.config?.url, err.message)
    return Promise.reject(err)
  }
)

export default client
