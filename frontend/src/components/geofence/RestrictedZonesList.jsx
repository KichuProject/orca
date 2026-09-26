import React from 'react'
import { AlertOctagon, ShieldAlert, Zap, Radio, FileText, Navigation, Compass } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const RESTRICTED_SECTORS = [
  {
    id: 'smw4',
    name: 'International Subsea Cable Landings (SMW-4 / BBG)',
    type: 'Critical Telecommunications Protection',
    location: 'Chennai Marina & Mumbai Versova Approaches',
    coordinates: '13.0400° N, 80.3200° E',
    lat: 13.04,
    lon: 80.32,
    radius: '1 nautical mile cable corridor',
    authority: 'International Cable Protection Committee (ICPC)',
    restriction: 'Strict no-anchoring and no bottom-contact gear zone to protect trans-continental optic fibers.',
    badge: 'NO ANCHORING',
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    id: 'maps',
    name: 'Madras Atomic Power Station (MAPS / BHAVINI)',
    type: 'Nuclear Energy Coastal Exclusion Zone',
    location: 'Kalpakkam Coastal Sector (Tamil Nadu)',
    coordinates: '12.5566° N, 80.1740° E',
    lat: 12.5566,
    lon: 80.174,
    radius: '5 km coastal security exclusion',
    authority: 'Atomic Energy Regulatory Board (AERB) & ICG',
    restriction: 'Total prohibition of unauthorized vessels, diving, and anchoring near reactor coolant intake corridors.',
    badge: 'SECURITY EXCLUSION',
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    id: 'kgd6',
    name: 'KG-D6 Deepwater Gas Field (Krishna-Godavari)',
    type: 'Subsea Production & Wellhead Zone',
    location: 'Bay of Bengal (Offshore Kakinada)',
    coordinates: '16.5500° N, 82.5000° E',
    lat: 16.55,
    lon: 82.5,
    radius: 'Subsea manifold corridor',
    authority: 'Petroleum Ministry & Indian Coast Guard',
    restriction: 'Bottom trawling and heavy seabed dredging strictly prohibited over high-pressure gas trunklines.',
    badge: 'NO BOTTOM GEAR',
    badgeColor: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  {
    id: 'inshansa',
    name: 'INS Hansa Naval Training Range',
    type: 'Naval Surface & Air Firing Sector',
    location: 'Offshore Goa (South Konkan Coast)',
    coordinates: '15.2000° N, 73.5000° E',
    lat: 15.2,
    lon: 73.5,
    radius: 'Live firing polygon',
    authority: 'Indian Navy (Western Naval Command)',
    restriction: 'Vessel transit restricted during active NOTAM / NAVAREA VIII broadcast periods.',
    badge: 'MILITARY FIRING',
    badgeColor: 'text-red-700 bg-red-50 border-red-200',
  },
  {
    id: 'mumbaihigh',
    name: 'Mumbai High Offshore Oil Complex (ONGC)',
    type: 'Offshore Energy Safety Zone',
    location: 'Arabian Sea (160km West of Mumbai)',
    coordinates: '19.4167° N, 71.3333° E',
    lat: 19.4167,
    lon: 71.3333,
    radius: '500-meter platform exclusion',
    authority: 'Directorate General of Hydrocarbons / Indian Navy',
    restriction: 'Total prohibition of unauthorized vessels, fishing nets, and anchoring to protect subsea risers.',
    badge: 'STRICT EXCLUSION',
    badgeColor: 'text-red-700 bg-red-50 border-red-200',
  },
  {
    id: 'kalamisland',
    name: 'Integrated Test Range (ITR) Dr. APJ Abdul Kalam Island',
    type: 'Missile Defense & NOTAM Launch Range',
    location: 'Offshore Dhamra / Chandipur (Odisha)',
    coordinates: '20.7553° N, 87.0855° E',
    lat: 20.7553,
    lon: 87.0855,
    radius: 'NAVAREA VIII dynamic polygon',
    authority: 'DRDO & Indian Coast Guard',
    restriction: 'Maritime vessels prohibited in ocean impact corridor during active rocket launch window broadcasts.',
    badge: 'ROCKETRY NOTAM',
    badgeColor: 'text-rose-700 bg-rose-50 border-rose-200',
  },
]

export default function RestrictedZonesList({ userLat = 13.0827, userLon = 80.2707, locationName = 'Selected Port' }) {
  const { t } = useGlobal()
  // Compute distance from user position and sort ascending by proximity
  const sortedSectors = [...RESTRICTED_SECTORS].map(s => {
    const distKm = haversineKm(userLat, userLon, s.lat, s.lon)
    const distNm = distKm / 1.852
    return {
      ...s,
      distKm: Math.round(distKm * 10) / 10,
      distNm: Math.round(distNm * 10) / 10,
    }
  }).sort((a, b) => a.distKm - b.distKm)

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertOctagon size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('Offshore Energy, Defense & Subsea Restricted Sectors')}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t('Sorted by live proximity from')} <strong className="text-navy">{t(locationName)}</strong> &bull; NAVAREA VIII
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-red-700 font-bold bg-red-50 px-2.5 py-1 rounded-full border border-red-100 self-start sm:self-auto">
          {t('Enforced by Navy & ICG')}
        </span>
      </div>

      <div className="space-y-3">
        {sortedSectors.map((s, idx) => {
          const isNearby = s.distKm <= 25.0
          const isRegional = s.distKm <= 100.0

          return (
            <div
              key={s.id || s.name}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                isNearby
                  ? 'bg-red-50/50 border-red-200 ring-2 ring-red-400/20 shadow-xs'
                  : isRegional
                  ? 'bg-amber-50/30 border-amber-200'
                  : 'bg-surface/70 border-borderLight hover:bg-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-navy">{t(s.name)}</h4>
                    {idx === 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-oceanBlue text-white">
                        {t('Nearest Sector')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-textMuted font-medium mt-0.5">
                    {t(s.location)} &bull; <span className="font-mono text-oceanBlue">{s.coordinates}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${s.badgeColor}`}>
                    {t(s.badge)}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${isNearby ? 'text-red-700' : isRegional ? 'text-amber-700' : 'text-textSecond'}`}>
                    {s.distKm} km ({s.distNm} nm)
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-textSecond pt-1 border-t border-borderLight/60">
                <strong className="text-navy">{t('Rule:')}</strong> {t(s.restriction)}
              </div>

              <div className="flex justify-between items-center text-[10px] text-textMuted pt-0.5">
                <span>{t('Authority:')} <strong className="text-navy">{t(s.authority)}</strong></span>
                <span>{t('Buffer:')} <strong className="text-navy">{t(s.radius)}</strong></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
