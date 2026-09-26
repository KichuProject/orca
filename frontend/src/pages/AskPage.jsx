import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useGlobal, VESSEL_PROFILES } from '../context/GlobalContext'
import { sendChatMessage, streamChatMessage } from '../services/chatService'
import { parseORCAResponse } from '../services/parseResponse'
import AgentLiveLoading from '../components/chat/AgentLiveLoading'
import AgentPipelineTrace from '../components/chat/AgentPipelineTrace'
import Orca3DMascot from '../components/mascot/Orca3DMascot'
import MapCanvas from '../components/map/MapCanvas'
import client from '../api/client'
import { useSpeech } from '../hooks/useSpeech'
import {
  Send, Mic, MicOff, Bot, Check, Copy, RotateCcw,
  MapPin, Anchor, ShieldAlert, User, Volume2, VolumeX,
  Zap, ChevronDown, ChevronUp, Globe, Menu, Map as MapIcon
} from 'lucide-react'

// ─── Maritime Gazetteer ───────────────────────────────────────────────────────
const MARITIME_GAZETTEER = [
  // Major Ports & Metros
  { keywords: ['chennai', 'madras', 'ennore', 'kamarajar', 'kasimedu'], center: [13.0827, 80.2707], zoom: 10, name: 'Chennai Coastal Waters' },
  { keywords: ['cochin', 'kochi', 'malabar', 'ernakulam'], center: [9.9312, 76.2673], zoom: 10, name: 'Cochin / Malabar Waters' },
  { keywords: ['mumbai', 'bombay', 'konkan', 'nhava sheva', 'jnpt'], center: [18.9500, 72.8200], zoom: 10, name: 'Mumbai / Konkan Sea' },
  { keywords: ['visakhapatnam', 'vizag', 'andhra', 'gangavaram'], center: [17.6868, 83.2185], zoom: 10, name: 'Visakhapatnam Outer Sea' },
  { keywords: ['tuticorin', 'thoothukudi', 'gulf of mannar'], center: [8.7642, 78.1348], zoom: 10, name: 'Tuticorin / Gulf of Mannar' },
  { keywords: ['mangalore', 'mangaluru', 'canara', 'panambur', 'malpe'], center: [12.9141, 74.8560], zoom: 10, name: 'Mangalore Canara Coast' },
  { keywords: ['goa', 'mormugao', 'panaji', 'vasco'], center: [15.4120, 73.8010], zoom: 10, name: 'Goa Coastal Waters' },
  { keywords: ['paradip', 'paradeep', 'odisha', 'mahanadi', 'dhamra'], center: [20.2644, 86.6738], zoom: 10, name: 'Paradip Offshore' },
  { keywords: ['kandla', 'gulf of kutch', 'kutch', 'gandhidham', 'mundra'], center: [23.0033, 70.2183], zoom: 9, name: 'Gulf of Kutch / Kandla' },
  { keywords: ['veraval', 'saurashtra', 'somnath', 'gir'], center: [20.9000, 70.3600], zoom: 10, name: 'Veraval / Saurashtra Coast' },
  { keywords: ['kanyakumari', 'cape comorin', 'wadge bank', 'colachel'], center: [8.0883, 77.5385], zoom: 10, name: 'Kanyakumari Confluence' },
  { keywords: ['port blair', 'andaman', 'nicobar', 'havelock'], center: [11.6234, 92.7265], zoom: 9, name: 'Andaman & Nicobar Waters' },
  { keywords: ['lakshadweep', 'kavaratti', 'agatti', 'minicoy'], center: [10.5667, 72.6417], zoom: 9, name: 'Lakshadweep Archipelago' },
  { keywords: ['haldia', 'sundarbans', 'bengal', 'kolkata', 'hooghly'], center: [21.7800, 88.0600], zoom: 10, name: 'Haldia / Sundarbans Outflow' },
  { keywords: ['pondicherry', 'puducherry', 'karaikal', 'cuddalore', 'nagapattinam'], center: [11.9416, 79.8083], zoom: 10, name: 'Pondicherry Coastal Roadstead' },
  { keywords: ['rameshwaram', 'palk strait', 'dhanushkodi', 'pamban'], center: [9.2876, 79.3129], zoom: 10, name: 'Rameshwaram & Palk Strait' },
  { keywords: ['porbandar', 'okha', 'dwarka', 'dahej', 'bhavnagar'], center: [21.6417, 69.6293], zoom: 10, name: 'Porbandar Coastal Sea' },
  { keywords: ['karwar', 'kumta', 'ankola'], center: [14.8167, 74.1333], zoom: 10, name: 'Karwar Naval Roadstead' },
  { keywords: ['ratnagiri', 'jaigad', 'dabhol', 'alibaug'], center: [16.9902, 73.3120], zoom: 10, name: 'Ratnagiri Konkan Coast' },
  { keywords: ['kakinada', 'coringa', 'godavari', 'machilipatnam', 'krishnapatnam'], center: [16.9891, 82.2475], zoom: 10, name: 'Kakinada Deepwater Port' },
  { keywords: ['digha', 'puri', 'chandipur', 'gopalpur'], center: [21.6266, 87.5074], zoom: 10, name: 'Digha / Odisha Coastal Bay' },
  { keywords: ['vizhinjam', 'neendakara', 'kollam', 'alappuzha', 'alleppey', 'munambam', 'beypore', 'calicut', 'kozhikode', 'kannur'], center: [9.4900, 76.3200], zoom: 10, name: 'Kerala Coastal Waters' },
  // Major Sea Basins
  { keywords: ['bay of bengal', 'bob'], center: [15.0000, 86.5000], zoom: 6, name: 'Bay of Bengal Basin' },
  { keywords: ['arabian sea'], center: [16.0000, 68.5000], zoom: 6, name: 'Arabian Sea Basin' },
  { keywords: ['indian ocean', 'equatorial'], center: [5.0000, 78.0000], zoom: 5, name: 'North Indian Ocean Basin' },
]

