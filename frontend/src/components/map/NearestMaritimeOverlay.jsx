import React, { useMemo } from 'react'
import { Marker, Popup, Polyline, Tooltip, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { useQuery } from '@tanstack/react-query'
import { useGlobal } from '../../context/GlobalContext'
import { endpoints } from '../../api'
import { resolvePortName } from '../../i18n/translations'
import { MapPin, Anchor, Fish, Navigation, ArrowRight, ShieldCheck, Compass } from 'lucide-react'

// ── Custom Leaflet HTML DivIcons ────────────────────────────────

const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'custom-user-marker',
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    popupAnchor: [0, -42],
    html: `
      <div style="position: relative; width: 36px; height: 44px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); cursor: pointer;">
        <div style="position: absolute; bottom: 2px; left: 50%; transform: translate(-50%, 50%); width: 26px; height: 26px; background: rgba(30, 96, 213, 0.45); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <svg width="36" height="44" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: relative; z-index: 2;">
          <path d="M17 0C7.61116 0 0 7.61116 0 17C0 26.5 13.5 40 16.1 41.8C16.6 42.1 17.4 42.1 17.9 41.8C20.5 40 34 26.5 34 17C34 7.61116 26.3888 0 17 0Z" fill="#0a2540"/>
          <path d="M17 1.5C8.43959 1.5 1.5 8.43959 1.5 17C1.5 25.2 14.1 37.8 16.5 39.5C16.8 39.7 17.2 39.7 17.5 39.5C19.9 37.8 32.5 25.2 32.5 17C32.5 8.43959 25.5604 1.5 17 1.5Z" fill="#1e60d5" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="17" cy="16" r="6" fill="#ffffff"/>
          <circle cx="17" cy="16" r="3.5" fill="#00c853"/>
        </svg>
      </div>
    `,
  })
}

const createCoastMarkerIcon = (distKm) => {
  return L.divIcon({
    className: 'custom-coast-marker',
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -44],
    html: `
      <div style="position: relative; width: 38px; height: 46px; filter: drop-shadow(0 4px 7px rgba(13, 148, 136, 0.5)); cursor: pointer;">
        <div style="position: absolute; bottom: 2px; left: 50%; transform: translate(-50%, 50%); width: 22px; height: 22px; background: rgba(13, 148, 136, 0.4); border-radius: 50%; animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <svg width="38" height="46" viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: relative; z-index: 2;">
          <path d="M19 0C9.6 0 2 7.6 2 17C2 27.2 15.5 43.5 18.1 45.4C18.6 45.8 19.4 45.8 19.9 45.4C22.5 43.5 36 27.2 36 17C36 7.6 28.4 0 19 0Z" fill="#042f2e"/>
          <path d="M19 1.5C10.5 1.5 3.5 8.5 3.5 17C3.5 26.2 16.2 41.5 18.6 43.2C18.8 43.4 19.2 43.4 19.4 43.2C21.8 41.5 34.5 26.2 34.5 17C34.5 8.5 27.5 1.5 19 1.5Z" fill="#0d9488" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="19" cy="17" r="9" fill="#ffffff"/>
        </svg>
        <div style="position: absolute; top: 9px; left: 50%; transform: translateX(-50%); z-index: 3; font-size: 13px; line-height: 1;">⚓</div>
        <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #042f2e; color: #5eead4; border: 1px solid #14b8a6; padding: 1px 5px; border-radius: 8px; font-size: 9px; font-weight: 700; font-family: monospace; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          ${distKm != null ? `${distKm} km` : 'Coast'}
        </div>
      </div>
    `,
  })
}

const createFishingMarkerIcon = (distKm) => {
  return L.divIcon({
    className: 'custom-fishing-marker',
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -44],
    html: `
      <div style="position: relative; width: 38px; height: 46px; filter: drop-shadow(0 4px 7px rgba(245, 158, 11, 0.55)); cursor: pointer;">
        <div style="position: absolute; bottom: 2px; left: 50%; transform: translate(-50%, 50%); width: 22px; height: 22px; background: rgba(245, 158, 11, 0.4); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <svg width="38" height="46" viewBox="0 0 38 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="position: relative; z-index: 2;">
          <path d="M19 0C9.6 0 2 7.6 2 17C2 27.2 15.5 43.5 18.1 45.4C18.6 45.8 19.4 45.8 19.9 45.4C22.5 43.5 36 27.2 36 17C36 7.6 28.4 0 19 0Z" fill="#451a03"/>
          <path d="M19 1.5C10.5 1.5 3.5 8.5 3.5 17C3.5 26.2 16.2 41.5 18.6 43.2C18.8 43.4 19.2 43.4 19.4 43.2C21.8 41.5 34.5 26.2 34.5 17C34.5 8.5 27.5 1.5 19 1.5Z" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="19" cy="17" r="9" fill="#ffffff"/>
        </svg>
        <div style="position: absolute; top: 9px; left: 50%; transform: translateX(-50%); z-index: 3; font-size: 13px; line-height: 1;">🐟</div>
        <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: #451a03; color: #fde68a; border: 1px solid #f59e0b; padding: 1px 5px; border-radius: 8px; font-size: 9px; font-weight: 700; font-family: monospace; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          ${distKm != null ? `${distKm} km` : 'PFZ'}
        </div>
      </div>
    `,
  })
}

