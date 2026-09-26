import React from 'react'
import { Clock, Waves, Wind, CheckCircle2, AlertTriangle, ShieldAlert, Sparkles, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useGlobal, VESSEL_PROFILES } from '../../context/GlobalContext'
import { endpoints } from '../../api'

export default function DepartureWindowPlanner({
  baseWave = null,
  baseWind = null,
  hourlyWaves = null,
  hourlyWinds = null,
}) {
  const { location, timeOffset, setTimeOffset, vessel, t } = useGlobal()
  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707
  const activeProfile = VESSEL_PROFILES[vessel] || VESSEL_PROFILES.fishing_trawler
  const waveLimit = activeProfile.limits?.wave || 1.5
  const windLimit = activeProfile.limits?.wind || 30

  // Direct fetch fallback if props are missing
  const needsDirectFetch =
    !Array.isArray(hourlyWaves) || hourlyWaves.length === 0 ||
    !Array.isArray(hourlyWinds) || hourlyWinds.length === 0

  const { data: liveCharts, isLoading } = useQuery({
    queryKey: ['charts-departure-live', lat, lon],
    queryFn: async () => (await endpoints.charts(lat, lon)).data,
    staleTime: 120000,
    enabled: needsDirectFetch,
  })

  const wavesArr = Array.isArray(hourlyWaves) && hourlyWaves.length > 0
    ? hourlyWaves
    : (liveCharts?.wave_next_24h || [])

  const windsArr = Array.isArray(hourlyWinds) && hourlyWinds.length > 0
    ? hourlyWinds
    : (liveCharts?.wind_next_24h || [])

  const now = new Date()

  const rawWindows = [
    { offset: 0, label: 'Immediate (Now)' },
    { offset: 3, label: '+3 Hours' },
    { offset: 6, label: '+6 Hours (Morning)' },
    { offset: 12, label: '+12 Hours (Afternoon)' },
    { offset: 18, label: '+18 Hours (Evening)' },
    { offset: 24, label: '+24 Hours (Tomorrow)' },
  ].map(w => {
    const time = new Date(now.getTime() + w.offset * 60 * 60 * 1000)
    const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

    // Bound offset to available hourly indices (array length 24 => max index 23)
    const waveIdx = Math.min(w.offset, Math.max(0, wavesArr.length - 1))
    const windIdx = Math.min(w.offset, Math.max(0, windsArr.length - 1))

    const wave = wavesArr[waveIdx] != null ? Number(Number(wavesArr[waveIdx]).toFixed(2)) : (baseWave ?? 0.8)
    const wind = windsArr[windIdx] != null ? Number(Number(windsArr[windIdx]).toFixed(1)) : (baseWind ?? 12.0)

    let status = 'SAFE'
    if (wave > waveLimit || wind > windLimit) {
      status = 'DANGER'
    } else if (wave > waveLimit * 0.8 || wind > windLimit * 0.8) {
      status = 'CAUTION'
    }

    const riskScore = wave * 30 + Math.max(0, wind - (windLimit * 0.6)) * 2

    return {
      ...w,
      timeStr,
      wave,
      wind,
      status,
      riskScore,
    }
  })

  const minRisk = Math.min(...rawWindows.map(w => w.riskScore))
  const windows = rawWindows.map(w => ({
    ...w,
    isOptimal: w.riskScore === minRisk,
  }))

  const optimalWindow = windows.find(w => w.isOptimal) || windows[0]

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-navy">
                {t('"What-If" Departure Window Calculator')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-100 text-safeGreen">
                ● {t('Live')}
              </span>
            </div>
            <p className="text-[10px] text-textMuted">
              {t('Forecasted sea state safety calibrated to')} {activeProfile.name || 'Active Vessel'} ({waveLimit}m / {windLimit}km/h)
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-oceanBlue bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1">
          <Sparkles size={12} /> {t('Optimal Window')}: {t(optimalWindow.label)}
        </span>
      </div>

      {/* Departure Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {windows.map(w => {
          const isSelected = timeOffset === w.offset
          return (
            <div
              key={w.offset}
              onClick={() => setTimeOffset(w.offset)}
              className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col justify-between space-y-2 relative ${
                isSelected
                  ? 'border-oceanBlue bg-blue-50/70 shadow-md ring-2 ring-oceanBlue/30'
                  : 'border-borderLight bg-surface hover:bg-surfaceMid'
              }`}
            >
              {w.isOptimal && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-isroOrange text-white uppercase tracking-tight shadow-xs">
                  {t('OPTIMAL')}
                </span>
              )}

              <div>
                <div className="text-[11px] font-bold text-navy">{t(w.label)}</div>
                <div className="text-[10px] text-textMuted font-mono">{w.timeStr}</div>
              </div>

              {/* Status Badge */}
              <div className="flex justify-center">
                {w.status === 'SAFE' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-safeGreen border border-emerald-200 flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> {t('SAFE')}
                  </span>
                )}
                {w.status === 'CAUTION' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                    <AlertTriangle size={10} /> {t('CAUTION')}
                  </span>
                )}
                {w.status === 'DANGER' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-dangerRed border border-rose-200 flex items-center gap-0.5">
                    <ShieldAlert size={10} /> {t('DANGER')}
                  </span>
                )}
              </div>

              {/* Wave & Wind metrics */}
              <div className="space-y-1 text-left bg-white/80 p-2 rounded-xl border border-borderLight/60 text-[11px] font-mono">
                <div className="flex items-center justify-between text-textSecond">
                  <span className="flex items-center gap-1 font-sans text-[10px]">
                    <Waves size={10} className="text-oceanBlue" /> {t('Wave')}:
                  </span>
                  <strong className={w.wave > waveLimit ? 'text-dangerRed' : 'text-navy'}>
                    {w.wave.toFixed(1)}m
                  </strong>
                </div>
                <div className="flex items-center justify-between text-textSecond">
                  <span className="flex items-center gap-1 font-sans text-[10px]">
                    <Wind size={10} className="text-emerald-600" /> {t('Wind')}:
                  </span>
                  <strong className={w.wind > windLimit ? 'text-dangerRed' : 'text-navy'}>
                    {w.wind.toFixed(0)}k
                  </strong>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
