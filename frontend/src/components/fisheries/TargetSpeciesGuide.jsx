import React, { useState } from 'react'
import { Fish, Filter, Anchor, Award, ChevronRight } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export const TARGET_SPECIES = [
  {
    name: 'Indian Mackerel',
    scientific: 'Rastrelliger kanagurta',
    type: 'Pelagic',
    depth: '20–90 meters',
    tempRange: '27.0–29.5 °C',
    gear: 'Purse Seine / Gillnet',
    abundance: 'HIGH',
    value: 'High Domestic Demand',
    desc: 'Abundant coastal pelagic schooling species congregating along thermal front upwelling edges.',
  },
  {
    name: 'Oil Sardine',
    scientific: 'Sardinella longiceps',
    type: 'Pelagic',
    depth: '10–50 meters',
    tempRange: '26.5–29.0 °C',
    gear: 'Ring Seine / Cast Net',
    abundance: 'VERY HIGH',
    value: 'High Commercial Volume',
    desc: 'Primary commercial biomass in coastal waters, highly sensitive to chlorophyll-a phytoplankton plumes.',
  },
  {
    name: 'Skipjack Tuna',
    scientific: 'Katsuwonus pelamis',
    type: 'Pelagic',
    depth: '50–250 meters',
    tempRange: '28.0–30.5 °C',
    gear: 'Oceanic Longline / Pole & Line',
    abundance: 'MODERATE',
    value: 'Premium Export Grade',
    desc: 'Fast-swimming oceanic pelagic species tracking deep thermal breaks and convergence lines.',
  },
  {
    name: 'Ribbonfish (Largehead Hairtail)',
    scientific: 'Trichiurus lepturus',
    type: 'Demersal',
    depth: '40–120 meters',
    tempRange: '26.0–28.5 °C',
    gear: 'Bottom Trawl / Pelagic Trawl',
    abundance: 'HIGH',
    value: 'Major Export Commodity',
    desc: 'Benthopelagic predator found along continental shelf slopes and muddy bottom contours.',
  },
  {
    name: 'Giant Tiger Prawn',
    scientific: 'Penaeus monodon',
    type: 'Demersal',
    depth: '15–60 meters',
    tempRange: '27.0–30.0 °C',
    gear: 'Shrimp Trawl / Trammel Net',
    abundance: 'MODERATE',
    value: 'High Value Delicacy',
    desc: 'Demersal crustacean concentrated near mangrove estuarine outlets and soft sediment shelves.',
  },
]

export default function TargetSpeciesGuide({ oceanData = {} }) {
  const { t } = useGlobal()
  const [filterType, setFilterType] = useState('ALL') // 'ALL' | 'Pelagic' | 'Demersal'

  const liveSst = oceanData?.isro?.sst_c ?? oceanData?.copernicus?.sst_c_at_point ?? 28.9

  const isOptimalSst = (tempRangeStr) => {
    const match = tempRangeStr.match(/([\d\.]+)\s*[–-]\s*([\d\.]+)/)
    if (!match) return true
    const minT = parseFloat(match[1])
    const maxT = parseFloat(match[2])
    return liveSst >= minT && liveSst <= maxT
  }

  const filtered = TARGET_SPECIES.filter(s =>
    filterType === 'ALL' ? true : s.type === filterType
  )

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-isroOrange flex items-center justify-center">
            <Fish size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('Target Commercial Species & Gear Advisory')}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t('Species assemblage forecast calibrated to active SST')} ({liveSst.toFixed(1)}°C) &amp; {t('bathymetry')}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-2xl border border-borderLight self-start">
          {['ALL', 'Pelagic', 'Demersal'].map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === f
                  ? 'bg-oceanBlue text-white shadow-xs'
                  : 'text-textSecond hover:text-navy'
              }`}
            >
              {t(f)}
            </button>
          ))}
        </div>
      </div>

      {/* Species Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map(sp => {
          const inOptimalRange = isOptimalSst(sp.tempRange)
          return (
            <div
              key={sp.name}
              className={`p-4 rounded-2xl border flex flex-col justify-between space-y-2.5 transition-all ${
                inOptimalRange
                  ? 'bg-white border-teal-200/80 shadow-xs ring-1 ring-teal-500/10'
                  : 'bg-surface/60 border-borderLight hover:bg-white hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <h4 className="text-xs font-bold text-navy">{t(sp.name)}</h4>
                    <div className="text-[10px] text-textMuted italic">{sp.scientific}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    sp.type === 'Pelagic' ? 'bg-blue-100 text-oceanBlue' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t(sp.type)}
                  </span>
                </div>

                <p className="text-[11px] text-textSecond mt-2 leading-relaxed">
                  {t(sp.desc)}
                </p>
              </div>

              <div className="pt-2 border-t border-borderLight/60 space-y-1 text-[10px] font-mono">
                <div className="flex justify-between text-textSecond">
                  <span>{t('Depth Layer:')}</span>
                  <span className="font-bold text-navy">{t(sp.depth)}</span>
                </div>
                <div className="flex justify-between text-textSecond">
                  <span>{t('Optimal SST:')}</span>
                  <span className="font-bold text-isroOrange flex items-center gap-1">
                    {sp.tempRange}
                    {inOptimalRange && (
                      <span className="text-[8px] font-sans font-extrabold text-safeGreen bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                        {t('MATCH')}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-textSecond">
                  <span>{t('Recommended Gear:')}</span>
                  <span className="font-bold text-navy truncate max-w-[150px]">{t(sp.gear)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
