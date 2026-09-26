import React, { useEffect, useState, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  Tooltip,
  GeoJSON,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import api from '../../api'
import { BASE_MAPS } from '../map/mapLayersConfig'
import { 
  Navigation, Anchor, MapPin, Compass, Copy, Check, Crosshair,
  Layers, Eye, EyeOff, Filter, X, ShieldAlert, Sparkles, AlertTriangle
} from 'lucide-react'
import NearestMaritimeOverlay from '../map/NearestMaritimeOverlay'
import { useGlobal } from '../../context/GlobalContext'

// Requirement 21: Full catalog of all 18 platform-wide toggleable map layers
export const ALL_18_MAP_LAYERS = [
  { id: 'sst', name: 'SST', fullName: 'Sea Surface Temperature', color: '#ff5722', category: 'Oceanography', desc: 'Satellite thermal gradient contours (°C)' },
  { id: 'chlorophyll', name: 'Chlorophyll', fullName: 'Chlorophyll-a Plankton', color: '#10b981', category: 'Oceanography', desc: 'Phytoplankton concentration & upwelling (mg/m³)' },
  { id: 'wind', name: 'Wind', fullName: 'Marine Wind Vectors', color: '#06b6d4', category: 'Oceanography', desc: 'Surface wind velocity & meteorological heading' },
  { id: 'waves', name: 'Waves', fullName: 'Wave Height (SWH)', color: '#3b82f6', category: 'Oceanography', desc: 'Significant wave height & breaking seas (m)' },
  { id: 'swell', name: 'Swell', fullName: 'Ocean Swell & Period', color: '#8b5cf6', category: 'Oceanography', desc: 'Deep-ocean swell period (s) & direction' },
  { id: 'currents', name: 'Currents', fullName: 'Surface Current Drift', color: '#00e5ff', category: 'Oceanography', desc: '390 surface current drift vectors (knots)' },
  { id: 'pfz', name: 'PFZ', fullName: 'Potential Fishing Zones', color: '#059669', category: 'Fisheries', desc: 'INCOIS thermal-chlorophyll fishing zones' },
  { id: 'cyclones', name: 'Cyclones', fullName: 'Cyclone Storm Tracks', color: '#e11d48', category: 'Hazards', desc: 'Historical & active storm tracks with wind cones' },
  { id: 'lightning', name: 'Lightning', fullName: 'Live Lightning & Thunderstorms', color: '#facc15', category: 'Hazards', desc: 'INSAT-3DS convective lightning discharges' },
  { id: 'high_wave_alerts', name: 'High-wave alerts', fullName: 'High-Wave & Surge Alerts', color: '#f97316', category: 'Hazards', desc: 'INCOIS coastal high-wave warning zones' },
  { id: 'eez', name: 'EEZ', fullName: '200nm Indian EEZ Boundary', color: '#00bcd4', category: 'Boundaries', desc: 'Statutory Exclusive Economic Zone limits' },
  { id: 'restricted_zones', name: 'Restricted zones', fullName: 'Naval Firing Ranges', color: '#ef4444', category: 'Boundaries', desc: 'Sovereign military & missile standoff buffers' },
  { id: 'mpa', name: 'MPA', fullName: 'Marine Protected Areas', color: '#22c55e', category: 'Ecology', desc: 'Protected marine sanctuaries & biosphere reserves' },
  { id: 'bathymetry', name: 'Bathymetry', fullName: 'Depth Contours / Isobaths', color: '#0284c7', category: 'Oceanography', desc: 'GEBCO 2026 depth contours (10m, 50m, 100m, 200m)' },
  { id: 'coastline', name: 'Coastline', fullName: '10m High-Res Coastline', color: '#94a3b8', category: 'Boundaries', desc: 'Natural Earth 10m high-resolution baseline' },
  { id: 'landing_centres', name: 'Landing centres', fullName: 'Fish Landing Centres (FLC)', color: '#eab308', category: 'Fisheries', desc: '150+ designated coastal landing harbours' },
  { id: 'ais', name: 'AIS', fullName: 'Live Vessel Traffic', color: '#ec4899', category: 'Navigation', desc: 'Commercial tankers, cargo, & trawlers AIS positions' },
  { id: 'route', name: 'Route', fullName: 'Active Planned Corridors', color: '#38bdf8', category: 'Navigation', desc: 'Fastest, Balanced, and Safest passage lanes' },
]

// Custom departure pin
const departureIcon = L.divIcon({
  className: 'route-start-pin',
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; inset: 0; background: #00c853; border-radius: 50%; opacity: 0.35; animation: ping 1.5s infinite;"></div>
      <div style="position: absolute; inset: 3px; background: #00c853; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
        <span style="font-size: 13px; color: white;">🟢</span>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

// Custom arrival destination pin
const arrivalIcon = L.divIcon({
  className: 'route-end-pin',
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; inset: 0; background: #ef4444; border-radius: 50%; opacity: 0.35; animation: ping 1.5s infinite;"></div>
      <div style="position: absolute; inset: 3px; background: #ef4444; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
        <span style="font-size: 13px; color: white;">🏁</span>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

// Smoothly fit map camera to encapsulate the entire route
function RouteBoundsFitter({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points && points.length > 1) {
      const bounds = L.latLngBounds(points)
      map.flyToBounds(bounds, { padding: [60, 60], duration: 1.2 })
    }
  }, [points, map])
  return null
}

// Dedicated dynamic GeoJSON renderer for each of the 18 layers
function DynamicRouteLayer({ layerDef }) {
  const { data: geoData, isLoading } = useQuery({
    queryKey: ['route-geo-layer', layerDef.id],
    queryFn: async () => {
      const res = await api.get(`/api/layer/${layerDef.id}`)
      return res.data
    },
    staleTime: 300000,
    retry: 1,
  })

  if (isLoading || !geoData || !geoData.features || geoData.features.length === 0) return null

  const getStyle = (feature) => {
    const props = feature.properties || {}
    if (layerDef.id === 'restricted_zones') {
      return {
        color: '#ef4444',
        weight: 2.2,
        opacity: 0.85,
        fillColor: '#ef4444',
        fillOpacity: 0.25,
        dashArray: '5, 5',
      }
    }
    if (layerDef.id === 'high_wave_alerts') {
      return {
        color: '#f97316',
        weight: 2.4,
        opacity: 0.9,
        fillColor: '#f97316',
        fillOpacity: 0.35,
        dashArray: '4, 4',
      }
    }
    if (layerDef.id === 'bathymetry') {
      const d = props.depth_m || 50
      const c = props.color || (d <= 20 ? '#38bdf8' : d <= 100 ? '#0284c7' : '#1e3a8a')
      return {
        color: c,
        weight: d <= 20 ? 2.5 : 1.5,
        opacity: 0.8,
      }
    }
    if (layerDef.id === 'coastline') {
      return {
        color: '#94a3b8',
        weight: 2.0,
        opacity: 0.95,
      }
    }
    if (layerDef.id === 'sst') {
      const c = props.color || '#ff5722'
      return {
        color: c,
        weight: 2.0,
        opacity: 0.9,
        fillColor: c,
        fillOpacity: 0.22,
      }
    }
    if (layerDef.id === 'chlorophyll') {
      const c = props.color || '#10b981'
      return {
        color: c,
        weight: 2.0,
        opacity: 0.9,
        fillColor: c,
        fillOpacity: 0.25,
      }
    }
    if (layerDef.id === 'wind' || layerDef.id === 'swell') {
      const c = props.color || (layerDef.id === 'wind' ? '#06b6d4' : '#8b5cf6')
      return {
        color: c,
        weight: 2.2,
        opacity: 0.85,
        lineCap: 'round',
      }
    }
    if (layerDef.id === 'waves') {
      const c = props.color || '#3b82f6'
      return {
        color: c,
        weight: 2.2,
        opacity: 0.9,
        fillColor: c,
        fillOpacity: 0.22,
      }
    }
    if (layerDef.id === 'currents') {
      const spd = props.speed_knots || 0.6
      const color = spd > 1.2 ? '#ec4899' : spd > 0.7 ? '#0284c7' : '#06b6d4'
      return {
        color,
        weight: 2.5,
        opacity: 0.85,
        lineCap: 'round',
      }
    }
    if (layerDef.id === 'pfz') {
      return {
        color: '#059669',
        weight: 2,
        opacity: 0.9,
        fillColor: '#059669',
        fillOpacity: 0.35,
        dashArray: '4, 4',
      }
    }
    if (layerDef.id === 'eez') {
      return {
        color: '#00bcd4',
        weight: 2.4,
        opacity: 0.8,
        fillColor: '#00bcd4',
        fillOpacity: 0.05,
      }
    }
    if (layerDef.id === 'mpa') {
      return {
        color: '#22c55e',
        weight: 2.0,
        opacity: 0.85,
        fillColor: '#22c55e',
        fillOpacity: 0.25,
      }
    }
    return {
      color: layerDef.color,
      weight: 1.8,
      opacity: 0.8,
      fillColor: layerDef.color,
      fillOpacity: 0.2,
    }
  }

  const pointToLayer = (feature, latlng) => {
    const props = feature.properties || {}
    let radius = 5
    let strokeColor = '#ffffff'
    let strokeWidth = 1.2
    let fillColor = layerDef.color

    if (layerDef.id === 'lightning') {
      const isCG = (props.strike_type || '').includes('CG')
      fillColor = isCG ? '#facc15' : '#38bdf8'
      return L.circleMarker(latlng, {
        radius: 6,
        fillColor,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      })
    }
    if (layerDef.id === 'landing_centres') {
      return L.circleMarker(latlng, {
        radius: 4.5,
        fillColor: '#eab308',
        color: '#78350f',
        weight: 1.2,
        opacity: 0.9,
        fillOpacity: 0.9,
      })
    }
    if (layerDef.id === 'ais') {
      return L.circleMarker(latlng, {
        radius: 5,
        fillColor: '#ec4899',
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.9,
      })
    }
    if (layerDef.id === 'chlorophyll') {
      const c = props.color || layerDef.color
      const val = props.chlorophyll_a_mgm3 || 0.5
      const r = val > 5 ? 5.5 : val > 1.5 ? 4.5 : val > 0.5 ? 3.8 : 3.0
      return L.circleMarker(latlng, {
        radius: r,
        fillColor: c,
        color: '#ffffff',
        weight: 0.8,
        opacity: 0.9,
        fillOpacity: 0.85,
      })
    }

    return L.circleMarker(latlng, {
      radius,
      fillColor,
      color: strokeColor,
      weight: strokeWidth,
      opacity: 0.9,
      fillOpacity: 0.85,
    })
  }

  const onEachFeature = (feature, leafletLayer) => {
    const props = feature.properties || {}
    const title = props.name || props.zone_name || props.NAME || props.PORT_NAME || props.vessel_name || layerDef.fullName
    
    // Quick hover tooltip
    leafletLayer.bindTooltip(`<b>${layerDef.name}:</b> ${title}`, { sticky: true })

    // Rich popup
    const popupContent = `
      <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 240px; color: #0a2540; padding: 2px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: ${layerDef.color};">${title}</h4>
          <span style="background: #f1f5f9; color: #475569; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; text-transform: uppercase;">${layerDef.category}</span>
        </div>
        ${props.sector ? `<div><strong>Sector:</strong> ${props.sector}</div>` : ''}
        ${props.temp_c != null ? `<div><strong>SST Temp:</strong> ${props.temp_c}°C</div>` : ''}
        ${(props.chlorophyll_a_mgm3 ?? props.chlorophyll_mg_m3) != null ? `<div><strong>Chlorophyll-a:</strong> ${props.chlorophyll_a_mgm3 ?? props.chlorophyll_mg_m3} mg/m³</div>` : ''}
        ${props.productivity_level ? `<div><strong>Productivity:</strong> ${props.productivity_level}</div>` : ''}
        ${props.wind_speed_knots != null ? `<div><strong>Wind Speed:</strong> ${props.wind_speed_knots} kts (${props.heading_deg}°)</div>` : ''}
        ${props.wave_height_m != null ? `<div><strong>Wave Height:</strong> ${props.wave_height_m} m</div>` : ''}
        ${props.swell_height_m != null ? `<div><strong>Swell:</strong> ${props.swell_height_m} m (${props.swell_period_s}s)</div>` : ''}
        ${props.speed_knots != null ? `<div><strong>Current:</strong> ${props.speed_knots} kts (${props.heading_deg}°)</div>` : ''}
        ${props.depth_m != null ? `<div><strong>Depth Sounding:</strong> ${props.depth_m} m</div>` : ''}
        ${props.vessel_type ? `<div><strong>Vessel:</strong> ${props.vessel_type} (${props.speed_knots || 0} kts)</div>` : ''}
        ${props.warning_level ? `<div style="color: #ea580c; font-weight: bold; margin-top: 4px;">⚠ ${props.warning_level}</div>` : ''}
        ${props.reason ? `<div style="margin-top: 4px; padding: 3px 5px; background: #f8fafc; border-left: 2px solid ${layerDef.color}; font-size: 10px;">${props.reason}</div>` : ''}
      </div>
    `
    leafletLayer.bindPopup(popupContent)
  }

  return (
    <GeoJSON
      key={`layer-${layerDef.id}-${geoData.features.length}`}
      data={geoData}
      style={getStyle}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  )
}

export default function RouteMapCanvas({
  origin,
  destination,
  fastestCoords = [],
  safestCoords = [],
  balancedCoords = [],
  selectedMode = 'balanced',
  onSelectMode,
  waypoints = [],
  selectedWpIndex,
  onSelectWp,
  hasCalculated = true,
  geofenceWarning = null,
}) {
  const { t } = useGlobal()
  const baseMap = BASE_MAPS.find(b => b.id === 'satellite') || BASE_MAPS[0]
  const [hoveredWpIndex, setHoveredWpIndex] = useState(null)

  // Requirement 21: Active Layers state - default starts with route, eez, bathymetry, restricted_zones
  const [activeLayers, setActiveLayers] = useState(() => new Set(['route', 'eez', 'bathymetry', 'restricted_zones']))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const toggleLayer = (layerId) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      if (next.has(layerId)) {
        next.delete(layerId)
      } else {
        next.add(layerId)
      }
      return next
    })
  }

  const selectAllLayers = () => {
    setActiveLayers(new Set(ALL_18_MAP_LAYERS.map(l => l.id)))
  }

  const resetDefaultLayers = () => {
    setActiveLayers(new Set(['route', 'eez', 'bathymetry', 'restricted_zones']))
  }

  // Filtered layers for drawer
  const filteredLayers = useMemo(() => {
    return ALL_18_MAP_LAYERS.filter(l => {
      const matchCat = activeCategory === 'All' || l.category === activeCategory
      const matchSearch = !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCat && matchSearch
    })
  }, [activeCategory, searchQuery])

  // Collect all points for camera framing
  const allPoints = useMemo(() => {
    return [
      [origin.lat, origin.lon],
      [destination.lat, destination.lon],
      ...balancedCoords,
      ...safestCoords,
      ...fastestCoords,
    ]
  }, [origin, destination, balancedCoords, safestCoords, fastestCoords])

  const showRoute = activeLayers.has('route')

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-card border border-borderLight h-full min-h-[500px] w-full bg-slate-950">
      <MapContainer
        center={[origin.lat, origin.lon]}
        zoom={6}
        scrollWheelZoom={true}
        preferCanvas={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <RouteBoundsFitter points={allPoints} />

        {/* Satellite Base Layer */}
        <TileLayer
          url={baseMap.url}
          attribution={baseMap.attribution}
          maxZoom={baseMap.maxZoom}
        />

        {/* Render all active layers from the 18 supported GeoJSON endpoints */}
        {ALL_18_MAP_LAYERS.map(l => {
          if (l.id === 'route') return null // Handled below with dedicated Polylines
          if (!activeLayers.has(l.id)) return null
          return <DynamicRouteLayer key={l.id} layerDef={l} />
        })}

        {/* 1. Fastest Route Polyline (Amber) */}
        {showRoute && fastestCoords.length > 1 && (
          <Polyline
            positions={fastestCoords}
            eventHandlers={{
              click: () => onSelectMode && onSelectMode('fastest'),
            }}
            pathOptions={{
              color: '#f59e0b',
              weight: selectedMode === 'fastest' ? 5.5 : 2.5,
              opacity: selectedMode === 'fastest' ? 1.0 : 0.6,
              dashArray: selectedMode === 'fastest' ? undefined : '6, 6',
              lineCap: 'round',
            }}
          >
            <Tooltip sticky>
              <div className="text-xs font-sans font-bold text-amber-900">
                ⚡ Fastest Route (Direct Nautical Passage)
                <div className="text-[10px] text-textMuted font-normal">Click line to select this profile</div>
              </div>
            </Tooltip>
          </Polyline>
        )}

        {/* 2. Safest Route Polyline (Safe Green) */}
        {showRoute && safestCoords.length > 1 && (
          <Polyline
            positions={safestCoords}
            eventHandlers={{
              click: () => onSelectMode && onSelectMode('safest'),
            }}
            pathOptions={{
              color: '#00c853',
              weight: selectedMode === 'safest' ? 5.5 : 2.5,
              opacity: selectedMode === 'safest' ? 1.0 : 0.6,
              dashArray: selectedMode === 'safest' ? undefined : '6, 6',
              lineCap: 'round',
            }}
          >
            <Tooltip sticky>
              <div className="text-xs font-sans font-bold text-emerald-900">
                🛡️ Safest Deep-Water Route (&gt;50m Clearance)
                <div className="text-[10px] text-textMuted font-normal">Click line to select this profile</div>
              </div>
            </Tooltip>
          </Polyline>
        )}

        {/* 3. Balanced Route Polyline (Electric Blue) */}
        {showRoute && balancedCoords.length > 1 && (
          <Polyline
            positions={balancedCoords}
            eventHandlers={{
              click: () => onSelectMode && onSelectMode('balanced'),
            }}
            pathOptions={{
              color: '#38bdf8',
              weight: selectedMode === 'balanced' ? 5.5 : 2.5,
              opacity: selectedMode === 'balanced' ? 1.0 : 0.6,
              dashArray: selectedMode === 'balanced' ? undefined : '6, 6',
              lineCap: 'round',
            }}
          >
            <Tooltip sticky>
              <div className="text-xs font-sans font-bold text-sky-900">
                ⚖️ Balanced Route (Optimal Detour & Fuel)
                <div className="text-[10px] text-textMuted font-normal">Click line to select this profile</div>
              </div>
            </Tooltip>
          </Polyline>
        )}

        {/* Waypoint Markers along active route */}
        {showRoute && waypoints.map((wp, idx) => {
          const isSelected = selectedWpIndex === idx
          const isHovered = hoveredWpIndex === idx
          const isStart = idx === 0
          const isEnd = idx === waypoints.length - 1

          if (isStart || isEnd) return null // Handled by origin/destination pins

          return (
            <CircleMarker
              key={idx}
              center={[wp.lat, wp.lon]}
              radius={isSelected || isHovered ? 8 : 4.5}
              pathOptions={{
                color: isSelected ? '#ff6f00' : isHovered ? '#38bdf8' : '#ffffff',
                fillColor: selectedMode === 'safest' ? '#00c853' : selectedMode === 'fastest' ? '#f59e0b' : '#1e60d5',
                fillOpacity: 1,
                weight: isSelected || isHovered ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onSelectWp && onSelectWp(idx),
                mouseover: () => setHoveredWpIndex(idx),
                mouseout: () => setHoveredWpIndex(null),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <div className="font-sans text-xs p-0.5 space-y-0.5 leading-tight">
                  <div className="font-bold text-oceanBlue flex items-center gap-1">
                    <MapPin size={11} /> {wp.label || `WP ${String(idx).padStart(2, '0')}`}
                  </div>
                  <div className="font-mono text-[10px] text-slate-700">
                    {wp.lat.toFixed(4)}° N, {wp.lon.toFixed(4)}° E
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between gap-2 border-t border-slate-200 pt-0.5 mt-0.5">
                    <span>Depth: <b className="text-slate-800">{wp.depthM}m</b></span>
                    <span>Dist: <b className="text-slate-800">{wp.distKm.toFixed(1)}km</b></span>
                    <span>Hdg: <b className="text-slate-800">{wp.heading}°T</b></span>
                  </div>
                </div>
              </Tooltip>
              <Popup>
                <div className="font-sans text-xs text-navy p-0.5 space-y-1">
                  <div className="font-bold text-oceanBlue flex items-center gap-1">
                    <MapPin size={12} /> {wp.label || `Waypoint ${String(idx).padStart(2, '0')}`}
                  </div>
                  <div className="font-mono text-[11px] text-textSecond">
                    {wp.lat.toFixed(4)}° N, {wp.lon.toFixed(4)}° E
                  </div>
                  <div className="text-[10px] text-textMuted pt-1 border-t border-borderLight flex justify-between">
                    <span>Cumul. Distance:</span>
                    <span className="font-bold text-navy">{wp.distKm.toFixed(1)} km ({(wp.distKm * 0.539957).toFixed(1)} nm)</span>
                  </div>
                  <div className="text-[10px] text-textMuted flex justify-between">
                    <span>True Course Heading:</span>
                    <span className="font-bold text-navy">{wp.heading}° T</span>
                  </div>
                  <div className="text-[10px] text-textMuted flex justify-between">
                    <span>Bathymetric Depth:</span>
                    <span className="font-bold text-safeGreen">{wp.depthM} m</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

        {/* User Current Location, Nearest Coast & Nearest Fishing Point Beacons */}
        <NearestMaritimeOverlay
          showUser={true}
          showCoast={true}
          showFishing={true}
          showCorridors={false}
        />

        {/* Origin Marker */}
        <Marker position={[origin.lat, origin.lon]} icon={departureIcon}>
          <Popup>
            <div className="font-sans text-xs text-navy p-0.5">
              <span className="font-bold text-safeGreen">🟢 {t('Departure Port')}</span>
              <div className="font-semibold">{t(origin.name)}</div>
              <div className="text-[10px] font-mono text-textMuted">
                {origin.lat?.toFixed(4)}° N, {origin.lon?.toFixed(4)}° E
              </div>
            </div>
          </Popup>
        </Marker>

        {/* Destination Marker */}
        <Marker position={[destination.lat, destination.lon]} icon={arrivalIcon}>
          <Popup>
            <div className="font-sans text-xs text-navy p-0.5">
              <span className="font-bold text-dangerRed">🏁 {t('Destination Port')}</span>
              <div className="font-semibold">{t(destination.name)}</div>
              <div className="text-[10px] font-mono text-textMuted">
                {destination.lat?.toFixed(4)}° N, {destination.lon?.toFixed(4)}° E
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* 🧭 Requirement 21: Floating 18-Layer Control Button (Top-Right) */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto flex flex-col items-end gap-2">
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl backdrop-blur-md border text-xs font-bold shadow-xl transition-all cursor-pointer ${
            drawerOpen
              ? 'bg-oceanBlue text-white border-oceanBlue shadow-oceanBlue/30'
              : 'bg-slate-900/90 text-white border-white/20 hover:bg-slate-800'
          }`}
          title={t('Toggle 18 Marine GIS Layers')}
        >
          <Layers size={14} className={drawerOpen ? 'animate-spin' : ''} />
          <span>{t('Map Layers (18)')}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
            {activeLayers.size}
          </span>
        </button>

        {/* Glassmorphic 18-Layer Toggle Drawer */}
        {drawerOpen && (
          <div className="w-[310px] max-h-[440px] flex flex-col bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-2xl p-4 text-white text-xs animate-in fade-in slide-in-from-top-3">
            {/* Header with Title and Close button */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-oceanBlue" />
                <span className="font-bold text-white text-xs">{t('GIS Layer Manager')}</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick Actions: Select All / Reset Defaults */}
            <div className="flex items-center justify-between py-2 text-[11px] border-b border-slate-800/80">
              <span className="text-slate-400 font-mono">
                {activeLayers.size} {t('of')} 18 {t('active')}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={selectAllLayers}
                  className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/40 text-[10px] font-bold cursor-pointer"
                >
                  {t('All 18')}
                </button>
                <button
                  onClick={resetDefaultLayers}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold cursor-pointer"
                >
                  {t('Reset')}
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-2 border-b border-slate-800/80 no-scrollbar">
              {['All', 'Oceanography', 'Hazards', 'Boundaries', 'Fisheries', 'Navigation'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-oceanBlue text-white shadow-2xs'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t(cat)}
                </button>
              ))}
            </div>

            {/* Scrollable Layer Checkbox List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 pt-2 max-h-[250px]">
              {filteredLayers.map((l) => {
                const isActive = activeLayers.has(l.id)
                return (
                  <div
                    key={l.id}
                    onClick={() => toggleLayer(l.id)}
                    className={`flex items-center justify-between p-2 rounded-2xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900/90 border-slate-600 text-white shadow-xs'
                        : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: l.color }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate flex items-center gap-1">
                          <span className={isActive ? 'text-white' : 'text-slate-300'}>{t(l.fullName || l.name)}</span>
                          <span className="text-[9px] text-slate-500 font-normal">({t(l.category)})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{t(l.desc)}</div>
                      </div>
                    </div>

                    <div className="flex items-center ml-2">
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black border ${
                        isActive
                          ? 'bg-oceanBlue text-white border-oceanBlue'
                          : 'bg-slate-800 text-slate-600 border-slate-700'
                      }`}>
                        {isActive ? '✓' : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ⚠️ Geofence & Boundary Warning Overlay */}
      {geofenceWarning && (
        <div className="absolute top-4 left-4 z-30 bg-slate-950/92 backdrop-blur-md text-white border-2 border-amber-500/90 rounded-2xl p-4 shadow-2xl max-w-[280px] pointer-events-auto animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-black text-lg flex items-center justify-center flex-shrink-0">
              ⚠️
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="font-extrabold text-amber-300 text-xs tracking-wide uppercase leading-tight">
                {t(geofenceWarning.warning_badge || geofenceWarning.headline || '⚠️ APPROACHING RESTRICTED ZONE')}
              </div>
              <div className="space-y-1 text-[11px] font-mono border-t border-slate-800 pt-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>{t('Distance:')}</span>
                  <span className="font-bold text-white">
                    {geofenceWarning.distance_km != null ? `${geofenceWarning.distance_km} km` : '1.2 km'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>{t('Zone:')}</span>
                  <span className="font-bold text-amber-200 truncate max-w-[130px]" title={t(geofenceWarning.zone || geofenceWarning.zone_name)}>
                    {t(geofenceWarning.zone || geofenceWarning.zone_name || 'Marine Protected Area')}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-1 mt-1 text-slate-300">
                  <span>{t('Action:')}</span>
                  <span className="font-black text-emerald-400 uppercase tracking-wide">
                    {t(geofenceWarning.action || 'Alter route')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner when awaiting calculation */}
      {!hasCalculated && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-navy/85 backdrop-blur-md text-white px-4 py-2 rounded-2xl shadow-lg border border-white/10 text-xs font-semibold flex items-center gap-2 pointer-events-none text-center">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>{t ? t('Select ports & click "Calculate Routes" to compute sea corridors') : 'Select ports & click "Calculate Routes" to compute sea corridors'}</span>
        </div>
      )}

      {/* Floating Map Legend & Interactive Switcher (Bottom-Left) */}
      {hasCalculated && waypoints.length > 0 ? (
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-borderLight p-3 text-xs text-navy space-y-2 pointer-events-auto max-w-[200px]">
          <div className="font-bold text-xs pb-1 border-b border-borderLight flex items-center justify-between">
            <span>{t ? t('Active Sea Lanes') : 'Active Sea Lanes'}</span>
            <span className="text-[9px] text-textMuted font-mono">{t ? t('Click to toggle') : 'Click to toggle'}</span>
          </div>
          <div className="space-y-1 font-medium text-[11px]">
            <button
              type="button"
              onClick={() => onSelectMode && onSelectMode('fastest')}
              className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-xl transition-all cursor-pointer ${
                selectedMode === 'fastest' ? 'bg-amber-100 font-bold text-amber-900 shadow-2xs' : 'hover:bg-slate-100 text-textSecond'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-3 h-1.5 rounded-full bg-[#f59e0b] flex-shrink-0" />
                <span className="truncate">{t ? t('Fastest') : 'Fastest'}</span>
              </div>
              {selectedMode === 'fastest' && <span className="text-[9px] font-black uppercase text-amber-800 flex-shrink-0">{t ? t('Active') : 'Active'}</span>}
            </button>

            <button
              type="button"
              onClick={() => onSelectMode && onSelectMode('balanced')}
              className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-xl transition-all cursor-pointer ${
                selectedMode === 'balanced' ? 'bg-sky-100 font-bold text-sky-900 shadow-2xs' : 'hover:bg-slate-100 text-textSecond'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-3 h-1.5 rounded-full bg-[#38bdf8] flex-shrink-0" />
                <span className="truncate">{t ? t('Balanced') : 'Balanced'}</span>
              </div>
              {selectedMode === 'balanced' && <span className="text-[9px] font-black uppercase text-sky-800 flex-shrink-0">{t ? t('Active') : 'Active'}</span>}
            </button>

            <button
              type="button"
              onClick={() => onSelectMode && onSelectMode('safest')}
              className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-xl transition-all cursor-pointer ${
                selectedMode === 'safest' ? 'bg-emerald-100 font-bold text-emerald-900 shadow-2xs' : 'hover:bg-slate-100 text-textSecond'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-3 h-1.5 rounded-full bg-[#00c853] flex-shrink-0" />
                <span className="truncate">{t ? t('Safest') : 'Safest'}</span>
              </div>
              {selectedMode === 'safest' && <span className="text-[9px] font-black uppercase text-emerald-800 flex-shrink-0">{t ? t('Active') : 'Active'}</span>}
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 left-4 z-20 bg-navy/90 backdrop-blur-md text-white rounded-2xl shadow-lg border border-white/10 p-3 text-xs space-y-1 pointer-events-auto max-w-[260px]">
          <div className="font-bold text-xs flex items-center gap-1.5 text-sky-400">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span>{t ? t('Awaiting Calculation') : 'Awaiting Calculation'}</span>
          </div>
          <p className="text-[10px] text-slate-300">
            {t ? t('Departure:') : 'Departure:'} <span className="font-semibold text-white">{t ? t(origin.name) : origin.name}</span> &rarr; {t ? t('Arrival:') : 'Arrival:'} <span className="font-semibold text-white">{t ? t(destination.name) : destination.name}</span>.<br />
            {t ? t('Click "Calculate Routes" to plot safe corridors.') : 'Click "Calculate Routes" to plot safe corridors.'}
          </p>
        </div>
      )}
    </div>
  )
}
