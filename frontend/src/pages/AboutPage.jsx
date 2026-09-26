import React from 'react'
import { Info, Sparkles, ShieldCheck, Globe } from 'lucide-react'
import PlatformVisionCard from '../components/about/PlatformVisionCard'
import OperationalRolesDirectory from '../components/about/OperationalRolesDirectory'
import TechStackMatrix from '../components/about/TechStackMatrix'
import StatutoryComplianceBanner from '../components/about/StatutoryComplianceBanner'

import { useGlobal } from '../context/GlobalContext'

export default function AboutPage() {
  const { t } = useGlobal()
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-12">
      {/* ── Top Header Strip ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center shadow-xs flex-shrink-0">
            <Info size={19} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-navy leading-tight tracking-tight">
              {t ? t('pages.about_title', 'About ORCA Marine Intelligence Platform') : 'About ORCA Marine Intelligence Platform'}
            </h1>
            <p className="text-[11px] text-textMuted mt-0.5">
              {t('Mission Overview, Multi-Role Capabilities, Engineering Architecture & Governance')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-2xl bg-white border border-borderLight text-textMuted font-mono flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span className="font-semibold text-navy">{t('Maritime Domain Research & Innovation Prototype')}</span>
          </span>
        </div>
      </div>

      {/* ── 1. Mission & 4 Core Pillars ──────────────────────────── */}
      <PlatformVisionCard />

      {/* ── 2. Operational Roles & User Personas ─────────────────── */}
      <OperationalRolesDirectory />

      {/* ── 3. Engineering Architecture & Tech Stack ─────────────── */}
      <TechStackMatrix />

      {/* ── 4. Statutory Compliance & Maritime Treaties ──────────── */}
      <StatutoryComplianceBanner />

      {/* ── 5. Project Footer & Team Seal ────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-borderLight flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-textMuted">
        <div>
          <div className="font-bold text-navy">{t('ORCA Maritime Intelligence Platform • Version 2.4.0 (Prototype Demonstration)')}</div>
          <div className="text-[10px] mt-0.5">
            {t('Built with pride for Indian coastal communities, navigators, and ocean conservation stewards.')}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-textSecond">
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>{t('Reference Standards Aligned')}</span>
          </span>
          <span>&bull;</span>
          <span>{t('Open Oceanographic Initiative')}</span>
        </div>
      </div>
    </div>
  )
}
