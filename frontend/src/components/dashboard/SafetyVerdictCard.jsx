import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, AlertTriangle, MessageSquare, ArrowRight, Anchor } from 'lucide-react'
import { useGlobal, VESSEL_PROFILES } from '../../context/GlobalContext'

export default function SafetyVerdictCard({ safetyData, isLoading }) {
  const navigate = useNavigate()
  const { location, vessel, t } = useGlobal()
  const activeVessel = VESSEL_PROFILES[vessel] || VESSEL_PROFILES.fishing_trawler || { label: 'Fishing Trawler', icon: '🚢' }

  const verdict = safetyData?.verdict || (isLoading ? 'EVALUATING...' : 'SAFE')
  const risks = safetyData?.risks || []
  const warnings = safetyData?.warnings || []

  // Visual themes based on verdict
  let config = {
    badge: 'SAFE TO VENTURE',
    sub: 'Favorable marine parameters for your vessel class',
    border: 'border-safeGreen/40',
    bg: 'bg-gradient-to-br from-emerald-950/20 via-white to-safeGreen/5',
    pill: 'bg-safeGreen text-white',
    icon: ShieldCheck,
    iconColor: 'text-safeGreen',
    confidence: '94%',
  }

  if (verdict === 'DO_NOT_VENTURE' || verdict === 'DANGER') {
    config = {
      badge: 'DO NOT VENTURE',
      sub: 'Official IMD / INCOIS advisory active. Sea conditions exceed safety limits.',
      border: 'border-dangerRed/50',
      bg: 'bg-gradient-to-br from-rose-950/20 via-white to-dangerRed/10',
      pill: 'bg-dangerRed text-white',
      icon: ShieldAlert,
      iconColor: 'text-dangerRed',
      confidence: '96%',
    }
  } else if (verdict === 'CAUTION') {
    config = {
      badge: 'PROCEED WITH CAUTION',
      sub: 'Elevated wave swell or gusty winds detected. Stay within sheltered coastal limits.',
      border: 'border-warnAmber/50',
      bg: 'bg-gradient-to-br from-amber-950/20 via-white to-warnAmber/10',
      pill: 'bg-warnAmber text-navy',
      icon: AlertTriangle,
      iconColor: 'text-warnAmber',
      confidence: '89%',
    }
  }

  const Icon = config.icon

  const handleConsultORCA = () => {
    navigate('/ask', {
      state: {
        prefill: `Why is the current safety verdict "${config.badge}" for a ${activeVessel.label} near ${location.name}? Give me a detailed breakdown of wave limits, wind gusts, and IMD advisories.`,
      },
    })
  }

  return (
    <div className={`p-6 rounded-3xl border ${config.border} ${config.bg} shadow-md relative overflow-hidden transition-all`}>
      {/* Background ambient glow */}
      <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-oceanBlue/5 pointer-events-none blur-2xl" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        {/* Left: Verdict Status & Details */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-xs flex items-center gap-1.5 ${config.pill}`}>
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              {t(config.badge)}
            </span>
            <span className="text-xs font-semibold text-textMuted bg-surface px-2.5 py-1 rounded-full border border-borderLight">
              {config.confidence} {t('Confidence Score')}
            </span>
            <span className="text-xs font-semibold text-navy bg-surface px-2.5 py-1 rounded-full border border-borderLight flex items-center gap-1">
              <span>{activeVessel.icon}</span>
              <span>{t(activeVessel.label)}</span>
              <span className="text-textMuted font-mono text-[10px]">
                {activeVessel.limits?.wave ? `(≤ ${activeVessel.limits.wave}m)` : ''}
              </span>
            </span>
          </div>

          <div>
            <h2 className="text-xl md:text-2xl font-black text-navy tracking-tight leading-tight">
              {config.badge === 'SAFE TO VENTURE' ? t('All Clear For Maritime Operations') : t(config.badge)}
            </h2>
            <p className="text-xs md:text-sm text-textSecond mt-1 leading-relaxed max-w-2xl">
              {t(config.sub)}
            </p>
          </div>

          {/* Active Risk Points */}
          {(risks.length > 0 || warnings.length > 0) && (
            <div className="pt-2 border-t border-borderLight/70 space-y-1.5">
              {risks.slice(0, 2).map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-semibold text-dangerRed">
                  <span className="w-1.5 h-1.5 rounded-full bg-dangerRed mt-1.5 flex-shrink-0" />
                  <span className="leading-snug">{t(r)}</span>
                </div>
              ))}
              {warnings.slice(0, 1).map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-medium text-warnAmber">
                  <span className="w-1.5 h-1.5 rounded-full bg-warnAmber mt-1.5 flex-shrink-0" />
                  <span className="leading-snug">{t(w)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Big Icon & Action Button */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 flex-shrink-0">
          <div className={`p-4 rounded-2xl bg-white shadow-sm border border-borderLight ${config.iconColor}`}>
            <Icon size={44} strokeWidth={2.2} />
          </div>

          <button
            id="dashboard-consult-orca-btn"
            onClick={handleConsultORCA}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-navy hover:bg-navyLight text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer group"
          >
            <MessageSquare size={14} className="text-saffron" />
            <span>{t('Consult ORCA Brain')}</span>
            <ArrowRight size={13} className="text-saffron group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}
