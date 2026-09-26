import { useGlobal } from '../../context/GlobalContext'
import React from 'react'
import { ShieldCheck, Scale, Award, FileCheck, CheckCircle2 } from 'lucide-react'

const FRAMEWORKS = [
  {
    code: 'UNCLOS 1982',
    name: 'UN Convention on the Law of the Sea',
    desc: 'Statutory reference demarcation of Territorial Waters (12nm), Contiguous Zone (24nm), and Exclusive Economic Zone (200nm) modeled for boundary awareness simulation.',
    authority: 'United Nations / ICJ Reference Framework'
  },
  {
    code: 'SOLAS 1974',
    name: 'Safety of Life at Sea Convention',
    desc: 'Passage planning benchmarks, under-keel clearance calculation, and dynamic weather/wave operational safety envelopes modeled as prototype safety rules.',
    authority: 'International Maritime Organization (IMO) Guidelines'
  },
  {
    code: 'WPA 1972 (Sched I)',
    name: 'India Wildlife Protection Act',
    desc: 'Simulated strike mitigation speed advisories and sanctuary avoidance corridors for endangered marine megafauna (Dugongs, Whale Sharks, Olive Ridleys).',
    authority: 'MoEFCC Schedule I Guidelines'
  },
  {
    code: 'MFRA & Ban Protocols',
    name: 'Marine Fisheries Regulation Acts',
    desc: 'Simulated enforcement calendar for statutory monsoon uniform seasonal fishing bans for the East Coast (April 15 - June 14) and West Coast (June 1 - July 31).',
    authority: 'Department of Fisheries Reference Directives'
  },
  {
    code: 'IMD / INCOIS OSF',
    name: 'Ocean State Forecast & Cyclone Protocols',
    desc: 'Standardized Beaufort scale sea state classification, port cautionary signal designations, and NAVAREA VIII radio broadcast formats referenced for advisory simulation.',
    authority: 'MoES / IMD / INCOIS Open Data Formats'
  },
  {
    code: 'OGC / ISO 19115',
    name: 'Open Geospatial Consortium Standards',
    desc: 'WGS 84 (EPSG:4326) coordinate reference standards, OGC GeoJSON schemas, and CF-compliant NetCDF4 climate metadata conventions.',
    authority: 'Open Geospatial Consortium (OGC) / ISO TC 211'
  }
]

export default function StatutoryComplianceBanner() {
  const { t } = useGlobal()
  return (
    <div className="bg-white rounded-2xl border border-borderLight p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-borderLight/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Scale size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy">
              {t('Maritime Regulatory Reference Frameworks & Standards')}
            </h2>
            <p className="text-[11px] text-textMuted">
              {t('Prototype simulation & algorithmic decision modeling aligned with established international and national maritime conventions')}
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold font-mono">
          <CheckCircle2 size={11} /> {t('PROTOTYPE REFERENCE BENCHMARK')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {FRAMEWORKS.map((fw) => (
          <div
            key={fw.code}
            className="p-3 rounded-xl border border-borderLight bg-surface/50 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between space-y-2"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                  {fw.code}
                </span>
              </div>
              <h3 className="text-xs font-bold text-navy mt-1.5">{t(fw.name)}</h3>
              <p className="text-[10px] text-textMuted mt-1 leading-relaxed">{t(fw.desc)}</p>
            </div>

            <div className="pt-2 border-t border-borderLight/60 text-[9px] text-textSecond font-medium">
              {t('Guiding Authority')}: <span className="text-navy font-semibold">{t(fw.authority)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
