import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Fish, Compass, Navigation, ArrowUpRight, Anchor, CheckCircle2 } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function PFZCardList({ pfzData = {} }) {
  const navigate = useNavigate()
  const { t } = useGlobal()

  const nearest = pfzData.nearest_pfz || {}
  const alternatives = pfzData.alternatives || []
  const confidence = pfzData.confidence || 'HIGH'
  const sector = pfzData.sector || 'NORTH_TAMILNADU'

  const handleRouteToZone = (zone) => {
    navigate('/navigation', {
      state: {
        destinationName: zone.name,
        destinationLat: zone.lat || 13.1033,
        destinationLon: zone.lon || 80.5481,
      },
    })
  }

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Fish size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('Active Potential Fishing Zones (PFZ)')}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t('INCOIS Multi-Satellite Thermal-Chlorophyll Front Detections')}
            </p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-teal-100 text-teal-800 flex items-center gap-1.5 self-start sm:self-auto">
          <CheckCircle2 size={12} /> {t(confidence)} {t('Confidence Advisory')}
        </span>
      </div>

      {/* Primary High-Yield Target Zone Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/70 via-white to-blue-50/50 border border-teal-200/80 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
              {t('Primary High-Yield Target')}
            </span>
            <h4 className="text-base font-bold text-navy mt-1.5">
              {t(nearest.name || 'Kasikoilkuppam Sector')}
            </h4>
            <div className="text-[11px] text-textMuted font-mono">
              {t('Coordinates')}: {nearest.lat || 13.1033}° N, {nearest.lon || 80.5481}° E
            </div>
          </div>

          <button
            onClick={() => handleRouteToZone(nearest)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy hover:bg-navyLight text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <span>{t('Plan Route')}</span>
            <ArrowUpRight size={13} className="text-saffron" />
          </button>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/80 border border-borderLight text-xs font-mono">
          <div>
            <span className="text-[10px] text-textMuted font-sans block">{t('Distance')}:</span>
            <span className="font-bold text-navy">
              {pfzData.distance_km || 30.1} km
            </span>
            <span className="text-[10px] text-textMuted block">
              (~{((pfzData.distance_km || 30.1) * 0.539957).toFixed(1)} nm)
            </span>
          </div>
          <div>
            <span className="text-[10px] text-textMuted font-sans block">{t('Heading')}:</span>
            <span className="font-bold text-oceanBlue flex items-center gap-1">
              <Compass size={12} /> {t(pfzData.direction || 'E')}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-textMuted font-sans block">{t('Depth Range')}:</span>
            <span className="font-bold text-navy">
              {nearest.depth_fathom || '136–141'} <span className="text-[10px] font-sans font-normal text-textMuted">{t('fathoms')}</span>
            </span>
          </div>
        </div>

        <div className="text-[11px] text-textSecond leading-relaxed pt-1">
          {t(pfzData.note || 'Official INCOIS advisory based on thermal chlorophyll composite overlay. High aggregation of Indian Mackerel and Pelagic Tuna predicted.')}
        </div>
      </div>

      {/* Alternative Secondary Zones */}
      {alternatives.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-textMuted uppercase tracking-wider px-1">
            {t('Secondary / Alternative Sectors')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alternatives.map((alt, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-surface border border-borderLight flex flex-col justify-between space-y-2 hover:bg-surfaceMid transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-xs text-navy">{t(alt.name)}</div>
                    <div className="text-[10px] text-textMuted font-mono">
                      {alt.lat}° N, {alt.lon}° E
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-oceanBlue">
                    {alt.depth_fathom} {t('fathoms')}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-borderLight/60 text-xs">
                  <span className="text-[10px] text-textMuted">
                    {alt.distance_miles} {t('miles offshore')}
                  </span>
                  <button
                    onClick={() => handleRouteToZone(alt)}
                    className="text-[11px] font-bold text-oceanBlue hover:text-navy flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{t('Route')}</span>
                    <ArrowUpRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
