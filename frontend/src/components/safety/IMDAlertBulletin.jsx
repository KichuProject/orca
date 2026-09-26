import React from 'react'
import { AlertCircle, Calendar, MapPin, Radio, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function IMDAlertBulletin({ safetyData = {} }) {
  const { t } = useGlobal()
  const imd = safetyData.imd || {}
  const observationCoast = safetyData.observation_coast || 'Chennai / South Tamil Nadu'
  const isWarningActive = imd.imd_warning_active

  const alertDetails = [
    {
      day: 'Day 1 (Immediate / Today)',
      status: isWarningActive ? 'SQUALLY WEATHER WARNING' : 'FAIR WEATHER',
      wind: isWarningActive ? '45–55 km/h gusting to 65 km/h' : '10–20 km/h gentle breeze',
      advisory: isWarningActive
        ? 'Squally wind prevailing along and off coastal sectors. Fishermen are strictly advised not to venture into southwest Bay of Bengal.'
        : 'Normal fishing operations permitted. Standard VHF watch recommended.',
      active: isWarningActive,
    },
    {
      day: 'Day 2 (Tomorrow)',
      status: 'SQUALLY WEATHER PERSISTS',
      wind: '40–50 km/h gusting to 60 km/h',
      advisory: 'Adjoining sea areas of south coast and Andaman Sea likely to experience moderate-to-rough sea states.',
      active: isWarningActive,
    },
    {
      day: 'Day 3–5 (Extended Outlook)',
      status: 'GRADUAL SUBSIDENCE',
      wind: '35–45 km/h',
      advisory: 'Wind speeds easing toward seasonal norms. Check daily updated morning bulletin at 06:30 IST.',
      active: false,
    },
  ]

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-dangerRed flex items-center justify-center">
            <Radio size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">{t('Official IMD Coastal Fishermen Bulletin')}</h3>
            <p className="text-[10px] text-textMuted flex items-center gap-1">
              <MapPin size={10} /> {t('Sector')}: {observationCoast} · {t('Synoptic Review')}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 self-start sm:self-auto ${
          isWarningActive ? 'bg-dangerRed text-white shadow-xs' : 'bg-emerald-100 text-safeGreen'
        }`}>
          {isWarningActive ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}
          {isWarningActive ? t('Warning Active') : t('Normal Conditions')}
        </span>
      </div>

      {/* Top Warning Alert Box if active */}
      {imd.imd_top_warning && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-navy flex items-start gap-2.5">
          <AlertCircle size={17} className="text-dangerRed mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <div className="font-bold text-dangerRed">{t('Official Advisory Broadcast:')}</div>
            <div className="text-textSecond leading-relaxed text-[11px] font-medium">
              {t(imd.imd_top_warning)}
            </div>
          </div>
        </div>
      )}

      {/* 5-Day Bulletin Breakdown */}
      <div className="space-y-2.5">
        <div className="text-xs font-bold text-textMuted uppercase tracking-wider px-1">
          {t('Synoptic 5-Day Outlook')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {alertDetails.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2.5 transition-all ${
                item.active
                  ? 'bg-amber-50/50 border-amber-200 shadow-2xs'
                  : 'bg-surface/50 border-borderLight'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-navy">
                  <span>{t(item.day)}</span>
                  <span className={`text-[10px] font-extrabold uppercase ${item.active ? 'text-dangerRed' : 'text-safeGreen'}`}>
                    {t(item.status)}
                  </span>
                </div>
                <div className="mt-1.5 text-xs font-bold text-oceanBlue font-mono">
                  {t(item.wind)}
                </div>
                <p className="text-[11px] text-textSecond mt-1 leading-relaxed">
                  {t(item.advisory)}
                </p>
              </div>

              <div className="pt-2 border-t border-borderLight/60 text-[10px] text-textMuted flex items-center justify-between">
                <span>{t('IMD ACWC Station')}</span>
                <span className="font-semibold text-navy">{t('VHF Ch 16 Broadcast')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
