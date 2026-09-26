import { useGlobal } from '../../context/GlobalContext'
import React, { useState } from 'react'
import { 
  Fish, Navigation, Leaf, Shield, Building2, 
  CheckCircle2, ArrowRight, Sparkles
} from 'lucide-react'

const ROLES = [
  {
    id: 'fishermen',
    title: 'Fishermen & Trawler Skippers',
    badge: 'Coastal Operations',
    icon: Fish,
    color: 'text-sky-600 bg-sky-50 border-sky-200',
    summary: 'Targeted PFZ aggregation navigation with direct compass bearings, seasonal ban alerts, and multilingual safety broadcasts.',
    features: [
      'INCOIS Potential Fishing Zones with 1-click safe routing and distance in km',
      'Multi-sensor Fishing Suitability Index (0-100) based on SST, chlorophyll-a, and waves',
      'Automatic Seasonal Fishing Ban checks for East Coast and West Coast zones',
      'Multilingual voice and text alerts in 10 coastal Indian languages'
    ]
  },
  {
    id: 'navigators',
    title: 'Commercial Navigators & Bridge Officers',
    badge: 'Passage Planning',
    icon: Navigation,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    summary: 'Safe passage route generation, vessel limit gauge audits, and GPX/GeoJSON export.',
    features: [
      'Multi-mode passage routing: Fastest, Safest (avoiding high waves), and Balanced',
      'Vessel-specific dynamic limits for small craft, trawlers, cargo ships, and research vessels',
      'Tidal harmonic prediction curves for port approach and shallow draft planning'
    ]
  },
  {
    id: 'ecologists',
    title: 'Marine Scientists & Conservationists',
    badge: 'Ecosystem Defense',
    icon: Leaf,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    summary: 'Real-time reef thermal bleaching monitoring, protected wetland buffers, and WPA Schedule I megafauna strike mitigation.',
    features: [
      'Degree Heating Weeks (DHW) and coral bleaching alert levels across Indian reef basins',
      'Wildlife Protection Act (WPA 1972) Schedule I megafauna strike mitigation corridors',
      'Proximity detection to 24+ Marine Protected Areas (MPAs) and 75 Ramsar coastal wetlands',
      'FAO 41-year longitudinal fisheries capture and aquaculture biomass trend analysis'
    ]
  },
  {
    id: 'enforcement',
    title: 'Coast Guard & Maritime Law Enforcement',
    badge: 'Sovereign Security',
    icon: Shield,
    color: 'text-red-600 bg-red-50 border-red-200',
    summary: 'UNCLOS maritime zone enforcement, International Maritime Boundary Line (IMBL) anti-apprehension alarms, and AIS surveillance.',
    features: [
      'Interactive UNCLOS sovereign hierarchy: Internal Waters, Territorial Sea (12nm), Contiguous (24nm), EEZ (200nm)',
      'Security buffers around offshore oil platforms (Mumbai High), gas pipelines, and naval firing ranges'
    ]
  },
  {
    id: 'ports',
    title: 'Port Authorities & VTS Operators',
    badge: 'Harbour Logistics',
    icon: Building2,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    summary: 'Harbour approach intelligence, meteorological squall warnings, local cautionary signals, and pilotage coordination.',
    features: [
      'IMD Port Warning Bulletins and Local Cautionary Signal levels (LC-I through LC-XI)',
      'Real-time convective CAPE index monitoring to predict sudden squalls and localized gusts',
      '148 Indian ports database with harbour types, channel depths, and VHF pilotage channels',
      'NAVTEX coastal radio transmitter dispatch integration for localized NavArea VIII alerts'
    ]
  }
]

export default function OperationalRolesDirectory() {
  const { t } = useGlobal()
  const [activeRole, setActiveRole] = useState(ROLES[0].id)
  const current = ROLES.find(r => r.id === activeRole) || ROLES[0]
  const Icon = current.icon

  return (
    <div className="bg-white rounded-2xl border border-borderLight p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-borderLight/60">
        <div>
          <h2 className="text-sm font-bold text-navy">
            {t('Stakeholder Operational Roles & Use Cases')}
          </h2>
          <p className="text-[11px] text-textMuted">
            {t('Tailored intelligence workflows across the Indian maritime ecosystem')}
          </p>
        </div>
      </div>

      {/* Role Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
        {ROLES.map((role) => {
          const RIcon = role.icon
          const isActive = role.id === activeRole
          return (
            <button
              key={role.id}
              onClick={() => setActiveRole(role.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-navy text-white border-navy shadow-xs'
                  : 'bg-surface hover:bg-slate-200/60 text-textSecond border-borderLight'
              }`}
            >
              <RIcon size={14} className={isActive ? 'text-saffron' : 'text-textMuted'} />
              <span>{t(role.title)}</span>
            </button>
          )
        })}
      </div>

      {/* Active Role Deep Dive Card */}
      <div className="p-4 rounded-xl border border-borderLight bg-slate-50/70 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${current.color}`}>
              <Icon size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-navy">{t(current.title)}</h3>
                <span className="px-2 py-0.5 rounded-full bg-white border border-borderLight text-[10px] font-mono text-textMuted">
                  {t(current.badge)}
                </span>
              </div>
              <p className="text-xs text-textSecond mt-0.5 max-w-xl">{t(current.summary)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/60">
          {current.features.map((feat, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-white border border-borderLight/70 flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <span className="text-[11px] text-navy leading-snug font-medium">{t(feat)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
