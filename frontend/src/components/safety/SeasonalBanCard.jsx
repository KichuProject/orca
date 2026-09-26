import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Shield, Info, CheckCircle2, AlertOctagon } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'
import { endpoints } from '../../api'

export default function SeasonalBanCard() {
  const { location, t } = useGlobal()
  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  // Live statutory seasonal ban from backend
  const { data: liveBan } = useQuery({
    queryKey: ['seasonal-ban', lat, lon],
    queryFn: async () => {
      const res = await endpoints.seasonalBan(lat, lon)
      return res.data
    },
    staleTime: 3600000,
  })

  // If longitude > 78.5, typically East Coast (Bay of Bengal); else West Coast (Arabian Sea)
  const isEastCoast = lon >= 78.5
  const coastName = liveBan?.region
    ? (liveBan.region.replace('_', ' ').toUpperCase())
    : (isEastCoast ? 'East Coast (Bay of Bengal)' : 'West Coast (Arabian Sea)')
  
  const banWindowLabel = (liveBan?.start && liveBan?.end)
    ? `${liveBan.start} to ${liveBan.end}`
    : (isEastCoast ? '15 April – 14 June (61 Days)' : '01 June – 31 July (61 Days)')

  const isInsideBan = liveBan?.ban_active != null ? liveBan.ban_active : false

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Calendar size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('Seasonal Monsoon Fishing Ban Calendar')}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t('Ministry of Fisheries, Animal Husbandry & Dairying (Govt. of India)')}
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 self-start sm:self-auto ${
          isInsideBan ? 'bg-dangerRed text-white shadow-xs' : 'bg-emerald-100 text-safeGreen'
        }`}>
          {isInsideBan ? <AlertOctagon size={13} /> : <CheckCircle2 size={13} />}
          {isInsideBan ? t('Seasonal Ban Active') : t('Ban Inactive / Season Open')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Your Coast Status Card */}
        <div className="p-4 rounded-2xl bg-surface border border-borderLight space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-navy">
            <span>{t('Detected Maritime Sector:')}</span>
            <span className="text-oceanBlue font-semibold">{t(coastName)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-textSecond">
            <span>{t('Annual Breeding Ban Period:')}</span>
            <span className="font-mono font-bold text-navy">{t(banWindowLabel)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-textSecond">
            <span>{t('Regulatory Status:')}</span>
            <span className={`font-bold ${isInsideBan ? 'text-dangerRed' : 'text-safeGreen'}`}>
              {isInsideBan ? t('Mechanized Trawling Prohibited') : t('Unrestricted Commercial Fishing Open')}
            </span>
          </div>
        </div>

        {/* Both Coasts Standard Schedule */}
        <div className="p-4 rounded-2xl bg-surface border border-borderLight space-y-2 text-xs">
          <div className="font-bold text-navy pb-1 border-b border-borderLight">
            {t('Pan-India Statutory Windows')}
          </div>
          <div className="flex justify-between text-textSecond">
            <span>{t('East Coast (WB, OD, AP, TN, Puducherry):')}</span>
            <span className="font-mono font-semibold text-navy">15 Apr – 14 Jun</span>
          </div>
          <div className="flex justify-between text-textSecond">
            <span>{t('West Coast (GJ, MH, GA, KA, KL):')}</span>
            <span className="font-mono font-semibold text-navy">01 Jun – 31 Jul</span>
          </div>
        </div>
      </div>

      {/* Guidelines Note */}
      <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-[11px] text-textSecond leading-relaxed flex items-start gap-2">
        <Info size={15} className="text-oceanBlue mt-0.5 flex-shrink-0" />
        <div>
          <strong>{t('Ecological Conservation Objective:')}</strong> {t('The annual uniform fishing ban protects pelagic and demersal fish species during peak monsoon spawning cycles.')} <em>{t('Non-motorized traditional country crafts (kattumarams, canoes) are fully exempted')}</em> {t('to preserve coastal artisanal livelihoods.')}
        </div>
      </div>
    </div>
  )
}
