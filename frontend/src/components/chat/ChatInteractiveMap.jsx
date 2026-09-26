import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap
} from 'react-leaflet'
import L from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import client from '../../api/client'
import {
  Compass,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Layers,
  Sparkles,
  Bot,
  RotateCcw,
  Eye,
  Info,
  ExternalLink,
  Shield,
  Activity,
  AlertTriangle,
  Radio,
  Sliders
} from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

// Standard Leaflet Icon fix
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Controller to smoothly fly map to active center & zoom
function MapFlyController({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2, easeLinearity: 0.25 })
    }
  }, [center, zoom, map])
  return null
}

// Available AI Controlled Layers configuration
export const CHAT_MAP_LAYERS = [
  { id: 'chlorophyll', name: 'Chlorophyll', icon: '🌱', color: '#10b981', endpoint: '/api/layer/chlorophyll' },
  { id: 'bathymetry',  name: 'Bathymetry',  icon: '🌊', color: '#0284c7', endpoint: '/api/layer/bathymetry' },
  { id: 'sst',         name: 'SST Temp',    icon: '🌡️', color: '#f97316', endpoint: '/api/layer/sst' },
  { id: 'pfz',         name: 'PFZ Zones',   icon: '🐟', color: '#059669', endpoint: '/api/layer/pfz' },
  { id: 'waves',       name: 'Waves/Swell', icon: '〰️', color: '#3b82f6', endpoint: '/api/layer/waves' },
  { id: 'wind',        name: 'Wind',        icon: '💨', color: '#06b6d4', endpoint: '/api/layer/wind' },
  { id: 'lightning',   name: 'Lightning',   icon: '⚡', color: '#eab308', endpoint: '/api/layer/lightning' },
  { id: 'cyclones',    name: 'Cyclones',    icon: '🌀', color: '#ef4444', endpoint: '/api/layer/cyclones' },
  { id: 'currents',    name: 'Currents',    icon: '🔄', color: '#6366f1', endpoint: '/api/layer/currents' },
  { id: 'eez',         name: 'EEZ Boundary',icon: '🛡️', color: '#00bcd4', endpoint: '/api/layer/eez' },
  { id: 'ports',       name: 'Ports/FLC',   icon: '⚓', color: '#d97706', endpoint: '/api/layer/ports' },
  { id: 'restricted',  name: 'Naval Zones', icon: '🚫', color: '#dc2626', endpoint: '/api/layer/restricted_zones' },
]

export const BASEMAP_CONFIGS = {
  satellite: {
    name: 'Satellite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics'
  },
  ocean: {
    name: 'Ocean Dark',
    icon: '🌊',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB, OpenStreetMap'
  },
  street: {
    name: 'Nautical Light',
    icon: '🗺️',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB, OpenStreetMap'
  }
}

