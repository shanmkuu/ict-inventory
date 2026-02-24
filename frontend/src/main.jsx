import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import LockdownScreen from './components/LockdownScreen'

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
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
