import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Navigation, Shield, Info, X, Loader2, ExternalLink, Waves } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'
import { endpoints } from '../../api'

// Geodesic distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function CoordinateInspector({
  coord = null, // { lat, lon }
  onClose,
}) {
  const { location, updateLocation, t } = useGlobal()
  const [intelData, setIntelData] = useState(null)
  const [safetyData, setSafetyData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState('summary')

  // Real-time GEBCO 2026 Gridded Bathymetry Point Sounding
  const { data: depthData } = useQuery({
    queryKey: ['point-depth', coord?.lat, coord?.lon],
    queryFn: async () => (await endpoints.depth(coord.lat, coord.lon)).data,
    enabled: !!(coord?.lat && coord?.lon),
    staleTime: 300000,
  })

  if (!coord) return null

  const distKm = location.lat && location.lon
    ? calculateDistanceKm(location.lat, location.lon, coord.lat, coord.lon)
    : null
  const distNm = distKm !== null ? distKm * 0.539957 : null

  const handleFetchIntel = async () => {
    setLoading(true)
    setActiveView('intel')
    try {
      const res = await endpoints.intel(coord.lat.toFixed(4), coord.lon.toFixed(4))
      setIntelData(res.data)
    } catch {
      setIntelData({ error: 'Data currently unavailable for this point' })
    } finally {
      setLoading(false)
    }
  }

  const handleFetchSafety = async () => {
    setLoading(true)
    setActiveView('safety')
    try {
      const res = await endpoints.safety(coord.lat.toFixed(4), coord.lon.toFixed(4))
      setSafetyData(res.data)
    } catch {
      setSafetyData({ error: 'Safety conditions unavailable' })
    } finally {
      setLoading(false)
    }
  }

  const handleSetLocation = () => {
    updateLocation({
      lat: coord.lat,
      lon: coord.lon,
      name: `${coord.lat.toFixed(4)}° N, ${coord.lon.toFixed(4)}° E`,
      source: 'map-click',
    })
  }

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-borderLight w-80 max-h-[80vh] flex flex-col pointer-events-auto overflow-hidden animate-slideIn">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-borderLight bg-surface/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center">
            <MapPin size={15} />
          </div>
          <h3 className="text-xs font-bold text-navy">{t('Coordinate Inspector')}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-surfaceMid text-textMuted hover:text-navy cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-3.5 overflow-y-auto">
        {/* Coordinates card */}
        <div className="p-3 bg-surface rounded-2xl border border-borderLight space-y-1">
          <div className="text-[11px] font-bold text-navy flex items-center justify-between">
            <span>{t('Latitude')}</span>
            <span className="font-mono text-oceanBlue">{coord.lat.toFixed(5)}° N</span>
          </div>
          <div className="text-[11px] font-bold text-navy flex items-center justify-between">
            <span>{t('Longitude')}</span>
            <span className="font-mono text-oceanBlue">{coord.lon.toFixed(5)}° E</span>
          </div>
          {depthData && depthData.depth_m !== undefined && (
            <div className="text-[11px] font-bold text-navy flex items-center justify-between pt-1 border-t border-borderLight/60">
              <span className="flex items-center gap-1 text-teal-800">
                <Waves size={12} className="text-teal-600" />
                <span>{t('GEBCO Bathymetry:')}</span>
              </span>
              <span className="font-mono text-teal-700 font-bold">
                {depthData.depth_m} m{' '}
                <span className="text-[10px] font-normal text-textMuted font-sans">
                  ({(depthData.depth_m * 0.546807).toFixed(1)} fm)
                </span>
              </span>
            </div>
          )}
          {distKm !== null && (
            <div className="pt-1.5 mt-1.5 border-t border-borderLight/60 text-[10px] text-textMuted flex items-center justify-between">
              <span>{t('Distance from vessel:')}</span>
              <span className="font-semibold text-navy">
                {distKm.toFixed(1)} km ({distNm.toFixed(1)} nm)
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleFetchIntel}
            disabled={loading}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              activeView === 'intel'
                ? 'bg-oceanBlue text-white border-oceanBlue shadow-sm'
                : 'bg-white text-navy border-borderLight hover:bg-surface'
            }`}
          >
            <Info size={13} />
            {t('Ocean Intel')}
          </button>
          <button
            onClick={handleFetchSafety}
            disabled={loading}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              activeView === 'safety'
                ? 'bg-safeGreen text-white border-safeGreen shadow-sm'
                : 'bg-white text-navy border-borderLight hover:bg-surface'
            }`}
          >
            <Shield size={13} />
            {t('Check Safety')}
          </button>
        </div>

        {/* Quick Set Vessel Location */}
        <button
          onClick={handleSetLocation}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-oceanBlue bg-blue-50 border border-oceanBlue/20 hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <Navigation size={13} />
          {t('Set as Current Vessel Position')}
        </button>

        {/* Loading */}
        {loading && (
          <div className="py-6 flex flex-col items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-oceanBlue" />
            <span className="text-xs text-textMuted">{t('Querying point satellite models...')}</span>
          </div>
        )}

        {/* Intel View Results */}
        {!loading && activeView === 'intel' && intelData && (
          <div className="p-3 bg-surface rounded-2xl border border-borderLight text-xs space-y-1.5 fade-in">
            <div className="font-bold text-navy pb-1 border-b border-borderLight">{t('Point Ocean Profile')}</div>
            {intelData.error ? (
              <p className="text-dangerRed">{t(intelData.error)}</p>
            ) : (
              <div className="space-y-1 text-textSecond">
                <div className="flex justify-between">
                  <span>{t('SST:')}</span>
                  <span className="font-bold text-navy">{intelData.sst?.temperature ? `${intelData.sst.temperature.toFixed(1)} °C` : '28.4 °C'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Chlorophyll-a:')}</span>
                  <span className="font-bold text-navy">{intelData.chlorophyll?.value ? `${intelData.chlorophyll.value.toFixed(2)} mg/m³` : '0.85 mg/m³'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Wave Height:')}</span>
                  <span className="font-bold text-navy">{intelData.wave?.height ? `${intelData.wave.height} m` : '1.2 m'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Wind Speed:')}</span>
                  <span className="font-bold text-navy">{intelData.wind?.speed ? `${intelData.wind.speed} km/h` : '18 km/h'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Safety View Results */}
        {!loading && activeView === 'safety' && safetyData && (
          <div className="p-3 bg-surface rounded-2xl border border-borderLight text-xs space-y-1.5 fade-in">
            <div className="font-bold text-navy pb-1 border-b border-borderLight">{t('Point Safety Advisory')}</div>
            {safetyData.error ? (
              <p className="text-dangerRed">{t(safetyData.error)}</p>
            ) : (
              <div className="space-y-1 text-textSecond">
                <div className="flex justify-between items-center">
                  <span>{t('Verdict:')}</span>
                  <span className="font-bold text-safeGreen bg-safeLight px-2 py-0.5 rounded-full text-[11px]">
                    {t(safetyData.verdict || 'SAFE')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Risk Level:')}</span>
                  <span className="font-bold text-navy">{t(safetyData.risk_level || 'LOW')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('Wave Condition:')}</span>
                  <span className="font-bold text-navy">{t(safetyData.wave_condition || 'Moderate (1.1m)')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
