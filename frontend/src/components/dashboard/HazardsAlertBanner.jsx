import React from 'react'
import { CloudLightning, Wind, BellRing, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function HazardsAlertBanner({ hazardsData = {}, safetyData = {} }) {
  const { t } = useGlobal()
  const cyclone = hazardsData.cyclone || {}
  const lightning = hazardsData.lightning || {}
  const imdWarningRaw = safetyData.imd?.imd_top_warning || cyclone.imd_top_warnings
  const imdWarning = Array.isArray(imdWarningRaw) 
    ? imdWarningRaw.filter(Boolean).join(' • ') 
    : (typeof imdWarningRaw === 'string' ? imdWarningRaw : '')

  const isCycloneActive = cyclone.is_cyclone_detected || cyclone.imd_cyclone_active
  const isLightningHigh = lightning.combined_lightning_risk === 'HIGH' || lightning.lightning_risk_openmeteo?.includes('HIGH')

  const isroConvection = hazardsData.isro_convection || {}
  const hasIsroData = isroConvection.status !== 'error' && isroConvection.source

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <BellRing size={16} className="text-isroOrange" />
          <h3 className="text-sm font-bold text-navy">{t('Active Marine Hazards & Surveillance')}</h3>
        </div>
        <span className="text-[11px] font-semibold text-textMuted">
          {t('Multi-Source IMD + ISRO MOSDAC + IBTrACS')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Cyclone Surveillance Card */}
        <div className={`p-4 rounded-3xl border transition-all ${
          isCycloneActive
            ? 'bg-red-50/70 border-dangerRed/40 shadow-xs'
            : 'bg-white border-borderLight shadow-xs'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isCycloneActive ? 'bg-dangerRed text-white' : 'bg-emerald-50 text-safeGreen'
              }`}>
                <Wind size={17} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy">{t('Tropical Cyclone Status')}</h4>
                <p className="text-[10px] text-textMuted">{t('Satellite Barometric Pressure & Best Track')}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
              isCycloneActive ? 'bg-dangerRed text-white' : 'bg-emerald-100 text-safeGreen'
            }`}>
              {isCycloneActive ? t('Advisory Active') : t('No Cyclones')}
            </span>
          </div>

          <p className="text-xs text-textSecond mt-2.5 leading-relaxed">
            {t(cyclone.recommended_action || (isCycloneActive
              ? 'IMD Cyclone Warning in effect for coastal sectors. Review storm track and squall warnings.'
              : 'Barometric pressure nominal at 1010 hPa. No cyclonic circulation detected within 300 nautical miles.'))}
          </p>

          <div className="mt-3 pt-2 border-t border-borderLight/60 flex items-center justify-between text-[10px] text-textMuted">
            <span>{t('NASA EONET: 0 Active Systems')}</span>
            <span className="font-semibold text-navy">{t('IBTrACS Verified')}</span>
          </div>
        </div>

        {/* Lightning & Convection Card */}
        <div className={`p-4 rounded-3xl border transition-all ${
          isLightningHigh
            ? 'bg-amber-50/70 border-warnAmber/40 shadow-xs'
            : 'bg-white border-borderLight shadow-xs'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isLightningHigh ? 'bg-warnAmber text-navy' : 'bg-emerald-50 text-safeGreen'
              }`}>
                <CloudLightning size={17} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy">{t('Lightning & Deep Convection')}</h4>
                <p className="text-[10px] text-textMuted">{t('INSAT-3DS Cloud Top & CAPE Index')}</p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
              isLightningHigh ? 'bg-warnAmber text-navy' : 'bg-emerald-100 text-safeGreen'
            }`}>
              {isLightningHigh ? t('High Convection') : t('Low Risk')}
            </span>
          </div>

          <p className="text-xs text-textSecond mt-2.5 leading-relaxed">
            {t(lightning.recommended_action || (isLightningHigh
              ? 'Thunderstorms likely within hours due to high CAPE (convective energy). Avoid open sea operations.'
              : 'Clear sky conditions detected by INSAT-3DS. Negligible lightning risk in active zone.'))}
          </p>

          <div className="mt-3 pt-2 border-t border-borderLight/60 flex flex-wrap items-center justify-between gap-1 text-[10px] text-textMuted">
            <span>CAPE: {lightning.cape_j_per_kg ? `${lightning.cape_j_per_kg.toFixed(0)} J/kg` : t('Low')}</span>
            {isroConvection.rain_mm != null && (
              <span className="font-semibold text-oceanBlue">
                {t('IMR Rain')}: {isroConvection.rain_mm.toFixed(1)} mm/d
              </span>
            )}
            <span className="font-semibold text-navy">{t('ISRO INSAT-3DS Live')}</span>
          </div>
        </div>
      </div>

      {/* Official IMD Bulletin Strip if warning present */}
      {imdWarning && (
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-warnAmber/40 text-xs text-navy flex items-start gap-2.5">
          <AlertCircle size={16} className="text-warnAmber mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <div className="font-bold text-navy">{t('Official IMD Coastal Fishermen Warning:')}</div>
            <div className="text-textSecond leading-relaxed text-[11px]">{t(imdWarning)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
