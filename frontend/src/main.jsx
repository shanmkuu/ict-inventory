import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import LockdownScreen from './components/LockdownScreen'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

const GlobalLockdown = () => (
  <LockdownScreen
    passwordInput=""
    setPasswordInput={() => { }}
    onUnlock={() => window.location.reload()}
    unlockError={false}
  />
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallback={<GlobalLockdown />}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
