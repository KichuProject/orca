import React, { useState, useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import { BASE_MAPS } from '../map/mapLayersConfig'
import api, { endpoints } from '../../api'
import { Shield, MapPin, Compass, AlertTriangle, Layers, AlertOctagon } from 'lucide-react'
import { RESTRICTED_SECTORS } from './RestrictedZonesList'
import NearestMaritimeOverlay from '../map/NearestMaritimeOverlay'
import { useGlobal } from '../../context/GlobalContext'

// Map auto-recenter helper when user position changes
function MapRecenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, Math.max(map.getZoom(), 7), { duration: 1.0 })
    }
  }, [center, map])
  return null
}

// Custom Restricted Hazard Pin Icon
const restrictedSectorIcon = L.divIcon({
  className: 'geofence-restricted-hazard-pin',
  html: `
    <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; background: #e11d48; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4); cursor: pointer;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
})

// Custom User Current Location Pin Marker Icon
const userLocationIcon = L.divIcon({
  className: 'geofence-user-location-pin',
  html: `
    <div style="position: relative; width: 34px; height: 42px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); cursor: pointer;">
      <!-- Sonar radar pulse at pinpoint anchor -->
      <div style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 50%); width: 24px; height: 24px; background: rgba(30, 96, 213, 0.45); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <!-- Modern Teardrop Location Marker Pin -->
      <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: relative; z-index: 2;">
        <path d="M17 0C7.61116 0 0 7.61116 0 17C0 26.5 13.5 40 16.1 41.8C16.6 42.1 17.4 42.1 17.9 41.8C20.5 40 34 26.5 34 17C34 7.61116 26.3888 0 17 0Z" fill="#0a2540"/>
        <path d="M17 1.5C8.43959 1.5 1.5 8.43959 1.5 17C1.5 25.2 14.1 37.8 16.5 39.5C16.8 39.7 17.2 39.7 17.5 39.5C19.9 37.8 32.5 25.2 32.5 17C32.5 8.43959 25.5604 1.5 17 1.5Z" fill="url(#userPinGradGeo)" stroke="#ffffff" stroke-width="1.5"/>
        <!-- Inner target dot -->
        <circle cx="17" cy="16" r="6.5" fill="#ffffff"/>
        <circle cx="17" cy="16" r="3.5" fill="#00c853"/>
        <defs>
          <linearGradient id="userPinGradGeo" x1="17" y1="1.5" x2="17" y2="41" gradientUnits="userSpaceOnUse">
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

// Point click inspector
function MapClickInspector({ onInspect }) {
  useMapEvents({
    click(e) {
      onInspect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function GeofenceMapCanvas({ userLat = 13.0827, userLon = 80.2707, activeZone = 'Territorial Sea' }) {
  const { t } = useGlobal()
  const baseMap = BASE_MAPS.find(b => b.id === 'satellite') || BASE_MAPS[0]
  const [inspectedPoint, setInspectedPoint] = useState(null)

  // Fetch 4 Maritime Zone GeoJSON layers
  const { data: eezGj } = useQuery({
    queryKey: ['layer-eez'],
    queryFn: async () => (await api.get('/api/layer/eez')).data,
    staleTime: Infinity,
  })

  const { data: territorialGj } = useQuery({
    queryKey: ['layer-territorial'],
    queryFn: async () => (await api.get('/api/layer/territorial')).data,
    staleTime: Infinity,
  })

  const { data: contiguousGj } = useQuery({
    queryKey: ['layer-contiguous'],
    queryFn: async () => (await api.get('/api/layer/contiguous')).data,
    staleTime: Infinity,
  })

  const { data: internalGj } = useQuery({
    queryKey: ['layer-internal'],
    queryFn: async () => (await api.get('/api/layer/internal')).data,
    staleTime: Infinity,
  })

  const { data: highSeasGj } = useQuery({
    queryKey: ['layer-high_seas'],
    queryFn: async () => (await api.get('/api/layer/high_seas')).data,
    staleTime: Infinity,
  })

  const { data: imblGj } = useQuery({
    queryKey: ['layer-imbl'],
    queryFn: async () => (await api.get('/api/layer/imbl')).data,
    staleTime: Infinity,
  })

  // Inspect point query
  const handleInspect = async (lat, lon) => {
    try {
      const res = await endpoints.geofence(lat, lon)
      setInspectedPoint({
        lat,
        lon,
        data: res.data,
      })
    } catch {
      setInspectedPoint({ lat, lon, error: true })
    }
  }

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-card border border-borderLight h-full min-h-[480px] w-full bg-slate-950">
      <MapContainer
        center={[userLat, userLon]}
        zoom={6}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapRecenter center={[userLat, userLon]} />
        <MapClickInspector onInspect={handleInspect} />

        <TileLayer
          url={baseMap.url}
          attribution={baseMap.attribution}
          maxZoom={baseMap.maxZoom}
        />

        {/* 1. EEZ 200nm Layer (Purple) */}
        {eezGj && (
          <GeoJSON
            key="eez"
            data={eezGj}
            style={{
              color: '#c084fc',
              weight: 2,
              dashArray: '6, 6',
              fillColor: '#a855f7',
              fillOpacity: 0.08,
            }}
          />
        )}

        {/* 2. Contiguous Zone 24nm Layer (Ocean Blue) */}
        {contiguousGj && (
          <GeoJSON
            key="contiguous"
            data={contiguousGj}
            style={{
              color: '#38bdf8',
              weight: 2,
              fillColor: '#0284c7',
              fillOpacity: 0.12,
            }}
          />
        )}

        {/* 3. Territorial Sea 12nm Layer (Teal) */}
        {territorialGj && (
          <GeoJSON
            key="territorial"
            data={territorialGj}
            style={{
              color: '#2dd4bf',
              weight: 2.5,
              fillColor: '#0d9488',
              fillOpacity: 0.18,
            }}
          />
        )}

        {/* 4. Internal Waters Layer (Emerald) */}
        {internalGj && (
          <GeoJSON
            key="internal"
            data={internalGj}
            style={{
              color: '#34d399',
              weight: 2,
              fillColor: '#059669',
              fillOpacity: 0.25,
            }}
          />
        )}

        {/* 5. International High Seas Layer (Indigo / Slate) */}
        {highSeasGj && (
          <GeoJSON
            key="high_seas"
            data={highSeasGj}
            style={{
              color: '#818cf8',
              weight: 2,
              dashArray: '8, 4',
              fillColor: '#6366f1',
              fillOpacity: 0.05,
            }}
          />
        )}

        {/* 6. International Maritime Boundary Lines (IMBL Treaties) (Crimson Red Dashed) */}
        {imblGj && (
          <GeoJSON
            key="imbl"
            data={imblGj}
            style={{
              color: '#dc2626',
              weight: 2.5,
              dashArray: '8, 5',
            }}
            onEachFeature={(feat, layer) => {
              const p = feat.properties || {}
              layer.bindPopup(`
                <div style="font-family: 'Noto Sans', sans-serif; font-size: 11px; max-width: 220px; color: #0a2540;">
                  <h4 style="font-weight: 700; margin: 0 0 3px; color: #dc2626;">IMBL: ${p.LINE_NAME || 'Maritime Boundary'}</h4>
                  <div><strong>Type:</strong> ${p.LINE_TYPE || 'Treaty / Award'}</div>
                  <div><strong>Nations:</strong> ${p.TERRITORY1} &harr; ${p.TERRITORY2}</div>
                  <div><strong>Date:</strong> ${p.DOC_DATE || 'Statutory'}</div>
                  <div style="margin-top: 4px; color: #dc2626; font-size: 10px; font-weight: 600;">⚠ Crossing prohibited without statutory clearance</div>
                </div>
              `)
            }}
          />
        )}

        {/* 8. Offshore Restricted Energy & Naval Sectors */}
        {RESTRICTED_SECTORS.map(s => (
          <React.Fragment key={s.id || s.name}>
            <Circle
              center={[s.lat, s.lon]}
              radius={s.radius.includes('500-meter') ? 1000 : (s.radius.includes('5 km') ? 5000 : 3500)}
              pathOptions={{
                color: '#e11d48',
                weight: 1.5,
                fillColor: '#f43f5e',
                fillOpacity: 0.18,
                dashArray: '4, 4',
              }}
            />
            <Marker position={[s.lat, s.lon]} icon={restrictedSectorIcon}>
              <Popup>
                <div className="font-sans text-xs text-navy p-0.5 space-y-1.5 max-w-[230px]">
                  <div className="font-bold text-red-600 flex items-center gap-1 pb-1 border-b border-borderLight">
                    <AlertOctagon size={13} />
                    <span>{t(s.name)}</span>
                  </div>
                  <div className="text-[10px] text-textMuted font-mono">
                    {s.coordinates} &bull; {t(s.radius)}
                  </div>
                  <div className="text-[11px] text-textSecond">
                    <strong>{t('Rule:')}</strong> {t(s.restriction)}
                  </div>
                  <div className="text-[10px] text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-100 font-semibold">
                    {t('Enforced by:')} {t(s.authority)}
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* User Current Location, Nearest Coast & Nearest Fishing Point Beacons */}
        <NearestMaritimeOverlay
          overrideLat={userLat}
          overrideLon={userLon}
          showUser={true}
          showCoast={true}
          showFishing={true}
          showCorridors={true}
        />

        {/* Inspected Point Popup */}
        {inspectedPoint && (
          <Marker position={[inspectedPoint.lat, inspectedPoint.lon]}>
            <Popup onClose={() => setInspectedPoint(null)}>
              <div className="font-sans text-xs text-navy p-0.5 space-y-1">
                <div className="font-bold text-purple-600 flex items-center gap-1">
                  <MapPin size={13} /> {t('Point Geofence Audit')}
                </div>
                <div className="font-mono text-[11px] text-textSecond">
                  {inspectedPoint.lat.toFixed(4)}° N, {inspectedPoint.lon.toFixed(4)}° E
                </div>
                {inspectedPoint.data?.coastline_distance && (
                  <div className="text-[10px] text-textMuted pt-1 border-t border-borderLight flex justify-between">
                    <span>{t('Coastline Dist:')}</span>
                    <span className="font-bold text-navy font-mono">
                      {inspectedPoint.data.coastline_distance.distance_to_coast_km} km
                    </span>
                  </div>
                )}
                {inspectedPoint.data?.imbl_proximity && (
                  <div className="text-[10px] text-textMuted pt-1 border-t border-borderLight flex justify-between">
                    <span>{t('Nearest Border:')}</span>
                    <span className="font-bold text-navy font-mono">
                      {inspectedPoint.data.imbl_proximity.distance_nm} nm ({t(inspectedPoint.data.imbl_proximity.nearest_line)})
                    </span>
                  </div>
                )}
                <div className="text-[10px] text-emerald-600 font-semibold pt-0.5">
                  {t(inspectedPoint.data?.alert || 'Sovereign EEZ of India')}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Interactive Map Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-borderLight p-3 text-xs text-navy space-y-2 pointer-events-auto max-w-[240px]">
        <div className="font-bold text-xs pb-1 border-b border-borderLight">{t('UNCLOS Maritime Boundaries')}</div>
        <div className="space-y-1.5 font-medium text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 rounded bg-emerald-500/80 border border-emerald-600" />
            <span>{t('Internal Waters (Baseline)')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 rounded bg-teal-500/80 border border-teal-600" />
            <span>{t('Territorial Sea (12 nm / 22.2 km)')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 rounded bg-sky-500/80 border border-sky-600" />
            <span>{t('Contiguous Zone (24 nm / 44.4 km)')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 rounded bg-purple-500/80 border border-purple-600" />
            <span>{t('Exclusive Economic Zone (200 nm)')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 rounded bg-indigo-400/80 border border-indigo-500" />
            <span>{t('International High Seas')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 rounded bg-rose-500/80 border border-rose-600" />
            <span>{t('Restricted / Caution Zones')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-red-600" />
            <span>{t('IMBL Treaties (Sri Lanka/Maldives)')}</span>
          </div>
        </div>
      </div>

      {/* Floating Tip */}
      <div className="absolute top-4 right-4 z-20 bg-navy/90 backdrop-blur-md text-white rounded-2xl shadow-lg p-2.5 px-3.5 text-xs pointer-events-none flex items-center gap-2">
        <MapPin size={13} className="text-saffron" />
        <span>{t('Click anywhere to inspect zone & coast distance')}</span>
      </div>
    </div>
  )
}
