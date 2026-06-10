import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { DataProvider } from '@/contexts/DataContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AuthProvider>
      <DataProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </DataProvider>
    </AuthProvider>
  </BrowserRouter>,
)
