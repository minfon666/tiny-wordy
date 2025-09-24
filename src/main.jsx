import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

function Root() {
  useEffect(() => {
    // Inject manifest link tag in case index.html wasn't updated
    const existing = document.querySelector('link[rel="manifest"]')
    if (!existing) {
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = '/manifest.json'
      document.head.appendChild(link)
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {})
      })
    }
  }, [])
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
