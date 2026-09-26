import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Layers } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function Legend({
  activeLayers = [],
  layerConfigs = [],
  selectedCyclone = null,
}) {
  const { t } = useGlobal()
  const [collapsed, setCollapsed] = useState(false)

  const activeConfigs = layerConfigs.filter(
    l => activeLayers.includes(l.id) && l.id !== 'cyclone_tracks'
  )

  const totalCount = activeConfigs.length + (selectedCyclone ? 1 : 0)

  if (totalCount === 0) return null

  return (
    <div className="bg-white/95 backdrop-blur rounded-2xl shadow-md border border-borderLight p-3 w-56 text-xs text-navy pointer-events-auto transition-all">
      <div
        className="flex items-center justify-between cursor-pointer select-none font-bold pb-1.5 border-b border-borderLight"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-1.5 text-oceanBlue">
          <Layers size={14} />
          <span>{t('Active Layers')} ({totalCount})</span>
        </div>
        <button className="text-textMuted hover:text-navy">
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {/* Selected Cyclone Entry */}
          {selectedCyclone && (
            <div className="flex items-center gap-2 bg-red-50/80 p-1.5 rounded-xl border border-red-200">
              <span className="text-xs">🌀</span>
              <div className="min-w-0 flex-1 truncate font-bold text-dangerRed">
                Cyclone {selectedCyclone.name} ({selectedCyclone.year})
              </div>
            </div>
          )}

          {/* Standard Vector Layers */}
          {activeConfigs.map(layer => (
            <div key={layer.id} className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0 border border-black/10 shadow-2xs"
                style={{ backgroundColor: layer.color }}
              />
              <div className="min-w-0 flex-1 truncate font-medium text-textSecond" title={t(layer.name)}>
                {t(layer.name)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
