import React from 'react'
import { Shield, Anchor, Globe, Compass, Scale, CheckCircle2 } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export const UNCLOS_ZONES = [
  {
    id: 'internal',
    name: 'Internal Waters',
    limit: 'Baseline to Shoreline',
    distKm: '0–5 km',
    jurisdiction: 'State Marine Police & Coastal Police',
    rights: 'Complete territorial sovereignty of India; full civil & criminal law applies.',
    color: 'bg-emerald-500',
    borderColor: 'border-emerald-500',
  },
  {
    id: 'territorial',
    name: 'Territorial Sea (12 nm)',
    limit: '0 to 12 Nautical Miles (22.2 km)',
    distKm: '0–22.2 km',
    jurisdiction: 'Indian Navy & Indian Coast Guard',
    rights: 'Full sovereign territorial waters; foreign vessels enjoy right of Innocent Passage.',
    color: 'bg-teal-500',
    borderColor: 'border-teal-500',
  },
  {
    id: 'contiguous',
    name: 'Contiguous Zone (24 nm)',
    limit: '12 to 24 Nautical Miles (44.4 km)',
    distKm: '22.2–44.4 km',
    jurisdiction: 'Indian Coast Guard & Customs / DRI',
    rights: 'Enforcement jurisdiction over fiscal, immigration, sanitary & customs infringements.',
    color: 'bg-oceanBlue',
    borderColor: 'border-oceanBlue',
  },
  {
    id: 'eez',
    name: 'Exclusive Economic Zone (200 nm)',
    limit: 'Up to 200 Nautical Miles (370.4 km)',
    distKm: '44.4–370.4 km',
    jurisdiction: 'Govt of India (MoES, Fisheries & Navy)',
    rights: 'Sovereign rights for exploration, exploitation, conservation of marine living & mineral resources.',
    color: 'bg-purple-600',
    borderColor: 'border-purple-600',
  },
  {
    id: 'highseas',
    name: 'High Seas (International)',
    limit: 'Beyond 200 Nautical Miles (>370.4 km)',
    distKm: '>370.4 km',
    jurisdiction: 'International Seabed Authority (UNCLOS)',
    rights: 'Global maritime commons; freedom of navigation, overflight, and scientific research.',
    color: 'bg-slate-500',
    borderColor: 'border-slate-500',
  },
]

export default function MaritimeZoneHierarchyCard({ activeZone = 'Territorial Sea (12 nm)', distanceToCoastKm = 2.2, geofenceData = null }) {
  const { t } = useGlobal()
  // Determine current active zone index based on activeZone string or distance
  let currentZoneId = 'territorial'
  const activeLower = (activeZone || '').toLowerCase()
  const zones = geofenceData?.zones || []

  if (activeLower.includes('internal') || zones.includes('internal_waters')) {
    currentZoneId = 'internal'
  } else if (activeLower.includes('territorial') || zones.includes('territorial_sea_12nm')) {
    currentZoneId = 'territorial'
  } else if (activeLower.includes('contiguous') || zones.includes('contiguous_zone_24nm')) {
    currentZoneId = 'contiguous'
  } else if (activeLower.includes('economic') || activeLower.includes('eez') || zones.includes('india_eez')) {
    currentZoneId = 'eez'
  } else if (activeLower.includes('high') || zones.includes('high_seas')) {
    currentZoneId = 'highseas'
  } else if (distanceToCoastKm <= 2.0) {
    currentZoneId = 'internal'
  } else if (distanceToCoastKm <= 22.2) {
    currentZoneId = 'territorial'
  } else if (distanceToCoastKm <= 44.4) {
    currentZoneId = 'contiguous'
  } else if (distanceToCoastKm <= 370.4) {
    currentZoneId = 'eez'
  } else {
    currentZoneId = 'highseas'
  }

  const activeZoneObj = UNCLOS_ZONES.find(z => z.id === currentZoneId) || UNCLOS_ZONES[1]
  const distNm = (distanceToCoastKm / 1.852).toFixed(1)

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Scale size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('UNCLOS 1982 Maritime Zones Legal Framework')}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t('Territorial Waters, Continental Shelf, EEZ and Other Maritime Zones Act (1976) • Natural Earth 1:10m Baseline')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-[11px] font-mono text-oceanBlue bg-blue-50 border border-blue-100 flex items-center gap-1.5 font-bold">
            <Compass size={12} /> {t(`Shore: ${distanceToCoastKm.toFixed(1)} km (${distNm} nm)`)}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> {t(`Fix: ${t(activeZoneObj.name)}`)}
          </span>
        </div>
      </div>

      {/* Visual Hierarchy Ladder */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {UNCLOS_ZONES.map(z => {
          const isCurrent = z.id === currentZoneId

          return (
            <div
              key={z.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 relative ${
                isCurrent
                  ? `bg-blue-50/70 ${z.borderColor} ring-2 ring-oceanBlue/30 shadow-md`
                  : 'bg-surface/70 border-borderLight hover:bg-surface'
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-oceanBlue text-white shadow-2xs">
                  {t('Active Sector')}
                </span>
              )}

              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${z.color}`} />
                  <h4 className="text-xs font-bold text-navy leading-tight">{t(z.name)}</h4>
                </div>
                <div className="text-[10px] text-textMuted font-mono mt-1">{t(z.limit)}</div>
              </div>

              <div className="text-[10px] text-textSecond space-y-1 pt-1.5 border-t border-borderLight/60">
                <div>
                  <strong className="text-navy">{t('Authority:')}</strong> {t(z.jurisdiction)}
                </div>
                <p className="leading-tight text-textMuted text-[10px]">{t(z.rights)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
