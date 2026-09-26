import React, { useState } from 'react'
import { useGlobal, VESSEL_PROFILES } from '../../context/GlobalContext'
import { Anchor, ChevronDown, X, Info } from 'lucide-react'

const PROFILE_COLORS = {
  small_boat:       'bg-green-50 border-safeGreen text-safeGreen',
  fishing_trawler:  'bg-blue-50 border-oceanBlue text-oceanBlue',
  cargo_vessel:     'bg-slate-50 border-slate-400 text-slate-600',
  research_vessel:  'bg-amber-50 border-saffron text-amber-600',
}

const PROFILE_ICONS = {
  small_boat:       '⛵',
  fishing_trawler:  '🚢',
  cargo_vessel:     '🛳️',
  research_vessel:  '🔬',
}

export default function VesselSelector() {
  const { vessel, setVessel, t } = useGlobal()
  const [open, setOpen] = useState(false)
  const profile = VESSEL_PROFILES[vessel]

  return (
    <div className="relative">
      <button
        id="vessel-selector-btn"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-borderLight bg-surface hover:bg-surfaceMid transition-colors"
        aria-label="Select vessel profile"
        aria-expanded={open}
      >
        <Anchor size={13} className="text-oceanBlue flex-shrink-0" />
        <div className="text-left leading-tight">
          <div className="text-[10px] text-textMuted font-medium">{t('Vessel')}</div>
          <div className="text-xs font-semibold text-navy">{PROFILE_ICONS[vessel]} {t(profile.label)}</div>
        </div>
        <ChevronDown size={12} className="text-textMuted" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] w-72 bg-white rounded-2xl shadow-cardHover border border-borderLight z-50 fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-borderLight">
            <div className="flex items-center gap-1.5">
              <Anchor size={13} className="text-oceanBlue" />
              <span className="text-sm font-semibold text-navy">{t('Vessel Profile')}</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-surfaceMid text-textMuted">
              <X size={13} />
            </button>
          </div>

          <div className="p-3 space-y-1.5">
            {Object.entries(VESSEL_PROFILES).map(([key, prof]) => {
              const isActive = vessel === key
              return (
                <button
                  key={key}
                  onClick={() => { setVessel(key); setOpen(false) }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? 'bg-oceanBlue/8 border-oceanBlue shadow-sm'
                      : 'border-borderLight hover:bg-surfaceMid hover:border-borderMid'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${
                    isActive ? PROFILE_COLORS[key] : 'bg-surface border-borderLight'
                  }`}>
                    {PROFILE_ICONS[key]}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold ${isActive ? 'text-oceanBlue' : 'text-navy'}`}>
                        {t(prof.label)}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-oceanBlue text-white font-semibold">
                          {t('Active')}
                        </span>
                      )}
                    </div>
                    {/* Limits */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-textMuted">
                        🌊 ≤{prof.limits.wave}m
                      </span>
                      <span className="text-[10px] text-textMuted">
                        💨 ≤{prof.limits.wind}km/h
                      </span>
                      <span className="text-[10px] text-textMuted">
                        ⚓ ≥{prof.limits.depth}m {t('depth')}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Info footer */}
          <div className="px-4 py-2.5 border-t border-borderLight bg-surface flex items-start gap-1.5">
            <Info size={11} className="text-textMuted mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-textMuted leading-relaxed">
              {t('Safety thresholds (wave, wind, depth) are automatically applied based on your vessel profile across all pages.')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export { VesselSelector as VesselProfileSelector }

