import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Fish, Anchor, Navigation, ArrowUpRight, Compass, ShieldCheck } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'
import { resolvePortName } from '../../i18n/translations'

export default function OperationalHighlights({ pfzData = {}, portsData = {} }) {
  const navigate = useNavigate()
  const { language, t } = useGlobal()

  const nearestPfz = pfzData.nearest_pfz || {}
  const hasPfz = Boolean(nearestPfz && nearestPfz.name)
  const portsList = portsData.ports || []
  const topPort = portsList[0] || {}

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Nearest Potential Fishing Zone (PFZ) Card */}
      <div className="p-5 rounded-3xl bg-white border border-borderLight shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Fish size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-navy">{t('Nearest High-Yield PFZ')}</h4>
              <p className="text-[10px] text-textMuted">{t('INCOIS Satellite Thermal-Chlorophyll Front')}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
            hasPfz ? 'bg-teal-100 text-teal-800' : 'bg-surfaceMid text-textMuted'
          }`}>
            {hasPfz ? `${t(pfzData.confidence || 'HIGH')} ${t('Confidence')}` : t('Standby / Out of Range')}
          </span>
        </div>

        <div className="p-3 bg-surface rounded-2xl border border-borderLight/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-textSecond">{t('Target Zone')}:</span>
            <span className="text-xs font-bold text-navy">
              {hasPfz ? resolvePortName(nearestPfz.name, language) : t('No active PFZ in range')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-textSecond">{t('Distance & Heading')}:</span>
            <span className="text-xs font-bold text-oceanBlue flex items-center gap-1 font-mono">
              <Compass size={12} />
              {hasPfz && pfzData.distance_km
                ? `${pfzData.distance_km} km (${pfzData.direction || 'E'})`
                : hasPfz
                ? t('Local offshore front')
                : t('Scan radius > 150 km')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-textSecond">{t('Depth Fathom')}:</span>
            <span className="text-xs font-semibold text-textMuted">
              {hasPfz && nearestPfz.depth_fathom
                ? `${nearestPfz.depth_fathom} ${t('fathoms')}`
                : hasPfz
                ? t('Continental shelf')
                : t('Deep pelagic')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-textMuted">
            {t('Source')}: {t(pfzData.source || 'INCOIS_LIVE')}
          </span>
          <button
            onClick={() => navigate('/fisheries')}
            className="flex items-center gap-1 text-xs font-bold text-oceanBlue hover:text-navy transition-colors cursor-pointer"
          >
            <span>{t('Fisheries Intelligence')}</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      {/* 2. Nearest Safe Ports & Refuges Card */}
      <div className="p-5 rounded-3xl bg-white border border-borderLight shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Anchor size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-navy">{t('Nearest Ports & Shelter')}</h4>
              <p className="text-[10px] text-textMuted">{t('Commercial Harbours & Fishing Jetties')}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800">
            {portsList.length} {t('In Range')}
          </span>
        </div>

        <div className="space-y-1.5">
          {portsList.slice(0, 3).map((port, idx) => (
            <div
              key={idx}
              className="p-2 px-3 rounded-xl bg-surface border border-borderLight/70 flex items-center justify-between text-xs"
            >
              <span className="font-semibold text-navy truncate max-w-[160px]">{resolvePortName(port.name, language)}</span>
              <span className="font-mono text-[11px] font-bold text-oceanBlue">
                {port.distance_km} km ({port.direction})
              </span>
            </div>
          ))}
          {portsList.length === 0 && (
            <div className="p-2.5 text-xs text-textMuted text-center bg-surface rounded-xl">
              {t('Searching nearest coastal harbours...')}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-textMuted">
            {t('OSM Maritime Registry')}
          </span>
          <button
            onClick={() => navigate('/routes')}
            className="flex items-center gap-1 text-xs font-bold text-oceanBlue hover:text-navy transition-colors cursor-pointer"
          >
            <span>{t('Plan Route to Port')}</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
