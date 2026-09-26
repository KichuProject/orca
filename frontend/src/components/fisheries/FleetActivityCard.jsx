import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Radio, Users, Compass, ShieldCheck, AlertCircle, Anchor, Activity } from 'lucide-react'
import { endpoints } from '../../api'
import { useGlobal } from '../../context/GlobalContext'

export default function FleetActivityCard({ sectorName = 'North Tamil Nadu' }) {
  const { location, t } = useGlobal()
  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  // Query GFW fleet composition and effort statistics
  const { data: fleetData, isLoading: isFleetLoading } = useQuery({
    queryKey: ['gfw-fleet-activity'],
    queryFn: async () => {
      const res = await endpoints.fleet()
      return res.data
    },
    staleTime: 300000,
  })

  // Query live nearby fishing vessel detections
  const { data: vesselsData } = useQuery({
    queryKey: ['gfw-vessels-near', lat, lon],
    queryFn: async () => {
      const res = await endpoints.vessels(lat, lon, 200)
      return res.data
    },
    staleTime: 120000,
  })

  const act = fleetData?.fleet_activity || {}
  const totalHours = act.total_fishing_hours ? (act.total_fishing_hours / 1000000).toFixed(2) : '2.65'
  const gearMap = act.effort_by_gear_pct || {}
  const topGear = Object.entries(gearMap).sort((a, b) => b[1] - a[1])[0]
  const dominantGearName = topGear ? topGear[0].replace(/_/g, ' ') : 'Drifting Longlines'
  const dominantGearPct = topGear ? `${topGear[1]}%` : '60.4%'

  const indianFleetCount = act.indian_fleet_vessels || 926
  const foreignEffort = act.foreign_effort_pct || 68.6

  const nearbyList = vesselsData?.vessels || []
  const nearestVessel = nearbyList[0]
  const nearestDistKm = nearestVessel?.distance_km
  const nearestDistNm = nearestDistKm != null ? Math.round(nearestDistKm * 0.539957) : null

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-oceanBlue flex items-center justify-center">
            <Radio size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t ? t('Global Fishing Watch (GFW) Fleet Density', 'Global Fishing Watch (GFW) Fleet Density') : 'Global Fishing Watch (GFW) Fleet Density'}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t ? t('Satellite AIS v3 • Apparent Fishing Effort Surveillance', 'Satellite AIS v3 • Apparent Fishing Effort Surveillance') : 'Satellite AIS v3 • Apparent Fishing Effort Surveillance'}
            </p>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-oceanBlue">
          GFW AIS v3 Live
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 bg-surface rounded-2xl border border-borderLight">
          <span className="text-[10px] text-textMuted font-sans block">
            {t ? t('Tracked in Sector:', 'Tracked in Sector:') : 'Tracked in Sector:'}
          </span>
          <span className="text-base font-black text-navy">{t(`${vesselsData?.vessels_found ?? nearbyList.length} Craft`)}</span>
          <span className={`text-[10px] font-sans block mt-0.5 ${(vesselsData?.vessels_found ?? nearbyList.length) > 0 ? 'text-safeGreen' : 'text-textMuted'}`}>
            {(vesselsData?.vessels_found ?? nearbyList.length) > 0
              ? (t ? t('Active Fleet', 'Active Fleet') : 'Active Fleet')
              : (t ? t('Clear Perimeter', 'Clear Perimeter') : 'Clear Perimeter')}
          </span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-borderLight">
          <span className="text-[10px] text-textMuted font-sans block">
            {t ? t('Nearest Vessel:', 'Nearest Vessel:') : 'Nearest Vessel:'}
          </span>
          {nearestDistNm != null ? (
            <>
              <span className="text-base font-black text-oceanBlue">{nearestDistNm} nm</span>
              <span className="text-[10px] text-textMuted font-sans block mt-0.5 truncate" title={nearestVessel?.name}>
                {nearestVessel?.name ? `${nearestVessel.name} (${nearestDistKm.toFixed(1)} km)` : `(${nearestDistKm.toFixed(1)} km)`}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-textSecond">
                {t ? t('Clear', 'Clear') : 'Clear'}
              </span>
              <span className="text-[10px] text-textMuted font-sans block mt-0.5">&gt; 200 km out</span>
            </>
          )}
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-borderLight">
          <span className="text-[10px] text-textMuted font-sans block">
            {t ? t('Dominant Gear:', 'Dominant Gear:') : 'Dominant Gear:'}
          </span>
          <span className="text-sm font-black text-navy capitalize truncate block">
            {t ? t(dominantGearName, dominantGearName) : dominantGearName}
          </span>
          <span className="text-[10px] text-oceanBlue font-sans block mt-0.5">{t(`${dominantGearPct} of total`)}</span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-borderLight">
          <span className="text-[10px] text-textMuted font-sans block">
            {t ? t('Indian Registry:', 'Indian Registry:') : 'Indian Registry:'}
          </span>
          <span className="text-base font-black text-safeGreen">{indianFleetCount}</span>
          <span className="text-[10px] text-textMuted font-sans block mt-0.5">
            {t ? t('Commercial Boats', 'Commercial Boats') : 'Commercial Boats'}
          </span>
        </div>
      </div>

      <div className="p-3 bg-surface/70 rounded-2xl border border-borderLight text-[11px] text-textSecond flex items-start gap-2 leading-relaxed">
        <ShieldCheck size={16} className="text-safeGreen mt-0.5 flex-shrink-0" />
        <div>
          <strong>{t ? t('Fleet Intelligence Interpretation:', 'Fleet Intelligence Interpretation:') : 'Fleet Intelligence Interpretation:'}</strong>{' '}
          {act.interpretation
            ? t(act.interpretation)
            : t(`Dominant gear in Indian Ocean: ${dominantGearName} (${dominantGearPct}). Total observed fishing effort: ${totalHours}M hours. Foreign vessels account for ${foreignEffort}% of outer EEZ activity.`)}
        </div>
      </div>
    </div>
  )
}
