import React from 'react'
import { Landmark, Compass, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { haversineKm } from '../map/MeasureTools'
import { useGlobal } from '../../context/GlobalContext'

export const INDIAN_MPAS = [
  {
    name: 'Gulf of Mannar Marine National Park',
    state: 'Tamil Nadu',
    lat: 9.1500,
    lon: 79.1000,
    type: 'Biosphere Reserve & National Park',
    area: '560 sq km',
    keyFauna: 'Dugong, Coral Reefs, Sea Cucumbers',
    status: 'Strict No-Take Marine Zone',
  },
  {
    name: 'Gahirmatha Marine Sanctuary',
    state: 'Odisha',
    lat: 20.7200,
    lon: 87.0500,
    type: 'Marine Sanctuary',
    area: '1,435 sq km',
    keyFauna: 'Olive Ridley Turtle Mass Nesting (Arribada)',
    status: 'Seasonal Fishing Ban Zone',
  },
  {
    name: 'Sundarbans Biosphere Reserve',
    state: 'West Bengal',
    lat: 21.9000,
    lon: 88.8500,
    type: 'UNESCO World Heritage / Ramsar',
    area: '9,630 sq km',
    keyFauna: 'Estuarine Crocodile, Mangrove Crab, Dolphin',
    status: 'Core Critical Tiger & Marine Habitat',
  },
  {
    name: 'Pulicat Lake Bird & Marine Sanctuary',
    state: 'Tamil Nadu / Andhra Pradesh',
    lat: 13.5500,
    lon: 80.2000,
    type: 'Coastal Wetland & Ramsar Site',
    area: '450 sq km',
    keyFauna: 'Migratory Avifauna, Finfish Nursery',
    status: 'Eco-Sensitive Zone (ESZ)',
  },
  {
    name: 'Malvan Marine Sanctuary',
    state: 'Maharashtra',
    lat: 16.0500,
    lon: 73.4600,
    type: 'Marine Protected Area',
    area: '29 sq km',
    keyFauna: 'Fringing Corals, Pearl Oysters, Sea Anemones',
    status: 'Regulated Non-Mechanized Fishing',
  },
  {
    name: 'Mahatma Gandhi Marine National Park',
    state: 'Andaman & Nicobar',
    lat: 11.5500,
    lon: 92.5800,
    type: 'National Park & Coral Reef',
    area: '281 sq km',
    keyFauna: 'Pristine Barrier Coral Reefs, Giant Clams',
    status: 'Strict No-Extraction Marine Reserve',
  },
]

export default function MarineSanctuariesDirectory({ userLat = 13.0827, userLon = 80.2707 }) {
  const { t } = useGlobal()
  const sortedMpas = [...INDIAN_MPAS].map(mpa => {
    const distKm = Math.round(haversineKm(userLat, userLon, mpa.lat, mpa.lon))
    const distNm = Math.round(distKm * 0.539957)
    return { ...mpa, distKm, distNm }
  }).sort((a, b) => a.distKm - b.distKm)

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Landmark size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('Key Marine Protected Areas & Ramsar Reserves')}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t('Proximity audit to statutory Indian marine sanctuaries (WDPA / WII)')}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-oceanBlue font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
          {t('Sorted by Nearest')}
        </span>
      </div>

      <div className="space-y-2.5">
        {sortedMpas.map((mpa, idx) => (
          <div
            key={mpa.name}
            className={`p-3.5 rounded-2xl border transition-colors flex flex-col justify-between space-y-2 ${
              idx === 0
                ? 'bg-blue-50/40 border-oceanBlue/30 shadow-2xs'
                : 'bg-surface/70 border-borderLight hover:bg-surface'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-navy">{t(mpa.name)}</h4>
                  {idx === 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-oceanBlue text-white">
                      {t('NEAREST')}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-textMuted font-medium mt-0.5">
                  {t(mpa.state)} &bull; <span className="font-semibold text-oceanBlue">{t(mpa.type)}</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-xs font-mono font-bold text-navy">{mpa.distKm} km</span>
                <span className="text-[10px] text-textMuted block font-sans">({mpa.distNm} nm)</span>
              </div>
            </div>

            <div className="text-[11px] text-textSecond flex justify-between items-center pt-1 border-t border-borderLight/60">
              <span className="text-[10px] text-textMuted">
                {t('Key Fauna:')} <strong className="text-navy">{t(mpa.keyFauna)}</strong>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                {t(mpa.status)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
