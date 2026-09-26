import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  Polyline,
  Polygon,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import { useGlobal, VESSEL_PROFILES } from '../../context/GlobalContext'
import client from '../../api/client'
import { BASE_MAPS, GEO_LAYERS, PAGE_DEFAULT_LAYERS, getFirstLayerPerCategory } from './mapLayersConfig'
import LayerManager from './LayerManager'
import Legend from './Legend'
import CoordinateInspector from './CoordinateInspector'
import MeasureTools from './MeasureTools'
import CycloneSelector from './CycloneSelector'
import SelectedCycloneLayer from './SelectedCycloneLayer'
import NearestMaritimeOverlay from './NearestMaritimeOverlay'
import SpatialReasoningOverlay from './SpatialReasoningOverlay'
import {
  Layers,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  X,
  Bot,
} from 'lucide-react'

// Fix standard Leaflet default icon paths in bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom User Current Location Pin Marker Icon
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'custom-user-location-marker',
    html: `
      <div style="position: relative; width: 34px; height: 42px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); cursor: pointer;">
        <!-- Sonar radar pulse at pinpoint anchor -->
        <div style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 50%); width: 24px; height: 24px; background: rgba(30, 96, 213, 0.45); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <!-- Modern Teardrop Location Marker Pin -->
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: relative; z-index: 2;">
          <path d="M17 0C7.61116 0 0 7.61116 0 17C0 26.5 13.5 40 16.1 41.8C16.6 42.1 17.4 42.1 17.9 41.8C20.5 40 34 26.5 34 17C34 7.61116 26.3888 0 17 0Z" fill="#0a2540"/>
          <path d="M17 1.5C8.43959 1.5 1.5 8.43959 1.5 17C1.5 25.2 14.1 37.8 16.5 39.5C16.8 39.7 17.2 39.7 17.5 39.5C19.9 37.8 32.5 25.2 32.5 17C32.5 8.43959 25.5604 1.5 17 1.5Z" fill="url(#userPinGrad)" stroke="#ffffff" stroke-width="1.5"/>
          <!-- Inner target dot -->
          <circle cx="17" cy="16" r="6.5" fill="#ffffff"/>
          <circle cx="17" cy="16" r="3.5" fill="#00c853"/>
          <defs>
            <linearGradient id="userPinGrad" x1="17" y1="1.5" x2="17" y2="41" gradientUnits="userSpaceOnUse">
              <stop stop-color="#1e60d5"/>
              <stop offset="1" stop-color="#0a2540"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    `,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -42],
  })
}

// Controller component to smoothly fly map to active GPS/search location
function MapRecenter({ lat, lon, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lon) {
      map.flyTo([lat, lon], zoom || map.getZoom(), { duration: 1.2 })
    }
  }, [lat, lon, zoom, map])
  return null
}

// Ensure Leaflet recalculates dimensions when map size changes in grid
function MapSizeInvalidator({ mapSize }) {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 300) // allow CSS transition to finish
    return () => clearTimeout(timer)
  }, [mapSize, map])
  return null
}

// Map Click Listener for Inspector & Measurement
function MapInteractionHandler({
  measureMode,
  onMapClick,
  onAddMeasurePoint,
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      if (measureMode !== 'none') {
        onAddMeasurePoint([lat, lng])
      } else {
        onMapClick({ lat, lon: lng })
      }
    },
  })
  return null
}

const FORECASTABLE_LAYERS = ['waves', 'wind', 'swell', 'sst', 'currents', 'current_vectors', 'high_wave_alerts', 'cyclones']

