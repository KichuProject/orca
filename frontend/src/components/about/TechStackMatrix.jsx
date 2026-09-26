import { useGlobal } from '../../context/GlobalContext'
import React from 'react'
import { Cpu, Layers, Code, Globe, Shield, Terminal, Zap } from 'lucide-react'

const STACK_GROUPS = [
  {
    title: 'Frontend & Bridge Workstation',
    icon: Globe,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    techs: [
      { name: 'React 19 & Vite', desc: 'Component architecture with sub-second hot module replacement' },
      { name: 'Tailwind CSS', desc: 'Custom maritime design system with curated slate and navy palette' },
      { name: 'Leaflet & ESRI Satellite', desc: 'High-resolution global imagery & vector GIS layer engine' },
      { name: 'TanStack Query v5', desc: 'Reactive caching, automated background refetch & stale-while-revalidate' },
      { name: 'Recharts & Lucide', desc: 'Harmonic wave/tide visualizers & lightweight maritime iconography' }
    ]
  },
  {
    title: 'Backend & Agentic Core',
    icon: Cpu,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    techs: [
      { name: 'FastAPI (Python 3.11+)', desc: 'Asynchronous REST gateway with automated OpenAPI documentation' },
      { name: 'LangChain & Agent Brain', desc: 'Autonomous tool-calling planner evaluating multi-parameter safety' },
      { name: 'NetworkX Graph Engine', desc: 'Relational knowledge graph connecting vessels, sensors, and hazards' },
      { name: 'Uvicorn ASGI Server', desc: 'High-throughput concurrency handling sub-15ms spatial queries' }
    ]
  },
  {
    title: 'Geospatial & Marine Science',
    icon: Layers,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    techs: [
      { name: 'Scikit-Learn KDTree', desc: 'Fast spatial nearest-neighbor search across ports and PFZ sectors' },
      { name: 'GeoPandas & Shapely', desc: 'Vector polygon containment & IMBL boundary distance raycasting' },
      { name: 'NetCDF4 & XArray', desc: 'Multi-dimensional raster extraction for Copernicus & NOAA sea temps' },
      { name: 'Harmonic Equilibrium Tide', desc: 'Constituent prediction (M2, S2, N2, K1, O1) for coastal datums' }
    ]
  },
  {
    title: 'Data Ingestion & Dispatch',
    icon: Zap,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    techs: [
      { name: 'Sub-Hourly Sync Daemons', desc: 'Automated fetchers caching live satellite telemetry and alerts' },
      { name: 'Anti-NaN Sanitizer', desc: 'Fault-tolerant JSON encoder guaranteeing zero serialization drops' },
      { name: 'NAVTEX & SMS Dispatcher', desc: 'Multi-channel broadcast across 518 kHz radio, WhatsApp, and SMS' },
      { name: '10 Coastal Languages', desc: 'Multilingual i18n localization for traditional fishing communities' }
    ]
  }
]

export default function TechStackMatrix() {
  const { t } = useGlobal()
  return (
    <div className="bg-white rounded-2xl border border-borderLight p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-borderLight/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-navy flex items-center justify-center">
            <Terminal size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy">
              {t('System Architecture & Technology Stack')}
            </h2>
            <p className="text-[11px] text-textMuted">
              {t('Production-grade agentic stack architected for real-time maritime operations')}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-surface text-textSecond border border-borderLight">
          Python 3.11+ &bull; React 19
        </span>
      </div>

      {/* 4 Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {STACK_GROUPS.map((group) => {
          const Icon = group.icon
          return (
            <div
              key={t(group.title)}
              className="p-3.5 rounded-xl border border-borderLight/80 bg-surface/40 hover:bg-white hover:border-oceanBlue/30 hover:shadow-xs transition-all space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${group.color}`}>
                  <Icon size={14} />
                </div>
                <h3 className="text-xs font-bold text-navy">{t(group.title)}</h3>
              </div>

              <div className="space-y-2 pt-1 border-t border-borderLight/50">
                {group.techs.map((tech) => (
                  <div key={tech.name} className="text-xs">
                    <div className="font-semibold text-navy text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-oceanBlue inline-block" />
                      <span>{tech.name}</span>
                    </div>
                    <div className="text-[10px] text-textMuted pl-2.5 mt-0.5 leading-snug">
                      {t(tech.desc)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