// ─── Layer NLP Mappings (All 18 Interactive Geospatial Layers) ──────────────────
const LAYER_KEYWORDS = [
  { keywords: ['chlorophyll', 'plankton', 'bloom', 'algae', 'ocean colour', 'biological productivity', 'chlorophyll-a'], layer: 'chlorophyll', label: 'Chlorophyll-a', emoji: '🌱' },
  { keywords: ['bathymetry', 'depth', 'isobath', 'soundings', 'keel', 'shallow', 'draft', 'fathom', 'contour', 'seafloor', 'water depth'], layer: 'bathymetry', label: 'Bathymetry', emoji: '🌊' },
  { keywords: ['sst', 'sea surface temperature', 'thermal front', 'warm water', 'cold water', 'sea temp', 'temperature gradient', 'thermal anomaly'], layer: 'sst', label: 'SST', emoji: '🌡️' },
  { keywords: ['wave', 'waves', 'swell', 'surge', 'sea state', 'breaking sea', 'high wave', 'rough sea', 'significant wave height'], layer: 'waves', label: 'Waves', emoji: '🌊' },
  { keywords: ['wind', 'winds', 'gust', 'breeze', 'gale', 'squall', 'wind speed', 'wind field'], layer: 'wind', label: 'Wind', emoji: '💨' },
  { keywords: ['pfz', 'potential fishing zone', 'tuna', 'mackerel', 'sardine', 'catch', 'feeding grounds', 'fishing zone', 'fish aggregation'], layer: 'pfz', label: 'PFZ', emoji: '🐟' },
  { keywords: ['lightning', 'thunderstorm', 'convection', 'storm cell', 'discharge', 'thunder'], layer: 'lightning', label: 'Lightning', emoji: '⚡' },
  { keywords: ['cyclone', 'cyclones', 'depression', 'storm track', 'low pressure', 'typhoon', 'tropical storm', 'storm tracks'], layer: 'cyclones', label: 'Cyclones', emoji: '🌀' },
  { keywords: ['current', 'currents', 'drift', 'ocean flow', 'rip current', 'current vector', 'surface current'], layer: 'currents', label: 'Currents', emoji: '↪️' },
  { keywords: ['eez', 'exclusive economic zone', 'maritime boundary', 'territorial', 'unclos', 'imbl', 'sovereign boundary'], layer: 'eez', label: 'EEZ Boundary', emoji: '🗺️' },
  { keywords: ['port', 'ports', 'harbour', 'harbor', 'landing centre', 'jetty', 'dock', 'anchorage', 'fishing harbor'], layer: 'ports', label: 'Ports', emoji: '⚓' },
  { keywords: ['restricted', 'restricted zones', 'naval zone', 'firing range', 'military zone', 'danger zone', 'prohibited area', 'firing practice'], layer: 'restricted_zones', label: 'Restricted Zones', emoji: '🚫' },
  { keywords: ['mpa', 'marine protected', 'sanctuary', 'national park', 'biosphere', 'marine reserve'], layer: 'mpa', label: 'Protected Areas', emoji: '🌿' },
  { keywords: ['oil', 'gas', 'rig', 'drilling', 'petroleum', 'offshore rig', 'oil platform', 'pipeline'], layer: 'oil_gas', label: 'Oil & Gas Platforms', emoji: '🛢️' },
  { keywords: ['wind farm', 'wind turbine', 'offshore wind', 'renewable energy zone'], layer: 'wind_farms', label: 'Offshore Wind', emoji: '🌬️' },
  { keywords: ['cable', 'cables', 'submarine cable', 'undersea cable', 'telecom cable', 'subsea fiber'], layer: 'cables', label: 'Subsea Cables', emoji: '🔌' },
  { keywords: ['shipping', 'shipping lane', 'traffic separation', 'tss', 'vessel traffic', 'commercial channel'], layer: 'shipping', label: 'Shipping Lanes', emoji: '🚢' },
  { keywords: ['sar', 'search and rescue', 'inmarsat', 'coast guard station', 'distress beacon'], layer: 'sar', label: 'SAR Stations', emoji: '🚨' },
]

const HIDE_PATTERNS = ['hide', 'remove', 'turn off', 'disable', 'stop showing']

const PROMPT_SUGGESTIONS = [
  {
    icon: '🐟',
    label: 'Where is the nearest Potential Fishing Zone (PFZ) today?',
    query: 'Where is the nearest Potential Fishing Zone (PFZ) today?'
  },
  {
    icon: '🛡️',
    label: 'Is it safe to venture into the sea tomorrow morning?',
    query: 'Is it safe to venture into the sea tomorrow morning?'
  },
  {
    icon: '🌊',
    label: 'What are the tide, weather, and sea conditions near my fishing location?',
    query: 'What are the tide, weather, and sea conditions near my fishing location?'
  },
  {
    icon: '⚡',
    label: 'Are there any lightning or cyclone alerts in my area?',
    query: 'Are there any lightning or cyclone alerts in my area?'
  },
  {
    icon: '🌱',
    label: 'Which regions show high chlorophyll concentration and favourable sea surface temperature?',
    query: 'Which regions show high chlorophyll concentration and favourable sea surface temperature?'
  },
  {
    icon: '🧭',
    label: 'What is the safest route for a fishing vessel considering weather and sea-state conditions?',
    query: 'What is the safest route for a fishing vessel considering weather and sea-state conditions?'
  },
  {
    icon: '📉',
    label: 'Why has fish productivity declined in a particular coastal region?',
    query: 'Why has fish productivity declined in a particular coastal region?'
  },
  {
    icon: '⚠️',
    label: 'Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions?',
    query: 'Which fishing zones should be avoided due to hazardous marine conditions or geofencing restrictions?'
  }
]

const CHAT_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect'},
  { code: 'en', name: 'English', native: 'English', label: 'English' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', label: 'Tamil' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', label: 'Hindi' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', label: 'Telugu' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', label: 'Malayalam' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', label: 'Kannada' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', label: 'Odia' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', label: 'Bengali' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', label: 'Gujarati' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', label: 'Marathi' },
]

