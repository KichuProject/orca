import React, { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, Clock, ChevronRight } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

const TIME_STOPS = [0, 3, 6, 12, 18, 24, 36, 48]

export default function TimeScrubber() {
  const { timeOffset, setTimeOffset, t } = useGlobal()
  const [isPlaying, setIsPlaying] = useState(false)

  // Simulation player loop
  useEffect(() => {
    let interval = null
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeOffset(prev => {
          const currentIdx = TIME_STOPS.findIndex(stopVal => stopVal >= prev)
          const nextIdx = (currentIdx + 1) % TIME_STOPS.length
          return TIME_STOPS[nextIdx]
        })
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, setTimeOffset])

  const now = new Date()
  const displayDate = new Date(now.getTime() + timeOffset * 60 * 60 * 1000)
  const timeFormatted = displayDate.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-borderLight p-3 px-4 pointer-events-auto flex flex-col gap-2 text-xs text-navy max-w-xl w-full">
      {/* Top Bar: Play, Reset, Preset Chips */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-xl text-white transition-all cursor-pointer shadow-xs flex items-center justify-center ${
              isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-oceanBlue hover:bg-navy'
            }`}
            title={isPlaying ? 'Pause forecast animation' : 'Play 48h forecast sequence'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
          </button>

          {/* Reset to Now */}
          <button
            onClick={() => {
              setIsPlaying(false)
              setTimeOffset(0)
            }}
            className="p-1.5 rounded-lg hover:bg-surface text-textMuted hover:text-navy transition-colors cursor-pointer"
            title="Reset to real-time (Now)"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Milestone Quick Select Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { label: 'Now', val: 0 },
            { label: '+3h', val: 3 },
            { label: '+6h', val: 6 },
            { label: '+12h', val: 12 },
            { label: '+24h', val: 24 },
            { label: '+48h', val: 48 },
          ].map(stop => (
            <button
              key={stop.val}
              onClick={() => {
                setIsPlaying(false)
                setTimeOffset(stop.val)
              }}
              className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer ${
                timeOffset === stop.val
                  ? 'bg-oceanBlue text-white shadow-xs'
                  : 'bg-surface text-textMuted hover:text-navy hover:bg-surfaceMid'
              }`}
            >
              {stop.label}
            </button>
          ))}
        </div>

        {/* Timestamp Display */}
        <div className="flex-shrink-0 text-right pl-2 border-l border-borderLight">
          <div className="text-[9px] text-textMuted uppercase font-bold flex items-center justify-end gap-1">
            <Clock size={9} /> {t('Valid At')}
          </div>
          <div className="font-mono font-bold text-[11px] text-navy truncate">
            {timeFormatted}
          </div>
        </div>
      </div>

      {/* Slider Bar */}
      <div className="flex flex-col space-y-1">
        <div className="flex justify-between items-center text-[10px] text-textMuted font-bold px-0.5">
          <span>{t('NOW')}</span>
          <span className="text-oceanBlue font-mono font-bold">
            {timeOffset === 0 ? `🟢 ${t('Live Real-Time')}` : `🕒 +${timeOffset}h ${t('Forecast')}`}
          </span>
          <span>+48h</span>
        </div>
        <input
          type="range"
          min="0"
          max="48"
          step="3"
          value={timeOffset}
          onChange={e => {
            setIsPlaying(false)
            setTimeOffset(Number(e.target.value))
          }}
          className="w-full h-1.5 bg-surfaceMid rounded-lg appearance-none cursor-pointer accent-oceanBlue"
        />
      </div>
    </div>
  )
}
