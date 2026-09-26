import React, { useState, useEffect, useRef } from 'react'
import { useGlobal, TIME_PRESETS } from '../../context/GlobalContext'
import { Clock, ChevronDown, X, Check } from 'lucide-react'

export default function TimeSelector() {
  const { timeOffset, setTimeOffset, t } = useGlobal()
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const panelRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activePreset = TIME_PRESETS.find(p => p.value === timeOffset)
  const label = activePreset ? t(activePreset.label) : `+${timeOffset}h`

  function apply(val) {
    setTimeOffset(val)
    setOpen(false)
  }

  function applyCustom() {
    const h = parseInt(custom, 10)
    if (!isNaN(h) && h >= 0 && h <= 240) apply(h)
  }

  // Compute the display date/time for the active offset
  const displayDate = new Date()
  displayDate.setHours(displayDate.getHours() + timeOffset)
  const displayTime = timeOffset === 0
    ? t('Right now')
    : displayDate.toLocaleString('en-IN', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger pill */}
      <button
        id="time-selector-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Select forecast time"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-borderLight bg-surface hover:bg-surfaceMid transition-colors"
      >
        <Clock size={13} className="text-oceanBlue flex-shrink-0" />
        <div className="text-left leading-tight">
          <div className="text-[10px] text-textMuted font-medium">{t('Forecast time')}</div>
          <div className="text-xs font-semibold text-navy">{label}</div>
        </div>
        <ChevronDown size={12} className="text-textMuted" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] w-60 bg-white rounded-2xl shadow-cardHover border border-borderLight z-50 fade-in overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-borderLight">
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-oceanBlue" />
              <span className="text-sm font-semibold text-navy">{t('Forecast Time')}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-surfaceMid text-textMuted transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Preset chips */}
            <div className="grid grid-cols-2 gap-1.5">
              {TIME_PRESETS.map(p => {
                const isActive = timeOffset === p.value
                return (
                  <button
                    key={p.label}
                    onClick={() => apply(p.value)}
                    className={[
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                      isActive
                        ? 'bg-oceanBlue text-white border-oceanBlue shadow-sm'
                        : 'bg-surface text-textSecond border-borderLight hover:bg-surfaceMid hover:text-navy',
                    ].join(' ')}
                  >
                    <span className="text-base leading-none">{p.icon}</span>
                    {t(p.label)}
                    {isActive && <Check size={11} className="ml-auto opacity-80" />}
                  </button>
                )
              })}
            </div>

            {/* Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-textSecond">{t('Slider (0 – 48h)')}</span>
                <span className="text-xs font-bold text-oceanBlue">{timeOffset}h</span>
              </div>
              <input
                type="range"
                min={0}
                max={48}
                step={1}
                value={timeOffset}
                onChange={e => setTimeOffset(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-oceanBlue cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-textMuted">
                <span>{t('Now')}</span>
                <span>12h</span>
                <span>24h</span>
                <span>36h</span>
                <span>48h</span>
              </div>
            </div>

            {/* Custom hours */}
            <div className="flex gap-1.5">
              <input
                value={custom}
                onChange={e => setCustom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyCustom()}
                placeholder={t('Custom hours (e.g. 72)')}
                type="number"
                min={0}
                max={240}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-borderLight bg-surface focus:outline-none focus:border-oceanBlue focus:bg-white transition-colors"
              />
              <button
                onClick={applyCustom}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-oceanBlue text-white hover:bg-blue-700 transition-colors"
              >
                {t('Go')}
              </button>
            </div>
          </div>

          {/* Active time footer */}
          <div className="px-4 py-2 border-t border-borderLight bg-surface">
            <p className="text-[10px] text-textMuted">
              📍 {t('Showing')}: <span className="font-semibold text-navy">{displayTime}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}