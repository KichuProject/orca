import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, Clock, Waves, Wind, Activity, Zap, Loader2, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useGlobal, VESSEL_PROFILES } from '../../context/GlobalContext'
import { endpoints } from '../../api'

export default function ForecastTrendChart({
  baseWave = null,
  baseWind = null,
  hourlyWaves = null,
  hourlyWinds = null,
  hourlyTides = null,
  hourlyCape = null,
  isLoading = false,
}) {
  const { location, vessel, t } = useGlobal()
  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707
  const activeProfile = VESSEL_PROFILES[vessel] || VESSEL_PROFILES.fishing_trawler

  // If props are not provided, query the live charts endpoint directly
  const needsDirectFetch =
    !Array.isArray(hourlyWaves) || hourlyWaves.length === 0 ||
    !Array.isArray(hourlyWinds) || hourlyWinds.length === 0

  const { data: liveCharts, isLoading: isFetchingCharts } = useQuery({
    queryKey: ['charts-forecast-live', lat, lon],
    queryFn: async () => (await endpoints.charts(lat, lon)).data,
    staleTime: 120000,
    enabled: needsDirectFetch,
  })

  // Selected forecast metric: 'wave' | 'wind' | 'tide' | 'cape'
  const [metric, setMetric] = useState('wave')

  // Resolve active arrays
  const wavesArr = Array.isArray(hourlyWaves) && hourlyWaves.length > 0
    ? hourlyWaves
    : (liveCharts?.wave_next_24h || [])

  const windsArr = Array.isArray(hourlyWinds) && hourlyWinds.length > 0
    ? hourlyWinds
    : (liveCharts?.wind_next_24h || [])

  const tidesArr = Array.isArray(hourlyTides) && hourlyTides.length > 0
    ? hourlyTides
    : (liveCharts?.tide_hourly || [])

  const capeArr = Array.isArray(hourlyCape) && hourlyCape.length > 0
    ? hourlyCape
    : (liveCharts?.cape_next_12h || [])

  const loading = isLoading || (needsDirectFetch && isFetchingCharts)

  // Build continuous hourly data directly from live telemetries
  const chartData = useMemo(() => {
    const data = []
    const now = new Date()
    const count = Math.max(wavesArr.length, windsArr.length, tidesArr.length, capeArr.length)

    if (count === 0) return []

    for (let i = 0; i < count; i++) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000)
      const hourStr = time.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })

      const wave = wavesArr[i] != null ? Number(Number(wavesArr[i]).toFixed(2)) : (baseWave ?? null)
      const wind = windsArr[i] != null ? Number(Number(windsArr[i]).toFixed(1)) : (baseWind ?? null)
      
      let tide = null
      if (tidesArr[i] != null) {
        tide = typeof tidesArr[i] === 'object' && tidesArr[i].height_m != null
          ? Number(Number(tidesArr[i].height_m).toFixed(2))
          : Number(Number(tidesArr[i]).toFixed(2))
      }

      const cape = capeArr[i] != null ? Math.round(Number(capeArr[i])) : null

      data.push({
        time: hourStr,
        hour: `+${i}h`,
        wave,
        wind,
        tide,
        cape,
      })
    }
    return data
  }, [wavesArr, windsArr, tidesArr, capeArr, baseWave, baseWind])

  // Compute live statistics across the dataset
  const stats = useMemo(() => {
    const validVals = chartData
      .map(d => d[metric])
      .filter(v => v != null && !isNaN(v))

    if (validVals.length === 0) return { current: '--', min: '--', max: '--', avg: '--' }

    const current = validVals[0]
    const min = Math.min(...validVals)
    const max = Math.max(...validVals)
    const avg = validVals.reduce((a, b) => a + b, 0) / validVals.length

    return {
      current: metric === 'cape' ? `${current}` : `${current.toFixed(1)}`,
      min: metric === 'cape' ? `${min}` : `${min.toFixed(1)}`,
      max: metric === 'cape' ? `${max}` : `${max.toFixed(1)}`,
      avg: metric === 'cape' ? `${Math.round(avg)}` : `${avg.toFixed(1)}`,
    }
  }, [chartData, metric])

  // Metric visual configuration
  const config = {
    wave: {
      label: 'Wave Height (m)',
      unit: 'm',
      color: '#1e60d5',
      gradId: 'waveGradient',
      limit: activeProfile.limits?.wave || 1.5,
      limitLabel: `${activeProfile.limits?.wave || 1.5}m ${t('Vessel Limit')}`,
      domain: [0, (dataMax) => Math.max(2.5, Math.ceil(dataMax * 1.25 * 10) / 10)],
      badgeColor: 'bg-blue-50 text-oceanBlue border-blue-100',
    },
    wind: {
      label: 'Wind Speed (km/h)',
      unit: 'km/h',
      color: '#10b981',
      gradId: 'windGradient',
      limit: activeProfile.limits?.wind || 30,
      limitLabel: `${activeProfile.limits?.wind || 30}km/h ${t('Squall Limit')}`,
      domain: [0, (dataMax) => Math.max(35, Math.ceil(dataMax * 1.25))],
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    },
    tide: {
      label: 'Harmonic Tide (m)',
      unit: 'm',
      color: '#06b6d4',
      gradId: 'tideGradient',
      limit: 1.2,
      limitLabel: `1.2m ${t('High Water')}`,
      domain: [(dataMin) => Math.min(0, Math.floor(dataMin * 10) / 10), (dataMax) => Math.max(1.5, Math.ceil(dataMax * 10) / 10)],
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    },
    cape: {
      label: 'Storm CAPE (J/kg)',
      unit: 'J/kg',
      color: '#8b5cf6',
      gradId: 'capeGradient',
      limit: 1500,
      limitLabel: `1500 J/kg ${t('Convection Threshold')}`,
      domain: [0, (dataMax) => Math.max(2500, Math.ceil(dataMax * 1.15))],
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-100',
    },
  }[metric]

  return (
    <div className="p-5 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header with Title and Live Metric Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center">
            <TrendingUp size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-navy">{t('24-Hour Marine Forecast Trend')}</h4>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-100 text-safeGreen">
                ● {t('Live')}
              </span>
            </div>
            <p className="text-[10px] text-textMuted flex items-center gap-1">
              <Clock size={10} /> {t('Open-Meteo ECMWF Ensemble & INCOIS Tidal Harmonics')}
            </p>
          </div>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex flex-wrap items-center gap-1 bg-surface p-1 rounded-2xl border border-borderLight self-start">
          <button
            onClick={() => setMetric('wave')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              metric === 'wave'
                ? 'bg-oceanBlue text-white shadow-xs'
                : 'text-textSecond hover:text-navy'
            }`}
          >
            <Waves size={12} />
            <span>{t('Wave')}</span>
          </button>
          <button
            onClick={() => setMetric('wind')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              metric === 'wind'
                ? 'bg-oceanBlue text-white shadow-xs'
                : 'text-textSecond hover:text-navy'
            }`}
          >
            <Wind size={12} />
            <span>{t('Wind')}</span>
          </button>
          <button
            onClick={() => setMetric('tide')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              metric === 'tide'
                ? 'bg-oceanBlue text-white shadow-xs'
                : 'text-textSecond hover:text-navy'
            }`}
          >
            <Activity size={12} />
            <span>{t('Tide')}</span>
          </button>
          <button
            onClick={() => setMetric('cape')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              metric === 'cape'
                ? 'bg-oceanBlue text-white shadow-xs'
                : 'text-textSecond hover:text-navy'
            }`}
          >
            <Zap size={12} />
            <span>{t('CAPE')}</span>
          </button>
        </div>
      </div>

      {/* Live Data Summary Strip */}
      <div className="grid grid-cols-4 gap-2 p-2.5 bg-surface/70 rounded-2xl border border-borderLight text-xs font-mono">
        <div>
          <span className="text-[9.5px] text-textMuted font-sans block uppercase tracking-wider">{t('Current Fix')}</span>
          <span className="font-bold text-navy text-sm">
            {stats.current} <span className="text-[10px] font-sans text-textMuted">{config.unit}</span>
          </span>
        </div>
        <div>
          <span className="text-[9.5px] text-textMuted font-sans block uppercase tracking-wider">{t('24h Peak')}</span>
          <span className="font-bold text-warnAmber text-sm">
            {stats.max} <span className="text-[10px] font-sans text-textMuted">{config.unit}</span>
          </span>
        </div>
        <div>
          <span className="text-[9.5px] text-textMuted font-sans block uppercase tracking-wider">{t('24h Trough')}</span>
          <span className="font-bold text-safeGreen text-sm">
            {stats.min} <span className="text-[10px] font-sans text-textMuted">{config.unit}</span>
          </span>
        </div>
        <div>
          <span className="text-[9.5px] text-textMuted font-sans block uppercase tracking-wider">{t('24h Mean')}</span>
          <span className="font-bold text-textSecond text-sm">
            {stats.avg} <span className="text-[10px] font-sans text-textMuted">{config.unit}</span>
          </span>
        </div>
      </div>

      {/* Chart Canvas or Live Loading Skeleton */}
      <div className="h-52 w-full">
        {loading && chartData.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-textMuted bg-surface/40 rounded-2xl border border-dashed border-borderLight">
            <Loader2 size={24} className="animate-spin text-oceanBlue" />
            <span className="text-xs font-semibold">{t('Connecting to live high-resolution marine telemetry...')}</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e60d5" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1e60d5" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="windGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="capeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

              <XAxis
                dataKey="time"
                tick={{ fontSize: 9.5, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(1, Math.floor(chartData.length / 8))}
              />

              <YAxis
                tick={{ fontSize: 9.5, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                domain={config.domain}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const pt = payload[0].payload
                    const val = pt[metric]
                    return (
                      <div className="bg-navy/95 text-white p-2.5 rounded-xl shadow-lg text-xs space-y-1 font-sans border border-white/10">
                        <div className="font-bold text-saffron">{label} ({pt.hour})</div>
                        <div className="font-mono">
                          <span>{t(config.label)}: <strong className="text-white">{val ?? '--'} {config.unit}</strong></span>
                        </div>
                        {config.limit && val != null && (
                          <div className={`text-[10px] font-bold ${val > config.limit ? 'text-dangerRed' : 'text-safeGreen'}`}>
                            {val > config.limit ? `⚠️ ${t('Exceeds limit')} (${config.limit}${config.unit})` : `✓ ${t('Within safe envelope')}`}
                          </div>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />

              {config.limit && (
                <ReferenceLine
                  y={config.limit}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: config.limitLabel, fill: '#ef4444', fontSize: 9.5, position: 'top' }}
                />
              )}

              <Area
                type="monotone"
                dataKey={metric}
                stroke={config.color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${config.gradId})`}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