// Single GeoJSON layer renderer with canvas hardware acceleration
function ChatMapGeoJsonLayer({ layer, active }) {
  const map = useMap()
  const layerGroupRef = useRef(null)

  const { data: geoData } = useQuery({
    queryKey: ['chat-geo-layer', layer.id],
    queryFn: async () => {
      const res = await client.get(layer.endpoint)
      return res.data
    },
    enabled: active,
    staleTime: 60000,
    retry: 1,
  })

  useEffect(() => {
    if (!active || !geoData || !geoData.features || !geoData.features.length) {
      if (layerGroupRef.current && map.hasLayer(layerGroupRef.current)) {
        map.removeLayer(layerGroupRef.current)
        layerGroupRef.current = null
      }
      return
    }

    // Remove previous instance if existing
    if (layerGroupRef.current && map.hasLayer(layerGroupRef.current)) {
      map.removeLayer(layerGroupRef.current)
    }

    const geoJsonInstance = L.geoJSON(geoData, {
      style: (feature) => {
        const props = feature?.properties || {}
        if (layer.id === 'bathymetry') {
          const depth = props.depth_m || 50
          const color = props.color || (depth <= 50 ? '#38bdf8' : depth <= 200 ? '#0284c7' : '#1e3a8a')
          return {
            color,
            weight: depth <= 100 ? 1.8 : 1.2,
            opacity: 0.85,
          }
        }
        if (layer.id === 'chlorophyll') {
          return {
            color: props.color || '#10b981',
            weight: 1.2,
            opacity: 0.85,
            fillColor: props.color || '#10b981',
            fillOpacity: 0.55,
          }
        }
        if (layer.id === 'eez') {
          return {
            color: '#00bcd4',
            weight: 2.0,
            opacity: 0.85,
            fillColor: '#00bcd4',
            fillOpacity: 0.05,
            dashArray: '5, 4',
          }
        }
        if (layer.id === 'pfz') {
          return {
            color: '#047857',
            weight: 1.8,
            opacity: 0.9,
            fillColor: '#10b981',
            fillOpacity: 0.35,
            dashArray: '4, 4',
          }
        }
        if (layer.id === 'cyclones') {
          return {
            color: '#ef4444',
            weight: 2.5,
            opacity: 0.9,
            dashArray: '6, 4',
          }
        }
        if (layer.id === 'restricted') {
          return {
            color: '#dc2626',
            weight: 2.0,
            opacity: 0.85,
            fillColor: '#ef4444',
            fillOpacity: 0.2,
            dashArray: '4, 4',
          }
        }
        return {
          color: layer.color,
          weight: 1.6,
          opacity: 0.8,
          fillColor: layer.color,
          fillOpacity: 0.2,
        }
      },
      pointToLayer: (feature, latlng) => {
        const props = feature?.properties || {}
        if (layer.id === 'chlorophyll') {
          const c = props.color || '#10b981'
          const val = props.chlorophyll_a_mgm3 || 0.5
          const r = val > 5 ? 5 : val > 1.5 ? 4 : val > 0.5 ? 3.2 : 2.5
          return L.circleMarker(latlng, {
            radius: r,
            fillColor: c,
            color: '#ffffff',
            weight: 0.8,
            opacity: 0.9,
            fillOpacity: 0.85,
          })
        }
        if (layer.id === 'sst') {
          const temp = props.temp_c ?? 28.5
          const color = props.color || '#f97316'
          const icon = L.divIcon({
            className: 'sst-chat-badge',
            html: `<div style="background:${color};color:#fff;border:1.2px solid #fff;border-radius:9999px;padding:1px 4px;font-size:8.5px;font-weight:800;font-family:monospace;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${temp.toFixed(1)}°C</div>`,
            iconSize: [40, 16],
            iconAnchor: [20, 8],
          })
          return L.marker(latlng, { icon })
        }
        if (layer.id === 'ports') {
          return L.circleMarker(latlng, {
            radius: 4.5,
            fillColor: '#d97706',
            color: '#ffffff',
            weight: 1.2,
            opacity: 0.9,
            fillOpacity: 0.9,
          })
        }
        if (layer.id === 'lightning') {
          const icon = L.divIcon({
            className: 'lightning-chat-badge',
            html: `<div style="font-size:12px;filter:drop-shadow(0 0 4px #facc15);">⚡</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })
          return L.marker(latlng, { icon })
        }
        if (layer.id === 'cyclones') {
          const icon = L.divIcon({
            className: 'cyclone-chat-badge',
            html: `<div style="font-size:14px;animation:spin 4s linear infinite;color:#ef4444;">🌀</div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          })
          return L.marker(latlng, { icon })
        }
        return L.circleMarker(latlng, {
          radius: 3.5,
          fillColor: layer.color,
          color: '#ffffff',
          weight: 1,
          opacity: 0.85,
          fillOpacity: 0.75,
        })
      },
      onEachFeature: (feature, leafletLayer) => {
        const props = feature?.properties || {}
        if (layer.id === 'bathymetry') {
          const depth = props.depth_m ?? 'N/A'
          leafletLayer.bindTooltip(`🌊 GEBCO Depth: ${depth}m isobath`, { sticky: true })
          leafletLayer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 11px; padding: 2px;">
              <h4 style="font-weight: 800; color: #0284c7; margin: 0 0 4px;">🌊 Isobath Depth Contour</h4>
              <div><strong>Depth:</strong> ${depth} meters below MSL</div>
              <div><strong>Keel Clearance:</strong> ${depth > 20 ? 'Safe for Commercial Craft' : 'Caution: Coastal Shoals'}</div>
              <div style="color: #64748b; font-size: 9px; margin-top: 4px;">GEBCO 2026 Bathymetric Grid</div>
            </div>
          `)
        } else if (layer.id === 'chlorophyll') {
          const val = props.chlorophyll_a_mgm3 ?? 'N/A'
          leafletLayer.bindTooltip(`🌱 Chlorophyll-a: ${val} mg/m³`, { sticky: true })
          leafletLayer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 11px; padding: 2px;">
              <h4 style="font-weight: 800; color: #047857; margin: 0 0 4px;">🌱 Chlorophyll-a Plankton</h4>
              <div><strong>Density:</strong> ${val} mg/m³</div>
              <div><strong>Productivity:</strong> ${props.productivity_level || 'Normal'}</div>
              <div style="color: #64748b; font-size: 9px; margin-top: 4px;">Copernicus Marine / MODIS-Aqua</div>
            </div>
          `)
        } else {
          const title = props.name || props.NAME || layer.name
          leafletLayer.bindTooltip(`<b>${layer.name}:</b> ${title}`, { sticky: true })
        }
      }
    })

    geoJsonInstance.addTo(map)
    layerGroupRef.current = geoJsonInstance

    return () => {
      if (layerGroupRef.current && map.hasLayer(layerGroupRef.current)) {
        map.removeLayer(layerGroupRef.current)
      }
    }
  }, [active, geoData, map, layer])

  return null
}

