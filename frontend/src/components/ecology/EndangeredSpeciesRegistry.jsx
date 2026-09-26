import React, { useState } from 'react'
import { Shield, AlertCircle, Info, ChevronRight, Anchor, HeartHandshake } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export const PROTECTED_SPECIES = [
  {
    name: 'Dugong (Sea Cow)',
    scientific: 'Dugong dugon',
    status: 'Schedule I / Vulnerable',
    iucn: 'VU',
    badgeColor: 'bg-amber-100 text-amber-800',
    habitat: 'Shallow seagrass meadows (<12m depth)',
    hotspots: 'Gulf of Mannar, Palk Bay, Andaman Islands',
    advisory: 'Strict speed restriction <8 knots in seagrass beds. Maintain lookouts to prevent propeller strikes.',
  },
  {
    name: 'Olive Ridley Sea Turtle',
    scientific: 'Lepidochelys olivacea',
    status: 'Schedule I / Vulnerable',
    iucn: 'VU',
    badgeColor: 'bg-amber-100 text-amber-800',
    habitat: 'Coastal waters & offshore breeding aggregations',
    hotspots: 'Gahirmatha Marine Sanctuary, Rushikulya, A&N',
    advisory: 'Mandatory Turtle Excluder Devices (TED) on trawl nets. No gillnetting within 20km offshore during Arribada (Nov–May).',
  },
  {
    name: 'Whale Shark',
    scientific: 'Rhincodon typus',
    status: 'Schedule I / Endangered',
    iucn: 'EN',
    badgeColor: 'bg-red-100 text-dangerRed',
    habitat: 'Surface to epipelagic oceanic waters (0–100m)',
    hotspots: 'Saurashtra Gujarat Coast, Lakshadweep',
    advisory: 'Maintain 50-meter vessel standoff distance. Filter feeder frequenting surface waters.',
  },
  {
    name: 'Indo-Pacific Humpback Dolphin',
    scientific: 'Sousa chinensis',
    status: 'Schedule I / Vulnerable',
    iucn: 'VU',
    badgeColor: 'bg-amber-100 text-amber-800',
    habitat: 'Estuarine mouths & shallow coastal waters (<20m)',
    hotspots: 'Sundarbans, Chilika Lagoon, Malvan Coast',
    advisory: 'Minimise active sonar emissions in estuarine channels to avoid echolocation disruption.',
  },
]

export default function EndangeredSpeciesRegistry({ locationName = 'Chennai' }) {
  const { t } = useGlobal()
  const [selectedSpecies, setSelectedSpecies] = useState(PROTECTED_SPECIES[0])

  const isLocallyRelevant = (s) => {
    const loc = (locationName || '').toLowerCase()
    const hot = s.hotspots.toLowerCase()
    if (loc.includes('chennai') || loc.includes('tamil nadu')) {
      return hot.includes('mannar') || hot.includes('palk') || hot.includes('a&n')
    }
    if (loc.includes('kochi') || loc.includes('kerala')) {
      return hot.includes('malvan') || hot.includes('mannar')
    }
    if (loc.includes('mumbai') || loc.includes('maharashtra') || loc.includes('gujarat')) {
      return hot.includes('saurashtra') || hot.includes('malvan')
    }
    if (loc.includes('vizag') || loc.includes('andhra') || loc.includes('odisha')) {
      return hot.includes('gahirmatha') || hot.includes('rushikulya') || hot.includes('chilika')
    }
    return false
  }

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Shield size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('Endangered Marine Megafauna Registry (OBIS / WII)')}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t('Wildlife Protection Act (1972) Schedule I species & strike mitigation rules')}
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 flex items-center gap-1 self-start sm:self-auto">
          <HeartHandshake size={12} /> {t('Biodiversity Safeguards Active')}
        </span>
      </div>

      {/* Species Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROTECTED_SPECIES.map(s => {
          const isSelected = selectedSpecies.name === s.name
          const locallyActive = isLocallyRelevant(s)

          return (
            <div
              key={s.name}
              onClick={() => setSelectedSpecies(s)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                isSelected
                  ? 'bg-blue-50/50 border-oceanBlue ring-2 ring-oceanBlue/20 shadow-xs'
                  : 'bg-surface/70 hover:bg-surface border-borderLight'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-navy">{t(s.name)}</h4>
                    {locallyActive && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                        {t('Sector Alert')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-textMuted italic">{s.scientific}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${s.badgeColor}`}>
                  {s.iucn} &bull; {s.status.split('/')[0]}
                </span>
              </div>

              <div className="text-[11px] text-textSecond space-y-1">
                <div>
                  <strong className="text-navy">{t('Habitat:')}</strong> {t(s.habitat)}
                </div>
                <div>
                  <strong className="text-navy">{t('Key Zones:')}</strong> {t(s.hotspots)}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-borderLight/80 text-[10px] text-textSecond leading-relaxed">
                <strong className="text-oceanBlue block mb-0.5">{t('Navigational Advisory:')}</strong>
                {t(s.advisory)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
