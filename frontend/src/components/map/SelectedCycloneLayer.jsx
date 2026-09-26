import { useGlobal } from '../../context/GlobalContext'
import React, { useEffect, useMemo } from 'react'
import { Polyline, CircleMarker, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import client from '../../api/client'

// Custom pulsing cyclone eye icon
const cycloneEyeIcon = L.divIcon({
  className: 'custom-cyclone-icon',
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; items-center; justify-content: center;">
      <div style="position: absolute; inset: 0; background: #ef4444; border-radius: 50%; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; inset: 4px; background: #dc2626; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.4);">
        <span style="font-size: 15px; line-height: 1;">🌀</span>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
})

export default function SelectedCycloneLayer({ selectedCyclone }) {
  const { t } = useGlobal()
  const map = useMap()

  // Fetch full cyclone GeoJSON
  const { data: geoData } = useQuery({
    queryKey: ['geo-layer', 'cyclone_tracks'],
    queryFn: async () => {
      const res = await client.get('/api/layer/cyclone_tracks')
      return res.data
    },
    staleTime: Infinity,
  })

  // Find matching feature
  const matchedFeature = useMemo(() => {
    if (!geoData?.features || !selectedCyclone) return null
    return geoData.features.find(f => {
      const p = f.properties || {}
      if (selectedCyclone.sid && (p.sid === selectedCyclone.sid || p.SID === selectedCyclone.sid)) {
        return true
      }
      const rawName = (p.name || p.NAME || '').toUpperCase()
      const targetName = (selectedCyclone.name || selectedCyclone.cleanName || '').toUpperCase()
      const nameMatch = rawName && rawName === targetName
      const yearMatch = !selectedCyclone.year || String(p.year || p.SEASON) === String(selectedCyclone.year)
      return nameMatch && yearMatch
    }) || geoData.features.find(f => {
      const p = f.properties || {}
      const rawName = (p.name || p.NAME || '').toUpperCase()
      const targetName = (selectedCyclone.name || selectedCyclone.cleanName || '').toUpperCase()
      return rawName && rawName === targetName
    })
  }, [geoData, selectedCyclone])

  // Extract lat-lng coordinates: GeoJSON is [lon, lat], Leaflet is [lat, lon]
  const coordinates = useMemo(() => {
    if (!matchedFeature?.geometry) return []
    const geom = matchedFeature.geometry
    if (geom.type === 'LineString') {
      return geom.coordinates.map(pt => [pt[1], pt[0]])
    } else if (geom.type === 'MultiLineString') {
      return geom.coordinates.flatMap(line => line.map(pt => [pt[1], pt[0]]))
    }
    return []
  }, [matchedFeature])

  // Fly to cyclone bounds when selected
  useEffect(() => {
    if (coordinates.length > 1) {
      const bounds = L.latLngBounds(coordinates)
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 })
    }
  }, [coordinates, map])

  if (!matchedFeature || coordinates.length === 0) return null

  const props = matchedFeature.properties || {}
  const startPt = coordinates[0]
  const endPt = coordinates[coordinates.length - 1]
  const maxWindKt = props.max_wind_kt || 65
  const maxWindKmh = Math.round(maxWindKt * 1.852)

  return (
    <>
      {/* Outer Glow Line */}
      <Polyline
        positions={coordinates}
        pathOptions={{
          color: '#ef4444',
          weight: 6,
          opacity: 0.4,
          lineCap: 'round',
        }}
      />

      {/* Main Sharp Track Line */}
      <Polyline
        positions={coordinates}
        pathOptions={{
          color: '#ffffff',
          weight: 2.5,
          opacity: 0.95,
          lineCap: 'round',
        }}
      />

      {/* Intermediate Waypoint Dots */}
      {coordinates.map((pt, idx) => (
        <CircleMarker
          key={idx}
          center={pt}
          radius={3}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ffffff',
            fillOpacity: 1,
            weight: 1.5,
          }}
        />
      ))}

      {/* Origin / Genesis Marker */}
      {startPt && (
        <CircleMarker
          center={startPt}
          radius={6}
          pathOptions={{
            color: '#ffffff',
            fillColor: '#00c853',
            fillOpacity: 1,
            weight: 2,
          }}
        >
          <Popup>
            <div className="font-sans text-xs text-navy p-1">
              <span className="font-bold text-safeGreen">🟢 {t("Storm Genesis")}</span>
              <p className="text-[10px] text-textMuted mt-0.5">
                {t("Initial tropical depression detection point")}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      )}

      {/* Peak / Landfall Eye Marker */}
      {endPt && (
        <Marker position={endPt} icon={cycloneEyeIcon}>
          <Popup>
            <div className="font-sans text-xs text-navy space-y-1.5 p-1 max-w-[210px]">
              <div className="flex items-center gap-1.5 pb-1 border-b border-borderLight">
                <span className="text-base">🌀</span>
                <span className="font-bold text-dangerRed text-sm leading-tight">
                  Cyclone {props.name} ({props.year})
                </span>
              </div>
              <div className="text-[11px] text-textSecond space-y-0.5">
                <div><strong>{t("Category")}:</strong> {t(props.category || selectedCyclone.cat || "Severe Cyclone")}</div>
                <div><strong>{t("Peak Winds")}:</strong> {maxWindKt} kt ({maxWindKmh} km/h)</div>
                {props.sid && <div><strong>{t("IBTrACS ID")}:</strong> {props.sid}</div>}
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  )
}
