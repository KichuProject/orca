import { useGlobal } from '../../context/GlobalContext'
import React from 'react'
import { Anchor, Compass, ShieldAlert, Award, Sparkles, HeartHandshake, Globe2 } from 'lucide-react'

export default function PlatformVisionCard() {
  const { t } = useGlobal()
  return (
    <div className="bg-gradient-to-br from-navy via-navyLight to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden space-y-5">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-oceanBlue/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-20 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Title & Badge */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-oceanBlue/30 text-sky-200 border border-oceanBlue/40 text-[10px] font-mono font-bold tracking-wider">
            <Sparkles size={11} className="text-saffron" />
            <span>{t('OCEANOGRAPHIC RESEARCH • INTEGRATED MARITIME DOMAIN AWARENESS PROTOTYPE')}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>{t('ORCA: Oceanographic & Real-Time Coastal Analytics')}</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {t("India's unified autonomous marine intelligence platform integrating multi-satellite earth observation, oceanographic physics, and LangChain agentic reasoning for fishermen, mariners, and coastal stewards.")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-lg font-black text-saffron">7,516 km</div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{t('Indian Coastline')}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
            <div className="text-lg font-black text-sky-400">2.3M km²</div>
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{t('EEZ Jurisdiction')}</div>
          </div>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-300 flex items-center justify-center mb-2">
            <ShieldAlert size={16} />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">{t('Zero Loss of Life at Sea')}</h3>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {t('Autonomous vessel limit boundary audits (wave, swell, wind, convective CAPE) and early gale warnings before departure.')}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-2">
            <Compass size={16} />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">{t('Sustainable Blue Economy')}</h3>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {t('High-yield PFZ navigation minimizing diesel burn and voyage duration while maximizing catch per unit effort (CPUE).')}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center mb-2">
            <Anchor size={16} />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">{t('Anti-Apprehension Geofence')}</h3>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {t('Real-time proximity alarms for the International Maritime Boundary Line (IMBL) preventing accidental cross-border detentions.')}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center mb-2">
            <Globe2 size={16} />
          </div>
          <h3 className="text-xs font-bold text-white mb-1">{t('Marine Sanctuary Defense')}</h3>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {t('Monitoring Degree Heating Weeks (DHW) on coral reefs and mitigating vessel strikes for WPA Schedule I megafauna (Dugongs, Olive Ridleys).')}
          </p>
        </div>
      </div>
    </div>
  )
}
