import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Sparkles, ChevronRight, X } from 'lucide-react'
import Orca3DMascot from './Orca3DMascot'

const PAGE_CONTEXT_TIPS = {
  '/': 'Welcome to ORCA! I monitor live Indian coastal weather, PFZ plumes, and safety conditions with you.',
  '/ocean': 'Copernicus & ISRO Oceansat-3 chlorophyll and SST thermal fronts are live on the map!',
  '/safety': 'Checking wave height, swell, and convective CAPE limits for your vessel profile.',
  '/fisheries': 'High-yield PFZ zones active! Follow thermal fronts to conserve fuel and boost catch.',
  '/navigation': 'Computing safe deep-water routing with under-keel clearance and speed optimization.',
  '/routes': 'Computing safe deep-water routing with under-keel clearance and speed optimization.',
  '/ecology': 'Marine Protected Areas (MPA) and sensitive coral reef buffers are mapped and protected.',
  '/geofencing': 'Tracking 12nm Territorial Waters and IMBL international boundaries to keep your crew safe.',
  '/geofence': 'Tracking 12nm Territorial Waters and IMBL international boundaries to keep your crew safe.',
  '/alerts': 'Real-time IMD marine squall warnings and INSAT-3DS convective thunderstorm radar active.',
  '/reports': 'Generate certified pre-voyage clearance dossiers with full regulatory compliance.',
  '/data': 'Live telemetry feeds connected from INCOIS, IMD, ISRO MOSDAC, Copernicus, and GFW AIS.',
  '/about': 'Explore ORCA mission architecture, operational roles, and reference frameworks.',
}

export default function OrcaMascotCompanion() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAskPage = location.pathname === '/ask'

  const [showSpeechBubble, setShowSpeechBubble] = useState(true)
  const [bubbleDismissed, setBubbleDismissed] = useState(false)

  const currentTip = PAGE_CONTEXT_TIPS[location.pathname] || PAGE_CONTEXT_TIPS['/']

  // Show speech bubble briefly on route change
  useEffect(() => {
    if (!bubbleDismissed) {
      setShowSpeechBubble(true)
      const timer = setTimeout(() => {
        setShowSpeechBubble(false)
      }, 12000)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, bubbleDismissed])

  const handleMascotClick = () => {
    navigate('/ask')
  }

  // Hide mascot on the dedicated Ask ORCA chat page
  if (isAskPage) {
    return null
  }

  const mascotContent = (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
      }}
      className="flex flex-col items-end pointer-events-none select-none print:hidden"
    >
      {/* ── 1. Contextual Speech Bubble ────────────────────────────── */}
      {showSpeechBubble && (
        <div
          onClick={handleMascotClick}
          className="mb-2 max-w-[270px] bg-white/95 backdrop-blur-md p-3 rounded-2xl rounded-br-xs shadow-xl border border-sky-200/80 text-xs text-navy pointer-events-auto animate-fadeIn transform transition-all duration-300 cursor-pointer hover:border-oceanBlue hover:shadow-2xl"
        >
          <div className="flex items-start justify-between gap-1.5 pb-1 mb-1 border-b border-sky-100">
            <div className="flex items-center gap-1.5 text-oceanBlue font-bold text-[11px]">
              <Sparkles size={12} className="text-saffron" />
              <span>ORCA Companion</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowSpeechBubble(false)
                setBubbleDismissed(true)
              }}
              className="text-textMuted hover:text-navy p-0.5 rounded cursor-pointer transition-colors"
              title="Dismiss tip"
            >
              <X size={12} />
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
            {currentTip}
          </p>
          <div className="mt-2 pt-1.5 flex items-center justify-between text-[10px] text-oceanBlue font-bold">
            <span className="flex items-center gap-0.5">
              <span>Chat with ORCA</span>
              <ChevronRight size={11} />
            </span>
            <span className="text-[9px] text-textMuted font-mono">Click to open</span>
          </div>
        </div>
      )}

      {/* ── 2. Floating 3D Interactive Mascot Trigger ─────────────── */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <Orca3DMascot
          size={78}
          onClick={handleMascotClick}
          className="transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
        />
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(mascotContent, document.body) : mascotContent
}
