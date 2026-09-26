import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useGlobal } from '../context/GlobalContext'
import { endpoints } from '../api'
import MapCanvas from '../components/map/MapCanvas'
import OceanSensorRibbon from '../components/ocean/OceanSensorRibbon'
import TimeScrubber from '../components/ocean/TimeScrubber'
import ExportMenu from '../components/ocean/ExportMenu'
import {
  Globe2,
  Columns,
  Maximize2,
  Info,
  Layers,
  Sparkles,
  Compass,
  Clock,
} from 'lucide-react'

export default function OceanExplorer() {
  const { location, timeOffset, setTimeOffset, t } = useGlobal()
  const [compareMode, setCompareMode] = useState(false)

  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  // Query Oceanographic Satellite Data (SST, Chl-a, Upwelling)
  const { data: oceanData, isLoading: oceanLoading } = useQuery({
    queryKey: ['ocean-data', lat, lon, timeOffset],
    queryFn: async () => {
      const res = await endpoints.ocean(lat, lon, 'all', timeOffset)
      return res.data
    },
    staleTime: 60000,
  })

  // Query Safety Conditions (Forecasted wave, wind, swell, temp at target timeOffset)
  const { data: safetyData, isLoading: safetyLoading } = useQuery({
    queryKey: ['safety', lat, lon, timeOffset],
    queryFn: async () => {
      const res = await endpoints.safety(lat, lon, timeOffset)
      return res.data
    },
    refetchInterval: 60000,
  })

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3 pb-8">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-navy text-saffron flex items-center justify-center shadow-xs flex-shrink-0">
            <Globe2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-black text-navy leading-tight tracking-tight">
                {t('Ocean Explorer — Multi-Layer GIS Workspace')}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-oceanBlue hidden sm:inline">
                {t('ISRO OCM-3 & Copernicus')}
              </span>
            </div>
            <p className="text-[11px] text-textMuted leading-none mt-0.5">
              {t('Live Satellite Fronts · Bathymetry Contours · Dynamic Currents · Geofenced Maritime Zones')}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Live vs Forecast Mode Toggle Pill */}
          {timeOffset === 0 ? (
            <button
              id="ocean-live-forecast-toggle"
              onClick={() => setTimeOffset(6)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 shadow-2xs"
              title="Currently showing Live Telemetry. Click to switch to +6h Forecast"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{t('Live Now (0h)')}</span>
            </button>
          ) : (
            <button
              id="ocean-live-forecast-toggle"
              onClick={() => setTimeOffset(0)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer bg-oceanBlue text-white border-oceanBlue shadow-md hover:bg-navy"
              title="Click to reset to Live real-time observations"
            >
              <Clock size={13} />
              <span>+{timeOffset}h {t('Forecast Active')} &bull; {t('Reset')}</span>
            </button>
          )}

          {/* Compare Mode Toggle */}
          <button
            id="ocean-compare-mode-btn"
            onClick={() => setCompareMode(!compareMode)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
              compareMode
                ? 'bg-oceanBlue text-white border-oceanBlue shadow-md'
                : 'bg-white hover:bg-surface text-navy border-borderLight shadow-2xs'
            }`}
            title="Toggle Side-by-Side Dual Map Comparison Mode"
          >
            <Columns size={14} />
            <span>{compareMode ? t('Exit Compare') : t('Compare Mode')}</span>
          </button>

          {/* Export Menu */}
          <ExportMenu oceanData={oceanData} safetyData={safetyData} />
        </div>
      </div>

      {/* ── Real-Time Satellite Sensor Ribbon ─────────────────────── */}
      <OceanSensorRibbon
        oceanData={oceanData}
        safetyData={safetyData}
        isLoading={oceanLoading || safetyLoading}
      />

      {/* ── Main GIS Map Canvas Workspace ─────────────────────────── */}
      <div className="flex-1 min-h-[580px] w-full rounded-3xl overflow-hidden shadow-card border border-borderLight relative flex flex-col">
        {!compareMode ? (
          /* Single Master Map View */
          <div className="w-full h-full relative flex-1 min-h-[580px]">
            <MapCanvas
              className="w-full h-full min-h-[580px]"
              pageContext="oceanMaster"
              defaultBaseMap="satellite"
            />
          </div>
        ) : (
          /* Split Dual Map Compare Mode View */
          <div className="w-full h-full flex flex-col md:flex-row flex-1 min-h-[580px] divide-y md:divide-y-0 md:divide-x divide-borderLight">
            {/* Left Pane: True Color Satellite + Marine Boundaries */}
            <div className="flex-1 relative flex flex-col min-h-[300px]">
              <div className="absolute top-3 left-3 z-10 bg-navy/90 text-white px-3 py-1 rounded-xl text-xs font-bold backdrop-blur-md border border-white/20 shadow-md">
                {t('Pane A: ESRI True-Color Satellite & Hazards')}
              </div>
              <MapCanvas
                className="w-full h-full flex-1"
                pageContext="oceanHazards"
                defaultBaseMap="satellite"
              />
            </div>

            {/* Right Pane: Mission Control Dark + Thermal / Ecological Frontiers */}
            <div className="flex-1 relative flex flex-col min-h-[300px]">
              <div className="absolute top-3 left-3 z-10 bg-navy/90 text-white px-3 py-1 rounded-xl text-xs font-bold backdrop-blur-md border border-white/20 shadow-md">
                {t('Pane B: Carto Dark Marine & Ecological Sanctuaries')}
              </div>
              <MapCanvas
                className="w-full h-full flex-1"
                pageContext="oceanEcology"
                defaultBaseMap="carto_dark"
              />
            </div>
          </div>
        )}

        {/* ── Floating Forecast Horizon Banner ─────────────────── */}
        {timeOffset > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl shadow-xl text-xs text-white animate-slideIn max-w-[90vw]">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
            <div className="flex items-center gap-1.5 font-bold text-cyan-300 uppercase tracking-wider text-[10px]">
              <Clock size={12} />
              <span>{t('Forecast Mode')}</span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="font-medium text-slate-100 truncate">
              {safetyData?.conditions?.target_time ? (
                <>
                  Valid: <strong className="text-white font-mono">{new Date(safetyData.conditions.target_time).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                </>
              ) : (
                <>
                  Horizon: <strong className="text-white font-mono">+{timeOffset} Hours Ahead</strong>
                </>
              )}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 font-mono font-bold text-[10px] border border-cyan-400/40">
              +{timeOffset}h
            </span>
            <button
              onClick={() => setTimeOffset(0)}
              className="ml-1 px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white text-white hover:text-slate-950 font-bold text-[10px] transition-all cursor-pointer"
              title="Reset map and sensor layers to real-time live data"
            >
              {t('Reset to Live')}
            </button>
          </div>
        )}

        {/* ── Bottom Floating Time Scrubber (0h to 48h Forecast) ─── */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-4 w-full flex justify-center">
          <TimeScrubber />
        </div>
      </div>
    </div>
  )
}
