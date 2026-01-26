import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { VibeKanbanWebCompanion } from 'vibe-kanban-web-companion'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <VibeKanbanWebCompanion />
  </StrictMode>,
)
