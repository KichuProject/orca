import React, { useState } from 'react'
import { Layers, X, Sliders, Eye, EyeOff, Search, Check } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function LayerManager({
  layers = [],
  activeLayers = [],
  opacities = {},
  onToggleLayer,
  onChangeOpacity,
  onClose,
}) {
  const { t } = useGlobal()
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const rawCategories = Array.from(new Set(layers.map(l => l.category || 'General')))
  const categories = ['All', ...rawCategories]

  const filtered = layers.filter(l => {
    const matchesCategory = selectedCategory === 'All' || (l.category || 'General') === selectedCategory
    const q = filterQuery.toLowerCase().trim()
    const transName = t(l.name).toLowerCase()
    const transDesc = l.description ? t(l.description).toLowerCase() : ''
    const transCat = l.category ? t(l.category).toLowerCase() : ''
    const matchesQuery = !q ||
      l.name.toLowerCase().includes(q) ||
      transName.includes(q) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      transDesc.includes(q) ||
      (l.category && l.category.toLowerCase().includes(q)) ||
      transCat.includes(q)
    return matchesCategory && matchesQuery
  })

  const activeCount = activeLayers.length

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-borderLight w-80 sm:w-88 max-w-[calc(100vw-2rem)] h-full flex flex-col pointer-events-auto overflow-hidden animate-slideIn">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-borderLight bg-surface/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-oceanBlue/10 flex items-center justify-center text-oceanBlue flex-shrink-0">
            <Layers size={15} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-navy leading-none">{t('GIS Layer Manager')}</h3>
            <p className="text-[10px] text-textMuted mt-0.5">
              <span className="font-semibold text-oceanBlue">{activeCount}</span> {t('of')} {layers.length} {t('active')}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-surfaceMid text-textMuted hover:text-navy transition-colors cursor-pointer"
            title={t('Close Layer Manager')}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-borderLight bg-white flex-shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            value={filterQuery}
            onChange={e => setFilterQuery(e.target.value)}
            placeholder={t('Filter GIS layers...')}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-borderLight bg-surface focus:outline-none focus:border-oceanBlue focus:bg-white transition-colors"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-navy cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category Pills (Horizontal Scrollable Filter) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 no-scrollbar">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-oceanBlue text-white shadow-xs'
                    : 'bg-slate-100 text-textSecond hover:bg-slate-200'
                }`}
              >
                {t(cat)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Layer List Grouped by Category */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 min-h-0 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-textMuted">
            {t('No matching GIS layers found')}
          </div>
        ) : (
          rawCategories.map(cat => {
            if (selectedCategory !== 'All' && selectedCategory !== cat) return null
            const catLayers = filtered.filter(l => (l.category || 'General') === cat)
            if (catLayers.length === 0) return null

            return (
              <div key={cat} className="space-y-1.5">
                <div className="text-[10px] font-black text-navy/70 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>{t(cat)}</span>
                  <span className="text-[9px] font-mono text-textMuted lowercase font-normal">
                    {catLayers.filter(l => activeLayers.includes(l.id)).length}/{catLayers.length} {t('active')}
                  </span>
                </div>
                <div className="space-y-2">
                  {catLayers.map(l => {
                    const isActive = activeLayers.includes(l.id)
                    const opacity = opacities[l.id] ?? l.defaultOpacity ?? 0.7

                    return (
                      <div
                        key={l.id}
                        className={`p-2.5 rounded-2xl border transition-all ${
                          isActive
                            ? 'bg-blue-50/50 border-oceanBlue/40 shadow-xs ring-1 ring-oceanBlue/10'
                            : 'bg-surface/60 border-borderLight/80 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2 cursor-pointer select-none flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => onToggleLayer(l.id)}
                              className="mt-0.5 rounded text-oceanBlue accent-oceanBlue cursor-pointer flex-shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: l.color }}
                                />
                                <span className={`text-xs truncate ${isActive ? 'font-bold text-navy' : 'font-medium text-textSecond'}`}>
                                  {t(l.name)}
                                </span>
                              </div>
                              {l.description && (
                                <p className="text-[10px] text-textMuted leading-tight mt-0.5 line-clamp-2">
                                  {t(l.description)}
                                </p>
                              )}
                            </div>
                          </label>

                          <button
                            onClick={() => onToggleLayer(l.id)}
                            className="text-textMuted hover:text-navy cursor-pointer p-0.5 flex-shrink-0"
                            title={isActive ? t('Hide layer') : t('Show layer')}
                          >
                            {isActive ? <Eye size={14} className="text-oceanBlue" /> : <EyeOff size={14} />}
                          </button>
                        </div>

                        {/* Opacity Slider (visible when active) */}
                        {isActive && (
                          <div className="mt-2 pt-2 border-t border-borderLight/60 flex items-center gap-2 px-1">
                            <Sliders size={11} className="text-textMuted flex-shrink-0" />
                            <span className="text-[10px] text-textMuted font-medium w-10 font-mono">
                              {Math.round(opacity * 100)}%
                            </span>
                            <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.05"
                              value={opacity}
                              onChange={e => onChangeOpacity(l.id, parseFloat(e.target.value))}
                              className="flex-1 h-1 bg-borderLight rounded-lg appearance-none cursor-pointer accent-oceanBlue"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

