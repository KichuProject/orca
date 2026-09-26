import React from 'react'
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Waves, Compass, FileCheck } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function EcoStatusBanner({ geofenceData = {} }) {
  const { t } = useGlobal()
  const eco = geofenceData.eco_restriction || {}
  const coast = geofenceData.coastline_distance || {}
  const status = eco.status || 'CLEAR'
  const distKm = coast.distance_to_coast_km ?? 2.2

  const isRestricted = status === 'RESTRICTED' || status === 'CORE_SANCTUARY'
  const isBuffer = status === 'BUFFER' || distKm < 5.0

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Top Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs flex-shrink-0 ${
            isRestricted ? 'bg-dangerRed/10 text-dangerRed' : isBuffer ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-safeGreen'
          }`}>
            {isRestricted ? <XCircle size={19} /> : isBuffer ? <AlertTriangle size={19} /> : <ShieldCheck size={19} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('Ecological Zoning & Restriction Status')}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t('Wildlife Protection Act (1972) • CRZ-I Eco-Sensitive Marine Buffers')}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 self-start sm:self-auto ${
          isRestricted
            ? 'bg-red-100 text-dangerRed'
            : isBuffer
            ? 'bg-amber-100 text-amber-800'
            : 'bg-emerald-100 text-safeGreen'
        }`}>
          {isRestricted ? t('🔴 CORE NO-TAKE SANCTUARY') : isBuffer ? t('🟡 ECO-SENSITIVE BUFFER ZONE') : t('🟢 UNRESTRICTED MARINE WATERS')}
        </span>
      </div>

      {/* Grid: Distance to Coast & Permitted Activities Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Distance to Coast KPI (4 cols) */}
        <div className="md:col-span-4 p-4 rounded-2xl bg-surface border border-borderLight flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-textMuted font-semibold flex items-center gap-1">
              <Waves size={13} className="text-oceanBlue" /> {t('Distance to Coastline:')}
            </span>
            <span className="font-mono font-bold text-navy text-sm">{distKm.toFixed(1)} km</span>
          </div>

          <div className="w-full bg-surfaceMid h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                distKm < 5 ? 'bg-amber-500' : 'bg-safeGreen'
              }`}
              style={{ width: `${Math.min(100, (distKm / 22.2) * 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-textMuted">
            <span>{t('Coastline (0 km)')}</span>
            <span>{t('Territorial Limit (22.2 km / 12 nm)')}</span>
          </div>
        </div>

        {/* Permitted vs Prohibited Matrix (8 cols) */}
        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Trawling */}
          <div className="p-2.5 rounded-xl bg-surface/80 border border-borderLight flex flex-col justify-between">
            <span className="text-[10px] text-textMuted font-medium">{t('Bottom Trawling:')}</span>
            <span className={`font-bold flex items-center gap-1 mt-1 ${isRestricted || distKm < 5 ? 'text-dangerRed' : 'text-safeGreen'}`}>
              {isRestricted || distKm < 5 ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
              {isRestricted || distKm < 5 ? t('Prohibited') : t('Permitted')}
            </span>
          </div>

          {/* Artisanal Fishing */}
          <div className="p-2.5 rounded-xl bg-surface/80 border border-borderLight flex flex-col justify-between">
            <span className="text-[10px] text-textMuted font-medium">{t('Artisanal Netting:')}</span>
            <span className="font-bold text-safeGreen flex items-center gap-1 mt-1">
              <CheckCircle2 size={12} /> {t('Permitted')}
            </span>
          </div>

          {/* Dredging / Mining */}
          <div className="p-2.5 rounded-xl bg-surface/80 border border-borderLight flex flex-col justify-between">
            <span className="text-[10px] text-textMuted font-medium">{t('Marine Dredging:')}</span>
            <span className="font-bold text-dangerRed flex items-center gap-1 mt-1">
              <XCircle size={12} /> {t('Prohibited')}
            </span>
          </div>

          {/* Eco-Tourism */}
          <div className="p-2.5 rounded-xl bg-surface/80 border border-borderLight flex flex-col justify-between">
            <span className="text-[10px] text-textMuted font-medium">{t('Eco-Vessel Transit:')}</span>
            <span className="font-bold text-safeGreen flex items-center gap-1 mt-1">
              <CheckCircle2 size={12} /> {t('Speed <10kn')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