export default function NearestMaritimeOverlay({
  showUser = true,
  showCoast = true,
  showFishing = true,
  showCorridors = true,
  overrideLat = null,
  overrideLon = null,
}) {
  const { location, vessel, selectedMaritimeLocation, selectMaritimeLocation, language, t } = useGlobal()

  const currentLat = overrideLat ?? location.lat ?? 13.0827
  const currentLon = overrideLon ?? location.lon ?? 80.2707

  // Fetch nearest coast point & nearest fishing point from backend
  const { data: nearestData } = useQuery({
    queryKey: ['nearest-maritime', currentLat, currentLon],
    queryFn: async () => {
      const res = await endpoints.nearestMaritime(currentLat, currentLon)
      return res.data
    },
    staleTime: 30000,
  })

  const nearestCoast = nearestData?.nearest_coast
  const nearestFishing = nearestData?.nearest_fishing_point

  const userPos = [currentLat, currentLon]
  const coastPos = nearestCoast?.lat && nearestCoast?.lon ? [nearestCoast.lat, nearestCoast.lon] : null
  const fishingPos = nearestFishing?.lat && nearestFishing?.lon ? [nearestFishing.lat, nearestFishing.lon] : null

  // Midpoints for corridor distance badges
  const coastMidpoint = useMemo(() => {
    if (!coastPos) return null
    return [(userPos[0] + coastPos[0]) / 2, (userPos[1] + coastPos[1]) / 2]
  }, [userPos, coastPos])

  const fishingMidpoint = useMemo(() => {
    if (!fishingPos) return null
    return [(userPos[0] + fishingPos[0]) / 2, (userPos[1] + fishingPos[1]) / 2]
  }, [userPos, fishingPos])

  return (
    <>
      {/* ── 1. Active User Location Beacon ──────────────────────── */}
      {showUser && (
        <Marker position={userPos} icon={createUserLocationIcon()}>
          <Popup>
            <div className="font-sans text-xs text-navy p-0.5 space-y-1.5 min-w-[210px]">
              <div className="font-bold flex items-center justify-between pb-1 border-b border-borderLight text-oceanBlue">
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> {t('Your Current Location')}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-50 text-oceanBlue font-bold">
                  {t('ACTIVE')}
                </span>
              </div>
              <div className="font-bold text-xs text-navy">{location.name}</div>
              <div className="text-[10px] text-textMuted font-mono">
                {currentLat.toFixed(4)}° N, {currentLon.toFixed(4)}° E
              </div>
              <div className="text-[10px] text-textSecond pt-1 border-t border-borderLight flex items-center justify-between">
                <span>{t('Vessel Profile:')}</span>
                <span className="font-semibold capitalize text-navy">{t(vessel.replace('_', ' '))}</span>
              </div>
              {nearestCoast && (
                <div className="text-[10px] text-emerald-700 bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100 flex items-center justify-between">
                  <span>⚓ {t('Nearest Coast:')}</span>
                  <strong className="font-mono">{nearestCoast.distance_km} km ({resolvePortName(nearestCoast.name, language)})</strong>
                </div>
              )}
              {nearestFishing && (
                <div className="text-[10px] text-amber-800 bg-amber-50/70 p-1.5 rounded-lg border border-amber-100 flex items-center justify-between">
                  <span>🐟 {t('Nearest PFZ:')}</span>
                  <strong className="font-mono">{nearestFishing.distance_km} km ({resolvePortName(nearestFishing.name, language)})</strong>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      )}

      {/* ── 2. Nearest Coast / Port Point ──────────────────────── */}
      {showCoast && coastPos && (
        <>
          <Marker position={coastPos} icon={createCoastMarkerIcon(nearestCoast.distance_km)}>
            <Popup>
              <div className="font-sans text-xs text-navy p-0.5 space-y-2 min-w-[220px]">
                <div className="font-bold flex items-center justify-between pb-1 border-b border-borderLight text-teal-700">
                  <span className="flex items-center gap-1.5">
                    <Anchor size={13} /> {t('Nearest Coast & Harbour')}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-teal-50 text-teal-700 font-bold">
                    {t('PORT')}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-xs text-navy">{resolvePortName(nearestCoast.name, language)}</div>
                  <div className="text-[10px] text-textMuted font-mono">
                    {nearestCoast.lat.toFixed(4)}° N, {nearestCoast.lon.toFixed(4)}° E
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 py-1 text-[10px] bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-textMuted block">{t('Distance:')}</span>
                    <strong className="text-navy font-mono">{nearestCoast.distance_km} km</strong>
                  </div>
                  <div>
                    <span className="text-textMuted block">{t('Direction:')}</span>
                    <strong className="text-navy font-mono">{nearestCoast.direction}</strong>
                  </div>
                </div>
                <button
                  onClick={() => {
                    selectMaritimeLocation({
                      type: 'coast',
                      name: nearestCoast.name,
                      lat: nearestCoast.lat,
                      lon: nearestCoast.lon,
                      distance_km: nearestCoast.distance_km,
                      direction: nearestCoast.direction,
                    })
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[10px] transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <span>{t('Select as Target Coast (Separate Location)')}</span>
                  <ArrowRight size={10} />
                </button>
                {selectedMaritimeLocation?.type === 'coast' && selectedMaritimeLocation?.name === nearestCoast.name && (
                  <div className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded text-center">
                    {t('✓ Active Target Location')}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Dotted Bearing Corridor to Coast */}
          {showCorridors && (
            <Polyline
              positions={[userPos, coastPos]}
              pathOptions={{
                color: '#0d9488',
                weight: 2,
                dashArray: '4, 6',
                opacity: 0.85,
              }}
            >
              <Tooltip sticky>
                <div className="text-[11px] font-sans font-bold text-teal-900">
                  ⚓ Coast Corridor: {nearestCoast.distance_km} km ({nearestCoast.direction})
                </div>
              </Tooltip>
            </Polyline>
          )}

          {/* Midpoint Distance Badge */}
          {showCorridors && coastMidpoint && (
            <CircleMarker
              center={coastMidpoint}
              radius={2}
              pathOptions={{ color: '#0d9488', fillColor: '#0d9488', fillOpacity: 1 }}
            >
              <Tooltip permanent direction="top" offset={[0, -4]} className="custom-maritime-dist-tooltip">
                <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                  ⚓ {nearestCoast.distance_km} km
                </span>
              </Tooltip>
            </CircleMarker>
          )}
        </>
      )}

      {/* ── 3. Nearest Fishing Point (INCOIS PFZ) ──────────────── */}
      {showFishing && fishingPos && (
        <>
          <Marker position={fishingPos} icon={createFishingMarkerIcon(nearestFishing.distance_km)}>
            <Popup>
              <div className="font-sans text-xs text-navy p-0.5 space-y-2 min-w-[230px]">
                <div className="font-bold flex items-center justify-between pb-1 border-b border-borderLight text-amber-700">
                  <span className="flex items-center gap-1.5">
                    <Fish size={13} /> {t('Nearest Fishing Zone (PFZ)')}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-50 text-amber-700 font-bold">
                    INCOIS
                  </span>
                </div>
                <div>
                  <div className="font-bold text-xs text-navy">{resolvePortName(nearestFishing.name, language)}</div>
                  <div className="text-[10px] text-textMuted font-mono">
                    {nearestFishing.lat.toFixed(4)}° N, {nearestFishing.lon.toFixed(4)}° E
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 py-1 text-[10px] bg-amber-50/50 p-1.5 rounded-lg border border-amber-100">
                  <div>
                    <span className="text-textMuted block">{t('Distance:')}</span>
                    <strong className="text-navy font-mono">{nearestFishing.distance_km} km</strong>
                  </div>
                  <div>
                    <span className="text-textMuted block">{t('Sounding Depth:')}</span>
                    <strong className="text-navy font-mono">{nearestFishing.depth_fathom || '15-40'} {t('fathoms')}</strong>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-600 flex-shrink-0" />
                  <span>{t('Pelagic aggregation front (Tuna, Mackerel, Sardine)')}</span>
                </div>
                <button
                  onClick={() => {
                    selectMaritimeLocation({
                      type: 'fishing',
                      name: nearestFishing.name,
                      lat: nearestFishing.lat,
                      lon: nearestFishing.lon,
                      distance_km: nearestFishing.distance_km,
                      direction: nearestFishing.direction,
                      depth_fathom: nearestFishing.depth_fathom,
                    })
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                >
                  <span>{t('Select as Target PFZ (Separate Location)')}</span>
                  <ArrowRight size={10} />
                </button>
                {selectedMaritimeLocation?.type === 'fishing' && selectedMaritimeLocation?.name === nearestFishing.name && (
                  <div className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-center">
                    {t('✓ Active Target Location')}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Dotted Bearing Corridor to PFZ */}
          {showCorridors && (
            <Polyline
              positions={[userPos, fishingPos]}
              pathOptions={{
                color: '#f59e0b',
                weight: 2,
                dashArray: '6, 6',
                opacity: 0.85,
              }}
            >
              <Tooltip sticky>
                <div className="text-[11px] font-sans font-bold text-amber-900">
                  🐟 {t('PFZ Corridor')}: {nearestFishing.distance_km} km ({t('Bearing')}: {nearestFishing.direction || 85}°)
                </div>
              </Tooltip>
            </Polyline>
          )}

          {/* Midpoint Distance Badge */}
          {showCorridors && fishingMidpoint && (
            <CircleMarker
              center={fishingMidpoint}
              radius={2}
              pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 1 }}
            >
              <Tooltip permanent direction="top" offset={[0, -4]} className="custom-maritime-dist-tooltip">
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                  🐟 {nearestFishing.distance_km} km
                </span>
              </Tooltip>
            </CircleMarker>
          )}
        </>
      )}
    </>
  )
}
