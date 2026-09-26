import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, MapPin, Download, Network, Award, ShieldCheck, Clock } from 'lucide-react'
import { useGlobal } from '../context/GlobalContext'
import { endpoints } from '../api'
import ReportGeneratorForm from '../components/reports/ReportGeneratorForm'
import ReportDocumentModal from '../components/reports/ReportDocumentModal'
import KnowledgeGraphViewer from '../components/reports/KnowledgeGraphViewer'

export default function ReportsPage() {
  const { location, t } = useGlobal()
  const [activeReportData, setActiveReportData] = useState(null)

  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  // 1. Live Safety & Weather Telemetry
  const { data: safetyData } = useQuery({
    queryKey: ['safety-report', lat, lon],
    queryFn: async () => (await endpoints.safety(lat, lon)).data,
    staleTime: 120000,
  })

  // 2. Live INCOIS PFZ & Fishery Intelligence
  const { data: pfzData } = useQuery({
    queryKey: ['pfz-report', lat, lon],
    queryFn: async () => (await endpoints.pfz(lat, lon)).data,
    staleTime: 120000,
  })

  // 3. Live Geofence & Maritime Boundaries
  const { data: geofenceData } = useQuery({
    queryKey: ['geofence-report', lat, lon],
    queryFn: async () => (await endpoints.geofence(lat, lon)).data,
    staleTime: 120000,
  })

  // 4. Live Hazards & Cyclones
  const { data: hazardsData } = useQuery({
    queryKey: ['hazards-report', lat, lon],
    queryFn: async () => (await endpoints.hazards(lat, lon)).data,
    staleTime: 120000,
  })

  // 5. Live Bhuvan Ecology & MPAs
  const { data: ecologyData } = useQuery({
    queryKey: ['ecology-report', lat, lon],
    queryFn: async () => (await endpoints.bhuvanEcology(lat, lon)).data,
    staleTime: 120000,
  })

  // 6. Live Seasonal Fishing Ban
  const { data: seasonalBanData } = useQuery({
    queryKey: ['seasonal-ban-report', lat, lon],
    queryFn: async () => (await endpoints.seasonalBan(lat, lon)).data,
    staleTime: 300000,
  })

  // 7. Live IMD Weather Bulletins
  const { data: bulletinsData } = useQuery({
    queryKey: ['bulletins-report'],
    queryFn: async () => (await endpoints.bulletins()).data?.bulletins || [],
    staleTime: 120000,
  })

  // 8. Autonomous Marine Knowledge Graph
  const { data: graphData, isLoading: isGraphLoading, refetch: refetchGraph } = useQuery({
    queryKey: ['marine-graph', lat, lon],
    queryFn: async () => (await endpoints.graph(lat, lon)).data,
    staleTime: 300000,
  })

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-12">
      {/* ── Top Header Strip ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center shadow-xs flex-shrink-0">
            <FileText size={19} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-navy leading-tight tracking-tight">
              {t('Official Marine Intelligence Reports & Dossiers')}
            </h1>
            <p className="text-[11px] text-textMuted mt-0.5 flex items-center gap-1">
              <MapPin size={11} className="text-oceanBlue" />
              <span>{t('Active Fix:')} <strong className="text-navy">{location.name}</strong> ({lat.toFixed(4)}°N, {lon.toFixed(4)}°E)</span>
            </p>
          </div>
        </div>

        {/* <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 font-bold flex items-center gap-1.5 shadow-2xs">
            <Clock size={13} className="text-amber-600" />
            <span>{t('To be developed in future')}</span>
          </span>
        </div> */}
      </div>

      {/* ── 1. Marine Intelligence Report Configurator ─────────────── */}
      {/* <ReportGeneratorForm onGenerate={(data) => setActiveReportData(data)} /> */}

      {/* ── 2. Interactive Autonomous Knowledge Graph (/api/graph) ──── */}
      <KnowledgeGraphViewer
        graphData={graphData}
        isLoading={isGraphLoading}
        onRefresh={refetchGraph}
      />

      {/* Printable Report Modal */}
      {activeReportData && (
        <ReportDocumentModal
          reportData={activeReportData}
          safetyData={safetyData}
          pfzData={pfzData}
          geofenceData={geofenceData}
          hazardsData={hazardsData}
          ecologyData={ecologyData}
          seasonalBanData={seasonalBanData}
          bulletinsData={bulletinsData}
          onClose={() => setActiveReportData(null)}
        />
      )}
    </div>
  )
}
