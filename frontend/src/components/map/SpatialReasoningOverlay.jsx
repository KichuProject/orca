import React, { useEffect, useMemo } from 'react'
import { Marker, Popup, Circle, Polyline, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Target, Compass, Fish, Ship, AlertTriangle, Anchor, Layers, ExternalLink } from 'lucide-react'

// Custom DivIcon for Spatial Anchor Location
const createAnchorIcon = (anchorName) => {
  return L.divIcon({
    className: 'spatial-anchor-marker',
    iconSize: [42, 50],
    iconAnchor: [21, 48],
    popupAnchor: [0, -48],
    html: `
      <div style="position: relative; width: 42px; height: 50px; filter: drop-shadow(0 6px 10px rgba(0, 229, 255, 0.45)); cursor: pointer;">
        <!-- Sonar radar pulse animation -->
        <div style="position: absolute; bottom: 2px; left: 50%; transform: translate(-50%, 50%); width: 28px; height: 28px; background: rgba(0, 229, 255, 0.4); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <!-- Pin Base SVG -->
        <svg width="42" height="50" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: relative; z-index: 2;">
          <path d="M17 0C7.6 0 0 7.6 0 17C0 26.5 13.5 40 16.1 41.8C16.6 42.1 17.4 42.1 17.9 41.8C20.5 40 34 26.5 34 17C34 7.6 26.4 0 17 0Z" fill="#042f2e"/>
          <path d="M17 1.5C8.4 1.5 1.5 8.4 1.5 17C1.5 25.2 14.1 37.8 16.5 39.5C16.8 39.7 17.2 39.7 17.5 39.5C19.9 37.8 32.5 25.2 32.5 17C32.5 8.4 25.6 1.5 17 1.5Z" fill="#00e5ff" stroke="#ffffff" stroke-width="1.6"/>
          <circle cx="17" cy="16" r="8" fill="#042f2e"/>
        </svg>
        <div style="position: absolute; top: 9px; left: 50%; transform: translateX(-50%); z-index: 3; font-size: 13px; line-height: 1;">⚓</div>
        <!-- Floating Label Pill -->
        <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #042f2e; color: #00e5ff; border: 1px solid #00e5ff; padding: 1px 6px; border-radius: 8px; font-size: 9px; font-weight: 800; font-family: monospace; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">
          ANCHOR
        </div>
      </div>
    `,
  })
}

// Custom DivIcon for Spatial Candidates (PFZ, Vessel, Hazard, etc.)
const createCandidateIcon = (item, index) => {
  const isPFZ = item.type === 'pfz' || item.zone_id || item.avg_sst_celsius
  const isVessel = item.mmsi || item.vessel_name
  const isHazard = item.hazard_type || item.severity
  
  const iconEmoji = isPFZ ? '🐟' : isVessel ? '🚢' : isHazard ? '⚠️' : '🎯'
  const primaryColor = isPFZ ? '#10b981' : isVessel ? '#3b82f6' : isHazard ? '#ef4444' : '#f59e0b'
  const bgColor = isPFZ ? '#064e3b' : isVessel ? '#1e3a8a' : isHazard ? '#7f1d1d' : '#78350f'
  const distLabel = item.distance_km != null ? `${item.distance_km} km` : `#${index + 1}`

  return L.divIcon({
    className: 'spatial-candidate-marker',
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -44],
    html: `
      <div style="position: relative; width: 38px; height: 46px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.45)); cursor: pointer;">
        <svg width="38" height="46" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: relative; z-index: 2;">
          <path d="M17 0C7.6 0 0 7.6 0 17C0 26.5 13.5 40 16.1 41.8C16.6 42.1 17.4 42.1 17.9 41.8C20.5 40 34 26.5 34 17C34 7.6 26.4 0 17 0Z" fill="${bgColor}"/>
          <path d="M17 1.5C8.4 1.5 1.5 8.4 1.5 17C1.5 25.2 14.1 37.8 16.5 39.5C16.8 39.7 17.2 39.7 17.5 39.5C19.9 37.8 32.5 25.2 32.5 17C32.5 8.4 25.6 1.5 17 1.5Z" fill="${primaryColor}" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="17" cy="16" r="7.5" fill="${bgColor}"/>
        </svg>
        <div style="position: absolute; top: 9px; left: 50%; transform: translateX(-50%); z-index: 3; font-size: 12px; line-height: 1;">${iconEmoji}</div>
        <!-- Floating Distance Badge -->
        <div style="position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: ${bgColor}; color: #ffffff; border: 1px solid ${primaryColor}; padding: 1px 5px; border-radius: 7px; font-size: 8.5px; font-weight: 700; font-family: monospace; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.35);">
          ${distLabel}
        </div>
      </div>
    `,
  })
}

// Controller component to auto-fit view to anchor & all candidate points
function SpatialFitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 })
    }
  }, [map, bounds])
  return null
}

