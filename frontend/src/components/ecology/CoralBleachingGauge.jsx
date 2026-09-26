import React, { useMemo } from 'react'
import { Thermometer, ShieldAlert, Sparkles, Activity, AlertTriangle } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

const REEF_BASELINES = [
  { name: 'Gulf of Mannar Biosphere', lat: 9.15, lon: 79.10, mmm: 29.8, type: 'Fringing Reefs' },
  { name: 'Andaman & Nicobar Islands', lat: 11.55, lon: 92.70, mmm: 29.2, type: 'Barrier & Fringing' },
  { name: 'Lakshadweep Archipelago', lat: 10.56, lon: 72.64, mmm: 29.4, type: 'Atoll Lagoons' },
  { name: 'Gulf of Kutch Marine Sanctuary', lat: 22.45, lon: 69.50, mmm: 28.6, type: 'Patch & Island Reefs' },
]

export default function CoralBleachingGauge({ sst = 28.9 }) {
  const { t } = useGlobal()
  const safeSst = typeof sst === 'number' && !isNaN(sst) ? sst : 28.9
  const mmm = 29.5 // Regional Maximum Monthly Mean (Indian Ocean Average)
  const bleachingThreshold = 30.5 // MMM + 1.0°C Bleaching Alert

  // Calculate Degree Heating Weeks based on live positive thermal anomaly
  const thermalAnomaly = Math.max(0, safeSst - mmm)
  const dhw = Number((thermalAnomaly * 2.5).toFixed(1))

  let alertLevel = {
    title: 'NO STRESS / WATCH',
    color: 'text-safeGreen',
    badge: 'bg-emerald-50 text-safeGreen border-emerald-200/80',
    barColor: 'bg-safeGreen',
    desc: 'Sea surface temperatures are below thermal bleaching thresholds. Coral symbionts stable.',
  }

  if (dhw >= 8.0 || safeSst >= 31.0) {
    alertLevel = {
      title: 'ALERT LEVEL 2: SEVERE BLEACHING',
      color: 'text-dangerRed',
      badge: 'bg-rose-50 text-dangerRed border-rose-200',
      barColor: 'bg-dangerRed',
      desc: 'Widespread coral mortality expected. Thermal stress exceeding critical resilience limits.',
    }
  } else if (dhw >= 4.0 || safeSst >= 30.5) {
    alertLevel = {
      title: 'ALERT LEVEL 1: BLEACHING RISK',
      color: 'text-amber-700',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      barColor: 'bg-amber-500',
      desc: 'Significant coral bleaching likely. Zooxanthellae expulsion occurring across sensitive species.',
    }
  }

  // Dynamically compute health for each reef sanctuary based on real live SST vs regional baseline
  const reefs = useMemo(() => {
    return REEF_BASELINES.map(r => {
      const anomaly = Math.max(0, safeSst - r.mmm)
      const reefDhw = Number((anomaly * 2.5).toFixed(1))

      // Dynamic resilience score from live thermal stress
      const healthPct = Math.max(30, Math.min(100, Math.round(98 - reefDhw * 8 - anomaly * 5)))

      let status = 'Healthy'
      let color = 'bg-safeGreen'
      if (healthPct < 55) {
        status = 'Severe Stress'
        color = 'bg-dangerRed'
      } else if (healthPct < 75) {
        status = 'Thermal Watch'
        color = 'bg-amber-500'
      } else if (healthPct < 85) {
        status = 'Stable'
        color = 'bg-blue-500'
      } else {
        status = 'Excellent'
        color = 'bg-safeGreen'
      }

      return {
        ...r,
        health: healthPct,
        status,
        color,
        dhw: reefDhw,
      }
    })
  }, [safeSst])

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-isroOrange flex items-center justify-center">
            <Thermometer size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-navy">
                {t('Coral Reef Thermal Stress & DHW Monitor')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-100 text-safeGreen">
                ● {t('Live SST')}
              </span>
            </div>
            <p className="text-[10px] text-textMuted">
              {t('NOAA Coral Reef Watch • Oceansat-3 Thermal Anomaly Index')}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase self-start sm:self-auto border ${alertLevel.badge}`}>
          {t(alertLevel.title)}
        </span>
      </div>

      {/* Main Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-surface rounded-2xl border border-borderLight text-xs font-mono">
        <div>
          <span className="text-[10px] text-textMuted font-sans block">{t('Current Surface Temp:')}</span>
          <span className="text-base font-black text-navy">{safeSst.toFixed(1)} °C</span>
          <span className="text-[10px] text-textMuted font-sans block mt-0.5">{t('MMM Baseline:')} {mmm}°C</span>
        </div>

        <div>
          <span className="text-[10px] text-textMuted font-sans block">{t('Bleaching Threshold:')}</span>
          <span className="text-base font-black text-isroOrange">{bleachingThreshold} °C</span>
          <span className="text-[10px] text-safeGreen font-sans block mt-0.5">
            +{(bleachingThreshold - safeSst).toFixed(1)}°C {t('Safety Margin')}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-textMuted font-sans block">{t('Degree Heating Weeks:')}</span>
          <span className="text-base font-black text-safeGreen">{dhw} °C-weeks</span>
          <span className="text-[10px] text-textMuted font-sans block mt-0.5">{t('Threshold:')} 4.0 °C-w</span>
        </div>
      </div>

      <p className="text-xs text-textSecond leading-relaxed">
        {t(alertLevel.desc)}
      </p>

      {/* Regional Reef Health Scorecards */}
      <div className="space-y-2.5 pt-1">
        <div className="text-xs font-bold text-navy flex items-center justify-between">
          <span>{t('Active Reef Sanctuaries Dynamic Resilience Index')}</span>
          <span className="text-[10px] text-textMuted font-normal">
            {t('Derived live from Oceansat-3 thermal anomaly')}
          </span>
        </div>

        <div className="space-y-2">
          {reefs.map(r => (
            <div key={r.name} className="p-2.5 rounded-2xl bg-surface border border-borderLight space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-navy">{t(r.name)}</span>
                  <span className="text-[10px] text-textMuted block">{t(r.type)}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-navy font-mono">{r.health}%</span>
                  <span className="text-[10px] text-textMuted block">{t(r.status)}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-borderLight/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${r.color}`}
                  style={{ width: `${r.health}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
