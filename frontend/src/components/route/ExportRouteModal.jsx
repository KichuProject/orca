import React from 'react'
import { Download, FileText, Code, Check, X, Compass } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function ExportRouteModal({
  origin,
  destination,
  waypoints = [],
  selectedMode = 'balanced',
  onClose,
}) {
  const { t } = useGlobal()
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 1. Export as GPX for Chartplotters (Garmin, Raymarine, Furuno)
  const exportGPX = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ORCA Marine Intelligence Platform - Official Maritime Navigation" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Route from ${origin.name} to ${destination.name} (${selectedMode})</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <rte>
    <name>${origin.name} to ${destination.name}</name>
    <desc>Calculated via ORCA Agentic AI (${selectedMode} mode)</desc>
${waypoints.map((wp, i) => `    <rtept lat="${wp.lat}" lon="${wp.lon}">
      <name>WP${String(i).padStart(2, '0')}</name>
      <cmt>Heading: ${wp.heading} deg, Dist: ${wp.distKm} km</cmt>
    </rtept>`).join('\n')}
  </rte>
</gpx>`
    downloadFile(xml, `ORCA_Route_${origin.name.replace(/\s+/g, '_')}_to_${destination.name.replace(/\s+/g, '_')}.gpx`, 'application/gpx+xml')
  }

  // 2. Export as GeoJSON
  const exportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            origin: origin.name,
            destination: destination.name,
            mode: selectedMode,
            waypoint_count: waypoints.length,
            total_distance_km: waypoints[waypoints.length - 1]?.distKm || 0,
            generated_at: new Date().toISOString(),
          },
          geometry: {
            type: 'LineString',
            coordinates: waypoints.map(w => [w.lon, w.lat]),
          },
        },
      ],
    }
    downloadFile(JSON.stringify(geojson, null, 2), `ORCA_Route_${selectedMode}.geojson`, 'application/geo+json')
  }

  // 3. Export as CSV Passage Plan
  const exportCSV = () => {
    const headers = ['Waypoint', 'Latitude', 'Longitude', 'Cumulative_Distance_KM', 'Cumulative_Distance_NM', 'True_Heading_Deg', 'Depth_M', 'Hazard_Status']
    const rows = waypoints.map((w, i) => [
      `WP_${String(i).padStart(2, '0')}`,
      w.lat.toFixed(5),
      w.lon.toFixed(5),
      w.distKm.toFixed(2),
      (w.distKm * 0.539957).toFixed(2),
      w.heading,
      w.depthM || 'Deep Ocean',
      `"${w.hazard || 'CLEAR'}"`,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    downloadFile(csv, `ORCA_Passage_Plan_${selectedMode}.csv`, 'text/csv')
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn pointer-events-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-borderLight max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-borderLight bg-surface/80">
          <div className="flex items-center gap-2">
            <Download size={17} className="text-oceanBlue" />
            <h3 className="text-sm font-bold text-navy">{t('Export Passage Plan')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surfaceMid text-textMuted hover:text-navy cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-navy">
          <div className="p-3 bg-surface rounded-2xl border border-borderLight space-y-1">
            <div className="font-bold text-navy">
              {t(origin.name)} &rarr; {t(destination.name)}
            </div>
            <div className="text-[11px] text-textMuted">
              {t('Profile:')} <span className="font-semibold capitalize text-oceanBlue">{t(selectedMode)} {t('Route')}</span> · {waypoints.length} {t('Waypoints')}
            </div>
          </div>

          <div className="space-y-2">
            {/* GPX Download */}
            <button
              onClick={exportGPX}
              className="w-full p-3 rounded-2xl border border-borderLight hover:border-oceanBlue bg-white hover:bg-blue-50/50 flex items-center justify-between transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-oceanBlue/10 text-oceanBlue">
                  <Compass size={18} />
                </div>
                <div>
                  <div className="font-bold text-navy">{t("GPX Nautical File (.gpx)")}</div>
                  <div className="text-[10px] text-textMuted">{t("Standard for Garmin, Raymarine & Furuno Chartplotters")}</div>
                </div>
              </div>
              <Download size={15} className="text-textMuted" />
            </button>

            {/* GeoJSON Download */}
            <button
              onClick={exportGeoJSON}
              className="w-full p-3 rounded-2xl border border-borderLight hover:border-oceanBlue bg-white hover:bg-blue-50/50 flex items-center justify-between transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Code size={18} />
                </div>
                <div>
                  <div className="font-bold text-navy">{t("GIS Vector GeoJSON (.geojson)")}</div>
                  <div className="text-[10px] text-textMuted">{t("Compatible with QGIS, ArcGIS & Web GIS Engines")}</div>
                </div>
              </div>
              <Download size={15} className="text-textMuted" />
            </button>

            {/* CSV Download */}
            <button
              onClick={exportCSV}
              className="w-full p-3 rounded-2xl border border-borderLight hover:border-oceanBlue bg-white hover:bg-blue-50/50 flex items-center justify-between transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="font-bold text-navy">{t("Passage Plan Spreadsheet (.csv)")}</div>
                  <div className="text-[10px] text-textMuted">{t("Tabular waypoint list with bearings & distances")}</div>
                </div>
              </div>
              <Download size={15} className="text-textMuted" />
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-borderLight bg-surface flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-borderLight bg-white hover:bg-surface text-xs font-bold text-navy cursor-pointer transition-colors"
          >
            {t('Close')}
          </button>
        </div>
      </div>
    </div>
  )
}