export default function ChatInteractiveMap({
  center,
  zoom = 8,
  activeLayers = ['bathymetry', 'chlorophyll'],
  onToggleLayer,
  aiTargetMarkers = [],
  aiRouteLine = null,
  aiCommandNotice = null,
  basemap = 'satellite',
  onBasemapChange,
  mapSize = 'compact', // 'compact' | 'balanced' | 'expanded'
  onToggleMapSize,
  className = 'h-full w-full'
}) {
  const { location, t } = useGlobal()
  const homeLat = location.lat || 13.0827
  const homeLon = location.lon || 80.2707

  const [mapCenter, setMapCenter] = useState(center || [homeLat, homeLon])
  const [mapZoom, setMapZoom] = useState(zoom)
  const [currentBasemap, setCurrentBasemap] = useState(basemap || 'satellite')

  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      setMapCenter(center)
      if (zoom) setMapZoom(zoom)
    }
  }, [center, zoom])

  useEffect(() => {
    if (basemap && BASEMAP_CONFIGS[basemap]) {
      setCurrentBasemap(basemap)
    }
  }, [basemap])

  const handleRecenter = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setMapCenter([homeLat, homeLon])
    setMapZoom(9)
  }

  const handleBasemapCycle = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const keys = Object.keys(BASEMAP_CONFIGS)
    const nextIdx = (keys.indexOf(currentBasemap) + 1) % keys.length
    const nextBasemap = keys[nextIdx]
    setCurrentBasemap(nextBasemap)
    if (onBasemapChange) onBasemapChange(nextBasemap)
  }

  // Create User Location Pin Icon
  const userIcon = useMemo(() => {
    return L.divIcon({
      className: 'orca-user-map-pin',
      html: `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(14, 165, 233, 0.4); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; z-index: 2; width: 16px; height: 16px; border-radius: 50%; background: #0284c7; border: 2px solid #ffffff; box-shadow: 0 0 8px rgba(2, 132, 199, 0.8); display: flex; align-items: center; justify-content: center; font-size: 8.5px; color: #ffffff; font-weight: bold;">
            📍
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
  }, [])

  const selectedBasemapConfig = BASEMAP_CONFIGS[currentBasemap] || BASEMAP_CONFIGS.satellite

  return (
    <div className={`relative rounded-3xl overflow-hidden shadow-card border border-borderLight bg-slate-950 flex flex-col ${className}`}>
      
      {/* ── Top Bar: AI Map Command Indicator & Quick Toggles ─────── */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[1000] flex flex-col gap-1.5 pointer-events-none">
        {/* Active AI Status Pill */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/70 text-white shadow-md text-[11px] max-w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <Bot size={12} className="text-cyan-400 flex-shrink-0" />
            <span className="font-bold tracking-tight truncate">
              {aiCommandNotice ? aiCommandNotice : t ? t('Conversational AI Map Control Active') : 'Conversational AI Map Control Active'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Basemap Switcher */}
            <button
              type="button"
              onClick={handleBasemapCycle}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/70 text-slate-200 text-[11px] font-semibold shadow-md transition-colors cursor-pointer"
              title="Cycle basemap: Satellite / Ocean / Street"
            >
              <span>{selectedBasemapConfig.icon}</span>
              <span className="hidden sm:inline">{selectedBasemapConfig.name}</span>
            </button>

            {/* Recenter Button */}
            <button
              type="button"
              onClick={handleRecenter}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/70 text-cyan-300 text-[11px] font-semibold shadow-md transition-colors cursor-pointer"
              title="Reset view to active GPS position"
            >
              <RotateCcw size={11} />
              <span className="hidden sm:inline">{t ? t('My GPS') : 'My GPS'}</span>
            </button>

            {/* Sizing Toggle Button */}
            {onToggleMapSize && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleMapSize()
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/70 text-amber-300 text-[11px] font-semibold shadow-md transition-colors cursor-pointer"
                title={`Current size: ${mapSize}. Click to change.`}
              >
                {mapSize === 'compact' ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
                <span className="capitalize hidden sm:inline">{mapSize}</span>
              </button>
            )}
          </div>
        </div>

        {/* Floating Quick Layer Chips Bar (Strictly prevent scroll jump on click) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pointer-events-auto no-scrollbar">
          {CHAT_MAP_LAYERS.map(layer => {
            const isActive = activeLayers.includes(layer.id)
            return (
              <button
                key={layer.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (onToggleLayer) onToggleLayer(layer.id)
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-extrabold shadow-cyan-500/20'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white backdrop-blur-sm'
                }`}
              >
                <span>{layer.icon}</span>
                <span>{layer.name}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 ml-0.5" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Leaflet Map Viewport ─────────────────────────────────── */}
      <div className="flex-1 w-full h-full min-h-[260px] relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          preferCanvas={true}
          className="w-full h-full z-0"
          zoomControl={false}
        >
          <MapFlyController center={mapCenter} zoom={mapZoom} />

          {/* Dynamic Base Layer */}
          <TileLayer
            key={currentBasemap}
            url={selectedBasemapConfig.url}
            attribution={selectedBasemapConfig.attribution}
            maxZoom={18}
          />

          {/* User Active Location Marker */}
          <Marker position={[homeLat, homeLon]} icon={userIcon}>
            <Popup>
              <div className="font-sans text-xs p-1">
                <strong className="text-navy block">📍 {location.name}</strong>
                <span className="text-textMuted">Active Reference GPS ({homeLat.toFixed(4)}°N, {homeLon.toFixed(4)}°E)</span>
              </div>
            </Popup>
          </Marker>

          {/* Dynamic AI-Commanded GeoJSON Layers */}
          {CHAT_MAP_LAYERS.map(layer => (
            <ChatMapGeoJsonLayer
              key={layer.id}
              layer={layer}
              active={activeLayers.includes(layer.id)}
            />
          ))}

          {/* AI Commanded Target Pins (PFZ candidates / Safety Waypoints) */}
          {aiTargetMarkers.map((marker, idx) => {
            const mLat = marker.lat ?? marker.latitude
            const mLon = marker.lon ?? marker.longitude
            if (mLat == null || mLon == null) return null

            const isSafe = marker.is_safe !== false
            const pinColor = marker.color || (isSafe ? '#10b981' : '#f59e0b')
            const markerIcon = L.divIcon({
              className: `ai-target-marker-${idx}`,
              html: `
                <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                  <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: ${pinColor}; opacity: 0.4; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                  <div style="position: relative; z-index: 2; width: 18px; height: 18px; border-radius: 50%; background: ${pinColor}; border: 2px solid #ffffff; box-shadow: 0 0 8px ${pinColor}; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #ffffff; font-weight: 900;">
                    ${marker.badge || '🎯'}
                  </div>
                </div>
              `,
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            })

            return (
              <Marker key={`ai-target-${idx}`} position={[mLat, mLon]} icon={markerIcon}>
                <Popup>
                  <div className="font-sans text-xs p-1 max-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                      <strong className="text-navy">{marker.title || marker.name || `Target Point #${idx + 1}`}</strong>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {marker.confidence || 'RECOMMENDED'}
                      </span>
                    </div>
                    {marker.distance_km && <div><strong>Distance:</strong> ~{Math.round(marker.distance_km)} km ({marker.direction || 'E'})</div>}
                    {marker.avg_sst_celsius && <div><strong>SST:</strong> {marker.avg_sst_celsius}°C</div>}
                    {marker.avg_chlorophyll_mg_m3 && <div><strong>Chlorophyll:</strong> {marker.avg_chlorophyll_mg_m3} mg/m³</div>}
                    {marker.description && <div className="mt-1 text-[10px] text-slate-600 bg-slate-50 p-1 rounded">{marker.description}</div>}
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Commanded Navigation Route Polyline */}
          {aiRouteLine && Array.isArray(aiRouteLine) && aiRouteLine.length > 1 && (
            <Polyline
              positions={aiRouteLine}
              pathOptions={{
                color: '#38bdf8',
                weight: 3.5,
                opacity: 0.9,
                dashArray: '6, 6'
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* ── Bottom Strip: Coordinates & Scale ─────────────────────── */}
      <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-slate-300">
            <Compass size={11} className="text-cyan-400" />
            <span>{mapCenter[0].toFixed(2)}°N, {mapCenter[1].toFixed(2)}°E (Zoom {mapZoom})</span>
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400">
            {activeLayers.length} Layers Active
          </span>
        </div>
        <div className="text-[9.5px] font-mono text-cyan-400 font-semibold truncate ml-2">
          GEBCO 2026 · Copernicus · ISRO OCM-3
        </div>
      </div>
    </div>
  )
}
