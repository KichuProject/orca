import React from 'react'
import { Trees, Droplets, MapPin, ShieldAlert, Globe, ExternalLink, Activity } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function BhuvanEcologyCard({ bhuvanData = {}, isLoading = false }) {
  const { t } = useGlobal()
  const {
    sector = 'NORTH_TAMILNADU',
    mangrove_km2 = 46.57,
    coastal_wetland_km2 = 418.86,
    forest_km2 = 298.37,
    districts_covered = 5,
    eco_buffer_advice = 'Maintain 500 m stand-off: 46.57 km² mangroves across 5 coastal districts',
    top_mangrove_districts = [],
    source = 'ISRO Bhuvan LULC 50K API (2011-12)',
  } = bhuvanData

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-xs flex-shrink-0">
            <Trees size={19} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-navy">
                {t('ISRO Bhuvan Coastal Ecology & LULC')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                {t('ISRO NRSC LIVE')}
              </span>
            </div>
            <p className="text-[10px] text-textMuted mt-0.5">
              {t('Land Use / Land Cover 1:50K Satellite Inventory • Sector:')} <strong className="text-navy">{t(sector)}</strong>
            </p>
          </div>
        </div>

        <a
          href="https://bhuvan.nrsc.gov.in"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-borderLight text-xs font-bold text-textSecond hover:text-navy hover:border-oceanBlue transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Globe size={13} className="text-oceanBlue" />
          <span>{t('Bhuvan Geoportal')}</span>
          <ExternalLink size={11} className="text-textMuted" />
        </a>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Mangrove */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
            <span className="flex items-center gap-1">
              <Trees size={13} className="text-emerald-700" /> {t('Mangrove Cover')}
            </span>
          </div>
          <div className="text-xl font-black text-emerald-950 font-mono">
            {mangrove_km2} <span className="text-xs font-normal text-emerald-700">km²</span>
          </div>
          <div className="text-[10px] text-emerald-700">{t('Protected Breeding Habitat')}</div>
        </div>

        {/* Coastal Wetland */}
        <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-blue-800">
            <span className="flex items-center gap-1">
              <Droplets size={13} className="text-blue-700" /> {t('Coastal Wetland')}
            </span>
          </div>
          <div className="text-xl font-black text-blue-950 font-mono">
            {coastal_wetland_km2} <span className="text-xs font-normal text-blue-700">km²</span>
          </div>
          <div className="text-[10px] text-blue-700">{t('Tidal Estuaries & Mudflats')}</div>
        </div>

        {/* Forest Cover */}
        <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-100 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-teal-800">
            <span className="flex items-center gap-1">
              <Trees size={13} className="text-teal-700" /> {t('Littoral Forest')}
            </span>
          </div>
          <div className="text-xl font-black text-teal-950 font-mono">
            {forest_km2} <span className="text-xs font-normal text-teal-700">km²</span>
          </div>
          <div className="text-[10px] text-teal-700">{t('Coastal Vegetative Shield')}</div>
        </div>

        {/* Coastal Districts */}
        <div className="p-3.5 rounded-2xl bg-surface border border-borderLight space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-textMuted">
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-oceanBlue" /> {t('Monitored Districts')}
            </span>
          </div>
          <div className="text-xl font-black text-navy font-mono">
            {districts_covered} <span className="text-xs font-normal text-textMuted">{t('districts')}</span>
          </div>
          <div className="text-[10px] text-textMuted">{t('Sector Spatial Aggregation')}</div>
        </div>
      </div>

      {/* Advisory Stand-off Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-950">
        <ShieldAlert size={16} className="text-amber-800 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-900">{t('ISRO Bhuvan Regulatory Stand-off Advisory:')} </span>
          <span className="text-amber-950">{t(eco_buffer_advice)}</span>
        </div>
      </div>

      {/* Top Mangrove Districts Breakdown */}
      {top_mangrove_districts.length > 0 && (
        <div className="pt-2 space-y-2">
          <div className="text-xs font-bold text-navy flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity size={13} className="text-oceanBlue" />
              {t('Highest Mangrove Density Districts in Sector')}
            </span>
            <span className="text-[10px] text-textMuted font-normal">{source}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {top_mangrove_districts.map((d, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-surface border border-borderLight flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-navy">{t(d.district)}</span>
                </div>
                <span className="font-mono font-bold text-emerald-700">
                  {d.mangrove_km2} km²
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
