import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  Circle,
  useMap
} from 'react-leaflet'
import L from 'leaflet'
import {
  Compass,
  MapPin,
  ExternalLink,
  Target,
  Maximize2,
  Navigation,
  Fish,
  Layers,
  CheckCircle2,
  Info
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGlobal } from '../../context/GlobalContext'

// Helper component to auto-fit map view to spatial features
function MapBoundsFitter({ bounds }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 })
    }
  }, [map, bounds])
  return null
}

export default function SpatialReasoningMapCard({ spatialData }) {
  const navigate = useNavigate()
  const { setActiveSpatialOverlay, activeSpatialOverlay } = useGlobal()
  const [selectedItem, setSelectedItem] = useState(null)
  const mapRef = useRef(null)

  if (!spatialData) return null

  const {
    operator = 'within',
    anchor = {},
    radius_km = 30,
    count = 0,
    results = [],
    summary = '',
    map_geojson = null
  } = spatialData

  const anchorLat = anchor?.lat ?? 13.125
  const anchorLon = anchor?.lon ?? 80.297
  const anchorName = anchor?.name || 'Reference Anchor'

  // Extract coordinates for bounds fitting
  const bounds = useMemo(() => {
    const latLngs = [[anchorLat, anchorLon]]
    if (Array.isArray(results)) {
      results.forEach(r => {
        if (r.lat && r.lon) latLngs.push([r.lat, r.lon])
      })
    }
    // Also include buffer circle extremes if available
    if (radius_km && radius_km > 0) {
      const dLat = radius_km / 111.0
      const dLon = radius_km / (111.0 * Math.cos((anchorLat * Math.PI) / 180))
      latLngs.push([anchorLat + dLat, anchorLon])
      latLngs.push([anchorLat - dLat, anchorLon])
      latLngs.push([anchorLat, anchorLon + dLon])
      latLngs.push([anchorLat, anchorLon - dLon])
    }
    try {
      return L.latLngBounds(latLngs)
    } catch {
      return null
    }
  }, [anchorLat, anchorLon, radius_km, results])

  // Custom Anchor Beacon Marker Icon
  const anchorIcon = useMemo(() => {
    return L.divIcon({
      className: 'spatial-anchor-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      html: `
        <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; background: rgba(14, 165, 233, 0.35); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; z-index: 2; width: 26px; height: 26px; background: #0284c7; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(2,132,199,0.5);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="3"></circle>
              <line x1="12" y1="22" x2="12" y2="8"></line>
              <path d="M5 12H2a10 10 0 0 0 20 0h-3"></path>
            </svg>
          </div>
        </div>
      `
    })
  }, [])

  // Custom Target Candidate Marker Icon
  const createTargetIcon = (item, index) => {
    return L.divIcon({
      className: 'spatial-target-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: relative; z-index: 2; width: 24px; height: 24px; background: #059669; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(5,150,105,0.6);">
            <span style="color: #ffffff; font-size: 11px; font-weight: 800;">${index + 1}</span>
          </div>
        </div>
      `
    })
  }

  const isOverlaySynced = activeSpatialOverlay?.summary === spatialData?.summary

  const handleSyncToMainMap = () => {
    setActiveSpatialOverlay(spatialData)
  }

  const handleJumpToMap = () => {
    setActiveSpatialOverlay(spatialData)
    navigate('/map')
  }

  return (
    <div className="w-full my-3 overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/95 shadow-xl backdrop-blur-md text-white">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border-b border-cyan-500/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center flex-shrink-0 text-cyan-400">
            <Compass size={17} className="animate-spin-slow" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold tracking-wider uppercase text-cyan-300">
                Spatial Reasoning Result
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                {operator.replace('_', ' ')}
              </span>
              {radius_km && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {radius_km} km radius
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Anchor: <strong className="text-slate-200">{anchorName}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncToMainMap}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isOverlaySynced
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-600/60 text-slate-200'
            }`}
            title="Keep overlay active on the main GIS Map"
          >
            {isOverlaySynced ? <CheckCircle2 size={13} /> : <Layers size={13} />}
            <span>{isOverlaySynced ? 'Active on GIS Map' : 'Send to GIS Map'}</span>
          </button>

          <button
            onClick={handleJumpToMap}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white transition-all cursor-pointer shadow-xs"
            title="Navigate to full GIS Map tab with this spatial layer"
          >
            <ExternalLink size={13} />
            <span>Open Map</span>
          </button>
        </div>
      </div>

      {/* ── Leaflet Mini-Map Viewport ── */}
      <div className="relative w-full h-[240px] bg-slate-900 border-b border-cyan-500/20">
        <MapContainer
          center={[anchorLat, anchorLon]}
          zoom={10}
          scrollWheelZoom={false}
          dragging={true}
          className="w-full h-full z-0"
          ref={mapRef}
        >
          {/* CartoDB Dark Matter / Voyager Basemap */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={18}
          />

          {/* Auto-Fit Bounds */}
          {bounds && <MapBoundsFitter bounds={bounds} />}

          {/* Buffer Circle Overlay (For within, surrounding_area, outside) */}
          {radius_km && radius_km > 0 && (
            <Circle
              center={[anchorLat, anchorLon]}
              radius={radius_km * 1000}
              pathOptions={{
                color: '#00e5ff',
                weight: 2,
                dashArray: '4, 6',
                fillColor: '#00e5ff',
                fillOpacity: 0.12,
              }}
            />
          )}

          {/* Reference Anchor Point Marker */}
          <Marker position={[anchorLat, anchorLon]} icon={anchorIcon}>
            <Popup className="orca-custom-popup">
              <div className="text-xs p-1">
                <p className="font-bold text-slate-900 flex items-center gap-1">
                  <MapPin size={12} className="text-sky-600" />
                  {anchorName}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Spatial Reference Origin ({anchorLat.toFixed(3)}°N, {anchorLon.toFixed(3)}°E)
                </p>
              </div>
            </Popup>
          </Marker>

          {/* Target Candidate Markers */}
          {Array.isArray(results) &&
            results.map((item, idx) => {
              if (!item.lat || !item.lon) return null
              return (
                <Marker
                  key={idx}
                  position={[item.lat, item.lon]}
                  icon={createTargetIcon(item, idx)}
                  eventHandlers={{
                    click: () => setSelectedItem(item),
                  }}
                >
                  <Popup className="orca-custom-popup">
                    <div className="text-xs p-1 space-y-1">
                      <p className="font-bold text-slate-900 flex items-center gap-1">
                        <Fish size={12} className="text-emerald-600" />
                        {item.name || `Target ${idx + 1}`}
                      </p>
                      <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-1 pt-1 border-t border-slate-200">
                        <span>Distance: <strong>{item.distance_km} km</strong></span>
                        <span>Bearing: <strong>{item.bearing_compass || item.direction || '—'}</strong></span>
                        {item.depth_fathom && <span>Depth: <strong>{item.depth_fathom} Fathoms</strong></span>}
                        <span>Source: <strong>{item.source || 'INCOIS'}</strong></span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
        </MapContainer>

        {/* Floating Map Legend Indicator */}
        <div className="absolute top-2.5 right-2.5 z-400 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-[10px] space-y-1 shadow-md pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block border border-white"></span>
            <span className="text-slate-200 font-medium">Origin: {anchorName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-white"></span>
            <span className="text-slate-200 font-medium">
              Target ({count || results.length} Filtered)
            </span>
          </div>
          {radius_km && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 border-t border-dashed border-cyan-400 inline-block"></span>
              <span className="text-cyan-300 font-medium">{radius_km} km Buffer</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary & Filtered Entities List ── */}
      <div className="p-3.5 space-y-3 bg-slate-950">
        {/* Human Plain-Language Spatial Summary */}
        {summary && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200">
            <Info size={15} className="text-cyan-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Filtered Feature Cards */}
        {Array.isArray(results) && results.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-semibold">
              <span>SPATIALLY FILTERED CANDIDATES ({results.length})</span>
              <span>DISTANCE & BEARING</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {results.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedItem(item)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    selectedItem?.name === item.name
                      ? 'bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400/50 shadow-md'
                      : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0 border border-emerald-500/40">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.depth_fathom ? `${item.depth_fathom} Fathoms · ` : ''}
                        {item.source || 'INCOIS PFZ'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold text-cyan-300">
                      {item.distance_km} km
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {item.bearing_compass || item.direction || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
