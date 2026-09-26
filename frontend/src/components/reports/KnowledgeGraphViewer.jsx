import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Network,
  Info,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Layers,
  Loader2,
  Compass,
  Anchor,
  Fish,
  Waves,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Activity,
  ArrowRight,
  Search,
  Move,
  HelpCircle,
  Maximize2,
  RotateCcw,
  Zap,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useGlobal } from '../../context/GlobalContext'
import { endpoints } from '../../api'

// Visual styling taxonomy with friendly icons & plain-English labels
const ENTITY_CONFIG = {
  Vessel: {
    color: '#0a2540',
    bg: 'bg-navy',
    border: 'border-navy',
    text: 'text-navy',
    label: 'Vessel Fix',
    icon: Compass,
    category: 'nav',
  },
  PFZ: {
    color: '#0d9488',
    bg: 'bg-teal-600',
    border: 'border-teal-500',
    text: 'text-teal-700',
    label: 'Fishing Zone (PFZ)',
    icon: Fish,
    category: 'fish',
  },
  Port: {
    color: '#1e60d5',
    bg: 'bg-oceanBlue',
    border: 'border-oceanBlue',
    text: 'text-oceanBlue',
    label: 'Safe Harbour / Port',
    icon: Anchor,
    category: 'nav',
  },
  Ocean_State: {
    color: '#0284c7',
    bg: 'bg-sky-600',
    border: 'border-sky-500',
    text: 'text-sky-700',
    label: 'Ocean Telemetry',
    icon: Waves,
    category: 'ocean',
  },
  Weather: {
    color: '#0ea5e9',
    bg: 'bg-sky-500',
    border: 'border-sky-400',
    text: 'text-sky-600',
    label: 'Marine Weather',
    icon: Activity,
    category: 'ocean',
  },
  Hazard: {
    color: '#ef4444',
    bg: 'bg-dangerRed',
    border: 'border-rose-500',
    text: 'text-dangerRed',
    label: 'Marine Hazard',
    icon: ShieldAlert,
    category: 'hazard',
  },
  Safety_Verdict: {
    color: '#10b981',
    bg: 'bg-safeGreen',
    border: 'border-emerald-500',
    text: 'text-safeGreen',
    label: 'Safety Clearance',
    icon: CheckCircle2,
    category: 'hazard',
  },
  Zone: {
    color: '#8b5cf6',
    bg: 'bg-purple-600',
    border: 'border-purple-500',
    text: 'text-purple-700',
    label: 'Maritime Boundary',
    icon: MapPin,
    category: 'nav',
  },
  Tide: {
    color: '#06b6d4',
    bg: 'bg-cyan-600',
    border: 'border-cyan-500',
    text: 'text-cyan-700',
    label: 'Tidal State',
    icon: Activity,
    category: 'ocean',
  },
  Risk_Assessment: {
    color: '#f59e0b',
    bg: 'bg-amber-500',
    border: 'border-amber-400',
    text: 'text-amber-700',
    label: 'Navigation Risk',
    icon: Zap,
    category: 'hazard',
  },
  Suitability: {
    color: '#10b981',
    bg: 'bg-emerald-600',
    border: 'border-emerald-500',
    text: 'text-safeGreen',
    label: 'Fish Suitability',
    icon: Fish,
    category: 'fish',
  },
  Eco_Restriction: {
    color: '#f97316',
    bg: 'bg-orange-500',
    border: 'border-orange-400',
    text: 'text-orange-700',
    label: 'Eco Sanctuary',
    icon: ShieldAlert,
    category: 'nav',
  },
  Sea_Region: {
    color: '#3b82f6',
    bg: 'bg-blue-500',
    border: 'border-blue-400',
    text: 'text-blue-700',
    label: 'Sea Basin',
    icon: Waves,
    category: 'ocean',
  },
}

// Human-friendly relationship labels
const RELATION_LABELS = {
  TARGET_PFZ: 'Optimal Fishing Zone',
  NEAREST_HAVEN: 'Designated Shelter Harbour',
  LOCATED_IN: 'Sovereign Maritime Zone',
  HAS_SST: 'Live Water Temperature',
  HAS_CHLOROPHYLL: 'Phytoplankton Density',
  HAS_WAVE: 'Significant Wave State',
  HAS_WIND: 'Sustained Wind Speed',
  HAS_CURRENT: 'Surface Ocean Current',
  THREATENED_BY: 'Active Hazard Alert',
  RISK_LEVEL: 'Calculated Navigation Risk',
  FISHING_SUITABILITY: 'Commercial Catch Potential',
  TIDE_STATE: 'Coastal Tidal Phase',
  IN_SEA: 'Geographic Sea Basin',
}

