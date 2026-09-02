import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AuthProvider from './auth/AuthProvider.jsx'
import './index.css'
import App from './App.jsx'

// No publishable key to check any more: authentication is served by our own ASP.NET Core API,
// so the app boots even before the backend is reachable.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
