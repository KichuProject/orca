import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CloudLightning, Search, X, ChevronDown, Check, Wind, Calendar, Filter } from 'lucide-react'
import client from '../../api/client'
import { useGlobal } from '../../context/GlobalContext'

export default function CycloneSelector({
  selectedCyclone,
  onSelectCyclone,
}) {
  const { t } = useGlobal()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('named') // 'named' | 'all'

  // Fetch full cyclone GeoJSON dataset
  const { data: geoData, isLoading } = useQuery({
    queryKey: ['geo-layer', 'cyclone_tracks'],
    queryFn: async () => {
      const res = await client.get('/api/layer/cyclone_tracks')
      return res.data
    },
    staleTime: Infinity,
  })

  // Parse all 466 storms from GeoJSON features
  const { namedCyclones, allStorms } = useMemo(() => {
    if (!geoData?.features) return { namedCyclones: [], allStorms: [] }

    const namedMap = new Map()
    const all = []

    geoData.features.forEach((f, idx) => {
      const p = f.properties || {}
      const rawName = (p.name || p.NAME || '').trim()
      const sid = p.sid || p.SID || `STORM-${idx}`
      const year = Number(p.year || p.SEASON || 0) || ''
      const cat = p.category || p.CATEGORY || 'Cyclonic Storm'
      const wind = Number(p.max_wind_kt || p.wind_kt || 0)

      const stormObj = {
        sid,
        name: rawName && rawName.toUpperCase() !== 'UNNAMED' ? rawName.toUpperCase() : `UNNAMED ${year}`,
        cleanName: rawName && rawName.toUpperCase() !== 'UNNAMED' ? rawName.toUpperCase() : `Storm ${sid}`,
        displayName: rawName && rawName.toUpperCase() !== 'UNNAMED' ? rawName.toUpperCase() : `Depression ${sid}`,
        year,
        cat,
        wind,
        isNamed: Boolean(rawName && rawName.toUpperCase() !== 'UNNAMED'),
        basin: 'North Indian Ocean',
      }

      all.push(stormObj)

      if (stormObj.isNamed) {
        // De-duplicate named storms by name + year (keeping highest wind if duplicate track)
        const key = `${stormObj.name}-${stormObj.year}`
        if (!namedMap.has(key) || (namedMap.get(key).wind < stormObj.wind)) {
          namedMap.set(key, stormObj)
        }
      }
    })

    const namedList = Array.from(namedMap.values()).sort((a, b) => {
      const yDiff = (Number(b.year) || 0) - (Number(a.year) || 0)
      if (yDiff !== 0) return yDiff
      return a.name.localeCompare(b.name)
    })

    const allList = all.sort((a, b) => {
      const yDiff = (Number(b.year) || 0) - (Number(a.year) || 0)
      if (yDiff !== 0) return yDiff
      return (b.wind || 0) - (a.wind || 0)
    })

    return { namedCyclones: namedList, allStorms: allList }
  }, [geoData])

  // Filter based on active tab and search query
  const filteredList = useMemo(() => {
    const list = activeTab === 'named' ? namedCyclones : allStorms
    if (!search.trim()) return list
    const q = search.toLowerCase().trim()
    return list.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.cleanName && c.cleanName.toLowerCase().includes(q)) ||
      (c.sid && c.sid.toLowerCase().includes(q)) ||
      (c.year && String(c.year).includes(q)) ||
      (c.cat && c.cat.toLowerCase().includes(q))
    )
  }, [activeTab, namedCyclones, allStorms, search])

  const activeLabel = selectedCyclone
    ? `${selectedCyclone.name || selectedCyclone.displayName} (${selectedCyclone.year})`
    : t("Select Cyclone Track")

  return (
    <div className="relative pointer-events-auto">
      {/* Trigger pill */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl shadow-md border text-xs font-bold transition-all cursor-pointer ${
          selectedCyclone
            ? 'bg-dangerRed text-white border-dangerRed shadow-lg'
            : 'bg-white text-navy border-borderLight hover:bg-slate-50'
        }`}
        style={!selectedCyclone ? { backgroundColor: '#ffffff' } : undefined}
        title="Browse and select from all historical cyclone paths"
      >
        <CloudLightning size={14} className={selectedCyclone ? 'text-white' : 'text-dangerRed'} />
        <span className="truncate max-w-[130px]">
          {selectedCyclone ? selectedCyclone.name : t('Historical Cyclones')}
        </span>
        {selectedCyclone && (
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/20 text-white font-mono">
            {selectedCyclone.year}
          </span>
        )}
        <ChevronDown size={12} className={selectedCyclone ? 'text-white/80' : 'text-textMuted'} />
      </button>

      {/* Dropdown panel: 100% Solid Opaque White (no backdrop-blur / no map bleed-through) */}
      {open && (
        <div 
          className="absolute right-0 top-10 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-borderLight p-3.5 z-50 animate-slideIn"
          style={{ backgroundColor: '#ffffff' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-borderLight px-1">
            <div className="flex items-center gap-1.5">
              <CloudLightning size={14} className="text-dangerRed" />
              <span className="text-xs font-bold text-navy">
                {t('Historical Cyclone Registry')}
              </span>
            </div>
            {selectedCyclone ? (
              <button
                onClick={() => {
                  onSelectCyclone(null)
                  setOpen(false)
                }}
                className="text-[10px] text-dangerRed font-bold hover:underline"
              >
                {t('Clear Track')}
              </button>
            ) : (
              <span className="text-[10px] font-mono text-slate-500 font-medium">
                {geoData ? `${namedCyclones.length} ${t('Named')} / ${allStorms.length} ${t('Total')}` : t('Loading...')}
              </span>
            )}
          </div>

          {/* Tab selector */}
          <div className="grid grid-cols-2 gap-1 my-2 p-1 bg-slate-100 rounded-xl text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab('named')}
              className={`py-1 rounded-lg transition-all ${
                activeTab === 'named'
                  ? 'bg-white text-dangerRed shadow-xs font-bold'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              {t('Named Cyclones')} ({namedCyclones.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-1 rounded-lg transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-dangerRed shadow-xs font-bold'
                  : 'text-slate-600 hover:text-navy'
              }`}
            >
              {t('All Storm Tracks')} ({allStorms.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('Search by name (e.g. Michaung, Fani, 2024)...')}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-borderLight bg-slate-50 text-navy placeholder:text-slate-400 focus:outline-none focus:border-dangerRed focus:bg-white"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Storm list */}
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-slate-500">
                {t("Loading all 466 cyclone tracks...")}
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No cyclones found matching "{search}"
              </div>
            ) : (
              filteredList.map((c, i) => {
                const isSelected = selectedCyclone && (
                  (c.sid && selectedCyclone.sid === c.sid) ||
                  (selectedCyclone.name === c.name && selectedCyclone.year === c.year)
                )

                return (
                  <button
                    key={`${c.sid || c.name}-${c.year}-${i}`}
                    onClick={() => {
                      onSelectCyclone(c)
                      setOpen(false)
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-dangerRed/10 text-dangerRed font-bold border border-dangerRed/20'
                        : 'hover:bg-slate-50 text-slate-700 hover:text-navy'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-navy">
                          {c.isNamed ? c.name : c.displayName}
                        </span>
                        {c.year && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-mono">
                            {c.year}
                          </span>
                        )}
                        {c.wind > 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 font-mono flex items-center gap-0.5 border border-amber-200/50">
                            <Wind size={9} />
                            <span>{c.wind} kt</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                        {c.cat || 'Cyclonic Storm'} {c.sid ? `• SID: ${c.sid}` : ''}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={14} className="text-dangerRed flex-shrink-0 ml-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer note */}
          <div className="pt-2 mt-2 border-t border-borderLight flex items-center justify-between text-[9px] text-slate-500 font-mono bg-white">
            <span>{t("NOAA NCEI IBTrACS Database")}</span>
            <span>{t("Click to plot track")}</span>
          </div>
        </div>
      )}
    </div>
  )
}
