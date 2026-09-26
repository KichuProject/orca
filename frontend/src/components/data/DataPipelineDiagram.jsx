import { useGlobal } from '../../context/GlobalContext'
import React from 'react'
import { 
  GitMerge, Satellite, Cpu, HardDrive, 
  Layers, ArrowRight, ShieldCheck, Zap, Radio
} from 'lucide-react'

const PIPELINE_STAGES = [
  {
    step: '01',
    title: 'Earth Observation Feeds',
    icon: Satellite,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    details: [
      'ISRO Oceansat-3 (OCM-3 / SSTM)',
      'Copernicus CMEMS PHY_001_024',
      'IMD Synoptic GTS Bulletins',
      'ECMWF / Open-Meteo Waves',
      'NOAA Coral Reef Watch DHW',
      'Global Fishing Watch AIS Streams'
    ]
  },
  {
    step: '02',
    title: 'Ingestion & Harmonization',
    icon: Cpu,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    details: [
      'Automated cron sub-hourly fetchers',
      'NetCDF4 & HDF5 raster slice extraction',
      'EPSG:4326 WGS-84 re-projection',
      'Anti-NaN sanitization & validation',
      'Tidal harmonic constituent solver'
    ]
  },
  {
    step: '03',
    title: 'High-Speed Storage & Cache',
    icon: HardDrive,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    details: [
      'Live telemetry: /data/orca/live_cache',
      'Static GIS layers: /data/orca/static_gis',
      'In-memory KD-Tree spatial indices',
      'R-Tree indexed UNCLOS boundaries',
      '5-minute sliding query cache'
    ]
  },
  {
    step: '04',
    title: 'Autonomous Marine Brain',
    icon: GitMerge,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    details: [
      'NetworkX 9-entity knowledge graph',
      'Multi-sensor fishing suitability (0-100)',
      'Vessel safety limit boundary audits',
      'Anti-apprehension IMBL distance raycast',
      'Safe route waypoint passage planner'
    ]
  },
  {
    step: '05',
    title: 'Delivery & Advisory Delivery',
    icon: Radio,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    details: [
      'Vite React GIS workstation (ESRI)',
      '10 Indian coastal languages',
      'NAVTEX 518 kHz transmitter broadcast',
      'SMS & WhatsApp (+91) alerts',
      'Official printable clearance dossiers'
    ]
  }
]

export default function DataPipelineDiagram() {
  const { t } = useGlobal()
  return (
    <div className="bg-white rounded-2xl border border-borderLight p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-borderLight/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <GitMerge size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy">
              {t('Autonomous End-to-End Data Ingestion & Intelligence Pipeline')}
            </h2>
            <p className="text-[11px] text-textMuted">
              {t('From raw satellite telemetry to real-time bridge navigational verdicts')}
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-textSecond text-[10px] font-mono font-medium">
          <Zap size={11} className="text-amber-500" /> &lt; 14ms {t('Query SLA')}
        </span>
      </div>

      {/* Process Flow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {PIPELINE_STAGES.map((stage, idx) => {
          const Icon = stage.icon
          return (
            <div
              key={stage.step}
              className="p-3.5 rounded-xl border border-borderLight bg-surface/50 hover:bg-white hover:border-oceanBlue/30 hover:shadow-xs transition-all flex flex-col justify-between relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${stage.color}`}>
                    <Icon size={14} />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-textMuted">
                    {stage.step}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-navy group-hover:text-oceanBlue transition-colors mb-2">
                  {t(stage.title)}
                </h3>

                <ul className="space-y-1.5 text-[10px] text-textSecond">
                  {stage.details.map((item, i) => (
                    <li key={i} className="flex items-start gap-1 leading-snug">
                      <span className="text-oceanBlue font-bold select-none">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step indicator footer */}
              <div className="mt-3 pt-2 border-t border-borderLight/60 flex items-center justify-between text-[9px] text-textMuted font-mono">
                <span>Stage {stage.step}</span>
                {idx < 4 && (
                  <ArrowRight size={11} className="text-slate-400 group-hover:text-oceanBlue group-hover:translate-x-0.5 transition-all" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
