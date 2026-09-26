import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Navigation2, MapPin, Gauge, Anchor, ArrowRightLeft, 
  Sparkles, Search, X, ChevronDown, Check, AlertTriangle, Compass 
} from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'
import { endpoints } from '../../api'

export function isSameOrAdjacentPort(p1, p2) {
  if (!p1 || !p2) return false
  const n1 = (p1.name || '').toLowerCase()
  const n2 = (p2.name || '').toLowerCase()
  if (n1 === n2) return true
  
  // Clean city root matching (e.g. Chennai, Visakhapatnam, Kochi, Mumbai)
  const extractRoot = (s) => s.replace(/(port|harbour|fishing|jetty|tamil nadu|andhra pradesh|kerala|gujarat|maharashtra|west bengal|odisha|karnataka|goa|,|\(|\))/gi, ' ').trim()
  const r1 = extractRoot(n1).split(/\s+/)[0]
  const r2 = extractRoot(n2).split(/\s+/)[0]
  if (r1 && r2 && r1.length >= 4 && r2.length >= 4 && (r1 === r2 || r1.includes(r2) || r2.includes(r1))) {
    return true
  }

  // Geographic coordinates proximity (< 18 km)
  if (p1.lat != null && p1.lon != null && p2.lat != null && p2.lon != null) {
    const dLat = Math.abs(p1.lat - p2.lat)
    const dLon = Math.abs(p1.lon - p2.lon)
    if (dLat < 0.16 && dLon < 0.16) return true
  }
  return false
}

