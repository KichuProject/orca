import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, BarChart3, Database, DollarSign, Fish, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useGlobal } from '../../context/GlobalContext'
import { endpoints } from '../../api'

export default function FAOProductivityChart({ productivityData = null }) {
  const { t } = useGlobal()
  const [metricMode, setMetricMode] = useState('volume') // 'volume' | 'value'

  // Fetch live from FAO FishStatJ if parent hasn't passed it
  const hasSeries = Array.isArray(productivityData?.annual_series) && productivityData.annual_series.length > 0
  const { data: fetchedData, isLoading } = useQuery({
    queryKey: ['fao-productivity-direct'],
    queryFn: async () => {
      const res = await endpoints.productivity('India')
      return res.data?.fao_trend || res.data
    },
    staleTime: 300000,
    enabled: !hasSeries,
  })

  const activePayload = hasSeries ? productivityData : fetchedData
  const series = activePayload?.annual_series || []

  // Calculate live statistics purely from the returned dataset
  const liveStats = useMemo(() => {
    if (!series || series.length === 0) {
      return {
        peakCatch: 0,
        peakYear: '--',
        latestYear: '--',
        latestCatch: 0,
        latestAqua: 0,
        latestAquaVal: 0,
        tenYearTrend: '0.0',
        aquaTrend: '0.0',
        aquaValueTrend: '0.0',
      }
    }

    const latest = series[series.length - 1]
    const baseline10 = series.length > 10 ? series[series.length - 11] : series[0]

    let peak = 0
    let peakYr = '--'
    for (const pt of series) {
      if ((pt.capture || 0) > peak) {
        peak = pt.capture
        peakYr = pt.year
      }
    }

    const tenYear = baseline10.capture
      ? (((latest.capture - baseline10.capture) / baseline10.capture) * 100).toFixed(1)
      : '0.0'

    const aquaPace = baseline10.aquaculture
      ? (((latest.aquaculture - baseline10.aquaculture) / baseline10.aquaculture) * 100).toFixed(1)
      : '0.0'

    const aquaValPace = baseline10.aqua_value_usd_m
      ? (((latest.aqua_value_usd_m - baseline10.aqua_value_usd_m) / baseline10.aqua_value_usd_m) * 100).toFixed(1)
      : '0.0'

    return {
      peakCatch: peak,
      peakYear: peakYr,
      latestYear: latest.year || '2024',
      latestCatch: latest.capture || 0,
      latestAqua: latest.aquaculture || 0,
      latestAquaVal: latest.aqua_value_usd_m || 0,
      tenYearTrend: tenYear,
      aquaTrend: aquaPace,
      aquaValueTrend: aquaValPace,
    }
  }, [series])

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingUp size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-navy">
                {t('Long-Term Marine & Aquaculture Trajectory (FAO FishStatJ)')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-100 text-safeGreen">
                ● {t('Live Time Series')}
              </span>
            </div>
            <p className="text-[10px] text-textMuted flex items-center gap-1">
              <Database size={10} /> {series.length} {t('Annual Observation Years (1984–')} {liveStats.latestYear}) • {t('Biomass & Valuation')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-surface p-0.5 rounded-xl border border-borderLight text-xs">
            <button
              onClick={() => setMetricMode('volume')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                metricMode === 'volume'
                  ? 'bg-white text-navy shadow-xs border border-borderLight/60'
                  : 'text-textMuted hover:text-navy'
              }`}
            >
              <Fish size={12} />
              <span>{t('Biomass (Tonnes)')}</span>
            </button>
            <button
              onClick={() => setMetricMode('value')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                metricMode === 'value'
                  ? 'bg-white text-emerald-700 shadow-xs border border-borderLight/60'
                  : 'text-textMuted hover:text-navy'
              }`}
            >
              <DollarSign size={12} />
              <span>{t('Valuation (USD)')}</span>
            </button>
          </div>

          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-safeGreen font-bold border border-emerald-100 text-xs font-mono">
            +{metricMode === 'volume' ? liveStats.tenYearTrend : liveStats.aquaValueTrend}% {t('10-Yr')}
          </span>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-surface rounded-2xl border border-borderLight text-xs font-mono">
        <div>
          <span className="text-[10px] text-textMuted font-sans block">{t('Peak Marine Capture')}:</span>
          <span className="font-bold text-navy text-sm">
            {(liveStats.peakCatch / 1000).toFixed(0)}k{' '}
            <span className="text-[10px] font-sans font-normal text-textMuted">{t('tonnes')} ({liveStats.peakYear})</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] text-textMuted font-sans block">{t('Aquaculture Production')}:</span>
          <span className="font-bold text-purple-600 text-sm">
            +{liveStats.aquaTrend}% <span className="text-[10px] font-sans font-normal text-textMuted">{t('10-yr pace')}</span>
          </span>
        </div>
        <div>
          <span className="text-[10px] text-textMuted font-sans block">{t('Aquaculture Valuation')}:</span>
          <span className="font-bold text-emerald-700 text-sm">
            ${(liveStats.latestAquaVal / 1000).toFixed(1)}B{' '}
            <span className="text-[10px] font-sans font-normal text-safeGreen">(+{liveStats.aquaValueTrend}%)</span>
          </span>
        </div>
      </div>

      {/* Chart Canvas or Live Loading Skeleton */}
      <div className="h-64 w-full">
        {isLoading && series.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-textMuted bg-surface/40 rounded-2xl border border-dashed border-borderLight">
            <Loader2 size={24} className="animate-spin text-purple-600" />
            <span className="text-xs font-semibold">{t('Streaming official FAO FishStatJ multi-decade fisheries time series...')}</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="captureGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="aquaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

              <XAxis
                dataKey="year"
                tick={{ fontSize: 9.5, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(1, Math.floor(series.length / 8))}
              />

              <YAxis
                tick={{ fontSize: 9.5, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => {
                  if (metricMode === 'volume') {
                    return `${(val / 1000000).toFixed(1)}M`
                  }
                  return `$${(val / 1000).toFixed(0)}B`
                }}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-navy/95 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 font-sans border border-white/10">
                        <div className="font-bold text-saffron border-b border-white/10 pb-1 flex items-center justify-between gap-4">
                          <span>{t('Year')} {label}</span>
                          <span className="text-[10px] text-textMuted font-mono">FAO India</span>
                        </div>

                        {metricMode === 'volume' ? (
                          <>
                            <div className="flex items-center justify-between gap-3 font-mono">
                              <span className="flex items-center gap-1 text-sky-400">
                                <span className="w-2 h-2 rounded-full bg-sky-500" />
                                {t('Marine Capture')}:
                              </span>
                              <strong className="text-white">
                                {payload.find(p => p.dataKey === 'capture')?.value?.toLocaleString() || 0} t
                              </strong>
                            </div>
                            <div className="flex items-center justify-between gap-3 font-mono">
                              <span className="flex items-center gap-1 text-purple-300">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                {t('Aquaculture')}:
                              </span>
                              <strong className="text-white">
                                {payload.find(p => p.dataKey === 'aquaculture')?.value?.toLocaleString() || 0} t
                              </strong>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between gap-3 font-mono">
                            <span className="flex items-center gap-1 text-emerald-400">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              {t('Aquaculture Valuation')}:
                            </span>
                            <strong className="text-white">
                              ${payload[0]?.value?.toLocaleString()} M USD
                            </strong>
                          </div>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />

              {metricMode === 'volume' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="aquaculture"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#aquaGrad)"
                    name="Aquaculture Production"
                  />
                  <Area
                    type="monotone"
                    dataKey="capture"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#captureGrad)"
                    name="Marine Capture"
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="aqua_value_usd_m"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#valGrad)"
                  name="Aquaculture Value"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend & Provenance */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-borderLight/60 text-[11px] text-textMuted">
        <div className="flex items-center gap-4">
          {metricMode === 'volume' ? (
            <>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-600" />
                <span className="text-navy">{t('Marine Wild Capture (tonnes)')}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-600" />
                <span className="text-navy">{t('Inland & Coastal Aquaculture (tonnes)')}</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
              <span className="text-navy">{t('Aquaculture Farmgate Valuation (USD Millions)')}</span>
            </div>
          )}
        </div>

        <span className="font-mono text-[10px]">
          {t('Source: FAO Global Fishery & Aquaculture Statistics v2026.1')}
        </span>
      </div>
    </div>
  )
}
