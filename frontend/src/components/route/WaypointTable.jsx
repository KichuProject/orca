import React, { useState } from 'react'
import { MapPin, Compass, ShieldCheck, AlertTriangle, Eye, Copy, Check } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function WaypointTable({ waypoints = [], selectedWpIndex, onSelectWp }) {
  const { t } = useGlobal()
  const [copied, setCopied] = useState(false)
  if (waypoints.length === 0) return null

  const handleCopyAll = () => {
    if (!waypoints || waypoints.length === 0) return
    const lines = waypoints.map((wp, idx) => {
      const nmDist = (wp.distKm * 0.539957).toFixed(1)
      return `WP ${String(idx).padStart(2, '0')}: ${wp.lat.toFixed(4)}°N, ${wp.lon.toFixed(4)}°E | Depth: ${wp.depthM ?? 'N/A'}m | Dist: ${wp.distKm?.toFixed(1) ?? 0}km (${nmDist}nm) | Hdg: ${wp.heading ?? 0}°T | [${wp.label || 'FIX'}]`
    })
    const text = `=== NAUTICAL PASSAGE FIX SEQUENCE ===\nTotal Fixes: ${waypoints.length}\n\n` + lines.join('\n')
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-borderLight gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center flex-shrink-0">
            <MapPin size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-navy truncate">
              {t ? t('Passage Plan Waypoint Sequence', 'Passage Plan Waypoint Sequence') : 'Passage Plan Waypoint Sequence'}
            </h3>
            <p className="text-[10px] text-textMuted">
              {waypoints.length} {t ? t('verified navigation waypoints along active sea corridor', 'verified navigation waypoints along active sea corridor') : 'verified navigation waypoints along active sea corridor'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-borderLight bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-navy transition-all cursor-pointer shadow-xs"
            title="Copy coordinates to clipboard"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-600" />
                <span className="text-emerald-700 font-bold">{t ? t('Copied Fixes!', 'Copied Fixes!') : 'Copied Fixes!'}</span>
              </>
            ) : (
              <>
                <Copy size={13} className="text-slate-600" />
                <span>{t ? t('Copy Fixes', 'Copy Fixes') : 'Copy Fixes'}</span>
              </>
            )}
          </button>
          <span className="text-xs font-semibold text-textMuted hidden sm:inline">
            {t ? t('Click row to highlight', 'Click row to highlight') : 'Click row to highlight'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-borderLight text-[10px] font-bold text-textMuted uppercase">
              <th className="py-2.5 px-3">{t ? t('WP', 'WP') : 'WP'}</th>
              <th className="py-2.5 px-3">{t ? t('Coordinates', 'Coordinates') : 'Coordinates'}</th>
              <th className="py-2.5 px-3">{t ? t('Distance (Cumul.)', 'Distance (Cumul.)') : 'Distance (Cumul.)'}</th>
              <th className="py-2.5 px-3">{t ? t('Heading', 'Heading') : 'Heading'}</th>
              <th className="py-2.5 px-3">{t ? t('Water Depth', 'Water Depth') : 'Water Depth'}</th>
              <th className="py-2.5 px-3">{t ? t('Hazard Check', 'Hazard Check') : 'Hazard Check'}</th>
              <th className="py-2.5 px-3 text-right">{t ? t('Action', 'Action') : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderLight/60 font-mono">
            {waypoints.map((wp, idx) => {
              const isSelected = selectedWpIndex === idx
              const isHazard = wp.hazard && wp.hazard !== 'CLEAR'

              return (
                <tr
                  key={idx}
                  onClick={() => onSelectWp(idx)}
                  className={`transition-colors cursor-pointer text-navy ${
                    isSelected
                      ? 'bg-blue-50/80 font-bold'
                      : 'hover:bg-surface/70'
                  }`}
                >
                  {/* WP ID */}
                  <td className="py-2.5 px-3 font-sans">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      idx === 0
                        ? 'bg-emerald-100 text-safeGreen'
                        : idx === waypoints.length - 1
                        ? 'bg-red-100 text-dangerRed'
                        : 'bg-surfaceMid text-textMuted'
                    }`}>
                      {idx === 0 ? (t ? t('START', 'START') : 'START') : idx === waypoints.length - 1 ? (t ? t('END', 'END') : 'END') : `WP ${String(idx).padStart(2, '0')}`}
                    </span>
                  </td>

                  {/* Coordinates */}
                  <td className="py-2.5 px-3 text-[11px]">
                    {wp.lat.toFixed(4)}° N, {wp.lon.toFixed(4)}° E
                  </td>

                  {/* Cumulative distance */}
                  <td className="py-2.5 px-3 text-[11px]">
                    {wp.distKm.toFixed(1)} km <span className="text-textMuted font-normal font-sans">({(wp.distKm * 0.539957).toFixed(1)} nm)</span>
                  </td>

                  {/* Heading */}
                  <td className="py-2.5 px-3 text-[11px] text-oceanBlue font-bold">
                    {wp.heading}° T
                  </td>

                  {/* Depth */}
                  <td className="py-2.5 px-3 text-[11px]">
                    {wp.depthM ? `${wp.depthM} m` : (t ? t('Deep Ocean', 'Deep Ocean') : 'Deep Ocean')}
                  </td>

                  {/* Hazard status */}
                  <td className="py-2.5 px-3 font-sans text-[11px]">
                    {isHazard ? (
                      <span className="text-warnAmber font-semibold flex items-center gap-1">
                        <AlertTriangle size={12} /> {t ? t(wp.hazard, wp.hazard) : wp.hazard}
                      </span>
                    ) : (
                      <span className="text-safeGreen font-semibold flex items-center gap-1">
                        <ShieldCheck size={12} /> {t ? t('Clear Water', 'Clear Water') : 'Clear Water'}
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-2.5 px-3 text-right font-sans">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectWp(idx)
                      }}
                      className="p-1 rounded-lg hover:bg-surfaceMid text-textMuted hover:text-navy cursor-pointer"
                      title="Inspect waypoint on map"
                    >
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
