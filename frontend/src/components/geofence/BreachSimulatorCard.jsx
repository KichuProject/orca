import React, { useState, useEffect, useRef } from 'react'
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Compass,
  RefreshCw,
  Volume2,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  ArrowDown,
  Anchor,
  AlertOctagon,
  Globe,
  Sliders,
  CheckCircle2,
} from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function BreachSimulatorCard({
  liveImbl = null,
  locationName = 'Selected Port',
  lat = 13.0827,
  lon = 80.2707,
}) {
  const { t } = useGlobal()

  // Target Mode: 'restricted_zone' (MPA / Ecological) vs 'imbl_border' (Border Crossing)
  const [targetMode, setTargetMode] = useState('restricted_zone') // 'restricted_zone' | 'imbl_border'

  // Distance in meters (0 to 10000 m)
  const [distanceM, setDistanceM] = useState(7500)
  const [isPlaying, setIsPlaying] = useState(false)
  const animRef = useRef(null)

  // Derived units
  const distanceKm = (distanceM / 1000).toFixed(2)
  const distanceNm = (distanceM / 1852).toFixed(2)

  // Automatic animation loop
  useEffect(() => {
    if (isPlaying) {
      animRef.current = setInterval(() => {
        setDistanceM((prev) => {
          if (prev <= 100) {
            clearInterval(animRef.current)
            setIsPlaying(false)
            return 0
          }
          // Smooth decrease simulating vessel at ~12 knots
          return Math.max(0, prev - 120)
        })
      }, 100)
    } else {
      if (animRef.current) clearInterval(animRef.current)
    }
    return () => {
      if (animRef.current) clearInterval(animRef.current)
    }
  }, [isPlaying])

  // Threshold logic
  // > 5000m -> Safe
  // 1000m - 5000m -> Warning
  // <= 1000m -> Danger
  const isSafe = distanceM > 5000
  const isWarning = distanceM <= 5000 && distanceM > 1000
  const isDanger = distanceM <= 1000
  const isBreached = distanceM === 0

  // Config per mode
  const modeConfig = {
    restricted_zone: {
      title: t('Restricted Marine Zone (MPA / Sanctuary) Proximity Demo'),
      targetName: t('Gulf of Mannar Marine Biosphere Reserve (WDPA MPA #317208)'),
      boundaryType: t('Marine Protected Area (MPA) / Eco-Sensitive Zone'),
      warningThreshold: '5,000 m',
      dangerThreshold: '1,000 m',
      dangerBannerText: t('Warning: vessel is approaching a restricted marine zone.'),
      actionText: t('Action: Alter route immediately by 045° to seaward corridor to clear MPA boundary.'),
      statute: t('Wildlife Protection Act 1972 & Indian Fisheries Act • All mechanized bottom trawling prohibited'),
      icon: AlertOctagon,
      iconColor: 'text-rose-600 bg-rose-50',
    },
    imbl_border: {
      title: t('International Maritime Boundary Line (IMBL) Crossing Demo'),
      targetName: t('India – Sri Lanka Sovereign IMBL Line (Palk Strait / Gulf of Mannar)'),
      boundaryType: t('International Maritime Boundary (UNCLOS Treaty 1974/1976)'),
      warningThreshold: '5,000 m (2.7 nm)',
      dangerThreshold: '1,000 m (0.54 nm)',
      dangerBannerText: t('Warning: vessel is approaching international maritime boundary line (IMBL).'),
      actionText: t('Action: Alter course 180° immediately! Imminent risk of foreign naval interception.'),
      statute: t('UNCLOS 1982 Sovereign Waters Treaty • Indian Coast Guard & Sri Lanka Navy surveillance'),
      icon: Globe,
      iconColor: 'text-blue-600 bg-blue-50',
    },
  }

  const currentMode = modeConfig[targetMode]

  return (
    <div
      className={`p-6 rounded-3xl border transition-all duration-300 shadow-sm space-y-5 ${
        isDanger
          ? 'bg-red-50/50 border-red-300 ring-2 ring-red-400/30'
          : isWarning
          ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/40'
          : 'bg-white border-borderLight'
      }`}
    >
      {/* ── Top Header Strip ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${currentMode.iconColor}`}>
            <currentMode.icon size={19} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-navy">{currentMode.title}</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {t('PS Demonstration')}
              </span>
            </div>
            <p className="text-[10px] text-textMuted mt-0.5">
              {currentMode.targetName} &bull; {currentMode.boundaryType}
            </p>
          </div>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex items-center bg-surfaceMid/90 p-1 rounded-2xl border border-borderLight self-start sm:self-auto">
          <button
            onClick={() => {
              setTargetMode('restricted_zone')
              setIsPlaying(false)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              targetMode === 'restricted_zone'
                ? 'bg-white text-navy shadow-xs border border-borderLight/80'
                : 'text-textMuted hover:text-navy'
            }`}
          >
            <AlertOctagon size={12} className="text-rose-600" />
            <span>{t('Restricted MPA Zone')}</span>
          </button>

          <button
            onClick={() => {
              setTargetMode('imbl_border')
              setIsPlaying(false)
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              targetMode === 'imbl_border'
                ? 'bg-white text-navy shadow-xs border border-borderLight/80'
                : 'text-textMuted hover:text-navy'
            }`}
          >
            <Globe size={12} className="text-oceanBlue" />
            <span>{t('IMBL Border Crossing')}</span>
          </button>
        </div>
      </div>

      {/* ── Visual Flow Diagram (Matching PS Demo Spec) ───────────── */}
      <div className="p-4 rounded-2xl bg-white border border-borderLight/90 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-navy flex items-center gap-1.5">
            <Sliders size={13} className="text-oceanBlue" />
            {t('Proximity Hierarchy & Warning Gates')}
          </span>
          <span className="text-[10px] font-mono text-textMuted">
            {t('Auto-triggers warning banner at proximity gates')}
          </span>
        </div>

        {/* Visual Progression Tree: Vessel -> 5000 m (Warning) -> 1000 m (Danger) -> Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 relative pt-1">
          {/* Node 1: Vessel */}
          <div
            className={`p-3 rounded-xl border transition-all flex flex-col items-center text-center justify-center space-y-1 ${
              isSafe
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Anchor size={14} className={isSafe ? 'text-emerald-600 animate-bounce' : 'text-slate-400'} />
              <span className="text-xs font-black uppercase text-navy">{t('Vessel')}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600">
              {distanceM > 5000 ? `${distanceM.toLocaleString()} m` : t('Past Gate')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              isSafe ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {isSafe ? t('🟢 SAFE') : t('PASSED')}
            </span>
          </div>

          {/* Node 2: 5000 m (Warning) */}
          <div
            className={`p-3 rounded-xl border transition-all flex flex-col items-center text-center justify-center space-y-1 ${
              isWarning
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 shadow-xs animate-pulse'
                : distanceM <= 1000
                ? 'bg-slate-50 border-slate-200 text-slate-400'
                : 'bg-slate-50/60 border-slate-200/70 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={14} className={isWarning ? 'text-amber-600' : 'text-slate-400'} />
              <span className="text-xs font-black uppercase text-navy">{t('5000 m')}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600">
              {t('Warning Buffer')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              isWarning
                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                : distanceM <= 1000
                ? 'bg-slate-200 text-slate-500'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {isWarning ? t('⚠️ WARNING ACTIVE') : distanceM <= 1000 ? t('PASSED') : t('ARMED')}
            </span>
          </div>

          {/* Node 3: 1000 m (Danger) */}
          <div
            className={`p-3 rounded-xl border transition-all flex flex-col items-center text-center justify-center space-y-1 ${
              isDanger && !isBreached
                ? 'bg-red-50 border-red-400 ring-2 ring-red-400/40 shadow-xs animate-pulse'
                : isBreached
                ? 'bg-red-100 border-red-500 text-red-900'
                : 'bg-slate-50/60 border-slate-200/70 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={14} className={isDanger ? 'text-red-600' : 'text-slate-400'} />
              <span className="text-xs font-black uppercase text-navy">{t('1000 m')}</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600">
              {t('Danger Standoff')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              isDanger
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {isBreached ? t('🚨 BREACHED') : isDanger ? t('🚨 DANGER ACTIVE') : t('ARMED')}
            </span>
          </div>

          {/* Node 4: Dynamic State Badge */}
          <div
            className={`p-3 rounded-xl border transition-all flex flex-col items-center text-center justify-center space-y-1 ${
              isDanger
                ? 'bg-red-600 text-white border-red-700 shadow-md'
                : isWarning
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-90">
              {t('System State')}
            </span>
            <span className="text-sm font-black tracking-tight">
              {isBreached
                ? t('BOUNDARY BREACH')
                : isDanger
                ? t('DANGER ALERT')
                : isWarning
                ? t('PROXIMITY WARNING')
                : t('CLEAR STANDOFF')}
            </span>
            <span className="text-[10px] font-mono opacity-90">
              {distanceM.toLocaleString()} m ({distanceKm} km)
            </span>
          </div>
        </div>
      </div>

      {/* ── CRITICAL NOTIFICATION BANNER (The Prominent Visual Demo Callout) ── */}
      {isDanger ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-md space-y-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-white/20 text-white flex-shrink-0">
              <ShieldAlert size={18} />
            </span>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-red-100">
                {t('CRITICAL PROXIMITY NOTIFICATION (DANGER STANDOFF < 1000m)')}
              </div>
              <h4 className="text-sm md:text-base font-black tracking-tight leading-snug">
                “{currentMode.dangerBannerText}”
              </h4>
            </div>
          </div>
          <div className="pt-2 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span className="text-red-100 font-medium">{currentMode.actionText}</span>
            <span className="font-mono text-[11px] bg-black/25 px-2 py-0.5 rounded-lg whitespace-nowrap self-start sm:self-auto">
              {t('Range')}: <strong>{distanceM.toLocaleString()} m</strong> ({distanceKm} km · {distanceNm} nm)
            </span>
          </div>
        </div>
      ) : isWarning ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs space-y-1.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-100">
                {t('PROXIMITY WARNING (BUFFER < 5000m)')}
              </div>
              <h4 className="text-xs md:text-sm font-black">
                {t('Warning: vessel is approaching buffer zone')} ({distanceM.toLocaleString()} m {t('from boundary')})
              </h4>
            </div>
          </div>
          <p className="text-[11px] text-amber-50 leading-relaxed pl-6.5">
            {t('Prepare navigational waypoint alteration. Reduce speed and verify radar clearance to stay clear of restricted coordinates.')}
          </p>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>
              <strong>{t('Clear Navigational Passage:')}</strong> {t('Vessel maintains safe margin of')} {distanceM.toLocaleString()} m ({distanceKm} km) {t('outside statutory boundary.')}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-black text-[10px] uppercase">
            {t('COMPLIANT')}
          </span>
        </div>
      )}

      {/* ── Interactive Simulation Slider & Player ───────────────── */}
      <div className="p-4 rounded-2xl bg-white border border-borderLight space-y-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-navy">{t('Simulated Standoff Distance to Boundary:')}</span>
            <span className="text-[11px] text-textMuted ml-1.5">
              ({distanceKm} km &bull; {distanceNm} nm)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-black text-oceanBlue">
              {distanceM.toLocaleString()} m
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
              isDanger ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {isBreached ? t('BREACH') : isDanger ? t('DANGER') : isWarning ? t('WARNING') : t('SAFE')}
            </span>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1.5">
          <input
            type="range"
            min="0"
            max="10000"
            step="50"
            value={distanceM}
            onChange={(e) => {
              setIsPlaying(false)
              setDistanceM(Number(e.target.value))
            }}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-oceanBlue"
          />

          {/* Milestone markers matching PS prompt */}
          <div className="flex justify-between text-[10px] font-mono text-textMuted px-1">
            <button
              onClick={() => {
                setIsPlaying(false)
                setDistanceM(0)
              }}
              className="text-red-700 font-bold hover:underline cursor-pointer"
            >
              0 m ({t('Breach')})
            </button>
            <button
              onClick={() => {
                setIsPlaying(false)
                setDistanceM(1000)
              }}
              className="text-red-600 font-bold hover:underline cursor-pointer"
            >
              1,000 m ({t('Danger')})
            </button>
            <button
              onClick={() => {
                setIsPlaying(false)
                setDistanceM(5000)
              }}
              className="text-amber-600 font-bold hover:underline cursor-pointer"
            >
              5,000 m ({t('Warning')})
            </button>
            <button
              onClick={() => {
                setIsPlaying(false)
                setDistanceM(10000)
              }}
              className="text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              10,000 m ({t('Safe')})
            </button>
          </div>
        </div>

        {/* Quick Jumps & Demo Player */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-borderLight/70">
          {/* Player controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-oceanBlue hover:bg-navy'
              }`}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              <span>{isPlaying ? t('Pause Demo') : t('▶ Run Visual Approach Demo')}</span>
            </button>

            <button
              onClick={() => {
                setIsPlaying(false)
                setDistanceM(8000)
              }}
              className="p-1.5 rounded-xl bg-surfaceMid hover:bg-surface text-navy transition-colors cursor-pointer border border-borderLight"
              title={t('Reset to 8,000m')}
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-textMuted font-bold">{t('Jump to:')}</span>
            <button
              onClick={() => {
                setIsPlaying(false)
                setDistanceM(8000)
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              8,000 m
            </button>
            <button
              onClick={() => {
                setIsPlaying(false)
                setDistanceM(5000)
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 cursor-pointer"
            >
              5,000 m ({t('Warning')})
            </button>
            <button
              onClick={() => {
                setIsPlaying(false)
                setDistanceM(1000)
              }}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-100 hover:bg-red-200 text-red-800 cursor-pointer"
            >
              1,000 m ({t('Danger')})
            </button>
          </div>
        </div>
      </div>

      {/* ── Statutory Authority & Radio Guard Footer ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] text-textMuted pt-1 border-t border-borderLight/60">
        <div className="flex items-center gap-1.5">
          <Volume2 size={13} className="text-oceanBlue flex-shrink-0" />
          <span>
            {t('Enforcement Watch:')} <strong>{currentMode.statute}</strong>
          </span>
        </div>

        {liveImbl?.distance_nm != null && (
          <button
            onClick={() => {
              setIsPlaying(false)
              setDistanceM(Math.round(liveImbl.distance_nm * 1852))
            }}
            className="text-oceanBlue font-bold hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <Compass size={11} />
            <span>{t('Sync to Live Sensor')} ({liveImbl.distance_nm} nm)</span>
          </button>
        )}
      </div>
    </div>
  )
}
