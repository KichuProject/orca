import React from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GlobalProvider } from './context/GlobalContext'
import TopNav   from './components/layout/TopNav'
import Sidebar  from './components/layout/Sidebar'
import Footer   from './components/layout/Footer'
import HomeDashboard from './pages/HomeDashboard'
import AskPage from './pages/AskPage'
import OceanExplorer from './pages/OceanExplorer'
import SafetyAdvisoryPage from './pages/SafetyAdvisoryPage'
import RoutePlannerPage from './pages/RoutePlannerPage'
import FisheriesIntelligencePage from './pages/FisheriesIntelligencePage'
import EcologyPage from './pages/EcologyPage'
import GeofencingPage from './pages/GeofencingPage'
import AlertsPage from './pages/AlertsPage'
import ReportsPage from './pages/ReportsPage'
import DataSourcesPage from './pages/DataSourcesPage'
import AboutPage from './pages/AboutPage'
import OrcaMascotCompanion from './components/mascot/OrcaMascotCompanion'
import { useGlobal } from './context/GlobalContext'

// styles loaded via index.css in main.jsx

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

// ── Inner layout (needs context) ─────────────────────────────────
function AppLayout({ children }) {
  const { sidebarOpen } = useGlobal()
  const location = useLocation()
  const isAskPage = location.pathname === '/ask'

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Navigation Bar */}
      <TopNav />

      {/* Body: sidebar + main in a flex row */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar: sticky under TopNav */}
        <Sidebar open={sidebarOpen} />

        {/* Main content area */}
        <main
          id="main-content"
          className="flex-1 flex flex-col min-w-0 bg-[#f4f7fb] overflow-y-auto relative"
        >
          <div className="p-3 md:p-6 flex-1 flex flex-col min-h-0">
            {/* Page content */}
            <div className="flex-1 flex flex-col min-h-0">
              {children}
            </div>
          </div>
          {!isAskPage && <Footer />}

          {/* 3D Interactive AI Marine Mascot Companion */}
          <OrcaMascotCompanion />
        </main>
      </div>
    </div>
  )
}

// ── Root ─────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomeDashboard />} />
        <Route path="/ask" element={<AskPage />} />
        <Route path="/ocean" element={<OceanExplorer />} />
        <Route path="/safety" element={<SafetyAdvisoryPage />} />
        <Route path="/navigation" element={<RoutePlannerPage />} />
        <Route path="/routes" element={<RoutePlannerPage />} />
        <Route path="/fisheries" element={<FisheriesIntelligencePage />} />
        <Route path="/ecology" element={<EcologyPage />} />
        <Route path="/geofencing" element={<GeofencingPage />} />
        <Route path="/geofence" element={<GeofencingPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/data" element={<DataSourcesPage />} />
        <Route path="/data-sources" element={<DataSourcesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <GlobalProvider>
          <AppRoutes />
        </GlobalProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
