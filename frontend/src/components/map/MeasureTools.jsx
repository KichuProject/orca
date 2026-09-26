import React from 'react'
import { Ruler, Compass, Square, Trash2, X } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

// Calculate Great Circle distance between two points in km
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Calculate Compass Bearing from point 1 to point 2 (0 - 360 degrees)
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180))
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos((lon2 - lon1) * (Math.PI / 180))
  let brng = Math.atan2(y, x) * (180 / Math.PI)
  return (brng + 360) % 360
}

// Approximate polygon area in km² using Shoelace formula on lat/lon
export function calculatePolygonAreaKm2(coords) {
  if (coords.length < 3) return 0
  let area = 0
  const n = coords.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const xi = coords[i][1] * 111.32 * Math.cos(coords[i][0] * (Math.PI / 180))
    const yi = coords[i][0] * 110.574
    const xj = coords[j][1] * 111.32 * Math.cos(coords[j][0] * (Math.PI / 180))
    const yj = coords[j][0] * 110.574
    area += xi * yj - xj * yi
  }
  return Math.abs(area / 2)
}

export default function MeasureTools({
  mode, // 'none' | 'distance' | 'bearing' | 'area'
  setMode,
  points = [],
  onClear,
}) {
  const { t } = useGlobal()
  let totalDistanceKm = 0
  let currentBearing = null
  let polygonArea = 0

  if (mode === 'distance' && points.length > 1) {
    for (let i = 0; i < points.length - 1; i++) {
      totalDistanceKm += haversineKm(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
    }
  }

  if (mode === 'bearing' && points.length >= 2) {
    currentBearing = calculateBearing(points[0][0], points[0][1], points[1][0], points[1][1])
  }

  if (mode === 'area' && points.length >= 3) {
    polygonArea = calculatePolygonAreaKm2(points)
  }

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-borderLight p-2 pointer-events-auto flex items-center gap-1.5 text-xs text-navy">
      {/* Distance Tool */}
      <button
        onClick={() => setMode(mode === 'distance' ? 'none' : 'distance')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
          mode === 'distance'
            ? 'bg-oceanBlue text-white border-oceanBlue shadow-xs'
            : 'bg-white hover:bg-surface border-borderLight text-textSecond'
        }`}
        title="Measure Distance (Click points on map)"
      >
        <Ruler size={14} />
        <span className="hidden sm:inline">{t('Distance')}</span>
      </button>

      {/* Bearing Tool */}
      <button
        onClick={() => setMode(mode === 'bearing' ? 'none' : 'bearing')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
          mode === 'bearing'
            ? 'bg-oceanBlue text-white border-oceanBlue shadow-xs'
            : 'bg-white hover:bg-surface border-borderLight text-textSecond'
        }`}
        title="Measure Bearing (Click 2 points on map)"
      >
        <Compass size={14} />
        <span className="hidden sm:inline">{t('Bearing')}</span>
      </button>

      {/* Area Tool */}
      <button
        onClick={() => setMode(mode === 'area' ? 'none' : 'area')}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
          mode === 'area'
            ? 'bg-oceanBlue text-white border-oceanBlue shadow-xs'
            : 'bg-white hover:bg-surface border-borderLight text-textSecond'
        }`}
        title="Draw Area (Click polygon boundary points)"
      >
        <Square size={14} />
        <span className="hidden sm:inline">{t('Area')}</span>
      </button>

      {/* Active Results Display */}
      {mode !== 'none' && (
        <div className="flex items-center gap-2 pl-2 border-l border-borderLight text-[11px] font-bold text-oceanBlue">
          {mode === 'distance' && (
            <span>
              {points.length > 1
                ? `${totalDistanceKm.toFixed(2)} km (${(totalDistanceKm * 0.539957).toFixed(2)} nm)`
                : t('Click on map to start measuring')}
            </span>
          )}
          {mode === 'bearing' && (
            <span>
              {currentBearing !== null
                ? `${currentBearing.toFixed(1)}° (${Math.round(currentBearing)}° True)`
                : t('Click 2 points for bearing')}
            </span>
          )}
          {mode === 'area' && (
            <span>
              {points.length >= 3
                ? `${polygonArea.toFixed(2)} km² (${(polygonArea * 100).toFixed(1)} ha)`
                : `Add ${Math.max(0, 3 - points.length)} more point(s)`}
            </span>
          )}

          {points.length > 0 && (
            <button
              onClick={onClear}
              className="p-1 text-textMuted hover:text-dangerRed rounded-lg cursor-pointer"
              title="Reset measurements"
            >
              <Trash2 size={13} />
            </button>
          )}

          <button
            onClick={() => setMode('none')}
            className="p-1 text-textMuted hover:text-navy rounded-lg cursor-pointer"
            title="Exit measurement mode"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
