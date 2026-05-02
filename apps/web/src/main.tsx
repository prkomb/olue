import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import App from './App.tsx'
import { ChatRoute } from '@/routes/chat'
import { CompetitorDetailRoute } from '@/routes/competitor-detail'
import { DashboardRoute } from '@/routes/dashboard'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <BrowserRouter>
          <Routes>
            <Route element={<App />}>
              <Route index element={<DashboardRoute />} />
              <Route path="chat" element={<ChatRoute />} />
              <Route path="competitors/:id" element={<CompetitorDetailRoute />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster richColors closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
)