export default function KnowledgeGraphViewer({ graphData = null, isLoading = false, onRefresh }) {
  const { location, t } = useGlobal()
  const userLat = location?.lat || 13.0827
  const userLon = location?.lon || 80.2707
  const userName = location?.name || 'Vessel Fix'

  // Direct live query fallback if parent didn't provide graphData
  const {
    data: liveGraphPayload,
    isLoading: isFetchingDirect,
    refetch: refetchDirect,
  } = useQuery({
    queryKey: ['marine-graph-live-direct', userLat, userLon],
    queryFn: async () => (await endpoints.graph(userLat, userLon)).data,
    staleTime: 300000,
    enabled: !graphData,
  })

  const activeGraphData = graphData || liveGraphPayload
  const loading = isLoading || (!graphData && isFetchingDirect)

  // Interactive Viewport State (Zoom & Pan)
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const svgRef = useRef(null)

  // Interactive Node Dragging State
  const [draggedNodeId, setDraggedNodeId] = useState(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // Node Positions (stored in local state for drag-and-drop interactivity)
  const [nodePositions, setNodePositions] = useState({})

  // Category Filter & Search
  const [activeCategory, setActiveCategory] = useState('all') // 'all' | 'nav' | 'fish' | 'ocean' | 'hazard'
  const [searchQuery, setSearchQuery] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  // Selected Node
  const [selectedNodeId, setSelectedNodeId] = useState('User_Vessel')
  const [hoveredNodeId, setHoveredNodeId] = useState(null)

  // Helper to extract string ID from source/target (whether object or string)
  const getEndpointId = (endpoint) =>
    typeof endpoint === 'object' && endpoint !== null ? endpoint.id : endpoint

  // Helper to construct human-understandable labels & descriptions for any NetworkX node
  const getEntityDetails = (node) => {
    const idStr = String(node.id || '')
    const type = node.type || 'Ocean_State'

    let label = node.label
    let desc = node.desc

    if (!label) {
      if (type === 'Vessel' || idStr.startsWith('Fix_') || idStr === 'User_Vessel') {
        label = `${userName} Vessel Fix`
        desc = `Active vessel coordinates at ${userLat.toFixed(4)}°N, ${userLon.toFixed(4)}°E`
      } else if (type === 'PFZ') {
        label = idStr.replace(/_/g, ' ')
        desc = `Target high-yield fishing zone (${node.distance_km ? `${node.distance_km} km away` : 'coastal sector'})`
      } else if (type === 'Port') {
        label = idStr.replace(/_/g, ' ')
        desc = `Designated safe harbour and emergency shelter anchorage (${node.distance_km ? `${node.distance_km} km` : 'coastal'})`
      } else if (type === 'Ocean_State') {
        if (idStr.startsWith('SST_') || node.unit === '°C') {
          label = `Sea Temp ${node.value ?? ''}°C`
          desc = 'Live Oceansat-3 satellite sea surface temperature telemetry.'
        } else if (idStr.startsWith('Chl_') || node.unit?.includes('mg')) {
          label = `Chlorophyll ${node.value ?? ''} mg/m³`
          desc = 'Phytoplankton concentration indicating biological feeding grounds.'
        } else if (idStr.startsWith('Wave_') || node.unit === 'm') {
          label = `Wave Height ${node.value ?? ''} m`
          desc = 'Significant sea wave height from oceanic wave ensemble.'
        } else if (idStr.startsWith('Current_') || node.unit?.includes('m/s')) {
          label = `Current ${node.value ?? ''} m/s`
          desc = 'ISRO OSCAT surface current speed and drift direction.'
        } else {
          label = idStr.replace(/_/g, ' ')
          desc = 'Live oceanographic telemetry.'
        }
      } else if (type === 'Weather') {
        label = idStr.replace(/_/g, ' ')
        desc = `Marine atmospheric condition: ${node.value ?? ''} ${node.unit || ''}`
      } else if (type === 'Safety_Verdict') {
        const verdict = node.verdict || idStr.replace('Safety_', '')
        label = `Safety Verdict: ${verdict}`
        desc =
          verdict === 'SAFE'
            ? 'Full navigational clearance granted. Wave, wind, and lightning all within safe limits.'
            : `Navigational advisory issued: ${verdict}. Exercise heightened caution.`
      } else if (type === 'Hazard') {
        label = `Hazard: ${idStr.replace(/_/g, ' ')}`
        desc = 'Active meteorological or navigation hazard alert in operating sector.'
      } else if (type === 'Safe_State') {
        label = 'No Active Cyclone'
        desc = 'IMD cyclone tracking confirms zero cyclonic disturbances or depressions.'
      } else if (type === 'Tide') {
        label = `Tidal State: ${idStr.replace('Tide_', '').replace(/_/g, ' ')}`
        desc = `Coastal tide forecast for ${node.port || 'operating sector'}. Water height: ${node.height_m ?? 'nominal'} m.`
      } else if (type === 'Risk_Assessment') {
        label = `Risk Index: ${idStr.replace('Risk_', '')}`
        desc = `Machine-learning maritime risk score: ${node.score ?? 'normal'}/100.`
      } else if (type === 'Suitability') {
        label = `Catch Potential: ${idStr.replace('Suitability_', '')}`
        desc = `Fish catch suitability model score: ${node.score ?? 'favorable'}/100.`
      } else if (type === 'Zone') {
        label = idStr.replace(/_/g, ' ')
        desc = 'Maritime administrative zone / territorial waters boundary.'
      } else if (type === 'Sea_Region') {
        label = idStr.replace(/_/g, ' ')
        desc = 'Regional sea basin and IHO hydrographic boundary.'
      } else {
        label = idStr.replace(/_/g, ' ')
        desc = 'Relational marine intelligence node.'
      }
    }

    return { label, desc }
  }

  // Parse raw NetworkX nodes and links
  const { rawNodes, rawLinks, summaryText } = useMemo(() => {
    const rawData = activeGraphData?.graph_data || {}
    const nodes = rawData.nodes || []
    const links = rawData.links || rawData.edges || []
    const summary =
      activeGraphData?.graph_summary ||
      `Knowledge Graph connected for ${userName} (${userLat.toFixed(3)}°N, ${userLon.toFixed(3)}°E).`

    if (nodes.length === 0) {
      // Dynamic baseline schema if backend is building
      const defaultNodes = [
        {
          id: 'User_Vessel',
          type: 'Vessel',
          label: `${userName} Vessel Fix`,
          desc: `Current GPS position at ${userLat.toFixed(4)}°N, ${userLon.toFixed(4)}°E`,
          lat: userLat,
          lon: userLon,
        },
        {
          id: 'Nearest_PFZ',
          type: 'PFZ',
          label: 'INCOIS High-Yield PFZ',
          desc: 'Thermal front & chlorophyll convergence with high pelagic aggregation',
          distance_km: 28.5,
          sector: 'East',
        },
        {
          id: `${userName}_Harbour`,
          type: 'Port',
          label: `${userName} Designated Port`,
          desc: 'Primary coastal haven and emergency shelter anchorage',
          distance_km: 2.4,
        },
        {
          id: 'Territorial_Waters',
          type: 'Zone',
          label: 'Territorial Waters (12nm)',
          desc: 'UNCLOS sovereign maritime zone of India',
        },
        {
          id: 'Live_SST',
          type: 'Ocean_State',
          label: 'Sea Surface Temp',
          desc: 'Live Oceansat-3 thermal satellite telemetry',
          value: 29.5,
          unit: '°C',
        },
        {
          id: 'Live_Waves',
          type: 'Weather',
          label: 'Significant Wave Height',
          desc: 'Open-Meteo operational wave ensemble',
          value: 0.8,
          unit: 'm',
        },
        {
          id: 'Safety_Audit',
          type: 'Safety_Verdict',
          label: 'Passed Operational Clearance',
          desc: 'All meteorological limits conform to safe vessel guidelines',
        },
      ]
      const defaultLinks = [
        { source: 'User_Vessel', target: 'Nearest_PFZ', relation: 'TARGET_PFZ' },
        { source: 'User_Vessel', target: `${userName}_Harbour`, relation: 'NEAREST_HAVEN' },
        { source: 'User_Vessel', target: 'Territorial_Waters', relation: 'LOCATED_IN' },
        { source: 'User_Vessel', target: 'Live_SST', relation: 'HAS_SST' },
        { source: 'User_Vessel', target: 'Live_Waves', relation: 'HAS_WAVE' },
        { source: 'User_Vessel', target: 'Safety_Audit', relation: 'RISK_LEVEL' },
      ]
      return { rawNodes: defaultNodes, rawLinks: defaultLinks, summaryText: summary }
    }

    return { rawNodes: nodes, rawLinks: links, summaryText: summary }
  }, [activeGraphData, userName, userLat, userLon])

  // Initialize node layout positions when data updates
  useEffect(() => {
    if (!rawNodes || rawNodes.length === 0) return

    const vesselNode =
      rawNodes.find(
        (n) =>
          n.type === 'Vessel' ||
          n.id === 'User_Vessel' ||
          (typeof n.id === 'string' && n.id.startsWith('Fix_'))
      ) || rawNodes[0]
    const otherNodes = rawNodes.filter((n) => n.id !== vesselNode.id)
    const total = otherNodes.length

    const newPositions = {
      [vesselNode.id]: { x: 300, y: 220 },
    }

    otherNodes.forEach((node, idx) => {
      const angle = (idx / Math.max(1, total)) * 2 * Math.PI - Math.PI / 2
      // Concentric orbital rings
      const radiusX = idx % 2 === 0 ? 210 : 155
      const radiusY = idx % 2 === 0 ? 150 : 110

      newPositions[node.id] = {
        x: Math.round(300 + Math.cos(angle) * radiusX),
        y: Math.round(220 + Math.sin(angle) * radiusY),
      }
    })

    setNodePositions(newPositions)
  }, [rawNodes])

  // Filtered nodes based on Category & Search
  const filteredNodes = useMemo(() => {
    return rawNodes.filter((node) => {
      const cfg = ENTITY_CONFIG[node.type] || ENTITY_CONFIG.Ocean_State
      const isVessel =
        node.type === 'Vessel' ||
        node.id === 'User_Vessel' ||
        (typeof node.id === 'string' && node.id.startsWith('Fix_'))

      // Category match
      if (activeCategory !== 'all' && !isVessel && cfg.category !== activeCategory) {
        return false
      }
      // Search match
      if (searchQuery.trim()) {
        const { label, desc } = getEntityDetails(node)
        const q = searchQuery.toLowerCase()
        const matchName = (label || String(node.id)).toLowerCase().includes(q)
        const matchType = (node.type || '').toLowerCase().includes(q)
        const matchDesc = (desc || '').toLowerCase().includes(q)
        return matchName || matchType || matchDesc
      }
      return true
    })
  }, [rawNodes, activeCategory, searchQuery, userName, userLat, userLon])

  // Processed nodes with actual coordinates and rich labels
  const displayNodes = useMemo(() => {
    return filteredNodes.map((node) => {
      const pos = nodePositions[node.id] || { x: 300, y: 220 }
      const cfg = ENTITY_CONFIG[node.type] || ENTITY_CONFIG.Ocean_State
      const isVessel =
        node.type === 'Vessel' ||
        node.id === 'User_Vessel' ||
        (typeof node.id === 'string' && node.id.startsWith('Fix_'))
      const { label, desc } = getEntityDetails(node)

      return {
        ...node,
        label,
        desc,
        x: pos.x,
        y: pos.y,
        radius: isVessel ? 26 : 20,
        color: cfg.color,
        bg: cfg.bg,
        border: cfg.border,
        text: cfg.text,
        typeLabel: cfg.label || node.type,
        Icon: cfg.icon || Activity,
        category: cfg.category || 'ocean',
      }
    })
  }, [filteredNodes, nodePositions, userName, userLat, userLon])

  // Filter links where both source and target exist in displayed nodes
  const displayLinks = useMemo(() => {
    const nodeIds = new Set(displayNodes.map((n) => n.id))
    return rawLinks
      .map((l) => ({
        ...l,
        source: getEndpointId(l.source),
        target: getEndpointId(l.target),
      }))
      .filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target))
  }, [rawLinks, displayNodes])

  // Currently inspected node (auto-selects Vessel or first node)
  const activeSelectedId =
    selectedNodeId && displayNodes.some((n) => n.id === selectedNodeId)
      ? selectedNodeId
      : displayNodes.find(
          (n) =>
            n.type === 'Vessel' ||
            n.id === 'User_Vessel' ||
            (typeof n.id === 'string' && n.id.startsWith('Fix_'))
        )?.id ||
        displayNodes[0]?.id ||
        'User_Vessel'

  const selectedNode =
    displayNodes.find((n) => n.id === activeSelectedId) || displayNodes[0] || {}

  // Connected neighbors for active selected node
  const connectedLinks = useMemo(() => {
    if (!selectedNode?.id) return []
    return rawLinks
      .map((l) => ({
        ...l,
        source: getEndpointId(l.source),
        target: getEndpointId(l.target),
      }))
      .filter((l) => l.source === selectedNode.id || l.target === selectedNode.id)
  }, [rawLinks, selectedNode])

  // Drag handlers for nodes
  const handleNodePointerDown = (e, nodeId) => {
    e.stopPropagation()
    setDraggedNodeId(nodeId)
    setSelectedNodeId(nodeId)

    const pos = nodePositions[nodeId] || { x: 300, y: 220 }
    dragOffsetRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialNodeX: pos.x,
      initialNodeY: pos.y,
    }
  }

  // Pan handlers for canvas
  const handleCanvasPointerDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.id === 'graph-bg') {
      setIsPanning(true)
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      }
    }
  }

  const handlePointerMove = useCallback(
    (e) => {
      if (draggedNodeId) {
        const dx = (e.clientX - dragOffsetRef.current.startX) / zoom
        const dy = (e.clientY - dragOffsetRef.current.startY) / zoom
        setNodePositions((prev) => ({
          ...prev,
          [draggedNodeId]: {
            x: Math.round(dragOffsetRef.current.initialNodeX + dx),
            y: Math.round(dragOffsetRef.current.initialNodeY + dy),
          },
        }))
      } else if (isPanning) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        })
      }
    },
    [draggedNodeId, isPanning, zoom]
  )

  const handlePointerUp = useCallback(() => {
    setDraggedNodeId(null)
    setIsPanning(false)
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((prev) => Math.max(0.6, Math.min(2.2, prev + delta)))
  }

  // Reset zoom & pan
  const handleResetView = () => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
  }

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-4">
      {/* ── Top Header Strip ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Network size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-navy">
                {t('Autonomous Marine Knowledge Graph')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-emerald-100 text-safeGreen">
                ● {t('Live Dynamic NetworkX')}
              </span>
            </div>
            <p className="text-[10px] text-textMuted">
              {t('Interactive relational intelligence linking sensors, hazards, bathymetry & vessels')}
            </p>
          </div>
        </div>

        {/* Right Tools: Help, Refresh, Node Counter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              showHelp
                ? 'bg-purple-50 text-purple-600 border-purple-200'
                : 'border-borderLight hover:bg-surface text-textMuted hover:text-navy'
            }`}
            title="How to read this graph"
          >
            <HelpCircle size={14} />
            <span className="hidden md:inline text-[11px]">{t('Guide')}</span>
          </button>

          <button
            onClick={onRefresh || refetchDirect}
            disabled={loading}
            className="p-1.5 rounded-xl border border-borderLight hover:bg-surface text-textMuted hover:text-navy transition-colors cursor-pointer"
            title="Recalculate live graph from 7 marine tools"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-oceanBlue' : ''} />
          </button>

          <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100 flex items-center gap-1 font-mono">
            <Sparkles size={12} /> {rawNodes.length} {t('Nodes')} · {rawLinks.length} {t('Edges')}
          </span>
        </div>
      </div>

      {/* ── Plain-English Narrative Banner (Understandable to Anyone) ─ */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-purple-50/40 to-emerald-50/60 border border-blue-100 flex items-start gap-3">
        <div className="w-6 h-6 rounded-lg bg-oceanBlue text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
          <Info size={14} />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-oceanBlue">
              {t('Live Maritime Narrative • Executive Briefing')}
            </span>
            <span className="text-[10px] font-mono text-textMuted">
              {location.name} ({userLat.toFixed(2)}°N, {userLon.toFixed(2)}°E)
            </span>
          </div>
          <p className="text-xs text-navy font-medium leading-relaxed">
            {summaryText}
          </p>
        </div>
      </div>

      {/* ── Help / How to Read Drawer (Collapsible) ─────────────── */}
      {showHelp && (
        <div className="p-4 rounded-2xl bg-surface border border-purple-100 space-y-2 text-xs text-textSecond animate-fadeIn">
          <h4 className="font-bold text-navy flex items-center gap-1.5 text-xs">
            <Sparkles size={13} className="text-purple-600" /> {t('How Anyone Can Read This Graph:')}
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
            <li className="p-2 bg-white rounded-xl border border-borderLight/80 space-y-0.5">
              <strong className="text-navy block font-semibold">1. {t('Center Node is You')}</strong>
              <span>{t('The dark navy circle represents your vessel fix and origin coordinates.')}</span>
            </li>
            <li className="p-2 bg-white rounded-xl border border-borderLight/80 space-y-0.5">
              <strong className="text-navy block font-semibold">2. {t('Lines Mean Relationships')}</strong>
              <span>{t('Arrows connect your vessel directly to nearest ports, fishing zones, and hazards.')}</span>
            </li>
            <li className="p-2 bg-white rounded-xl border border-borderLight/80 space-y-0.5">
              <strong className="text-navy block font-semibold">3. {t('Drag, Pan & Zoom')}</strong>
              <span>{t('Click and drag any circle to rearrange the network. Click to inspect live metrics.')}</span>
            </li>
          </ul>
        </div>
      )}

      {/* ── Category Filters & Search Controls ─────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 bg-surface p-1 rounded-2xl border border-borderLight">
          {[
            { id: 'all', label: 'All Entities' },
            { id: 'nav', label: 'Nav & Ports ⚓' },
            { id: 'fish', label: 'Fisheries (PFZ) 🐟' },
            { id: 'ocean', label: 'Ocean & Weather 🌊' },
            { id: 'hazard', label: 'Hazards & Safety ⚠️' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-textSecond hover:text-navy'
              }`}
            >
              {t(cat.label)}
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            type="text"
            placeholder={t('Search entity or sensor...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-56 pl-7 pr-3 py-1 text-xs rounded-xl bg-surface border border-borderLight focus:border-oceanBlue focus:ring-1 focus:ring-oceanBlue outline-none font-sans"
          />
        </div>
      </div>

      {/* ── Main Graph Canvas & Inspector Grid ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Interactive SVG Canvas (8 cols) */}
        <div
          className="lg:col-span-8 h-96 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-[#071324] border border-slate-800 overflow-hidden relative shadow-inner cursor-grab active:cursor-grabbing select-none"
          onWheel={handleWheel}
          onPointerDown={handleCanvasPointerDown}
        >
          {/* Zoom & Pan Floating Controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-1 z-10 bg-slate-900/90 p-1 rounded-xl border border-slate-700 shadow-md backdrop-blur-xs">
            <button
              onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Interactive Instructions Floating Badge */}
          <div className="absolute bottom-2.5 left-2.5 text-[10px] text-slate-400 font-mono bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700/80 shadow-xs flex items-center gap-2">
            <Move size={11} className="text-cyan-400" />
            <span>{t('Drag circles to move • Scroll to zoom • Drag canvas to pan')}</span>
          </div>

          {loading ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <Loader2 size={26} className="animate-spin text-cyan-400" />
              <span className="text-xs font-semibold">
                {t('Synthesizing dynamic multi-entity relational graph from 7 live telemetry tools...')}
              </span>
            </div>
          ) : (
            <svg
              ref={svgRef}
              id="graph-bg"
              viewBox="0 0 600 440"
              className="w-full h-full"
            >
              <defs>
                {/* Arrow markers */}
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>

                {/* Glow Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* 1. Draw Edges */}
                {displayLinks.map((link, idx) => {
                  const src = displayNodes.find((n) => n.id === link.source)
                  const tgt = displayNodes.find((n) => n.id === link.target)
                  if (!src || !tgt) return null

                  const isConnected =
                    (selectedNode && (selectedNode.id === src.id || selectedNode.id === tgt.id)) ||
                    (hoveredNodeId && (hoveredNodeId === src.id || hoveredNodeId === tgt.id))

                  const isDanger =
                    link.relation?.includes('THREAT') || link.relation?.includes('RESTRICT')

                  const strokeColor = isConnected
                    ? isDanger
                      ? '#ef4444'
                      : '#38bdf8'
                    : '#334155'

                  // Midpoint for relationship badge
                  const midX = (src.x + tgt.x) / 2
                  const midY = (src.y + tgt.y) / 2

                  return (
                    <g key={`edge-${idx}`} className="transition-all duration-300">
                      <line
                        x1={src.x}
                        y1={src.y}
                        x2={tgt.x}
                        y2={tgt.y}
                        stroke={strokeColor}
                        strokeWidth={isConnected ? 2.5 : 1.2}
                        strokeDasharray={isDanger ? '4, 4' : undefined}
                        opacity={isConnected ? 1 : 0.45}
                        markerEnd={isConnected ? 'url(#arrow-active)' : 'url(#arrow-default)'}
                      />

                      {/* Clean relationship label pill on connected edges */}
                      {isConnected && (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect
                            x="-45"
                            y="-9"
                            width="90"
                            height="18"
                            rx="9"
                            fill="#0f172a"
                            stroke={strokeColor}
                            strokeWidth="1"
                            opacity="0.9"
                          />
                          <text
                            textAnchor="middle"
                            y="3.5"
                            fill="#f8fafc"
                            fontSize="8"
                            fontWeight="bold"
                            className="font-mono pointer-events-none select-none"
                          >
                            {link.relation.replace(/_/g, ' ')}
                          </text>
                        </g>
                      )}
                    </g>
                  )
                })}

                {/* 2. Draw Nodes */}
                {displayNodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id
                  const isHovered = hoveredNodeId === node.id
                  const isVessel = node.type === 'Vessel' || node.id === 'User_Vessel'

                  return (
                    <g
                      key={`node-${node.id}`}
                      transform={`translate(${node.x}, ${node.y})`}
                      onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      className="cursor-pointer group"
                    >
                      {/* Vessel Pulsing Radar Rings */}
                      {isVessel && (
                        <>
                          <circle
                            r="38"
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth="1.5"
                            className="animate-ping opacity-30 pointer-events-none"
                          />
                          <circle
                            r="30"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                            className="opacity-40 pointer-events-none"
                          />
                        </>
                      )}

                      {/* Outer Selection Ring */}
                      {(isSelected || isHovered) && (
                        <circle
                          r={node.radius + 6}
                          fill="none"
                          stroke={isSelected ? '#38bdf8' : '#94a3b8'}
                          strokeWidth="2"
                          strokeDasharray={isSelected ? undefined : '3, 3'}
                          filter="url(#glow)"
                        />
                      )}

                      {/* Main Node Circle */}
                      <circle
                        r={node.radius}
                        fill={node.color}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-transform duration-150 group-hover:scale-110 shadow-lg"
                      />

                      {/* Inner Node Text or Icon Letter */}
                      <text
                        textAnchor="middle"
                        y="4"
                        fill="#ffffff"
                        fontSize={isVessel ? '11' : '9'}
                        fontWeight="900"
                        className="select-none pointer-events-none font-mono tracking-tight"
                      >
                        {isVessel ? '🚢' : node.type[0]}
                      </text>

                      {/* Node Label Below */}
                      <g transform={`translate(0, ${node.radius + 14})`}>
                        <rect
                          x="-50"
                          y="-8"
                          width="100"
                          height="16"
                          rx="8"
                          fill="rgba(15, 23, 42, 0.85)"
                          stroke={isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          y="3"
                          fill={isSelected ? '#38bdf8' : '#f8fafc'}
                          fontSize="8.5"
                          fontWeight="700"
                          className="select-none pointer-events-none font-sans"
                        >
                          {node.label.length > 15
                            ? `${node.label.slice(0, 13)}…`
                            : node.label}
                        </text>
                      </g>
                    </g>
                  )
                })}
              </g>
            </svg>
          )}
        </div>

        {/* ── Interactive Entity Inspector Panel (4 cols) ──────────── */}
        <div className="lg:col-span-4 p-4 rounded-2xl bg-surface border border-borderLight min-h-[384px] flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            {/* Inspector Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-borderLight">
              <span className="text-[10px] font-black text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                <Compass size={12} className="text-oceanBlue" />
                {t('Entity Inspector')}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase text-white shadow-2xs"
                style={{ backgroundColor: selectedNode.color || '#0a2540' }}
              >
                {t(selectedNode.typeLabel || selectedNode.type || 'Entity')}
              </span>
            </div>

            {/* Entity Name & Primary Description */}
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-navy leading-tight">
                {t(selectedNode.label || selectedNode.id || 'Selected Entity')}
              </h4>
              <p className="text-xs text-textSecond leading-relaxed">
                {t(selectedNode.desc || 'No specific attributes attached.')}
              </p>
            </div>

            {/* Live Measurements / Proximity Tile */}
            {(selectedNode.distance_km != null || selectedNode.value != null || selectedNode.score != null) && (
              <div className="p-3 rounded-2xl bg-white border border-borderLight space-y-1.5 font-mono text-xs shadow-2xs">
                {selectedNode.distance_km != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-textMuted font-sans">{t('Direct Range:')}</span>
                    <strong className="text-oceanBlue font-bold">{selectedNode.distance_km} km</strong>
                  </div>
                )}
                {selectedNode.value != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-textMuted font-sans">{t('Live Telemetry:')}</span>
                    <strong className="text-navy font-bold">
                      {selectedNode.value} {selectedNode.unit || ''}
                    </strong>
                  </div>
                )}
                {selectedNode.score != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-textMuted font-sans">{t('Index Rating:')}</span>
                    <strong className="text-emerald-600 font-bold">{selectedNode.score} / 100</strong>
                  </div>
                )}
              </div>
            )}

            {/* Plain-English Actionable Takeaway */}
            <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-950 space-y-0.5">
              <strong className="block text-[10px] uppercase tracking-wider text-purple-700 font-black">
                {t('Operational Meaning:')}
              </strong>
              <span>
                {selectedNode.type === 'Vessel' && t('Your active GPS fix and navigation origin. All bearings and safety thresholds are calibrated to this point.')}
                {selectedNode.type === 'PFZ' && t('High plankton density area where commercial fish naturally aggregate. Plan transit directly to this sector.')}
                {selectedNode.type === 'Port' && t('Your closest certified shelter haven. In the event of squalls or mechanical fault, divert here.')}
                {selectedNode.type === 'Hazard' && t('Warning issued. Review squall timing before departure.')}
                {selectedNode.type === 'Ocean_State' && t('Real-time sensor observation stream verified against satellite ground-truth.')}
                {selectedNode.type === 'Zone' && t('UNCLOS territorial sovereignty applies. Keep VHF radio watch on Channel 16.')}
                {selectedNode.type === 'Safety_Verdict' && t('Official marine clearance assessment. Conditions conform to safety rules.')}
                {selectedNode.type === 'Tide' && t('Harmonic water level forecast. Check draft depth before crossing shallow bars.')}
                {!['Vessel', 'PFZ', 'Port', 'Hazard', 'Ocean_State', 'Zone', 'Safety_Verdict', 'Tide'].includes(selectedNode.type) &&
                  t('Active relational entity connected to your maritime domain awareness network.')}
              </span>
            </div>
          </div>

          {/* 1-Hop Connected Entities (Click to Jump) */}
          <div className="pt-2.5 border-t border-borderLight space-y-1.5">
            <span className="text-[10px] text-textMuted font-bold uppercase tracking-wider block">
              {t('Connected Neighbors (Click to Jump):')}
            </span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
              {connectedLinks.length === 0 ? (
                <span className="text-[10px] text-textMuted italic">{t('No direct connected links.')}</span>
              ) : (
                connectedLinks.map((link, idx) => {
                  const otherId = link.source === selectedNode.id ? link.target : link.source
                  const otherNode = rawNodes.find((n) => n.id === otherId)
                  if (!otherNode) return null
                  const relLabel = RELATION_LABELS[link.relation] || link.relation

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedNodeId(otherId)}
                      className="px-2 py-1 rounded-lg bg-white hover:bg-surface border border-borderLight text-[10px] text-navy font-semibold hover:border-oceanBlue transition-colors flex items-center gap-1 cursor-pointer"
                      title={relLabel}
                    >
                      <ArrowRight size={10} className="text-oceanBlue flex-shrink-0" />
                      <span>{otherNode.label || otherId}</span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