export default function SpatialReasoningOverlay({ overlay }) {
  if (!overlay) return null

  const {
    operator = 'within',
    anchor = {},
    radius_km = 30,
    results = [],
    summary = '',
    map_geojson = null,
  } = overlay

  const anchorLat = anchor?.lat ?? 13.125
  const anchorLon = anchor?.lon ?? 80.297
  const anchorName = anchor?.name || 'Reference Anchor'

  // Calculate bounding box across anchor, circle extent, and candidates
  const bounds = useMemo(() => {
    const latlngs = [[anchorLat, anchorLon]]
    
    // Add circle bounds if radius exists
    if (radius_km && radius_km > 0) {
      const latDelta = radius_km / 111.0
      const lonDelta = radius_km / (111.0 * Math.cos((anchorLat * Math.PI) / 180))
      latlngs.push([anchorLat + latDelta, anchorLon + lonDelta])
      latlngs.push([anchorLat - latDelta, anchorLon - lonDelta])
    }

    // Add all candidate coordinates
    results.forEach(r => {
      if (r.lat && r.lon) {
        latlngs.push([r.lat, r.lon])
      }
    })

    return L.latLngBounds(latlngs)
  }, [anchorLat, anchorLon, radius_km, results])

  return (
    <>
      {/* Auto-fit map to spatial bounds */}
      {bounds && <SpatialFitBounds bounds={bounds} />}

      {/* ── Buffer Circle Overlay ── */}
      {radius_km && radius_km > 0 && ['within', 'surrounding_area', 'outside'].includes(operator) && (
        <Circle
          center={[anchorLat, anchorLon]}
          radius={radius_km * 1000}
          pathOptions={{
            color: '#00e5ff',
            weight: 2.5,
            dashArray: '5, 6',
            fillColor: '#00e5ff',
            fillOpacity: 0.12,
          }}
        />
      )}

      {/* ── Connecting Radial Lines (Anchor to Candidates) ── */}
      {results.map((cand, idx) => {
        if (!cand.lat || !cand.lon) return null
        return (
          <Polyline
            key={`spatial-line-${idx}`}
            positions={[
              [anchorLat, anchorLon],
              [cand.lat, cand.lon],
            ]}
            pathOptions={{
              color: '#00e5ff',
              weight: 1.8,
              dashArray: '4, 6',
              opacity: 0.75,
            }}
          />
        )
      })}

      {/* ── Anchor Point Marker ── */}
      <Marker
        position={[anchorLat, anchorLon]}
        icon={createAnchorIcon(anchorName)}
      >
        <Popup>
          <div style={{ fontFamily: "'Noto Sans', sans-serif", fontSize: '11px', maxWidth: '240px', color: '#042f2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', borderBottom: '1px solid #99f6e4', paddingBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>⚓</span>
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '12px', margin: 0, color: '#0f766e' }}>
                  {anchorName}
                </h4>
                <div style={{ fontSize: '9.5px', color: '#0d9488', fontWeight: 600 }}>
                  Spatial Reference Anchor
                </div>
              </div>
            </div>
            <div><strong>Coordinates:</strong> {anchorLat.toFixed(4)}°N, {anchorLon.toFixed(4)}°E</div>
            <div><strong>Active Filter:</strong> <span style={{ textTransform: 'uppercase', color: '#0284c7', fontWeight: 700 }}>{operator}</span> {radius_km ? `(${radius_km} km)` : ''}</div>
            <div style={{ marginTop: '5px', padding: '4px 6px', background: '#f0fdfa', borderLeft: '3px solid #14b8a6', borderRadius: '4px', fontSize: '10px', color: '#134e4a' }}>
              {summary || `Filtering features relative to ${anchorName}`}
            </div>
          </div>
        </Popup>
      </Marker>

      {/* ── Candidate Results Markers ── */}
      {results.map((cand, idx) => {
        if (!cand.lat || !cand.lon) return null
        const isPFZ = cand.type === 'pfz' || cand.zone_id || cand.avg_sst_celsius
        const isVessel = cand.mmsi || cand.vessel_name
        const isHazard = cand.hazard_type || cand.severity

        return (
          <Marker
            key={`spatial-cand-${idx}`}
            position={[cand.lat, cand.lon]}
            icon={createCandidateIcon(cand, idx)}
          >
            <Popup>
              <div style={{ fontFamily: "'Noto Sans', sans-serif", fontSize: '11px', maxWidth: '250px', color: '#0a2540' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '15px' }}>
                      {isPFZ ? '🐟' : isVessel ? '🚢' : isHazard ? '⚠️' : '🎯'}
                    </span>
                    <h4 style={{ fontWeight: 800, fontSize: '12px', margin: 0, color: '#0f172a' }}>
                      {cand.name || `Target #${idx + 1}`}
                    </h4>
                  </div>
                  {cand.confidence && (
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '6px' }}>
                      {cand.confidence}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '10px', marginBottom: '6px' }}>
                  <div style={{ background: '#f8fafc', padding: '3px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b' }}>Distance:</span> <strong>{cand.distance_km != null ? `${cand.distance_km} km` : 'N/A'}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '3px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b' }}>Bearing:</span> <strong>{cand.direction || `${cand.bearing_deg || 0}°`}</strong>
                  </div>
                </div>

                {cand.avg_sst_celsius && (
                  <div><strong>Sea Temp (SST):</strong> {cand.avg_sst_celsius}°C</div>
                )}
                {cand.avg_chlorophyll_mg_m3 && (
                  <div><strong>Chlorophyll-a:</strong> {cand.avg_chlorophyll_mg_m3} mg/m³</div>
                )}
                {cand.sector && (
                  <div><strong>Sector:</strong> {cand.sector}</div>
                )}
                {cand.source && (
                  <div style={{ marginTop: '4px', fontSize: '9px', color: '#64748b' }}>
                    <strong>Source:</strong> {cand.source}
                  </div>
                )}
                {cand.reason && (
                  <div style={{ marginTop: '5px', padding: '4px 6px', background: '#ecfdf5', borderLeft: '3px solid #10b981', borderRadius: '4px', fontSize: '10px', color: '#064e3b' }}>
                    {cand.reason}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}