// ─── AI Map Action Log — shows what AI auto-executed, no buttons ──────────────
function AIMapActionLog({ actions }) {
  const { t } = useGlobal()
  const [expanded, setExpanded] = useState(false)
  if (!actions || actions.length === 0) return null
  const visible = expanded ? actions : actions.slice(0, 3)
  const hasMore = actions.length > 3
  return (
    <div className="pt-2.5 border-t border-slate-100">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <Zap size={10} className="text-cyan-500" />
          {t('AI executed')} {actions.length} {actions.length !== 1 ? t('map operations') : t('map operation')}
        </span>
        {hasMore && (
          <button type="button" onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer">
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? t('less') : `+${actions.length - 3} ${t('more')}`}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {visible.map((action, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-cyan-50 to-sky-50 border border-cyan-200/70 text-cyan-800 rounded-full text-[10px] font-semibold">
            <span className="w-1 h-1 rounded-full bg-cyan-400 flex-shrink-0" />
            {t(action)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Assistant Bubble ─────────────────────────────────────────────────────────
function AssistantBubble({ raw, timestamp, speech, language = 'en', msgId = 'bubble', aiActions = [], pipeline = null }) {
  const { t } = useGlobal()
  const [copied, setCopied] = useState(false)
  const { text } = parseORCAResponse(raw)
  const isThisSpeaking = speech?.isSpeaking && speech?.activeSpeechId === msgId
  function handleCopy(e) {
    e?.preventDefault(); e?.stopPropagation()
    navigator.clipboard.writeText(raw).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  function handleToggleTTS(e) {
    e?.preventDefault(); e?.stopPropagation()
    if (!speech) return
    speech.speak(raw, { lang: language, id: msgId })
  }
  return (
    <div className="flex items-start gap-3 max-w-full w-full fade-in">
      <div className="flex-shrink-0 mt-1">
        <Orca3DMascot size={42} isSpeaking={isThisSpeaking} showAura={true} interactive={true} onClick={handleToggleTTS} />
      </div>
      <div className={`flex-1 min-w-0 bg-white rounded-3xl p-3.5 border shadow-sm space-y-2 transition-all ${isThisSpeaking ? 'border-cyan-400 ring-2 ring-cyan-200/50' : 'border-borderLight'}`}>
        <div className="flex items-center justify-between pb-2 border-b border-borderLight/60 flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-navy">ORCA</span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-50 text-oceanBlue border border-sky-200">AI</span>
            {isThisSpeaking && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-300 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />{t('Speaking')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {timestamp && <span className="text-[10px] text-textMuted font-mono">{new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
            <button type="button" onClick={handleToggleTTS}
              className={`p-1.5 rounded-xl border text-xs transition-colors cursor-pointer ${isThisSpeaking ? 'bg-cyan-100 border-cyan-300 text-cyan-800' : 'bg-surface border-borderLight text-textMuted hover:text-navy'}`}
              title={t('Voice')}>
              {isThisSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
            <button type="button" onClick={handleCopy}
              className="p-1.5 rounded-xl bg-surface border border-borderLight text-textMuted hover:text-navy text-xs transition-colors cursor-pointer" title={t('Copy')}>
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
        <div className="prose prose-sm max-w-none text-slate-800 text-xs sm:text-[13px] leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
        <AIMapActionLog actions={aiActions} />
        {pipeline && <AgentPipelineTrace pipeline={pipeline} />}
      </div>
    </div>
  )
}

// ─── User Bubble ──────────────────────────────────────────────────────────────
function UserBubble({ content, timestamp }) {
  return (
    <div className="flex items-end justify-end gap-2 w-full fade-in">
      <div className="flex flex-col items-end max-w-xl">
        <div className="bg-navy text-white px-4 py-2.5 rounded-2xl rounded-tr-sm text-xs sm:text-sm font-medium leading-relaxed shadow-sm">{content}</div>
        {timestamp && <span className="text-[10px] text-textMuted mt-1 mr-1 font-mono">{new Date(timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
      </div>
      <div className="w-7 h-7 rounded-full bg-blue-100 text-oceanBlue flex items-center justify-center flex-shrink-0 mb-3"><User size={13} /></div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN AskPage
// ═══════════════════════════════════════════════════════════════════════════════
export default function AskPage() {
  const { location, vessel, chatMessages, setChatMessages, language = 'en', setLanguage, LANGUAGES = [], t } = useGlobal()
  const speech = useSpeech(language)
  const homeLat = location.lat || 13.0827
  const homeLon = location.lon || 80.2707
  const messages = chatMessages || []
  const [inputQuery, setInputQuery] = useState('')
  const [activeLoadingQuery, setActiveLoadingQuery] = useState('')
  const [livePlannedAgents, setLivePlannedAgents] = useState([])
  const [activeAgentAction, setActiveAgentAction] = useState('')
  const [streamProgressPct, setStreamProgressPct] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const chatContainerRef = useRef(null)
  const inputRef = useRef(null)

  // Chat box language selector (default English, Auto Detect and other languages available)
  const [chatLanguage, setChatLanguage] = useState(language || 'en')
  const [chatLangOpen, setChatLangOpen] = useState(false)
  const chatLangRef = useRef(null)
  const currentChatLang = CHAT_LANGUAGES.find(l => l.code === chatLanguage) || CHAT_LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(e) {
      if (chatLangRef.current && !chatLangRef.current.contains(e.target)) {
        setChatLangOpen(false)
      }
    }
    if (chatLangOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [chatLangOpen])

  // Map state — owned by AskPage, passed down as controlled props
  const [mapCenter, setMapCenter] = useState([homeLat, homeLon])
  const [mapZoom, setMapZoom] = useState(8)
  const [activeMapLayers, setActiveMapLayers] = useState(['eez', 'ports'])
  const [aiTargetMarkers, setAiTargetMarkers] = useState([])
  const [aiRouteLine, setAiRouteLine] = useState(null)
  const [aiCommandNotice, setAiCommandNotice] = useState(null)
  const [mapBasemap, setMapBasemap] = useState('satellite')
  const [mapSize, setMapSize] = useState('balanced')
  const [aiBeacons, setAiBeacons] = useState(true)
  const [aiSelectedCyclone, setAiSelectedCyclone] = useState('ALL')
  const [aiMeasureMode, setAiMeasureMode] = useState('none')
  const [aiMeasurePoints, setAiMeasurePoints] = useState([])
  const [showMap, setShowMap] = useState(true)

  // Force map resize recalculation when toggled back to visible
  useEffect(() => {
    if (showMap) {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'))
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [showMap])

  const scrollToBottom = useCallback((smooth = true) => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const prevCountRef = useRef(messages.length)
  useEffect(() => {
    if (messages.length !== prevCountRef.current || loading) {
      prevCountRef.current = messages.length
      scrollToBottom(true)
    }
  }, [messages.length, loading, scrollToBottom])

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleToggleMapSize = useCallback(() => {
    setMapSize(prev => prev === 'compact' ? 'balanced' : prev === 'balanced' ? 'expanded' : 'compact')
  }, [])

  // Layer toggle handler — supports both (layerId) and (layerId, newFullArray) signatures
  const handleToggleMapLayer = useCallback((layerIdOrEvent, newLayerArray) => {
    if (Array.isArray(newLayerArray)) {
      setActiveMapLayers(newLayerArray)
    } else {
      const id = layerIdOrEvent
      setActiveMapLayers(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
    }
  }, [])

  // ────────────────────────────────────────────────────────────────────────────
  // MASTER AI MAP COMMAND ENGINE
  // Parses natural language text and autonomously executes all map operations.
  // Returns array of action strings for display in the AI Map Action Log.
  // ────────────────────────────────────────────────────────────────────────────
  const processChatMapCommands = useCallback((text, pipeline = null) => {
    if (!text) return []
    const tl = text.toLowerCase()
    const actions = []

    // 1. Location: Gazetteer + free coordinate extraction
    let newCenter = null, newZoom = null
    for (const loc of MARITIME_GAZETTEER) {
      if (loc.keywords.some(kw => tl.includes(kw))) {
        newCenter = loc.center; newZoom = loc.zoom
        actions.push(`📍 Panned to ${loc.name}`)
        break
      }
    }
    if (!newCenter) {
      const m = text.match(/(-?\d{1,2}\.?\d*)\s*\u00b0?\s*([nNsS])?,?\s*(-?\d{1,3}\.?\d*)\s*\u00b0?\s*([eEwW])?/)
      if (m && m[1] && m[3]) {
        let lat = parseFloat(m[1]), lon = parseFloat(m[3])
        if (m[2]?.toLowerCase() === 's') lat = -lat
        if (m[4]?.toLowerCase() === 'w') lon = -lon
        if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
          newCenter = [lat, lon]; newZoom = 10
          actions.push(`📍 Targeted ${lat.toFixed(2)}N, ${lon.toFixed(2)}E`)
        }
      }
    }
    if (newCenter) { setMapCenter(newCenter); if (newZoom) setMapZoom(newZoom) }

    // 2. Zoom
    const zoomM = tl.match(/zoom\s+(?:level\s+)?(\d+)/)
    if (zoomM) {
      const z = Math.min(18, Math.max(3, parseInt(zoomM[1])))
      setMapZoom(z); actions.push(`🔍 Zoom level ${z}`)
    } else if (/zoom\s*in|closer|close.up|detail\s*view/.test(tl)) {
      setMapZoom(prev => Math.min(prev + 2, 16)); actions.push('🔍 Zoomed in')
    } else if (/zoom\s*out|overview|wide.view|regional|full\s*view/.test(tl)) {
      setMapZoom(prev => Math.max(prev - 2, 4)); actions.push('🔍 Zoomed out')
    }

    // 3. Basemap control (All styles: Satellite, Bathymetry, Dark, Light, Terrain, Bhuvan)
    if (/satellite|imagery|google satellite|aerial/i.test(tl)) {
      setMapBasemap('satellite'); actions.push('🛰️ Satellite basemap')
    } else if (/bathymetry|ocean\s*basemap|gebco|seafloor/i.test(tl)) {
      setMapBasemap('bathymetry'); actions.push('🌊 Bathymetry basemap')
    } else if (/dark\s*map|ocean\s*dark|night\s*mode|carto/i.test(tl)) {
      setMapBasemap('carto_dark'); actions.push('🌑 Dark ocean basemap')
    } else if (/street\s*map|light\s*map|osm|openstreet|standard\s*map/i.test(tl)) {
      setMapBasemap('osm'); actions.push('🗺️ Street map basemap')
    } else if (/topo|terrain|topographic/i.test(tl)) {
      setMapBasemap('terrain'); actions.push('🏔️ Terrain basemap')
    } else if (/bhuvan|isro|nrsc/i.test(tl)) {
      setMapBasemap('bhuvan'); actions.push('🇮🇳 ISRO Bhuvan basemap')
    }

    // 4. Layer control (Show, Hide, Isolate, Clear, Show All)
    if (/clear\s*(all\s*)?layers|hide\s*all|remove\s*all\s*layers|turn\s*off\s*all|no\s*layers/i.test(tl)) {
      setActiveMapLayers([]); actions.push('🗑️ All layers cleared')
    } else if (/show\s*all\s*layers|turn\s*on\s*all|enable\s*all\s*layers/i.test(tl)) {
      setActiveMapLayers(LAYER_KEYWORDS.map(l => l.layer)); actions.push('📚 All layers active')
    } else {
      const isHideIntent = HIDE_PATTERNS.some(p => tl.includes(p))
      const isOnlyIntent = /\bonly\b|\bisolate\b|\bjust\s+show\b|\bfocus\s+on\b/.test(tl)
      const mentionedLayers = LAYER_KEYWORDS.filter(k => k.keywords.some(kw => tl.includes(kw))).map(k => k.layer)
      if (mentionedLayers.length > 0) {
        const layerLabels = LAYER_KEYWORDS.filter(k => mentionedLayers.includes(k.layer)).map(k => k.emoji + ' ' + k.label)
        if (isOnlyIntent) {
          setActiveMapLayers(mentionedLayers); actions.push(`🎯 Isolated: ${layerLabels.join(', ')}`)
        } else if (isHideIntent) {
          setActiveMapLayers(prev => prev.filter(l => !mentionedLayers.includes(l))); actions.push(`🚫 Hidden: ${layerLabels.join(', ')}`)
        } else {
          setActiveMapLayers(prev => Array.from(new Set([...prev, ...mentionedLayers]))); actions.push(layerLabels.join(' · '))
        }
      }
    }

    // 5. Beacons Toggle
    if (/hide\s*beacons?|turn\s*off\s*beacons?|disable\s*beacons?|no\s*beacons?/i.test(tl)) {
      setAiBeacons(false); actions.push('🔕 Beacons hidden')
    } else if (/show\s*beacons?|turn\s*on\s*beacons?|enable\s*beacons?/i.test(tl)) {
      setAiBeacons(true); actions.push('🔔 Beacons active')
    }

    // 6. Cyclone Tracking
    if (/track\s*cyclone|focus\s*on\s*cyclone|select\s*cyclone/i.test(tl)) {
      const cycMatch = tl.match(/cyclone\s+([a-zA-Z]+)/)
      const name = cycMatch ? cycMatch[1].toUpperCase() : 'ALL'
      setAiSelectedCyclone(name)
      setActiveMapLayers(prev => Array.from(new Set([...prev, 'cyclones'])))
      actions.push(`🌀 Tracking Cyclone ${name}`)
    } else if (/all\s*cyclones|show\s*all\s*cyclones/i.test(tl)) {
      setAiSelectedCyclone('ALL')
      setActiveMapLayers(prev => Array.from(new Set([...prev, 'cyclones'])))
      actions.push('🌀 Showing all cyclones')
    }

    // 7. Measure tool
    if (/measure\s*distance|distance\s*tool|start\s*measur/i.test(tl)) {
      setAiMeasureMode('distance'); actions.push('📏 Distance measure tool active')
    } else if (/measure\s*area|area\s*tool/i.test(tl)) {
      setAiMeasureMode('area'); actions.push('📐 Area measure tool active')
    } else if (/stop\s*measur|clear\s*measur|exit\s*measur/i.test(tl)) {
      setAiMeasureMode('none'); setAiMeasurePoints([]); actions.push('🗑️ Measure cleared')
    }

    // 8. Map Sizing / Layout & Visibility
    if (/hide\s*map|close\s*map|remove\s*map/i.test(tl)) {
      setShowMap(false); actions.push('🗺️ Map hidden (Full chat mode)')
    } else if (/show\s*map|open\s*map|display\s*map|view\s*map/i.test(tl)) {
      setShowMap(true); actions.push('🗺️ Map visible')
    } else if (/expand\s*map|maximize\s*map|large\s*map/i.test(tl)) {
      setShowMap(true); setMapSize('expanded'); actions.push('🖥️ Map expanded')
    } else if (/compact\s*map|minimize\s*map|small\s*map/i.test(tl)) {
      setShowMap(true); setMapSize('compact'); actions.push('📱 Map compact')
    } else if (/balanced\s*map|default\s*map|reset\s*map\s*size/i.test(tl)) {
      setShowMap(true); setMapSize('balanced'); actions.push('⚖️ Map balanced')
    }

    // 9. Pipeline: Route Data, PFZ targets, waypoints, hazards
    const routeSource = pipeline?.route_data || pipeline?.map_operations?.route || ops?.route
    if (routeSource) {
      const rd = routeSource
      const recKey = rd.recommended_route || 'safest'
      const recRoute = rd.routes?.[recKey] || rd.routes?.safest || rd.routes?.balanced || rd
      const coords = rd.route_geojson?.coordinates || recRoute?.coordinates || rd.coordinates
      if (Array.isArray(coords) && coords.length > 1) {
        const mappedCoords = coords[0][0] > 50 ? coords.map(c => [c[1], c[0]]) : coords;
        setAiRouteLine(mappedCoords)
        const dist = rd.distance_nm || recRoute?.distance_nm || Math.round((rd.distance_km || 0) / 1.852)
        const sLat = mappedCoords[0][0], sLon = mappedCoords[0][1]
        const eLat = mappedCoords[mappedCoords.length - 1][0], eLon = mappedCoords[mappedCoords.length - 1][1]
        setAiTargetMarkers([
          { lat: sLat, lon: sLon, title: `Departure: ${rd.origin_name || location.name}`, badge: '📍', color: '#0284c7', confidence: 'ORIGIN' },
          { lat: eLat, lon: eLon, title: `Destination: ${rd.destination_name || 'Destination'}`, badge: '⚓', color: '#10b981', confidence: 'ARRIVAL', distance_nm: dist, description: `Corridor: ${recKey.toUpperCase()}` },
        ])
        const midLat = (sLat + eLat) / 2, midLon = (sLon + eLon) / 2
        setMapCenter([midLat, midLon])
        const span = Math.max(Math.abs(sLat - eLat), Math.abs(sLon - eLon))
        setMapZoom(span > 8 ? 5 : span > 4 ? 6 : span > 1.5 ? 7 : 8)
        actions.push(`🛣️ ${recKey.toUpperCase()} Route: ${dist} NM`)
      }
    }

    if (pipeline?.spatial_reasoning) {
      const sr = pipeline.spatial_reasoning
      if (Array.isArray(sr.candidate_pfz_targets) && sr.candidate_pfz_targets.length > 0) {
        setAiTargetMarkers(sr.candidate_pfz_targets.map((t, i) => ({
          lat: t.latitude || t.lat, lon: t.longitude || t.lon,
          title: t.name || `PFZ Zone #${i + 1}`, badge: '🐟', color: '#10b981',
          confidence: `${Math.round((t.confidence || 0.88) * 100)}%`,
          distance_km: t.distance_km, avg_sst_celsius: t.avg_sst_celsius,
          description: t.reason || 'Thermal-chlorophyll convergence zone',
        })))
        actions.push(`📌 ${sr.candidate_pfz_targets.length} PFZ zone${sr.candidate_pfz_targets.length !== 1 ? 's' : ''} pinned`)
      }
      if (Array.isArray(sr.waypoints) && sr.waypoints.length > 0) {
        const wps = sr.waypoints.map((w, i) => ({ lat: w.lat || w.latitude, lon: w.lon || w.longitude, title: w.name || `WP ${i + 1}`, badge: '📍', color: '#0284c7', description: w.note || '' }))
        setAiTargetMarkers(prev => [...prev, ...wps])
        actions.push(`📍 ${wps.length} waypoint${wps.length !== 1 ? 's' : ''} placed`)
      }
      if (Array.isArray(sr.hazard_zones) && sr.hazard_zones.length > 0) {
        const hz = sr.hazard_zones.map((h, i) => ({ lat: h.lat || h.latitude || h.center?.[0], lon: h.lon || h.longitude || h.center?.[1], title: h.name || `Hazard #${i + 1}`, badge: '⚠️', color: '#ef4444', is_safe: false, description: h.description || h.reason || 'Hazard area' }))
        setAiTargetMarkers(prev => [...prev, ...hz])
        actions.push(`⚠️ ${hz.length} hazard${hz.length !== 1 ? 's' : ''} marked`)
      }
      if (!pipeline?.route_data && Array.isArray(sr.optimal_route_coordinates) && sr.optimal_route_coordinates.length > 1) {
        const mappedCoords = sr.optimal_route_coordinates[0][0] > 50 ? sr.optimal_route_coordinates.map(c => [c[1], c[0]]) : sr.optimal_route_coordinates;
        setAiRouteLine(mappedCoords); actions.push('🛣️ Optimal corridor plotted')
      }
    }

    // 10. Clear route/markers
    if (/clear\s*route|remove\s*route|reset\s*route/i.test(tl)) { setAiRouteLine(null); actions.push('🗑️ Route cleared') }
    if (/clear\s*markers?|remove\s*pins?|clear\s*pins?/i.test(tl)) { setAiTargetMarkers([]); actions.push('🗑️ Markers cleared') }

    // 11. Notice banner (auto-dismiss)
    if (actions.length > 0) {
      setAiCommandNotice(actions.slice(0, 3).join(' · '))
      setTimeout(() => setAiCommandNotice(null), 6000)
    }
    return actions
  }, [location.name])

  // Route calculator for explicit navigation requests
  const handleRouteRequest = useCallback(async (text) => {
    if (!text) return false
    const tl = text.toLowerCase()
    if (!/route|navigate|path|sail\s+to|directions|passage|go\s+to|heading\s+to|travel\s+to/i.test(tl)) return false

    // Identify origin & destination
    let origLoc = null
    let destLoc = null

    for (const loc of MARITIME_GAZETTEER) {
      if (loc.keywords.some(kw => tl.includes(`from ${kw}`))) {
        origLoc = loc
      } else if (loc.keywords.some(kw => tl.includes(`to ${kw}`) || tl.includes(`for ${kw}`) || tl.includes(kw))) {
        if (!destLoc) destLoc = loc
      }
    }

    if (!destLoc) {
      for (const loc of MARITIME_GAZETTEER) {
        if (loc.keywords.some(kw => tl.includes(kw))) { destLoc = loc; break }
      }
    }

    if (!destLoc) return false

    const sLat = origLoc ? origLoc.center[0] : homeLat
    const sLon = origLoc ? origLoc.center[1] : homeLon
    let eLat = destLoc.center[0], eLon = destLoc.center[1]
    if (Math.abs(sLat - eLat) < 0.05 && Math.abs(sLon - eLon) < 0.05) { eLat += 0.08; eLon += 0.08 }

    setAiCommandNotice(`🛣️ Calculating AI optimized route to ${destLoc.name}...`)
    try {
      let res
      try {
        res = await client.post('/api/route/optimize', {
          start_lat: sLat,
          start_lon: sLon,
          end_lat: eLat,
          end_lon: eLon,
          vessel_type: vessel || 'small_boat',
          steps: 12
        })
      } catch (e1) {
        res = await client.get('/api/route', {
          params: { start_lat: sLat, start_lon: sLon, end_lat: eLat, end_lon: eLon, vessel_type: vessel || 'small_boat', steps: 12 }
        })
      }

      const rd = res?.data
      const recKey = rd?.recommended_route || 'safest'
      const recRoute = rd?.routes?.[recKey] || rd?.routes?.safest || rd?.routes?.balanced
      const coords = rd?.route_geojson?.coordinates || recRoute?.coordinates

      if (Array.isArray(coords) && coords.length > 1) {
        const mappedCoords = coords[0][0] > 50 ? coords.map(c => [c[1], c[0]]) : coords;
        setAiRouteLine(mappedCoords)
        const distNm = rd?.distance_nm || recRoute?.distance_nm || Math.round((rd?.distance_km || 0) / 1.852)
        setAiTargetMarkers([
          { lat: sLat, lon: sLon, title: `Departure: ${origLoc ? origLoc.name : location.name}`, badge: '📍', color: '#0284c7', confidence: 'ORIGIN' },
          { lat: eLat, lon: eLon, title: `Destination: ${destLoc.name}`, badge: '⚓', color: '#10b981', confidence: 'ARRIVAL', distance_nm: distNm, description: `Corridor: ${recKey.toUpperCase()}` },
        ])
        const midLat = (sLat + eLat) / 2, midLon = (sLon + eLon) / 2
        setMapCenter([midLat, midLon])
        const span = Math.max(Math.abs(sLat - eLat), Math.abs(sLon - eLon))
        setMapZoom(span > 8 ? 5 : span > 4 ? 6 : span > 1.5 ? 7 : 8)
        setActiveMapLayers(prev => Array.from(new Set([...prev, 'bathymetry', 'ports'])))
        setAiCommandNotice(`🟢 AI Route: ${origLoc ? origLoc.name : location.name} → ${destLoc.name} · ${distNm} NM`)
        return true
      }
    } catch (err) { console.warn('Route calc error:', err) }
    return false
  }, [homeLat, homeLon, location.name, vessel])

  // ────────────────────────────────────────────────────────────────────────────
  // AUTONOMOUS AI MAP CONTROLLER
  // Consumes backend AI pipeline.map_operations to dynamically control all map features.
  // Directly controls: center, zoom, basemap, layers, routes, markers, measure, cyclones, beacons, size.
  // ────────────────────────────────────────────────────────────────────────────
  const applyAiMapOperations = useCallback((ops) => {
    if (!ops || typeof ops !== 'object') return []
    const executedActions = Array.isArray(ops.actions_summary) ? ops.actions_summary : []

    // 1. Center & Zoom
    if (Array.isArray(ops.center) && ops.center.length === 2 && !isNaN(ops.center[0]) && !isNaN(ops.center[1])) {
      setMapCenter([ops.center[0], ops.center[1]])
    }
    if (typeof ops.zoom === 'number' && !isNaN(ops.zoom)) {
      setMapZoom(ops.zoom)
    }

    // 2. Basemap
    if (ops.basemap && typeof ops.basemap === 'string') {
      setMapBasemap(ops.basemap)
    }

    // 3. Active Layers (Curated by AI — ZERO unwanted layer clutter)
    if (Array.isArray(ops.active_layers)) {
      if (ops.layer_action === 'remove') {
        setActiveMapLayers(prev => prev.filter(l => !ops.active_layers.includes(l)))
      } else if (ops.layer_action === 'add') {
        setActiveMapLayers(prev => Array.from(new Set([...prev, ...ops.active_layers])))
      } else {
        // default 'set': cleanly set ONLY the layers needed for this inquiry
        setActiveMapLayers(ops.active_layers)
      }
    }

    // 4. Route Navigation Line
    if (ops.route && Array.isArray(ops.route.coordinates) && ops.route.coordinates.length > 1) {
      setAiRouteLine(ops.route.coordinates)
    } else if (ops.route === null) {
      setAiRouteLine(null)
    }

    // 5. Target Markers
    if (Array.isArray(ops.markers)) {
      setAiTargetMarkers(ops.markers)
    }

    // 6. Measure Tool
    if (ops.measure && typeof ops.measure === 'object') {
      if (ops.measure.mode) setAiMeasureMode(ops.measure.mode)
      if (Array.isArray(ops.measure.points)) setAiMeasurePoints(ops.measure.points)
    }

    // 7. Cyclone Focus
    if (ops.cyclone_focus) {
      setAiSelectedCyclone(ops.cyclone_focus)
    }

    // 8. Beacons
    if (typeof ops.beacons === 'boolean') {
      setAiBeacons(ops.beacons)
    }

    // 9. Map Sizing / Layout
    if (ops.map_size && ['compact', 'balanced', 'expanded'].includes(ops.map_size)) {
      setMapSize(ops.map_size)
    }

    // 10. Notification Banner
    if (ops.notification) {
      setAiCommandNotice(ops.notification)
      setTimeout(() => setAiCommandNotice(null), 5000)
    }

    return executedActions
  }, [])

  const handleSend = async (queryText) => {
    const textToSend = (queryText || inputQuery).trim()
    if (!textToSend || loading) return

    // Quick client-side pre-flight for immediate responsiveness on simple location keywords
    for (const loc of MARITIME_GAZETTEER) {
      if (loc.keywords.some(kw => textToSend.toLowerCase().includes(kw))) {
        setMapCenter(loc.center)
        if (loc.zoom) setMapZoom(loc.zoom)
        break
      }
    }

    const userMsg = { role: 'user', content: textToSend, timestamp: new Date().toISOString() }
    const baseList = chatMessages || []
    const updatedWithUser = [...baseList, userMsg]
    setChatMessages(updatedWithUser)
    setInputQuery('')
    setActiveLoadingQuery(textToSend)
    setLivePlannedAgents([])
    setActiveAgentAction('Initializing live multi-agent swarm...')
    setStreamProgressPct(12)
    setLoading(true)
    setError(null)

    // Pre-flight planner to immediately display planned swarm agents while connection opens
    client.post('/api/orca/plan', {
      message: textToSend,
      lat: homeLat,
      lon: homeLon,
      vessel_type: vessel,
      language: chatLanguage || 'auto'
    }).then(res => {
      if (Array.isArray(res.data?.display_agents) && res.data.display_agents.length > 0) {
        setLivePlannedAgents(prev => {
          if (prev.length > 0 && prev.some(a => a.status === 'completed' || a.status === 'running')) {
            return prev
          }
          return res.data.display_agents
        })
      }
    }).catch(err => {
      console.debug('Planner preview fallback:', err)
    })

    // Callback for real-time SSE telemetry from backend
    const handleLiveTelemetryEvent = (evt) => {
      if (!evt || !evt.event) return

      if (evt.event === 'plan') {
        const tools = Array.isArray(evt.tools) ? evt.tools : []
        if (tools.length > 0) {
          setLivePlannedAgents(tools.map(t => ({
            tool: t,
            name: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            category: 'Specialized Agent',
            status: 'planned'
          })))
        }
        if (evt.intent) {
          setActiveAgentAction(evt.intent)
        }
        setStreamProgressPct(25)
      } else if (evt.event === 'agent_start') {
        setActiveAgentAction(`Dispatching ${evt.name || evt.agent}...`)
        setLivePlannedAgents(prev => {
          const found = prev.some(a => a.tool === evt.agent)
          if (!found) {
            return [...prev, { tool: evt.agent, name: evt.name || evt.agent, category: evt.category || 'Specialized Agent', status: 'running' }]
          }
          return prev.map(a => a.tool === evt.agent ? { ...a, status: 'running', name: evt.name || a.name, category: evt.category || a.category } : a)
        })
        setStreamProgressPct(prev => Math.min(85, Math.max(prev, 35)))
      } else if (evt.event === 'agent_complete') {
        setActiveAgentAction(`${evt.name || evt.agent}: ${evt.summary || 'Telemetry verified'}`)
        setLivePlannedAgents(prev => {
          const found = prev.some(a => a.tool === evt.agent)
          if (!found) {
            return [...prev, { tool: evt.agent, name: evt.name || evt.agent, category: evt.category || 'Specialized Agent', status: 'completed', summary: evt.summary || '' }]
          }
          return prev.map(a => a.tool === evt.agent ? { ...a, status: 'completed', summary: evt.summary || '', name: evt.name || a.name, category: evt.category || a.category } : a)
        })
        setStreamProgressPct(prev => Math.min(prev + 12, 92))
      } else if (evt.event === 'fusion') {
        setActiveAgentAction(evt.summary || `Safety Fusion: ${evt.verdict} (${evt.confidence}% confidence)`)
        setStreamProgressPct(96)
      }
    }

    try {
      let data = null
      try {
        data = await streamChatMessage({
          message: textToSend,
          history: updatedWithUser.slice(-10),
          vessel_type: vessel,
          current_lat: homeLat,
          current_lon: homeLon,
          language: chatLanguage || 'auto'
        }, handleLiveTelemetryEvent)
      } catch (streamErr) {
        console.warn('Live SSE stream fallback to standard chat API:', streamErr)
        data = await sendChatMessage({
          message: textToSend,
          history: updatedWithUser.slice(-10),
          vessel_type: vessel,
          current_lat: homeLat,
          current_lon: homeLon,
          language: chatLanguage || 'auto'
        })
      }

      if (!data || !data.response) {
        throw new Error('No response returned from ORCA multi-agent engine.')
      }
      
      // Dynamic AI Map Control: backend agent_pipeline.map_operations executes directly
      let aiActions = []
      if (data.agent_pipeline?.map_operations) {
        aiActions = applyAiMapOperations(data.agent_pipeline.map_operations)
      } else if (data.agent_pipeline?.route_data) {
        // Fallback for route data
        aiActions = processChatMapCommands(textToSend, data.agent_pipeline)
      }

      const botMsg = {
        role: 'assistant',
        content: data.response,
        agent_pipeline: data.agent_pipeline,
        timestamp: data.timestamp || new Date().toISOString(),
        aiActions
      }
      setChatMessages(prev => [...(prev || updatedWithUser), botMsg])
    } catch (err) {
      const detail = err.response?.data?.detail
      let safeMsg = ''
      if (typeof detail === 'string') safeMsg = detail
      else if (Array.isArray(detail)) safeMsg = detail.map(d => typeof d === 'object' ? (d.msg || JSON.stringify(d)) : String(d)).join(', ')
      else if (detail && typeof detail === 'object') safeMsg = detail.msg || detail.message || JSON.stringify(detail)
      else safeMsg = err.message || 'Connection to ORCA backend failed'
      setError(String(safeMsg || 'An error occurred'))
    } finally {
      setLoading(false)
      setActiveLoadingQuery('')
      setLivePlannedAgents([])
      setActiveAgentAction('')
      setStreamProgressPct(0)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleResetChat(e) {
    e?.preventDefault(); e?.stopPropagation()
    setChatMessages([{ role: 'assistant', content: `ORCA refreshed. Ready near **${location.name}**.`, timestamp: new Date().toISOString(), aiActions: [] }])
    setError(null); setInputQuery('')
    setMapCenter([homeLat, homeLon]); setMapZoom(8)
    setActiveMapLayers(['eez', 'ports'])
    setAiTargetMarkers([]); setAiRouteLine(null)
    setAiBeacons(true); setAiSelectedCyclone('ALL')
    setAiMeasureMode('none'); setAiMeasurePoints([])
    setShowMap(true)
    setAiCommandNotice('🔄 Map & AI state reset')
    setTimeout(() => setAiCommandNotice(null), 3000)
    inputRef.current?.focus()
  }

  const gridClasses = useMemo(() => {
    if (!showMap) {
      return { chatCol: 'lg:col-span-12', mapCol: 'hidden', mapH: 'h-0' }
    }
    if (mapSize === 'compact')  return { chatCol: 'lg:col-span-8', mapCol: 'lg:col-span-4', mapH: 'h-[420px]' }
    if (mapSize === 'expanded') return { chatCol: 'lg:col-span-4', mapCol: 'lg:col-span-8', mapH: 'h-[560px]' }
    return { chatCol: 'lg:col-span-7', mapCol: 'lg:col-span-5', mapH: 'h-[480px]' }
  }, [mapSize, showMap])

  return (
    <div className="flex flex-col min-h-0 w-full max-w-[1700px] mx-auto space-y-3.5 pb-6">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-3xl border border-borderLight shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-navy via-slate-900 to-oceanBlue p-1.5 shadow-sm flex-shrink-0 flex items-center justify-center">
            <img src="/assets/orca-mascot-3d.png" alt="ORCA" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-navy tracking-tight">ORCA</h1>
              <span className="w-2 h-2 rounded-full bg-safeGreen animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {t('One Intelligence System')}
              </span>
            </div>
            <p className="text-[11px] text-textMuted flex items-center gap-1">
              <Bot size={10} className="text-oceanBlue" />
              <span>{t('AI controls map automatically from your conversation')}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-surface rounded-2xl border border-borderLight text-textSecond">
            <MapPin size={12} className="text-oceanBlue" />
            <strong className="text-navy">{t(location.name)}</strong>
            <span className="text-textMuted">({homeLat.toFixed(2)}N, {homeLon.toFixed(2)}E)</span>
            <span>·</span>
            <Anchor size={12} className="text-oceanBlue" />
            <span>{t(VESSEL_PROFILES[vessel]?.label || 'Fishing Trawler')}</span>
          </div>

          <button type="button"
            onClick={e => {
              e.preventDefault(); e.stopPropagation()
              if (speech.isAiRecording) {
                speech.stopAiRecording({ onTranscribed: d => { if (d?.text) handleSend(d.text) } })
              } else { speech.startAiRecording() }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${speech.isAiRecording ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse' : 'bg-white hover:bg-surface text-navy border-borderLight'}`}
          >
            {speech.isAiRecording ? <MicOff size={13} className="text-rose-600 animate-bounce" /> : <Mic size={13} className="text-oceanBlue" />}
            <span className="hidden sm:inline">{speech.isAiRecording ? t('Recording...') : t('Voice AI')}</span>
          </button>
          <button type="button" onClick={handleResetChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-surface text-textMuted hover:text-navy border border-borderLight text-xs font-bold transition-all cursor-pointer">
            <RotateCcw size={12} />
            <span className="hidden sm:inline">{t('New Session')}</span>
          </button>
        </div>
      </div>

      {/* ── Floating 3D Animated Map Toggle Button (Right Side below New Session) ── */}
      <button
        type="button"
        id="floating-map-toggle-btn"
        onClick={() => setShowMap(prev => !prev)}
        className={`fixed right-3 sm:right-5 top-[114px] z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer select-none group shadow-lg animate-3d-map-float ${
          showMap
            ? 'bg-white/95 backdrop-blur-md hover:bg-white border-2 border-sky-300/80 hover:border-sky-400 hover:shadow-xl active:scale-95'
            : 'bg-gradient-to-br from-sky-500 via-oceanBlue to-navy hover:opacity-95 shadow-xl ring-4 ring-sky-300/70 active:scale-95'
        }`}
        title={showMap ? t('Hide Map (Switch to Full Chat View)') : t('Show Interactive Map')}
        aria-label="Toggle Interactive Map"
      >
        <img
          src="/assets/map-3d-icon.png"
          alt="3D Interactive Map"
          className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-115 pointer-events-none"
        />
        <span
          className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
            showMap ? 'bg-safeGreen shadow-xs' : 'bg-amber-400 animate-ping'
          }`}
        />

        {/* Floating Tooltip */}
        <span className="absolute right-full mr-2.5 px-2.5 py-1 bg-navy/95 text-white text-[11px] font-bold rounded-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-xl border border-white/10 backdrop-blur-sm flex items-center gap-1.5">
          <span>🗺️</span>
          <span>{showMap ? t('Hide Map (Full Chat)') : t('Show Interactive Map')}</span>
        </span>
      </button>

      {/* ── SPLIT GRID ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 lg:h-[540px]">

        {/* CHAT PANEL */}
        <div className={`${gridClasses.chatCol} flex flex-col h-[500px] lg:h-full bg-white rounded-3xl border border-borderLight shadow-sm overflow-hidden min-h-0 transition-all duration-200`}>
          <div className="px-4 py-2 bg-surface border-b border-borderLight flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-navy">
              <Bot size={13} className="text-oceanBlue" />
              <span>{t('AI Conversation')}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-textMuted">
              <span className="font-mono">{messages.length} {t('msg')}</span>
              {showMap ? (
                <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded-full border border-cyan-200 font-bold">{t('🗺️ AI controls map')}</span>
              ) : (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200 font-bold">{t('💬 Full Chat View')}</span>
              )}
            </div>
          </div>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                <Orca3DMascot size={72} showAura={true} interactive={true} />
                <h3 className="text-base font-black text-navy">{t('How can ORCA assist?')}</h3>
                <p className="text-xs text-textMuted max-w-sm leading-relaxed">
                  {t('Ask anything in your language — AI will automatically analyze marine hazards, pan and zoom the map, plot safe routes, and pin zones.')}
                </p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <React.Fragment key={idx}>
                  {m.role === 'user'
                    ? <UserBubble content={m.content} timestamp={m.timestamp} />
                    : <AssistantBubble raw={m.content} timestamp={m.timestamp} speech={speech} language={language} msgId={`ask-msg-${idx}`} aiActions={m.aiActions || []} pipeline={m.agent_pipeline} />
                  }
                </React.Fragment>
              ))
            )}
            {loading && (
              <div className="w-full fade-in">
                <AgentLiveLoading
                  queryText={activeLoadingQuery}
                  plannedAgents={livePlannedAgents}
                  activeAction={activeAgentAction}
                  progressPct={streamProgressPct}
                />
              </div>
            )}
            {error && (
              <div className="p-3 bg-dangerLight border border-dangerRed/30 rounded-2xl flex items-start gap-2 text-dangerRed text-xs">
                <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{t('Agent Notice')}</p>
                  <p className="opacity-90">{typeof error === 'string' ? error : JSON.stringify(error)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="px-3 py-1.5 bg-surface/60 border-t border-borderLight/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
            {PROMPT_SUGGESTIONS.map((s, i) => (
              <button key={i} type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); handleSend(s.query) }}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-sky-50 text-slate-700 hover:text-oceanBlue border border-borderLight text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0 shadow-2xs">
                <span>{s.icon}</span><span>{t(s.query)}</span>
              </button>
            ))}
          </div>

          <div className="p-2.5 bg-white border-t border-borderLight flex-shrink-0">
            {speech.isAiRecording && (
              <div className="mb-2 px-3 py-1 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs animate-pulse">
                <span className="flex items-center gap-1.5 font-bold text-purple-700 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />{t('Whisper AI listening...')}
                </span>
                <button type="button" onClick={() => speech.stopAiRecording({ onTranscribed: d => { if (d?.text) handleSend(d.text) } })} className="text-[10px] font-bold text-purple-800 underline cursor-pointer">{t('Stop & Send')}</button>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-surface rounded-2xl border border-borderLight p-1.5 focus-within:ring-2 focus-within:ring-oceanBlue/20 focus-within:border-oceanBlue transition-all">
              {/* Language Selector inside Chat Box */}
              <div className="relative flex-shrink-0" ref={chatLangRef}>
                <button
                  type="button"
                  id="chat-box-language-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setChatLangOpen(prev => !prev);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                    chatLangOpen
                      ? 'bg-blue-50 border-oceanBlue text-oceanBlue ring-2 ring-blue-100 shadow-xs'
                      : chatLanguage === 'auto'
                        ? 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-oceanBlue shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-borderLight text-navy hover:text-oceanBlue shadow-2xs'
                  }`}
                  title={t('Switch Chat Language (Auto Detect supported)')}
                  aria-label="Switch Chat Language"
                >
                  <Globe size={13} className="text-oceanBlue flex-shrink-0" />
                  <span className="text-[11px] font-bold max-w-[85px] truncate">{currentChatLang.name}</span>
                  <ChevronUp size={11} className={`text-textMuted transition-transform duration-150 ${chatLangOpen ? 'rotate-180 text-oceanBlue' : ''}`} />
                </button>

                {chatLangOpen && (
                  <div
                    role="listbox"
                    className="absolute left-0 bottom-full mb-2 w-56 bg-white rounded-2xl shadow-2xl border border-borderLight z-50 p-1.5 max-h-72 overflow-y-auto animate-slideIn"
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-textMuted border-b border-borderLight mb-1 flex items-center justify-between">
                      <span>{t('Chat Language')}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-oceanBlue font-semibold">{t('AI Multilingual')}</span>
                    </div>
                    {CHAT_LANGUAGES.map(lang => {
                      const isSelected = chatLanguage === lang.code
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setChatLanguage(lang.code)
                            if (lang.code !== 'auto' && setLanguage) {
                              setLanguage(lang.code)
                            }
                            setChatLangOpen(false)
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-oceanBlue text-white font-bold'
                              : 'text-navy hover:bg-surface font-medium'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              {lang.native}
                              {lang.code === 'auto' && (
                                <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-800'}`}>
                                  Auto
                                </span>
                              )}
                            </span>
                            <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-textMuted'}`}>{lang.label || lang.name}</span>
                          </div>
                          {isSelected && <Check size={13} className="flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <input ref={inputRef} type="text" value={inputQuery} onChange={e => setInputQuery(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={t('Ask ORCA — "Show chlorophyll near Chennai", "Route to Mumbai", "Zoom in on Bay of Bengal"...')}
                className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-navy placeholder-textMuted focus:outline-none min-w-0"
                disabled={loading} />
              <button type="button"
                onClick={e => {
                  e.preventDefault(); e.stopPropagation()
                  if (speech.isAiRecording) { speech.stopAiRecording({ onTranscribed: d => { if (d?.text) handleSend(d.text) } }) } else { speech.startAiRecording() }
                }}
                className={`p-2 rounded-xl transition-all cursor-pointer flex-shrink-0 ${speech.isAiRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-white hover:bg-slate-100 text-textMuted border border-borderLight'}`}>
                <Mic size={14} />
              </button>
              <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); handleSend() }}
                disabled={!inputQuery.trim() || loading}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-oceanBlue to-navy hover:opacity-95 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 flex-shrink-0 shadow-xs">
                <span>{t('Send')}</span><Send size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* MAP PANEL */}
        {showMap && (
          <div className={`${gridClasses.mapCol} ${gridClasses.mapH} lg:h-full flex flex-col min-h-0 relative`}>
            <MapCanvas
              className="w-full h-full min-h-[460px] rounded-3xl"
              initialCenter={{ lat: homeLat, lon: homeLon }}
              initialZoom={8}
              targetCenter={mapCenter}
              targetZoom={mapZoom}
              controlledActiveLayers={activeMapLayers}
              controlledBaseMap={mapBasemap}
              controlledBeacons={aiBeacons}
              controlledSelectedCyclone={aiSelectedCyclone}
              controlledMeasureMode={aiMeasureMode}
              controlledMeasurePoints={aiMeasurePoints}
              onToggleLayer={handleToggleMapLayer}
              externalRoute={aiRouteLine}
              externalMarkers={aiTargetMarkers}
              aiCommandNotice={aiCommandNotice}
              mapSize={mapSize}
              onToggleMapSize={handleToggleMapSize}
              pageContext="chatWorkstation"
              showControls={true}
            />
          </div>
        )}

      </div>

    </div>
  )
}