export default function RouteSelectorCard({
  origin,
  setOrigin,
  destination,
  setDestination,
  cruiseSpeed,
  setCruiseSpeed,
  onCalculate,
  isLoading,
  inlandWarning,
  isSamePort,
  hasCalculated,
}) {
  const { t } = useGlobal()
  const [originOpen, setOriginOpen] = useState(false)
  const [originSearch, setOriginSearch] = useState('')
  const [destOpen, setDestOpen] = useState(false)
  const [destSearch, setDestSearch] = useState('')
  const [coastFilter, setCoastFilter] = useState('all')

  // Fetch all Indian coastal ports dynamically from backend (zero hardcoding)
  const { data: portsData, isLoading: portsLoading } = useQuery({
    queryKey: ['all-ports-catalog'],
    queryFn: async () => {
      const res = await endpoints.ports(null, null, true)
      return res.data
    },
    staleTime: Infinity,
  })

  const portsList = useMemo(() => {
    return portsData?.ports || []
  }, [portsData])

  // Filter ports for Origin
  const filteredOrigins = useMemo(() => {
    if (!originSearch.trim()) return portsList
    const q = originSearch.toLowerCase().trim()
    return portsList.filter(p => {
      const transName = t ? t(p.name).toLowerCase() : ''
      const transCoast = p.coast && t ? t(p.coast).toLowerCase() : ''
      return p.name.toLowerCase().includes(q) ||
        transName.includes(q) ||
        (p.coast && p.coast.toLowerCase().includes(q)) ||
        transCoast.includes(q)
    })
  }, [portsList, originSearch, t])

  // Filter ports for Destination
  const filteredDests = useMemo(() => {
    let list = portsList
    if (coastFilter !== 'all') {
      list = list.filter(p => (p.coast || '').toLowerCase().includes(coastFilter.toLowerCase()))
    }
    if (!destSearch.trim()) return list
    const q = destSearch.toLowerCase().trim()
    return list.filter(p => {
      const transName = t ? t(p.name).toLowerCase() : ''
      const transCoast = p.coast && t ? t(p.coast).toLowerCase() : ''
      return p.name.toLowerCase().includes(q) ||
        transName.includes(q) ||
        (p.coast && p.coast.toLowerCase().includes(q)) ||
        transCoast.includes(q)
    })
  }, [portsList, coastFilter, destSearch, t])

  const handleSwap = () => {
    const temp = { ...origin }
    setOrigin({ ...destination })
    setDestination(temp)
  }

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center">
            <Navigation2 size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">{t('Passage Plan & Waypoint Configurator')}</h3>
            <p className="text-[10px] text-textMuted">
              {portsList.length > 0 ? `${portsList.length} ${t('Indian ports & harbours loaded from GIS database')}` : t('Loading ports catalogue...')}
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-oceanBlue bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1 self-start sm:self-auto">
          <Sparkles size={12} /> {t('Nautical Sea-Corridors Active')}
        </span>
      </div>

      {/* Inland Warning if detected */}
      {inlandWarning && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-2.5 text-xs animate-in fade-in">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <div className="font-bold">{t('Inland Coordinates Detected:')} {t(origin.name)}</div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {t('Marine vessels cannot navigate across landmasses. The nautical engine has snapped the sea route to the nearest navigable coastal port, or you can select any departure port from the full directory below.')}
            </p>
          </div>
        </div>
      )}

      {/* Same Port Error Warning */}
      {isSamePort && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center gap-2.5 text-xs font-bold animate-in fade-in shadow-xs">
          <AlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
          <div className="space-y-0.5">
            <div className="font-bold">{t('Departure and Arrival Ports Cannot Be Identical!')}</div>
            <div className="text-[11px] font-normal text-rose-800">
              {t('Please select a distinct destination port from the directory to compute a valid ocean passage.')}
            </div>
          </div>
        </div>
      )}

      {/* Origin & Destination Dropdowns with Swap */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
        {/* Origin Selector */}
        <div className="md:col-span-5 space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-navy flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-safeGreen" />
              {t('Departure Port (Origin)')}
            </label>
            <span className="text-[10px] font-mono text-textMuted">
              {origin.lat?.toFixed(4)}°N, {origin.lon?.toFixed(4)}°E
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOriginOpen(!originOpen)
                setDestOpen(false)
              }}
              className="w-full flex items-center justify-between p-2.5 text-xs rounded-2xl border border-borderLight bg-slate-50 hover:bg-white font-bold text-navy focus:outline-none focus:border-oceanBlue text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <MapPin size={15} className="text-safeGreen flex-shrink-0" />
                <span className="truncate">{t(origin.name)}</span>
              </div>
              <ChevronDown size={14} className="text-textMuted flex-shrink-0" />
            </button>

            {originOpen && (
              <div 
                className="absolute left-0 top-12 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-borderLight p-3 z-50 animate-slideIn"
                style={{ backgroundColor: '#ffffff' }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-borderLight">
                  <span className="text-xs font-bold text-navy">{t('Select Departure Port')}</span>
                  <button onClick={() => setOriginOpen(false)} className="p-1 rounded text-textMuted hover:text-navy">
                    <X size={14} />
                  </button>
                </div>

                {/* Search */}
                <div className="relative my-2">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={originSearch}
                    onChange={e => setOriginSearch(e.target.value)}
                    placeholder={t('Search from 830+ ports...')}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-borderLight bg-slate-50 text-navy focus:outline-none focus:border-oceanBlue focus:bg-white"
                    autoFocus
                  />
                </div>

                {/* Port List */}
                <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-slate-100 bg-white">
                  {filteredOrigins.length === 0 ? (
                    <div className="py-4 text-center text-xs text-textMuted">{t('No ports found matching')} "{originSearch}"</div>
                  ) : (
                    filteredOrigins.map((p, idx) => {
                      const isSelected = origin.name === p.name
                      const isCurrentDest = isSameOrAdjacentPort(p, destination)

                      return (
                        <button
                          key={`${p.name}-${idx}`}
                          onClick={() => {
                            if (isCurrentDest) {
                              handleSwap()
                            } else {
                              setOrigin({ name: p.name, lat: p.lat, lon: p.lon })
                            }
                            setOriginOpen(false)
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50 text-oceanBlue font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 font-bold text-navy truncate">
                              <span className="truncate">{t(p.name)}</span>
                              {isCurrentDest && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  {t('Current Arrival (will swap)')}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-textMuted truncate flex items-center gap-2 mt-0.5">
                              <span>{t(p.coast)}</span>
                              <span>&bull;</span>
                              <span className="font-mono">{p.lat}°N, {p.lon}°E</span>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-oceanBlue flex-shrink-0 ml-2" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Swap Button */}
        <div className="md:col-span-1 flex justify-center pt-2 md:pt-4">
          <button
            onClick={handleSwap}
            className="p-2 rounded-xl border border-borderLight bg-surface hover:bg-slate-200 text-textMuted hover:text-navy cursor-pointer transition-colors"
            title={t('Swap Origin & Destination')}
          >
            <ArrowRightLeft size={14} />
          </button>
        </div>

        {/* Destination Selector */}
        <div className="md:col-span-5 space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-navy flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-dangerRed" />
              {t('Arrival Port (Destination)')}
            </label>
            <span className="text-[10px] font-mono text-textMuted">
              {destination.lat?.toFixed(4)}°N, {destination.lon?.toFixed(4)}°E
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDestOpen(!destOpen)
                setOriginOpen(false)
              }}
              className="w-full flex items-center justify-between p-2.5 text-xs rounded-2xl border border-borderLight bg-slate-50 hover:bg-white font-bold text-navy focus:outline-none focus:border-oceanBlue text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Anchor size={15} className="text-dangerRed flex-shrink-0" />
                <span className="truncate">{t(destination.name)}</span>
              </div>
              <ChevronDown size={14} className="text-textMuted flex-shrink-0" />
            </button>

            {destOpen && (
              <div 
                className="absolute right-0 top-12 w-full sm:w-96 bg-white rounded-2xl shadow-2xl border border-borderLight p-3 z-50 animate-slideIn"
                style={{ backgroundColor: '#ffffff' }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-borderLight">
                  <span className="text-xs font-bold text-navy">{t('Select Arrival Port')}</span>
                  <button onClick={() => setDestOpen(false)} className="p-1 rounded text-textMuted hover:text-navy">
                    <X size={14} />
                  </button>
                </div>

                {/* Coast Filter Pills */}
                <div className="grid grid-cols-4 gap-1 my-2 p-1 bg-slate-100 rounded-xl text-[10px] font-semibold text-center">
                  {[
                    { id: 'all', label: t('All') },
                    { id: 'west', label: t('West Coast') },
                    { id: 'east', label: t('East Coast') },
                    { id: 'andaman', label: t('Islands') },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCoastFilter(tab.id)}
                      className={`py-1 rounded-lg transition-all ${
                        coastFilter === tab.id ? 'bg-white text-navy font-bold shadow-xs' : 'text-textMuted hover:text-navy'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={destSearch}
                    onChange={e => setDestSearch(e.target.value)}
                    placeholder={t('Search from 830+ ports...')}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-borderLight bg-slate-50 text-navy focus:outline-none focus:border-oceanBlue focus:bg-white"
                    autoFocus
                  />
                </div>

                {/* Port List */}
                <div className="max-h-56 overflow-y-auto space-y-1 divide-y divide-slate-100 bg-white">
                  {filteredDests.length === 0 ? (
                    <div className="py-4 text-center text-xs text-textMuted">{t('No ports found matching')} "{destSearch}"</div>
                  ) : (
                    filteredDests.map((p, idx) => {
                      const isSelected = destination.name === p.name
                      const isCurrentOrigin = isSameOrAdjacentPort(p, origin)

                      return (
                        <button
                          key={`${p.name}-${idx}`}
                          disabled={isCurrentOrigin}
                          onClick={() => {
                            if (isCurrentOrigin) return
                            setDestination({ name: p.name, lat: p.lat, lon: p.lon })
                            setDestOpen(false)
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                            isCurrentOrigin 
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400' 
                              : isSelected 
                                ? 'bg-red-50 text-dangerRed font-bold cursor-pointer' 
                                : 'hover:bg-slate-50 text-slate-700 cursor-pointer'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 font-bold text-navy truncate">
                              <span className="truncate">{t(p.name)}</span>
                              {isCurrentOrigin && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                  {t('Departure Port (Cannot select same)')}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-textMuted truncate flex items-center gap-2 mt-0.5">
                              <span>{t(p.coast)}</span>
                              <span>&bull;</span>
                              <span className="font-mono">{p.lat}°N, {p.lon}°E</span>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-dangerRed flex-shrink-0 ml-2" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Speed Slider & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-borderLight">
        {/* Speed Slider */}
        <div className="flex items-center gap-3">
          <Gauge size={16} className="text-oceanBlue flex-shrink-0" />
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-navy flex items-center gap-2">
              <span>{t('Cruise Speed:')}</span>
              <span className="font-mono text-oceanBlue">{cruiseSpeed} {t('knots')}</span>
              <span className="text-[10px] font-normal text-textMuted">
                (~{(cruiseSpeed * 1.852).toFixed(1)} {t('km/h')})
              </span>
            </div>
            <input
              type="range"
              min="6"
              max="25"
              step="1"
              value={cruiseSpeed}
              onChange={e => setCruiseSpeed(Number(e.target.value))}
              className="w-36 sm:w-48 h-1.5 bg-surfaceMid rounded-lg appearance-none cursor-pointer accent-oceanBlue"
            />
          </div>
        </div>

        {/* Calculate Button */}
        <button
          id="calculate-routes-btn"
          onClick={onCalculate}
          disabled={isLoading || isSamePort}
          title={isSamePort ? t('Departure and Arrival ports cannot be identical') : undefined}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-white text-xs font-bold shadow-md transition-all ${
            isSamePort
              ? 'opacity-50 cursor-not-allowed bg-slate-400'
              : !hasCalculated
              ? 'bg-oceanBlue hover:bg-navy hover:shadow-lg cursor-pointer ring-4 ring-oceanBlue/20'
              : 'bg-slate-700 hover:bg-navy hover:shadow-lg cursor-pointer'
          } disabled:opacity-50`}
        >
          <Navigation2 size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>
            {isLoading 
              ? t('Plotting Sea Corridors...') 
              : isSamePort 
              ? t('Distinct Ports Required') 
              : !hasCalculated 
              ? t('Calculate Routes') 
              : t('Recalculate Routes')}
          </span>
        </button>
      </div>
    </div>
  )
}
