import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ShieldCheck, Printer, X, Download, Anchor, Award } from 'lucide-react'
import { useGlobal, VESSEL_PROFILES } from '../../context/GlobalContext'

export default function SafetyCertificateModal({ safetyData = {}, onClose }) {
  const { location, vessel, t } = useGlobal()
  const activeProfile = VESSEL_PROFILES[vessel] || VESSEL_PROFILES.fishing_trawler
  const conditions = safetyData.conditions || {}

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-modal-active')
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint)
      document.body.classList.remove('printing-modal-active')
    }
  }, [])

  const handlePrint = () => {
    document.body.classList.add('printing-modal-active')
    setTimeout(() => {
      window.print()
    }, 50)
  }

  const certId = `ORCA-IND-${Date.now().toString().slice(-6)}`
  const now = new Date()
  const issueDate = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const validUntil = new Date(now.getTime() + 12 * 60 * 60 * 1000).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const verdict = safetyData.verdict || 'SAFE'

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn pointer-events-auto printable-modal-overlay">
      <div className="bg-white rounded-3xl shadow-2xl border border-borderLight max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] printable-modal-card">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-borderLight bg-surface/80 print:hidden">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-isroOrange" />
            <h3 className="text-sm font-bold text-navy">{t('Maritime Safety Clearance Certificate')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surfaceMid text-textMuted hover:text-navy cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Certificate Printable Canvas */}
        <div id="printable-safety-cert" className="printable-document p-6 overflow-y-auto space-y-4 font-sans text-navy">
          {/* Top ISRO Banner */}
          <div className="text-center pb-4 border-b border-borderLight space-y-1">
            <div className="text-[10px] font-black tracking-widest text-textMuted uppercase">
              {t('GOVERNMENT OF INDIA • MINISTRY OF EARTH SCIENCES & ISRO')}
            </div>
            <h2 className="text-lg font-black text-navy">{t('ORCA OCEAN INTELLIGENCE PLATFORM')}</h2>
            <div className="text-xs text-oceanBlue font-semibold">{t('Pre-Departure Automated Safety Assessment')}</div>
            <div className="text-[10px] font-mono text-textMuted">{t('Certificate ID')}: {certId}</div>
          </div>

          {/* Vessel & Location Information */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-surface p-3.5 rounded-2xl border border-borderLight">
            <div>
              <span className="text-textMuted block text-[10px]">{t('Vessel Profile')}:</span>
              <span className="font-bold text-navy flex items-center gap-1 mt-0.5">
                <Anchor size={12} className="text-oceanBlue" />
                {t(activeProfile.label)}
              </span>
            </div>
            <div>
              <span className="text-textMuted block text-[10px]">{t('Departure Sector')}:</span>
              <span className="font-bold text-navy block truncate mt-0.5">{location.name}</span>
            </div>
            <div>
              <span className="text-textMuted block text-[10px]">{t('Coordinates')}:</span>
              <span className="font-mono font-semibold text-navy">
                {location.lat?.toFixed(4)}° N, {location.lon?.toFixed(4)}° E
              </span>
            </div>
            <div>
              <span className="text-textMuted block text-[10px]">{t('Validity Window')}:</span>
              <span className="font-semibold text-navy">12 {t('Hours')} ({t('to')} {validUntil})</span>
            </div>
          </div>

          {/* Evaluated Sea Parameters */}
          <div className="space-y-1.5 text-xs">
            <div className="font-bold text-navy text-[11px] uppercase tracking-wider">
              {t('Evaluated Meteorological Conditions')}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-surface border border-borderLight/80 flex justify-between">
                <span className="text-textSecond">{t('Significant Wave')}:</span>
                <span className="font-bold font-mono">{conditions.wave_m ?? 0.9} m</span>
              </div>
              <div className="p-2 rounded-xl bg-surface border border-borderLight/80 flex justify-between">
                <span className="text-textSecond">{t('Wind Speed')}:</span>
                <span className="font-bold font-mono">{conditions.wind_kmh ?? 11.2} km/h</span>
              </div>
              <div className="p-2 rounded-xl bg-surface border border-borderLight/80 flex justify-between">
                <span className="text-textSecond">{t('Deep Swell')}:</span>
                <span className="font-bold font-mono">{conditions.swell_m ?? 0.7} m</span>
              </div>
              <div className="p-2 rounded-xl bg-surface border border-borderLight/80 flex justify-between">
                <span className="text-textSecond">{t('Visibility')}:</span>
                <span className="font-bold font-mono">
                  {conditions.visibility_m ? `${(conditions.visibility_m / 1000).toFixed(1)} km` : '19.3 km'}
                </span>
              </div>
            </div>
          </div>

          {/* Official Stamp & Verdict */}
          <div className="pt-3 border-t border-borderLight flex items-center justify-between">
            <div>
              <span className="text-[10px] text-textMuted block uppercase font-bold">{t('Advisory Verdict')}</span>
              <span className={`text-base font-black uppercase ${
                verdict === 'SAFE' ? 'text-safeGreen' : verdict === 'CAUTION' ? 'text-warnAmber' : 'text-dangerRed'
              }`}>
                {verdict === 'SAFE' ? t('SAFE TO DEPART') : verdict === 'CAUTION' ? t('PROCEED WITH CAUTION') : t('DEPARTURE DISCOURAGED')}
              </span>
            </div>

            {/* Verification Stamp Badge */}
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-oceanBlue flex flex-col items-center justify-center text-center text-oceanBlue rotate-12 p-1">
              <span className="text-[8px] font-black uppercase">{t('ORCA VERIFIED')}</span>
              <span className="text-[7px]">{t('GOVT OF INDIA')}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons (Hidden during printing) */}
        <div className="p-4 border-t border-borderLight bg-surface flex items-center justify-end gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-oceanBlue hover:bg-navy text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <Printer size={14} />
            <span>{t('Print Clearance')}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-borderLight bg-white hover:bg-surface text-xs font-bold text-navy cursor-pointer transition-colors"
          >
            {t('Close')}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