// Individual GeoJSON Layer loader with React Query caching & dynamic forecast support
function AsyncGeoJsonLayer({ layer, opacity = 0.7, timeOffset = 0 }) {
  const isForecastable = FORECASTABLE_LAYERS.includes(layer.id)
  const endpoint = isForecastable && timeOffset > 0
    ? `${layer.endpoint}?time_offset=${timeOffset}`
    : layer.endpoint

  const { data: geoData, isLoading } = useQuery({
    queryKey: ['geo-layer', layer.id, isForecastable ? timeOffset : 0],
    queryFn: async () => {
      const res = await client.get(endpoint)
      return res.data
    },
    staleTime: isForecastable ? 30000 : Infinity, // Static boundary files never expire, live/forecast updates
    retry: 1,
  })

  if (isLoading || !geoData) return null

  const style = (feature) => {
    if (layer.id === 'current_vectors' && feature?.properties) {
      const spd = feature.properties.speed_knots || 0.5
      const color = spd > 1.2 ? '#ec4899' : spd > 0.7 ? '#0284c7' : '#06b6d4'
      return {
        color: color,
        weight: 2.5,
        opacity: opacity,
        lineCap: 'round',
      }
    }

    if (layer.id === 'lightning' && feature?.properties) {
      // In land areas alone, the outer circle polygon must NOT show:
      if (feature.properties.is_land || feature.properties.zone_type === 'land') {
        return {
          stroke: false,
          fill: false,
          opacity: 0,
          fillOpacity: 0,
        }
      }
      const pColor = feature.properties.color || '#ef4444'
      const isCritical = (feature.properties.risk_level || '').includes('CRITICAL') || (feature.properties.risk_level || '').includes('HIGH')
      return {
        color: pColor,
        weight: isCritical ? 2.2 : 1.6,
        opacity: opacity * 0.95,
        fillColor: pColor,
        fillOpacity: isCritical ? opacity * 0.22 : opacity * 0.12,
        dashArray: '6, 5',
      }
    }

    if (layer.id === 'pfz') {
      return {
        color: '#38013aff', // Vivid Emerald Green border
        weight: 2,
        opacity: Math.min(1, opacity * 1.2),
        fillColor: '#4d0065ff', // Translucent Phytoplankton Green
        fillOpacity: Math.min(0.55, opacity * 0.8),
        dashArray: '4, 4',
      }
    }

    if (layer.id === 'restricted_zones') {
      return {
        color: '#ef4444',
        weight: 2.2,
        opacity: opacity,
        fillColor: '#ef4444',
        fillOpacity: opacity * 0.28,
        dashArray: '5, 5',
      }
    }

    if (layer.id === 'high_wave_alerts') {
      return {
        color: '#f97316',
        weight: 2.5,
        opacity: opacity,
        fillColor: '#f97316',
        fillOpacity: opacity * 0.35,
        dashArray: '4, 4',
      }
    }

    if (layer.id === 'bathymetry') {
      const d = feature?.properties?.depth_m || 50
      const c = feature?.properties?.color || (d <= 20 ? '#38bdf8' : d <= 100 ? '#0284c7' : '#1e3a8a')
      return {
        color: c,
        weight: d <= 20 ? 2.5 : 1.6,
        opacity: opacity * 0.85,
      }
    }

    if (layer.id === 'coastline') {
      return {
        color: '#94a3b8',
        weight: 2.0,
        opacity: opacity * 0.95,
      }
    }

    if (layer.id === 'sst') {
      const c = feature?.properties?.color || '#ff5722'
      return {
        color: c,
        weight: 2.0,
        opacity: opacity * 0.9,
        fillColor: c,
        fillOpacity: opacity * 0.22,
      }
    }

    if (layer.id === 'chlorophyll') {
      const c = feature?.properties?.color || '#10b981'
      return {
        color: c,
        weight: 2.0,
        opacity: opacity * 0.9,
        fillColor: c,
        fillOpacity: opacity * 0.25,
      }
    }

    if (layer.id === 'wind' || layer.id === 'swell') {
      const c = feature?.properties?.color || (layer.id === 'wind' ? '#06b6d4' : '#8b5cf6')
      return {
        color: c,
        weight: 2.2,
        opacity: opacity * 0.9,
        lineCap: 'round',
      }
    }

    if (layer.id === 'waves') {
      const c = feature?.properties?.color || '#3b82f6'
      return {
        color: c,
        weight: 2.2,
        opacity: opacity * 0.9,
        fillColor: c,
        fillOpacity: opacity * 0.22,
      }
    }

    return {
      color: layer.color,
      weight:
        layer.id === 'imbl'
          ? 2.8
          : layer.id === 'eez'
          ? 2.5
          : layer.id === 'high_seas' || layer.id === 'cyclone_tracks' || layer.id === 'mpa'
          ? 2
          : 1.6,
      opacity: opacity,
      fillColor: layer.color,
      fillOpacity:
        layer.id === 'ocean_basin'
          ? opacity * 0.04
          : layer.id === 'high_seas'
          ? opacity * 0.08
          : layer.id === 'seas'
          ? opacity * 0.06
          : layer.id === 'fao_areas'
          ? opacity * 0.06
          : layer.id === 'mpa' || layer.id === 'wetlands'
          ? opacity * 0.25
          : layer.id === 'territorial'
          ? opacity * 0.15
          : layer.id === 'contiguous'
          ? opacity * 0.12
          : opacity * 0.08,
      dashArray:
        layer.id === 'imbl'
          ? '8, 5'
          : layer.id === 'territorial'
          ? '5, 4'
          : layer.id === 'contiguous'
          ? '4, 4'
          : layer.id === 'fao_areas'
          ? '6, 6'
          : layer.id === 'high_seas'
          ? '8, 6'
          : layer.id === 'ocean_basin'
          ? '10, 8'
          : undefined,
    }
  }

  const onEachFeature = (feature, leafletLayer) => {
    const props = feature.properties || {}
    if (layer.id === 'pfz') {
      leafletLayer.bindTooltip(`🐟 ${props.name || props.zone_id || 'PFZ Area'}`, {
        sticky: true,
      })
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 250px; color: #042f2e; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #a82cfbff; padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 15px;">🐟</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #065f46;">${props.name || props.zone_id || 'Potential Fishing Zone'}</h4>
            </div>
            <span style="background: #a82cfbff; color: #065f46; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 6px; font-family: monospace;">${props.confidence || 'HIGH'}</span>
          </div>
          <div><strong>Sector:</strong> ${props.sector || 'Indian Coastal Sector'}</div>
          ${props.depth_fathom ? `<div><strong>Depth Range:</strong> ${props.depth_fathom} fathoms</div>` : ''}
          ${props.distance_miles ? `<div><strong>Distance Offshore:</strong> ~${props.distance_miles} nautical miles</div>` : ''}
          ${props.avg_sst_celsius ? `<div><strong>Sea Surface Temp:</strong> ${props.avg_sst_celsius}°C</div>` : ''}
          ${props.avg_chlorophyll_mg_m3 ? `<div><strong>Chlorophyll-a:</strong> ${props.avg_chlorophyll_mg_m3} mg/m³</div>` : ''}
          <div style="margin-top: 6px; padding: 4px 6px; background: #ecfdf5; border-left: 3px solid #a82cfbff; border-radius: 4px; font-size: 10px; color: #064e3b;">
            ${props.reason || 'Thermal-chlorophyll composite front with high pelagic aggregation (Mackerel, Tuna, Sardine).'}
          </div>
          <div style="margin-top: 4px; color: #64748b; font-size: 9px;">${props.source || 'INCOIS & Copernicus Satellite PFZ'}</div>
        </div>
      `)
      return
    }

    if (layer.id === 'imbl') {
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 230px; color: #0a2540;">
          <h4 style="font-weight: 700; margin: 0 0 4px; color: #ef4444;">IMBL: ${props.LINE_NAME || 'Maritime Boundary'}</h4>
          <div><strong>Treaty Type:</strong> ${props.LINE_TYPE || 'Treaty / Court Ruling'}</div>
          <div><strong>Nations:</strong> ${props.TERRITORY1 || 'India'} &harr; ${props.TERRITORY2 || 'Adjacent Sovereign'}</div>
          <div><strong>Length:</strong> ${props.LENGTH_KM ? `${props.LENGTH_KM.toFixed(1)} km` : 'N/A'}</div>
          <div><strong>Date:</strong> ${props.DOC_DATE || 'Statutory Baseline'}</div>
          <div style="margin-top: 4px; color: #dc2626; font-size: 10px; font-weight: 600;">⚠ International Maritime Boundary Line &bull; Cross-border transit prohibited without authorization</div>
        </div>
      `)
      return
    }

    if (layer.id === 'current_vectors') {
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 210px; color: #0a2540;">
          <h4 style="font-weight: 700; margin: 0 0 4px; color: #0284c7;">Surface Current Flow Vector</h4>
          <div><strong>Speed:</strong> ${props.speed_knots} kts (${props.speed_ms} m/s)</div>
          <div><strong>Heading:</strong> ${props.heading_compass} (${props.heading_deg}°)</div>
          <div><strong>Position:</strong> ${props.lat}°N, ${props.lon}°E</div>
          <div style="margin-top: 4px; color: #64748b; font-size: 10px;">Copernicus Marine Physics Reanalysis</div>
        </div>
      `)
      return
    }

    if (layer.id === 'lightning') {
      if (props.feature_type === 'strike_point') {
        const isCG = (props.strike_type || '').includes('CG')
        const isLand = Boolean(props.is_land || props.zone_type === 'land')
        leafletLayer.bindPopup(`
          <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 250px; color: #0a2540; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
              <span style="font-size: 16px;">⚡</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #d97706;">${props.name || 'Lightning Discharge'}</h4>
            </div>
            <div><strong>Sector:</strong> ${props.sector || 'Regional Zone'} ${isLand ? '<span style="display: inline-block; font-size: 9px; padding: 1px 5px; background: #e0f2fe; color: #0369a1; border-radius: 3px; font-weight: 700; margin-left: 4px;">LAND</span>' : '<span style="display: inline-block; font-size: 9px; padding: 1px 5px; background: #dbeafe; color: #1d4ed8; border-radius: 3px; font-weight: 700; margin-left: 4px;">MARINE</span>'}</div>
            <div><strong>Discharge Type:</strong> <span style="font-weight: 700; color: ${isCG ? '#dc2626' : '#0284c7'};">${props.strike_type}</span></div>
            <div><strong>Peak Current:</strong> ${props.peak_current_ka} kA</div>
            <div><strong>Detected Time:</strong> ${props.strike_time}</div>
            <div><strong>Atmospheric CAPE:</strong> ${props.cape_j_per_kg} J/kg</div>
            <div style="margin-top: 5px; padding: 4px 6px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 10px; color: #92400e; font-weight: 600;">
              ${isLand 
                ? '⚠ Active land lightning strike. High electrocution danger in open fields & near trees. Seek safe indoor shelter.' 
                : '⚠ Active marine lightning strike. Severe hazard for open-deck boats & masts.'}
            </div>
            <div style="margin-top: 4px; color: #64748b; font-size: 9px;">${props.source}</div>
          </div>
        `)
      } else {
        leafletLayer.bindPopup(`
          <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 250px; color: #0a2540; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px;">
              <span style="font-size: 16px;">🌩️</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: ${props.color || '#ef4444'};">${props.name || 'Convective Thunderstorm Cell'}</h4>
            </div>
            <div><strong>Sector:</strong> ${props.sector} (${props.basin})</div>
            <div><strong>Threat Level:</strong> <span style="font-weight: 700; color: ${props.color || '#ef4444'};">${props.risk_level}</span></div>
            <div><strong>CAPE Energy:</strong> ${props.cape_j_per_kg} J/kg</div>
            <div><strong>Cloud Top Temp:</strong> ${props.cloud_top_temp_c}°C (INSAT-3DS)</div>
            <div><strong>Flash Rate:</strong> ~${props.stroke_rate_per_min} discharges/min</div>
            <div><strong>Wind Gusts:</strong> ${props.wind_gusts_kmh} km/h</div>
            <div style="margin-top: 5px; padding: 5px 6px; background: #fee2e2; border-left: 3px solid #ef4444; border-radius: 4px; font-size: 10px; color: #991b1b;">
              <strong>Action:</strong> ${props.recommended_action}
            </div>
            <div style="margin-top: 4px; color: #64748b; font-size: 9px;">${props.source}</div>
          </div>
        `)
      }
      return
    }

    if (layer.id === 'tsunami_epicenters') {
      const mag = props.MAGNITUDE || 'N/A'
      const threatBadge = props.threat_status === 'NO_THREAT' || !props.threat_exists_india
        ? '<span style="background: #dcfce7; color: #15803d; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">NO THREAT FOR INDIA</span>'
        : '<span style="background: #fee2e2; color: #b91c1c; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">⚠️ THREAT ACTIVE</span>'

      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 260px; color: #0a2540; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #fed7aa; padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">⚡</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #e11d48;">M${mag} Earthquake</h4>
            </div>
            ${threatBadge}
          </div>
          <div><strong>Region:</strong> ${props.REGIONNAME || 'Indian Ocean Basin'}</div>
          <div><strong>Origin Time:</strong> ${props.ORIGINTIME || 'Recent'}</div>
          <div><strong>Focal Depth:</strong> ${props.DEPTH ? `${props.DEPTH} km` : 'N/A'}</div>
          <div><strong>Distance to Coast:</strong> ${props.distance_to_india_km ? `~${Math.round(props.distance_to_india_km)} km` : 'N/A'}</div>
          <div style="margin-top: 6px; padding: 5px 6px; background: #fff1f2; border-left: 3px solid #f43f5e; border-radius: 4px; font-size: 10px; color: #881337;">
            <strong>Evaluation:</strong> ${props.evaluation || 'Under continuous seismic monitoring by INCOIS ITEWC.'}
          </div>
          <div style="margin-top: 4px; color: #64748b; font-size: 9px;">INCOIS National Tsunami Warning Centre (ITEWC / MoES)</div>
        </div>
      `)
      return
    }

    if (layer.id === 'argo_floats') {
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 250px; color: #0a2540; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #bae6fd; padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 15px;">🌊</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #0284c7;">Argo Float #${props.platform_number}</h4>
            </div>
            <span style="background: #e0f2fe; color: #0369a1; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px;">IN-SITU CTD</span>
          </div>
          <div><strong>Latest Fix:</strong> ${props.latest_time ? props.latest_time.split('T')[0] : 'Operational'}</div>
          <div><strong>Surface SST:</strong> <span style="font-weight: 700; color: #0284c7;">${props.surface_temp_c}°C</span></div>
          <div><strong>Surface Salinity:</strong> ${props.surface_salinity_psu} PSU</div>
          <div><strong>Thermocline Depth:</strong> ${props.thermocline_depth_m} m</div>
          <div><strong>Max Profile Depth:</strong> ${props.max_depth_m} m</div>
          <div style="margin-top: 5px; padding: 4px 6px; background: #f0f9ff; border-left: 3px solid #0284c7; border-radius: 4px; font-size: 10px; color: #0c4a6e;">
            Autonomous subsurface robotic CTD profiling float (0-2000m vertical profile).
          </div>
          <div style="margin-top: 4px; color: #64748b; font-size: 9px;">INCOIS / Euro-Argo / NOAA Profiling Array</div>
        </div>
      `)
      return
    }

    if (layer.id === 'waves') {
      const isForecast = props.is_forecast
      const swh = props.wave_height_m ?? 0.8
      const badge = isForecast
        ? `<span style="background: #e0f2fe; color: #0369a1; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">🕒 +${props.forecast_offset_hours}H FORECAST</span>`
        : `<span style="background: #dcfce7; color: #15803d; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">🟢 LIVE NOW</span>`

      leafletLayer.bindTooltip(`🌊 ${props.station_name || 'Wave Station'}: ${swh}m (${isForecast ? `+${props.forecast_offset_hours}h` : 'Live'})`, { sticky: true })
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 250px; color: #0a2540; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 15px;">🌊</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #1d4ed8;">${props.station_name || 'Significant Wave Height'}</h4>
            </div>
            ${badge}
          </div>
          <div><strong>Sector / State:</strong> ${props.state || 'Indian Coastal Waters'}</div>
          <div><strong>Significant Wave Height (SWH):</strong> <span style="font-weight: 800; font-size: 13px; color: ${props.color || '#3b82f6'};">${swh} meters</span></div>
          ${props.wave_period_s ? `<div><strong>Dominant Period:</strong> ${props.wave_period_s} seconds</div>` : ''}
          ${props.heading_deg != null ? `<div><strong>Wave Direction:</strong> ${props.heading_deg}°</div>` : ''}
          <div><strong>Sea State:</strong> <span style="font-weight: 700; color: ${props.color || '#3b82f6'};">${props.risk_level || 'Normal Sea State'}</span></div>
          <div style="margin-top: 5px; padding: 4px 6px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 4px; font-size: 10px; color: #1e40af;">
            Valid At: <strong>${props.target_time_formatted || 'Current Live'}</strong>
          </div>
          <div style="margin-top: 4px; color: #64748b; font-size: 9px;">${props.source || 'Open-Meteo Marine / ECMWF / INCOIS'}</div>
        </div>
      `)
      return
    }

    if (layer.id === 'wind') {
      const isForecast = props.is_forecast
      const kts = props.wind_speed_knots ?? 12
      const badge = isForecast
        ? `<span style="background: #e0f2fe; color: #0369a1; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">🕒 +${props.forecast_offset_hours}H FORECAST</span>`
        : `<span style="background: #dcfce7; color: #15803d; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">🟢 LIVE NOW</span>`

      leafletLayer.bindTooltip(`💨 ${props.station_name || 'Wind Station'}: ${kts} kts (${isForecast ? `+${props.forecast_offset_hours}h` : 'Live'})`, { sticky: true })
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 250px; color: #0a2540; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #bae6fd; padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 15px;">💨</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #0284c7;">${props.station_name || 'Marine Surface Wind'}</h4>
            </div>
            ${badge}
          </div>
          <div><strong>10m Wind Velocity:</strong> <span style="font-weight: 800; font-size: 13px; color: ${props.color || '#0284c7'};">${kts} knots (${props.wind_speed_kmh ?? Math.round(kts * 1.852)} km/h)</span></div>
          ${props.gust_knots ? `<div><strong>Peak Gusts:</strong> ${props.gust_knots} kts (${props.gust_kmh} km/h)</div>` : ''}
          ${props.heading_deg != null ? `<div><strong>Meteorological Heading:</strong> ${props.heading_deg}°</div>` : ''}
          <div><strong>Beaufort Evaluation:</strong> <span style="font-weight: 700; color: ${props.color || '#0284c7'};">${props.risk_level || 'Moderate Breeze'}</span></div>
          <div style="margin-top: 5px; padding: 4px 6px; background: #f0f9ff; border-left: 3px solid #0284c7; border-radius: 4px; font-size: 10px; color: #0c4a6e;">
            Valid At: <strong>${props.target_time_formatted || 'Current Live'}</strong>
          </div>
          <div style="margin-top: 4px; color: #64748b; font-size: 9px;">${props.source || 'Open-Meteo High-Res Weather API'}</div>
        </div>
      `)
      return
    }

    if (layer.id === 'swell') {
      const isForecast = props.is_forecast
      const sh = props.swell_height_m ?? 1.0
      const badge = isForecast
        ? `<span style="background: #e0f2fe; color: #0369a1; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">🕒 +${props.forecast_offset_hours}H FORECAST</span>`
        : `<span style="background: #dcfce7; color: #15803d; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">🟢 LIVE NOW</span>`

      leafletLayer.bindTooltip(`〰️ ${props.station_name || 'Swell Station'}: ${sh}m Swell (${isForecast ? `+${props.forecast_offset_hours}h` : 'Live'})`, { sticky: true })
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 250px; color: #0a2540; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #ddd6fe; padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 15px;">〰️</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #7c3aed;">${props.station_name || 'Ocean Swell Surge'}</h4>
            </div>
            ${badge}
          </div>
          <div><strong>Swell Height:</strong> <span style="font-weight: 800; font-size: 13px; color: ${props.color || '#7c3aed'};">${sh} meters</span></div>
          ${props.swell_period_s ? `<div><strong>Swell Period:</strong> ${props.swell_period_s} seconds</div>` : ''}
          ${props.swell_direction_deg != null ? `<div><strong>Approach Angle:</strong> ${props.swell_direction_deg}°</div>` : ''}
          <div><strong>Surge Risk:</strong> <span style="font-weight: 700; color: ${props.color || '#7c3aed'};">${props.risk_level || 'Normal Swell'}</span></div>
          <div style="margin-top: 5px; padding: 4px 6px; background: #f5f3ff; border-left: 3px solid #8b5cf6; border-radius: 4px; font-size: 10px; color: #4c1d95;">
            Valid At: <strong>${props.target_time_formatted || 'Current Live'}</strong>
          </div>
          <div style="margin-top: 4px; color: #64748b; font-size: 9px;">${props.source || 'Open-Meteo Southern Ocean Swell Model'}</div>
        </div>
      `)
      return
    }

    if (layer.id === 'sst') {
      const isForecast = props.is_forecast
      const temp = props.temp_c ?? 28.5
      const badge = isForecast
        ? `<span style="background: #e0f2fe; color: #0369a1; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">🕒 +${props.forecast_offset_hours}H FORECAST</span>`
        : `<span style="background: #dcfce7; color: #15803d; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">🟢 LIVE NOW</span>`

      leafletLayer.bindTooltip(`🌡️ ${props.station_name || 'SST Station'}: ${temp}°C (${isForecast ? `+${props.forecast_offset_hours}h` : 'Live'})`, { sticky: true })
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 250px; color: #0a2540; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #fed7aa; padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 15px;">🌡️</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #c2410c;">${props.station_name || 'Sea Surface Temperature'}</h4>
            </div>
            ${badge}
          </div>
          <div><strong>SST Value:</strong> <span style="font-weight: 800; font-size: 13px; color: ${props.color || '#ff5722'};">${temp}°C</span></div>
          <div><strong>Thermal Zone:</strong> ${temp >= 29.5 ? 'Tropical Hot Zone (>29.5°C)' : temp >= 28.0 ? 'Optimal Pelagic Frontier' : 'Cool Upwelling Plume'}</div>
          <div style="margin-top: 5px; padding: 4px 6px; background: #fff7ed; border-left: 3px solid #ff5722; border-radius: 4px; font-size: 10px; color: #9a3412;">
            Valid At: <strong>${props.target_time_formatted || 'Current Live'}</strong>
          </div>
          <div style="margin-top: 4px; color: #64748b; font-size: 9px;">${props.source || 'Open-Meteo Marine / ISRO OCM-3'}</div>
        </div>
      `)
      return
    }

    if (layer.id === 'high_wave_alerts') {
      const swh = props.wave_height_m ?? 2.2
      const badge = `<span style="background: #fee2e2; color: #b91c1c; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">⚠️ ${props.alert_level || 'HIGH WAVE WARNING'}</span>`

      leafletLayer.bindTooltip(`⚠️ Wave Alert: ${props.station_name || 'Coast'} (${swh}m)`, { sticky: true })
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 250px; color: #0a2540; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #fecaca; padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 15px;">🌊</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #dc2626;">${props.station_name || 'High Wave Hazard'}</h4>
            </div>
            ${badge}
          </div>
          <div><strong>Predicted Significant Wave:</strong> <span style="font-weight: 800; font-size: 13px; color: #dc2626;">${swh} meters</span></div>
          <div><strong>Threat Status:</strong> ${props.risk_level || 'Dangerous Breaking Seas'}</div>
          ${props.target_time_formatted ? `<div style="margin-top: 5px; padding: 4px 6px; background: #fff1f2; border-left: 3px solid #ef4444; border-radius: 4px; font-size: 10px; color: #991b1b;">
            Forecast Horizon: <strong>${props.target_time_formatted} (+${props.forecast_offset_hours || 0}h)</strong>
          </div>` : ''}
          <div style="margin-top: 4px; color: #64748b; font-size: 9px;">${props.source || 'INCOIS Coastal High Wave Warning System'}</div>
        </div>
      `)
      return
    }

    if (layer.id === 'chlorophyll') {
      const val = props.chlorophyll_a_mgm3 ?? 'N/A'
      const level = props.productivity_level || 'Normal'
      leafletLayer.bindTooltip(`🌱 Chlorophyll-a: ${val} mg/m³ (${level})`, { sticky: true })
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 240px; color: #0a2540; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #a7f3d0; padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 15px;">🌱</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #047857;">Chlorophyll-a Plankton</h4>
            </div>
            <span style="background: #d1fae5; color: #065f46; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px;">${level}</span>
          </div>
          <div><strong>Concentration:</strong> <span style="font-weight: 800; color: ${props.color || '#059669'};">${val} mg/m³</span></div>
          <div><strong>Productivity:</strong> ${level}</div>
          <div style="margin-top: 5px; padding: 4px 6px; background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 4px; font-size: 10px; color: #064e3b;">
            Phytoplankton density indicator for pelagic fish foraging and marine biological productivity.
          </div>
          <div style="margin-top: 4px; color: #64748b; font-size: 9px;">${props.source || 'Copernicus Marine / MODIS-Aqua L3'}</div>
        </div>
      `)
      return
    }

    if (layer.id === 'bathymetry') {
      const depth = props.depth_m != null ? Math.abs(props.depth_m) : 50
      const label = props.label || `${depth} m`
      const zone = props.zone || (depth <= 200 ? 'Continental Shelf' : 'Continental Slope')
      leafletLayer.bindTooltip(`🌊 Depth Isobath: ${label}`, { sticky: true })
      leafletLayer.bindPopup(`
        <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 230px; color: #0a2540; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #bae6fd; padding-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="font-size: 15px;">🌊</span>
              <h4 style="font-weight: 800; font-size: 12px; margin: 0; color: #0284c7;">Bathymetry Contour</h4>
            </div>
            <span style="background: #e0f2fe; color: #0369a1; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px;">${label}</span>
          </div>
          <div><strong>Depth Sounding:</strong> <span style="font-weight: 800; color: ${props.color || '#0284c7'};">${depth} meters</span> (${Math.round(depth * 0.5468)} fathoms)</div>
          <div><strong>Geomorphic Zone:</strong> ${zone}</div>
          <div style="margin-top: 5px; padding: 4px 6px; background: #f0f9ff; border-left: 3px solid #0284c7; border-radius: 4px; font-size: 10px; color: #0c4a6e;">
            GEBCO 2026 gridded bathymetry isobaths for keel clearance verification and safe passage planning.
          </div>
          <div style="margin-top: 4px; color: #64748b; font-size: 9px;">${props.source || 'GEBCO 2026 Bathymetric Grid'}</div>
        </div>
      `)
      return
    }

    const title =
      props.name ||
      props.NAME ||
      props.PORT_NAME ||
      props.zone_name ||
      props.scientificName ||
      props.gear_type ||
      props.type ||
      layer.name
    const details = Object.entries(props)
      .slice(0, 6)
      .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
      .join('')

    leafletLayer.bindPopup(`
      <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 220px; color: #0a2540;">
        <h4 style="font-weight: 700; margin: 0 0 4px; color: ${layer.color};">${title}</h4>
        <div style="color: #4a6080; line-height: 1.3;">${details || layer.description}</div>
      </div>
    `)
  }

  // Point layers (Lightning, Ports, Ramsar, Coral, Nautical Marks, Biodiversity, Fishing Events, Tsunami, Argo)
  const pointToLayer = (feature, latlng) => {
    if (layer.id === 'tsunami_epicenters') {
      const mag = parseFloat(feature.properties?.MAGNITUDE || 5)
      const color = mag >= 6.5 ? '#e11d48' : '#f43f5e'
      const icon = L.divIcon({
        className: 'tsunami-epicenter-marker',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; border: 2px solid ${color}; animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.7;"></div>
            <div style="position: relative; z-index: 2; width: 18px; height: 18px; border-radius: 50%; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 0 10px ${color}; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: #ffffff;">
              ${mag >= 6 ? Math.round(mag) : '⚡'}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      })
      return L.marker(latlng, { icon })
    }

    if (layer.id === 'argo_floats') {
      const icon = L.divIcon({
        className: 'argo-float-marker',
        html: `
          <div style="position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 16px; height: 16px; border-radius: 50%; background: rgba(2, 132, 199, 0.3); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; z-index: 2; width: 12px; height: 12px; border-radius: 50%; background: #0284c7; border: 1.5px solid #ffffff; box-shadow: 0 0 6px rgba(2, 132, 199, 0.8); display: flex; align-items: center; justify-content: center; font-size: 8px; color: #ffffff;">
              ⚓
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
      })
      return L.marker(latlng, { icon })
    }

    if (layer.id === 'lightning') {
      const isCG = (feature.properties?.strike_type || '').includes('CG')
      const color = isCG ? '#facc15' : '#38bdf8'
      const icon = L.divIcon({
        className: 'lightning-strike-marker',
        html: `
          <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 20px; height: 20px; border-radius: 50%; background: ${isCG ? 'rgba(250, 204, 21, 0.45)' : 'rgba(56, 189, 248, 0.45)'}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; z-index: 2; width: 14px; height: 14px; border-radius: 50%; background: ${color}; border: 1.5px solid #ffffff; box-shadow: 0 0 8px ${color}; display: flex; align-items: center; justify-content: center; font-size: 9px; line-height: 1;">
              ⚡
            </div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11],
      })
      return L.marker(latlng, { icon })
    }

    if (layer.id === 'waves') {
      const swh = feature.properties?.wave_height_m ?? 0.8
      const color = feature.properties?.color || (swh >= 2.5 ? '#ef4444' : swh >= 1.8 ? '#f59e0b' : '#3b82f6')
      const icon = L.divIcon({
        className: 'wave-forecast-marker',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; background: ${color}; color: #ffffff; border: 1.5px solid #ffffff; border-radius: 9999px; padding: 2px 6px; font-weight: 800; font-size: 10px; font-family: monospace; box-shadow: 0 2px 6px rgba(0,0,0,0.4); white-space: nowrap; cursor: pointer;">
            <span style="font-size: 9px; margin-right: 2px;">🌊</span>${swh.toFixed(1)}m
          </div>
        `,
        iconSize: [46, 20],
        iconAnchor: [23, 10],
        popupAnchor: [0, -10],
      })
      return L.marker(latlng, { icon })
    }

    if (layer.id === 'wind') {
      const kts = feature.properties?.wind_speed_knots ?? 12
      const heading = feature.properties?.heading_deg ?? 0
      const color = feature.properties?.color || (kts >= 25 ? '#ef4444' : kts >= 18 ? '#f59e0b' : '#06b6d4')
      const icon = L.divIcon({
        className: 'wind-forecast-marker',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; background: ${color}; color: #ffffff; border: 1.5px solid #ffffff; border-radius: 9999px; padding: 2px 6px; font-weight: 800; font-size: 10px; font-family: monospace; box-shadow: 0 2px 6px rgba(0,0,0,0.4); white-space: nowrap; cursor: pointer;">
            <span style="display: inline-block; transform: rotate(${heading}deg); margin-right: 2px; font-size: 9px;">➔</span>${kts}kt
          </div>
        `,
        iconSize: [48, 20],
        iconAnchor: [24, 10],
        popupAnchor: [0, -10],
      })
      return L.marker(latlng, { icon })
    }

    if (layer.id === 'swell') {
      const sh = feature.properties?.swell_height_m ?? 1.0
      const color = feature.properties?.color || (sh >= 2.0 ? '#ef4444' : sh >= 1.4 ? '#f59e0b' : '#8b5cf6')
      const icon = L.divIcon({
        className: 'swell-forecast-marker',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; background: ${color}; color: #ffffff; border: 1.5px solid #ffffff; border-radius: 9999px; padding: 2px 6px; font-weight: 800; font-size: 10px; font-family: monospace; box-shadow: 0 2px 6px rgba(0,0,0,0.4); white-space: nowrap; cursor: pointer;">
            <span style="font-size: 9px; margin-right: 2px;">〰️</span>${sh.toFixed(1)}m
          </div>
        `,
        iconSize: [46, 20],
        iconAnchor: [23, 10],
        popupAnchor: [0, -10],
      })
      return L.marker(latlng, { icon })
    }

    if (layer.id === 'sst') {
      const temp = feature.properties?.temp_c ?? 28.5
      const color = feature.properties?.color || '#ff5722'
      const icon = L.divIcon({
        className: 'sst-forecast-marker',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; background: ${color}; color: #ffffff; border: 1.5px solid #ffffff; border-radius: 9999px; padding: 2px 6px; font-weight: 800; font-size: 10px; font-family: monospace; box-shadow: 0 2px 6px rgba(0,0,0,0.4); white-space: nowrap; cursor: pointer;">
            <span style="font-size: 9px; margin-right: 2px;">🌡️</span>${temp.toFixed(1)}°C
          </div>
        `,
        iconSize: [52, 20],
        iconAnchor: [26, 10],
        popupAnchor: [0, -10],
      })
      return L.marker(latlng, { icon })
    }

    if (layer.id === 'high_wave_alerts') {
      const swh = feature.properties?.wave_height_m ?? 2.2
      const isDangerous = (feature.properties?.alert_level || '').includes('WARNING') || swh >= 2.5
      const color = isDangerous ? '#ef4444' : '#f97316'
      const icon = L.divIcon({
        className: 'high-wave-alert-marker',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: ${color}; opacity: 0.4; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; z-index: 2; width: 22px; height: 22px; border-radius: 50%; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 0 10px ${color}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; color: #ffffff;">
              ⚠️
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      })
      return L.marker(latlng, { icon })
    }

    let radius = 5
    let strokeColor = '#ffffff'
    let strokeWidth = 1.2

    if (layer.id === 'ports') {
      radius = 6
      strokeWidth = 1.5
    } else if (layer.id === 'landing_centres') {
      radius = 4.5
      strokeWidth = 1.2
      strokeColor = '#78350f'
    } else if (layer.id === 'ais') {
      radius = 5.0
      strokeWidth = 1.5
      strokeColor = '#ffffff'
    } else if (layer.id === 'biodiversity_points') {
      radius = 3
      strokeWidth = 0.8
      strokeColor = '#064e3b'
    } else if (layer.id === 'nautical_marks') {
      radius = 4.5
      strokeWidth = 1.2
      strokeColor = '#1e293b'
    } else if (layer.id === 'fishing_events') {
      radius = 5.5
      strokeWidth = 1.5
    } else if (layer.id === 'coral') {
      radius = 4
      strokeWidth = 1
    } else if (layer.id === 'ramsar') {
      radius = 5.5
      strokeWidth = 1.5
    } else if (layer.id === 'chlorophyll') {
      const c = feature.properties?.color || layer.color
      const val = feature.properties?.chlorophyll_a_mgm3 || 0.5
      radius = val > 5 ? 5.5 : val > 1.5 ? 4.5 : val > 0.5 ? 3.8 : 3.0
      return L.circleMarker(latlng, {
        radius,
        fillColor: c,
        color: '#ffffff',
        weight: 0.8,
        opacity: opacity * 0.9,
        fillOpacity: opacity * 0.85,
      })
    }

    return L.circleMarker(latlng, {
      radius,
      fillColor: layer.color,
      color: strokeColor,
      weight: strokeWidth,
      opacity: opacity,
      fillOpacity: opacity,
    })
  }

  const filterFeature = (feature) => {
    if (layer.id === 'ports') {
      const props = feature?.properties || {}
      const name = (props.name || props.name_en || props.seamark_name || props.PORT_NAME || '').toLowerCase()
      const ferryKeywords = [
        'ferry', 'ghat', 'water taxi', 'boat jetty', 'passenger jetty', 
        'launch ghat', 'lanch ghat', 'steamer', 'river', 'canal', 'lake', 
        'backwater', 'boat terminal', 'landing stage'
      ]
      if (ferryKeywords.some(kw => name.includes(kw))) return false
      if (props.amenity === 'ferry_terminal' && !name.includes('port') && !name.includes('harbour')) return false
    }
    return true
  }

  return (
    <GeoJSON
      key={`${layer.id}-${opacity}`}
      data={geoData}
      style={style}
      filter={filterFeature}
      onEachFeature={onEachFeature}
      pointToLayer={pointToLayer}
    />
  )
}

export default function MapCanvas({
  className = 'h-full min-h-[500px] w-full',
  initialCenter,
  initialZoom = 7,
  showControls = true,
  onPointSelect,
  pageContext,
  defaultActiveLayers,
  defaultBaseMap = 'satellite',
  externalRoute = null,
  externalMarkers = [],
  aiCommandNotice = null,
  targetCenter = null,
  targetZoom = null,
  controlledActiveLayers = null,
  controlledBaseMap = null,
  controlledBeacons = null,
  controlledSelectedCyclone = null,
  controlledMeasureMode = null,
  controlledMeasurePoints = null,
  onToggleLayer = null,
  mapSize = null,
  onToggleMapSize = null,
}) {
  const { location, vessel, t, activeSpatialOverlay, setActiveSpatialOverlay, timeOffset } = useGlobal()

  // Helper to determine initial active layer IDs based on page context or explicit prop
  const resolveInitialLayers = () => {
    if (Array.isArray(controlledActiveLayers)) return controlledActiveLayers
    if (Array.isArray(defaultActiveLayers)) return defaultActiveLayers
    if (pageContext && PAGE_DEFAULT_LAYERS[pageContext]) return PAGE_DEFAULT_LAYERS[pageContext]
    return getFirstLayerPerCategory()
  }

  // Base map & layer selection state
  const [baseMapId, setBaseMapId] = useState(controlledBaseMap || defaultBaseMap)
  const [activeLayers, setActiveLayers] = useState(resolveInitialLayers)
  const [opacities, setOpacities] = useState(() =>
    GEO_LAYERS.reduce((acc, l) => ({ ...acc, [l.id]: l.defaultOpacity || 0.7 }), {})
  )

  // Keep active layers & base map updated if pageContext, props, or AI controlled states change
  // CRITICAL: In controlled mode (onToggleLayer provided), internal state always mirrors the prop.
  // In uncontrolled mode, internal state is managed locally.
  useEffect(() => {
    if (Array.isArray(controlledActiveLayers)) {
      setActiveLayers(controlledActiveLayers)
    } else if (Array.isArray(defaultActiveLayers)) {
      setActiveLayers(defaultActiveLayers)
    } else if (pageContext && PAGE_DEFAULT_LAYERS[pageContext]) {
      setActiveLayers(PAGE_DEFAULT_LAYERS[pageContext])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledActiveLayers, defaultActiveLayers, pageContext])

  useEffect(() => {
    if (controlledBaseMap && BASE_MAPS.some(b => b.id === controlledBaseMap)) {
      setBaseMapId(controlledBaseMap)
    } else if (defaultBaseMap) {
      setBaseMapId(defaultBaseMap)
    }
  }, [defaultBaseMap, controlledBaseMap])

  // Floating panels state
  const [layerManagerOpen, setLayerManagerOpen] = useState(false)
  const [baseMapMenuOpen, setBaseMapMenuOpen] = useState(false)
  const [inspectedCoord, setInspectedCoord] = useState(null)
  const [measureMode, setMeasureMode] = useState('none')
  const [measurePoints, setMeasurePoints] = useState([])
  const [selectedCyclone, setSelectedCyclone] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showBeacons, setShowBeacons] = useState(true)
  const containerRef = useRef(null)

  const [centerLat, setCenterLat] = useState(targetCenter?.[0] || location.lat || initialCenter?.lat || 13.0827)
  const [centerLon, setCenterLon] = useState(targetCenter?.[1] || location.lon || initialCenter?.lon || 80.2707)
  const [zoomLevel, setZoomLevel] = useState(targetZoom || initialZoom || 7)

  useEffect(() => {
    if (controlledBeacons !== null && controlledBeacons !== undefined) {
      setShowBeacons(Boolean(controlledBeacons))
    }
  }, [controlledBeacons])

  useEffect(() => {
    if (controlledSelectedCyclone !== null && controlledSelectedCyclone !== undefined) {
      setSelectedCyclone(controlledSelectedCyclone)
    }
  }, [controlledSelectedCyclone])

  useEffect(() => {
    if (controlledMeasureMode !== null && controlledMeasureMode !== undefined) {
      setMeasureMode(controlledMeasureMode)
    }
  }, [controlledMeasureMode])

  useEffect(() => {
    if (Array.isArray(controlledMeasurePoints)) {
      setMeasurePoints(controlledMeasurePoints)
    }
  }, [controlledMeasurePoints])

  useEffect(() => {
    if (targetCenter && Array.isArray(targetCenter) && targetCenter.length === 2 && !isNaN(targetCenter[0]) && !isNaN(targetCenter[1])) {
      setCenterLat(targetCenter[0])
      setCenterLon(targetCenter[1])
      if (targetZoom) setZoomLevel(targetZoom)
    }
  }, [targetCenter, targetZoom])

  const currentBaseMap = useMemo(
    () => BASE_MAPS.find(b => b.id === baseMapId) || BASE_MAPS[0],
    [baseMapId]
  )

  // toggleLayer: In controlled mode (parent provides onToggleLayer), notify parent and let
  // parent update controlledActiveLayers so the effect above syncs us back.
  // In uncontrolled mode, manage state locally.
  const toggleLayer = (layerId) => {
    if (onToggleLayer) {
      // Controlled: compute the new layer set and notify parent
      const next = activeLayers.includes(layerId)
        ? activeLayers.filter(id => id !== layerId)
        : [...activeLayers, layerId]
      onToggleLayer(layerId, next)
      // Optimistically update local state too so UI feels instant
      setActiveLayers(next)
    } else {
      setActiveLayers(prev => {
        const next = prev.includes(layerId) ? prev.filter(id => id !== layerId) : [...prev, layerId]
        return next
      })
    }
  }

  const changeOpacity = (layerId, val) => {
    setOpacities(prev => ({ ...prev, [layerId]: val }))
  }

  const handleMapClick = (coord) => {
    setInspectedCoord(coord)
    if (onPointSelect) onPointSelect(coord)
  }

  const handleAddMeasurePoint = (point) => {
    setMeasurePoints(prev => [...prev, point])
  }

  const handleClearMeasure = () => {
    setMeasurePoints([])
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative rounded-3xl overflow-hidden shadow-card border border-borderLight bg-slate-950 ${className}`}
    >
      {/* ── Leaflet Interactive Map Engine ────────────────────────── */}
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={initialZoom}
        scrollWheelZoom={true}
        preferCanvas={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapRecenter lat={centerLat} lon={centerLon} zoom={zoomLevel} />
        <MapSizeInvalidator mapSize={mapSize} />

        {/* Base Tile Layer (Default: ESRI Satellite) */}
        <TileLayer
          key={currentBaseMap.id}
          url={currentBaseMap.url}
          attribution={currentBaseMap.attribution}
          maxZoom={currentBaseMap.maxZoom}
        />

        {/* GeoJSON Vector Layers with Dynamic Live / Forecast Switching */}
        {GEO_LAYERS.map(layer => {
          if (!activeLayers.includes(layer.id)) return null
          if (layer.id === 'cyclone_tracks') return null
          const isForecastable = FORECASTABLE_LAYERS.includes(layer.id)
          return (
            <AsyncGeoJsonLayer
              key={`${layer.id}-${isForecastable ? timeOffset : 0}`}
              layer={layer}
              opacity={opacities[layer.id] ?? layer.defaultOpacity}
              timeOffset={timeOffset}
            />
          )
        })}

        {/* Individual Selected Cyclone Path (Curved track, genesis point & eye marker) */}
        {selectedCyclone && (
          <SelectedCycloneLayer selectedCyclone={selectedCyclone} />
        )}

        {/* User Current Location, Nearest Coast & Nearest Fishing Point Beacons */}
        {showBeacons && location.lat && location.lon && (
          <NearestMaritimeOverlay
            showUser={true}
            showCoast={true}
            showFishing={true}
            showCorridors={true}
          />
        )}

        {/* Active Spatial Reasoning Filter Overlay (e.g. PFZs within 30 km) */}
        {activeSpatialOverlay && (
          <SpatialReasoningOverlay overlay={activeSpatialOverlay} />
        )}

        {/* Commanded Navigation Route Polyline */}
        {externalRoute && Array.isArray(externalRoute) && externalRoute.length > 1 && (
          <Polyline
            positions={externalRoute}
            pathOptions={{
              color: '#38bdf8',
              weight: 4.5,
              opacity: 0.95,
              dashArray: '8, 6'
            }}
          />
        )}

        {/* Commanded Target / Route Waypoint Markers */}
        {externalMarkers && Array.isArray(externalMarkers) && externalMarkers.map((marker, idx) => {
          const mLat = marker.lat ?? marker.latitude
          const mLon = marker.lon ?? marker.longitude
          if (mLat == null || mLon == null) return null

          const isSafe = marker.is_safe !== false
          const pinColor = marker.color || (isSafe ? '#10b981' : '#f59e0b')
          const markerIcon = L.divIcon({
            className: `ai-target-marker-${idx}`,
            html: `
              <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: ${pinColor}; opacity: 0.45; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: relative; z-index: 2; width: 22px; height: 22px; border-radius: 50%; background: ${pinColor}; border: 2px solid #ffffff; box-shadow: 0 0 10px ${pinColor}; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #ffffff; font-weight: 900;">
                  ${marker.badge || '🎯'}
                </div>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          })

          return (
            <Marker key={`ai-target-${idx}`} position={[mLat, mLon]} icon={markerIcon}>
              <Popup>
                <div className="font-sans text-xs p-1 max-w-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                    <strong className="text-navy">{marker.title || marker.name || `Target Point #${idx + 1}`}</strong>
                    {marker.confidence && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {marker.confidence}
                      </span>
                    )}
                  </div>
                  {marker.distance_nm && <div><strong>Distance:</strong> ~{marker.distance_nm} NM</div>}
                  {marker.distance_km && <div><strong>Distance (km):</strong> ~{Math.round(marker.distance_km)} km</div>}
                  {marker.description && <div className="mt-1 text-[10px] text-slate-600 bg-slate-50 p-1 rounded">{marker.description}</div>}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Active Measurement Renderings */}
        {measureMode === 'distance' && measurePoints.length > 1 && (
          <Polyline
            positions={measurePoints}
            pathOptions={{ color: '#ff6f00', weight: 3, dashArray: '6, 6' }}
          />
        )}

        {measureMode === 'bearing' && measurePoints.length >= 2 && (
          <Polyline
            positions={[measurePoints[0], measurePoints[1]]}
            pathOptions={{ color: '#00c853', weight: 3 }}
          />
        )}

        {measureMode === 'area' && measurePoints.length >= 3 && (
          <Polygon
            positions={measurePoints}
            pathOptions={{ color: '#8b5cf6', weight: 2, fillColor: '#8b5cf6', fillOpacity: 0.25 }}
          />
        )}

        {/* Measure Point Dot Markers */}
        {measurePoints.map((pt, idx) => (
          <CircleMarker
            key={idx}
            center={pt}
            radius={4}
            pathOptions={{ color: '#ffffff', fillColor: '#ff6f00', fillOpacity: 1, weight: 2 }}
          />
        ))}

        {/* Map Click Events Handler */}
        <MapInteractionHandler
          measureMode={measureMode}
          onMapClick={handleMapClick}
          onAddMeasurePoint={handleAddMeasurePoint}
        />
      </MapContainer>

      {/* ── Active Spatial Reasoning Filter Floating Banner ── */}
      {activeSpatialOverlay && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 bg-slate-900/90 backdrop-blur-md border border-cyan-500/50 rounded-2xl shadow-xl text-xs text-white animate-slideIn max-w-[90vw]">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
          <div className="flex items-center gap-1.5 font-semibold text-cyan-300 uppercase tracking-wider text-[10px]">
            <span>🗺️</span>
            <span>Spatial Filter Active</span>
          </div>
          <span className="text-slate-500">|</span>
          <span className="font-medium text-slate-200 truncate">
            <span className="text-cyan-400 font-bold">{activeSpatialOverlay.operator}</span>{' '}
            {activeSpatialOverlay.radius_km ? `${activeSpatialOverlay.radius_km} km of ` : 'near '}
            <strong className="text-white">{activeSpatialOverlay.anchor?.name || 'Anchor'}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-500/30 whitespace-nowrap">
            {activeSpatialOverlay.count ?? (activeSpatialOverlay.results?.length || 0)} results
          </span>
          <button
            onClick={() => setActiveSpatialOverlay(null)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            title="Dismiss spatial filter overlay"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* AI Live Command Notification Banner */}
      {aiCommandNotice && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl text-xs pointer-events-auto max-w-sm sm:max-w-md animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <Bot size={14} className="text-cyan-400 flex-shrink-0" />
          <span className="font-bold tracking-tight truncate">{aiCommandNotice}</span>
        </div>
      )}

      {/* ── Overlay Controls (ISRO Style UI) ──────────────────────── */}
      {showControls && (
        <>
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-none flex-wrap justify-end">
              {/* Map Size Toggle Button (if provided) */}
              {onToggleMapSize && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggleMapSize()
                  }}
                  className="p-2.5 rounded-2xl bg-white/95 text-navy border border-borderLight shadow-md hover:bg-surface pointer-events-auto cursor-pointer transition-colors"
                  title={`Toggle map size: currently ${mapSize || 'normal'}`}
                >
                  {mapSize === 'compact' ? <Maximize2 size={17} /> : <Minimize2 size={17} />}
                </button>
              )}

              {/* Cyclone Selector Pill - Non-AskPage only */}
              {pageContext !== 'chatWorkstation' && (
                <CycloneSelector
                  selectedCyclone={selectedCyclone}
                  onSelectCyclone={setSelectedCyclone}
                />
              )}

              {/* Measure Tools Pill - Non-AskPage only */}
              {pageContext !== 'chatWorkstation' && (
                <div className="pointer-events-auto">
                  <MeasureTools
                    mode={measureMode}
                    setMode={setMeasureMode}
                    points={measurePoints}
                    onClear={handleClearMeasure}
                  />
                </div>
              )}

              {/* Nearest Coast & PFZ Beacons Toggle - Non-AskPage only */}
              {pageContext !== 'chatWorkstation' && (
                <button
                  type="button"
                  onClick={() => setShowBeacons(!showBeacons)}
                  className={`px-3 py-2 rounded-2xl shadow-md border text-xs font-semibold flex items-center gap-1.5 transition-all pointer-events-auto cursor-pointer ${
                    showBeacons
                      ? 'bg-white text-navy border-borderLight hover:bg-slate-50'
                      : 'bg-white/80 text-textMuted border-borderLight hover:bg-white'
                  }`}
                  title="Toggle Nearest Coast & Fishing Point Beacons"
                >
                  <span>⚓🐟</span>
                  <span className="hidden sm:inline">{showBeacons ? t('Beacons') : t('Beacons Off')}</span>
                </button>
              )}

              {/* Layer Manager Toggle Button - Shown in all pages including AskPage */}
              <button
                type="button"
                id="map-layer-manager-btn"
                onClick={() => {
                  setLayerManagerOpen(!layerManagerOpen)
                  setBaseMapMenuOpen(false)
                }}
                className={`p-2.5 rounded-2xl shadow-md border transition-all pointer-events-auto cursor-pointer ${
                  layerManagerOpen
                    ? 'bg-oceanBlue text-white border-oceanBlue shadow-lg'
                    : 'bg-white/95 text-navy border-borderLight hover:bg-surface'
                }`}
                title={t('Toggle GIS Layers')}
              >
                <div className="relative">
                  <Layers size={17} />
                  {activeLayers.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-oceanBlue text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                      {activeLayers.length}
                    </span>
                  )}
                </div>
              </button>

              {/* Base Map Switcher Button - Non-AskPage only */}
              {pageContext !== 'chatWorkstation' && (
                <div className="relative pointer-events-auto">
                  <button
                    type="button"
                    id="map-basemap-btn"
                    onClick={() => {
                      setBaseMapMenuOpen(!baseMapMenuOpen)
                      setLayerManagerOpen(false)
                    }}
                    className={`p-2.5 rounded-2xl shadow-md border transition-all cursor-pointer ${
                      baseMapMenuOpen
                        ? 'bg-oceanBlue text-white border-oceanBlue shadow-lg'
                        : 'bg-white/95 text-navy border-borderLight hover:bg-surface'
                    }`}
                    title={t('Change Base Map')}
                  >
                    <MapIcon size={17} />
                  </button>

                  {/* Base Map Dropdown */}
                  {baseMapMenuOpen && (
                    <div className="absolute right-0 top-12 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-borderLight p-2 z-30 animate-slideIn">
                      <div className="text-[10px] font-bold text-textMuted uppercase px-2 py-1">
                        {t('Base Map Style')}
                      </div>
                      <div className="space-y-1">
                        {BASE_MAPS.map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setBaseMapId(b.id)
                              setBaseMapMenuOpen(false)
                            }}
                            className={`w-full flex items-start gap-2 p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                              baseMapId === b.id
                                ? 'bg-oceanBlue/10 text-oceanBlue font-bold'
                                : 'text-textSecond hover:bg-surface hover:text-navy'
                            }`}
                          >
                            <div>
                              <div className="font-semibold">{t(b.label)}</div>
                              <div className="text-[10px] text-textMuted">{t(b.sub)}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2.5 rounded-2xl bg-white/95 text-navy border border-borderLight shadow-md hover:bg-surface pointer-events-auto cursor-pointer transition-colors"
                title={t('Toggle Fullscreen')}
              >
                {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
            </div>

          {/* Floating Layer Manager Drawer */}
          {layerManagerOpen && (
            <div className="absolute top-16 right-4 bottom-4 z-30 pointer-events-auto flex flex-col max-h-[calc(100%-5rem)]">
              <LayerManager
                layers={GEO_LAYERS}
                activeLayers={activeLayers}
                opacities={opacities}
                onToggleLayer={toggleLayer}
                onChangeOpacity={changeOpacity}
                onClose={() => setLayerManagerOpen(false)}
              />
            </div>
          )}

          {/* Coordinate Inspector Panel (When a point is clicked) */}
          {inspectedCoord && (
            <div className="absolute bottom-6 right-4 z-30 pointer-events-auto">
              <CoordinateInspector
                coord={inspectedCoord}
                onClose={() => setInspectedCoord(null)}
              />
            </div>
          )}

          {/* Auto-Rendered Legend (Bottom-Left) */}
          <div className="absolute bottom-6 left-4 z-20 pointer-events-none">
            <Legend
              activeLayers={activeLayers}
              layerConfigs={GEO_LAYERS}
              selectedCyclone={selectedCyclone}
            />
          </div>
        </>
      )}
    </div>
  )
}
