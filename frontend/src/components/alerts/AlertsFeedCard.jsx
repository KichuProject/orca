import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, AlertTriangle, ShieldAlert, Info, Check, CheckCheck, Trash2, Clock, MapPin, RefreshCw, Image, FileText, ChevronRight, ChevronLeft, X, ExternalLink, Maximize2, Layers, Waves, Radio, Compass } from 'lucide-react'
import { endpoints } from '../../api'
import { useGlobal } from '../../context/GlobalContext'
import TsunamiSection from './TsunamiSection'
import HazardDetectionMatrix from './HazardDetectionMatrix'

function BulletinCard({ bulletin, onOpenModal }) {
  const { t } = useGlobal()
  const pages = bulletin.pages && bulletin.pages.length > 0
    ? bulletin.pages
    : [{
        page_number: 1,
        title: bulletin.title,
        image_url: bulletin.image_url,
        synoptic_situation: bulletin.synoptic_situation,
        markdown_content: bulletin.markdown_content
      }]
  const [activePageIndex, setActivePageIndex] = useState(0)
  const totalPages = pages.length
  const currentPage = pages[activePageIndex] || pages[0]

  const handlePrevPage = (e) => {
    e.stopPropagation()
    setActivePageIndex((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = (e) => {
    e.stopPropagation()
    setActivePageIndex((prev) => Math.min(totalPages - 1, prev + 1))
  }

  const handleOpen = () => {
    onOpenModal(bulletin, activePageIndex)
  }

  return (
    <div className="p-4 rounded-2xl border border-borderLight bg-slate-50/50 hover:bg-white hover:border-oceanBlue/50 transition-all flex flex-col justify-between space-y-3 group shadow-sm hover:shadow">
      <div className="space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-oceanBlue font-bold text-[10px] tracking-wide uppercase">
                {t(bulletin.region)}
              </span>
              {totalPages > 1 && (
                <span className="px-2 py-0.5 rounded-md bg-navy/10 text-navy font-bold text-[10px] flex items-center gap-1">
                  <Layers size={10} className="text-oceanBlue" />
                  {totalPages} {t('Pages')}
                </span>
              )}
            </div>
            <h4 className="text-xs font-bold text-navy mt-1 group-hover:text-oceanBlue transition-colors line-clamp-2">
              {t(currentPage.title || bulletin.title)}
            </h4>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] font-mono text-textMuted block whitespace-nowrap">
              {bulletin.issued_at}
            </span>
            {totalPages > 1 && (
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-slate-200 text-navy font-bold text-[10px]">
                {t('Page')} {activePageIndex + 1} {t('of')} {totalPages}
              </span>
            )}
          </div>
        </div>

        {/* Scanned Graphic Image Preview with Next/Prev page controls */}
        {currentPage.image_url ? (
          <div
            onClick={handleOpen}
            className="relative h-44 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer group/img"
          >
            <img
              src={currentPage.image_url}
              alt={currentPage.title}
              className="w-full h-full object-cover object-top opacity-90 group-hover/img:opacity-100 group-hover/img:scale-[1.02] transition-all duration-300"
              loading="lazy"
            />

            {/* Next / Previous Page Navigation Controls */}
            {totalPages > 1 && (
              <>
                <button
                  onClick={handlePrevPage}
                  disabled={activePageIndex === 0}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition-all z-20 shadow-md ${
                    activePageIndex === 0 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'opacity-90 hover:scale-110 cursor-pointer'
                  }`}
                  title={t('Previous Page')}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={activePageIndex === totalPages - 1}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition-all z-20 shadow-md ${
                    activePageIndex === totalPages - 1 ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'opacity-90 hover:scale-110 cursor-pointer'
                  }`}
                  title={t('Next Page')}
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}

            {/* Top right page badge overlay */}
            {totalPages > 1 && (
              <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-white text-[10px] font-bold flex items-center gap-1">
                <span>{t('Page')} {activePageIndex + 1} / {totalPages}</span>
              </div>
            )}

            {/* Bottom Overlay Info & Dots */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent flex items-end justify-between p-2.5 z-10">
              <span className="text-[10px] text-white/95 font-medium flex items-center gap-1">
                <Image size={11} /> {t('Click to expand IMD chart')}
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActivePageIndex(i)
                      }}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        activePageIndex === i ? 'w-4 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                      title={`Go to page ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <span className="p-1 rounded-lg bg-black/60 text-white backdrop-blur">
                <Maximize2 size={12} />
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={handleOpen}
            className="p-3 bg-white rounded-xl border border-borderLight text-xs text-textSecond cursor-pointer hover:bg-slate-50"
          >
            {t('No image preview available • Click to view text')}
          </div>
        )}

        {/* Synoptic Situation excerpt */}
        {currentPage.synoptic_situation && (
          <p className="text-[11px] text-textSecond line-clamp-3 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-borderLight/80">
            <strong className="text-navy font-semibold">
              {activePageIndex > 0 ? `${t('Page')} ${activePageIndex + 1}: ` : `${t('Synoptic Situation')}: `}
            </strong>
            {t(currentPage.synoptic_situation)}
          </p>
        )}
      </div>

      {/* Footer with page tabs and full bulletin button */}
      <div className="pt-2.5 border-t border-borderLight flex items-center justify-between text-[11px] gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-amber-700 font-semibold flex items-center gap-1">
            <AlertTriangle size={12} /> {t('Warning active')}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1 ml-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {pages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePageIndex(idx)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                    activePageIndex === idx
                      ? 'bg-navy text-white shadow-xs'
                      : 'text-textMuted hover:text-navy hover:bg-slate-200'
                  }`}
                  title={`View Page ${idx + 1}`}
                >
                  {t('Page')} {idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleOpen}
          className="text-oceanBlue font-bold hover:underline flex items-center gap-0.5 cursor-pointer ml-auto whitespace-nowrap"
        >
          <span>{t('Full Bulletin')}</span>
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

export default function AlertsFeedCard() {
  const { location, t } = useGlobal()
  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  const [acknowledgedIds, setAcknowledgedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('orca_ack_alerts') || localStorage.getItem('ocra_ack_alerts')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('orca_dismissed_alerts') || localStorage.getItem('ocra_dismissed_alerts')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })
  const [feedMode, setFeedMode] = useState('tactical') // 'tactical' | 'official_imd'
  const [filter, setFilter] = useState('all') // 'all' | 'critical' | 'warning' | 'advisory'
  const [selectedBulletinModal, setSelectedBulletinModal] = useState(null)
  const [modalPageIndex, setModalPageIndex] = useState(0)

  const handleOpenBulletinModal = (bulletin, pageIdx = 0) => {
    setSelectedBulletinModal(bulletin)
    setModalPageIndex(pageIdx)
  }

  // Query Live Tactical Alerts from Backend
  const { data: alertsPayload, isLoading: isAlertsLoading, refetch: refetchAlerts, isFetching: isAlertsFetching } = useQuery({
    queryKey: ['tactical-alerts', lat, lon],
    queryFn: async () => {
      const res = await endpoints.alerts(lat, lon)
      return res.data?.alerts || []
    },
    staleTime: 60000,
    refetchInterval: 60000,
  })

  // Query Official IMD Bulletins & Graphics
  const { data: bulletinsData, isLoading: isBulletinsLoading, refetch: refetchBulletins } = useQuery({
    queryKey: ['imd-bulletins'],
    queryFn: async () => {
      const res = await endpoints.bulletins()
      return res.data?.bulletins || []
    },
    staleTime: 30000,
  })

  // Query INCOIS Tsunami Early Warning System (ITEWS)
  const { data: tsunamiPayload, isLoading: isTsunamiLoading, refetch: refetchTsunami } = useQuery({
    queryKey: ['tsunami-itews', lat, lon],
    queryFn: async () => {
      const res = await endpoints.tsunami(lat, lon)
      return res.data || {}
    },
    staleTime: 60000,
    refetchInterval: 120000,
  })

  const [isSyncing, setIsSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  const rawAlerts = alertsPayload || []
  const alerts = rawAlerts
    .filter(a => !dismissedIds.has(a.id))
    .map(a => ({
      ...a,
      acknowledged: a.acknowledged || acknowledgedIds.has(a.id)
    }))

  const handleAcknowledge = (id) => {
    setAcknowledgedIds(prev => {
      const next = new Set([...prev, id])
      try { localStorage.setItem('orca_ack_alerts', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const handleDismiss = (id) => {
    setDismissedIds(prev => {
      const next = new Set([...prev, id])
      try { localStorage.setItem('orca_dismissed_alerts', JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const handleAcknowledgeAll = () => {
    const allIds = new Set(alerts.map(a => a.id))
    setAcknowledgedIds(allIds)
    try { localStorage.setItem('orca_ack_alerts', JSON.stringify([...allIds])) } catch {}
  }

  const handleRestoreDismissed = () => {
    setDismissedIds(new Set())
    try {
      localStorage.removeItem('orca_dismissed_alerts')
      localStorage.removeItem('ocra_dismissed_alerts')
    } catch {}
  }

  const handleSyncFeeds = async () => {
    setIsSyncing(true)
    setJustSynced(false)
    try {
      await Promise.all([refetchAlerts(), refetchBulletins(), refetchTsunami()])
      setJustSynced(true)
      setTimeout(() => setJustSynced(false), 2500)
    } finally {
      setIsSyncing(false)
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true
    return a.severity === filter
  })

  const unackCount = alerts.filter(a => !a.acknowledged).length
  const officialBulletins = bulletinsData || []

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-5">
      {/* Top Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-50 text-dangerRed flex items-center justify-center">
            <Bell size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">{t('Marine Warning & Alert Center')}</h3>
            <p className="text-[10px] text-textMuted">
              {t('Official IMD Cyclone Division bulletins • Live INCOIS, ICG & MoES advisories')}
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-surfaceMid/80 p-1 rounded-xl border border-borderLight">
          <button
            onClick={() => setFeedMode('tactical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              feedMode === 'tactical'
                ? 'bg-white text-navy shadow-sm'
                : 'text-textMuted hover:text-navy'
            }`}
          >
            <span>{t('Tactical Alerts')}</span>
            {unackCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-dangerRed text-white text-[9px] flex items-center justify-center font-black">
                {unackCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFeedMode('official_imd')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              feedMode === 'official_imd'
                ? 'bg-white text-navy shadow-sm'
                : 'text-textMuted hover:text-navy'
            }`}
          >
            <FileText size={12} className="text-oceanBlue" />
            <span>{t('IMD Official Bulletins')}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-oceanBlue text-[9px] font-bold">
              {officialBulletins.length || 11}
            </span>
          </button>

          <button
            onClick={() => setFeedMode('tsunami_iteows')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              feedMode === 'tsunami_iteows'
                ? 'bg-white text-navy shadow-sm'
                : 'text-textMuted hover:text-navy'
            }`}
          >
            <Waves size={12} className="text-teal-600" />
            <span>{t('INCOIS Tsunami (ITEWS)')}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
              tsunamiPayload?.threat_summary?.threat_active ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-teal-100 text-teal-800'
            }`}>
              {tsunamiPayload?.threat_summary?.threat_active ? t('THREAT') : t('SAFE')}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-toolbar based on Mode */}
      {feedMode === 'tactical' ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            {['all', 'critical', 'warning', 'advisory'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer ${
                  filter === cat
                    ? 'bg-navy text-white shadow-sm'
                    : 'bg-surfaceMid hover:bg-surfaceMid/80 text-textMuted'
                }`}
              >
                {t(cat)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncFeeds}
              disabled={isSyncing}
              className="flex items-center gap-1 text-[11px] font-semibold text-oceanBlue hover:text-navy px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100/70 transition-colors cursor-pointer"
            >
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? t('Connecting...') : justSynced ? t('Live Synchronized') : t('Sync IMD Feeds')}</span>
            </button>

            {unackCount > 0 && (
              <button
                onClick={handleAcknowledgeAll}
                className="flex items-center gap-1 text-[11px] font-semibold text-textMuted hover:text-navy px-2 py-1 rounded-lg hover:bg-surfaceMid transition-colors cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>{t('Mark All Read')}</span>
              </button>
            )}

            {dismissedIds.size > 0 && (
              <button
                onClick={handleRestoreDismissed}
                className="flex items-center gap-1 text-[11px] font-semibold text-oceanBlue hover:text-navy px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                title="Restore previously dismissed alerts"
              >
                <RefreshCw size={11} />
                <span>{t('Restore')} ({dismissedIds.size}) {t('Cleared')}</span>
              </button>
            )}
          </div>
        </div>
      ) : feedMode === 'official_imd' ? (
        <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t('IMD Cyclone Warning Division • Real Coastal Scanned Charts (East & West Coasts)')}</span>
          </div>
          <span className="text-[11px] font-mono text-textMuted">{t('Official Govt of India Weather Bulletins')}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs bg-teal-50/70 p-2.5 rounded-xl border border-teal-200">
          <div className="flex items-center gap-2 text-teal-900 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t('INCOIS Indian Tsunami Early Warning Centre (ITEWC) • 24x7 Deep Ocean Bottom Pressure & Seismic Surveillance')}</span>
          </div>
          <button
            onClick={handleSyncFeeds}
            disabled={isSyncing}
            className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 px-2.5 py-1 rounded-xl bg-teal-100/70 hover:bg-teal-200/70 transition-colors cursor-pointer"
          >
            <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? t('Connecting...') : justSynced ? t('Live Synchronized') : t('Sync ITEWS Feeds')}</span>
          </button>
        </div>
      )}

      {/* Content Area */}
      {feedMode === 'tactical' ? (
        <div className="space-y-5">
          {/* Feature 16: Visible Hazard Detection Matrix */}
          <HazardDetectionMatrix alerts={alerts} lat={lat} lon={lon} />

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-navy px-1">
              <span className="flex items-center gap-1.5">
                <Bell size={13} className="text-oceanBlue" />
                {t('Active Navigational & Marine Warnings')}
              </span>
              <span className="text-[10px] text-textMuted font-mono">
                {filteredAlerts.length} {t('alerts active')}
              </span>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="py-8 text-center text-textMuted text-xs font-medium">
                {t('No active alerts in this category.')}
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const isCrit = alert.severity === 'critical'
                const isWarn = alert.severity === 'warning'

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      alert.acknowledged
                        ? 'bg-surface/50 border-borderLight/80 opacity-75'
                        : isCrit
                        ? 'bg-red-50/40 border-red-300 ring-1 ring-red-200 shadow-2xs'
                        : isWarn
                        ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200 shadow-2xs'
                        : 'bg-blue-50/40 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${
                          isCrit ? 'bg-red-100 text-red-700' : isWarn ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-oceanBlue'
                        }`}>
                          {isCrit ? <ShieldAlert size={16} /> : isWarn ? <AlertTriangle size={16} /> : <Info size={16} />}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {alert.badge && (
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wide shadow-2xs border ${
                                isCrit 
                                  ? 'bg-red-500 text-white border-red-600' 
                                  : isWarn 
                                  ? 'bg-amber-500 text-white border-amber-600' 
                                  : 'bg-navy text-white border-navy/80'
                              }`}>
                                {t(alert.badge)}
                              </span>
                            )}
                            <h4 className="text-xs font-bold text-navy">{t(alert.title)}</h4>
                            <span className="text-[10px] font-mono text-textMuted bg-slate-100 px-1.5 py-0.5 rounded">{alert.id}</span>
                          </div>

                          {/* 5 Required Metadata Points: location, valid time, source, severity, affected region */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-textMuted font-medium bg-white/80 p-2 rounded-xl border border-borderLight/60">
                            <span className="flex items-center gap-1 text-slate-700">
                              <MapPin size={11} className="text-oceanBlue flex-shrink-0" />
                              <span><strong className="text-navy">{t('Location')}:</strong> {alert.location_coord || `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`}</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-700">
                              <Clock size={11} className="text-amber-600 flex-shrink-0" />
                              <span className="truncate" title={t(alert.valid_time || alert.time)}><strong className="text-navy">{t('Valid Time')}:</strong> {t(alert.valid_time || alert.time)}</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-700 truncate" title={alert.source}>
                              <Radio size={11} className="text-purple-600 flex-shrink-0" />
                              <span className="truncate"><strong className="text-navy">{t('Source')}:</strong> {t(alert.source)}</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-700 truncate" title={alert.affected_region || alert.sector}>
                              <Compass size={11} className="text-teal-600 flex-shrink-0" />
                              <span className="truncate"><strong className="text-navy">{t('Affected')}:</strong> {t(alert.affected_region || alert.sector)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex-shrink-0 border shadow-2xs ${
                        isCrit ? 'bg-red-100 text-red-700 border-red-200' : isWarn ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-blue-100 text-oceanBlue border-blue-200'
                      }`}>
                        {t(alert.severity)}
                      </span>
                    </div>

                    <p className="text-xs text-textSecond leading-relaxed pl-10.5">
                      {t(alert.message)}
                    </p>

                  {/* Footer action buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-borderLight/60 pl-9 text-xs">
                    <div className="text-[10px] font-semibold text-textMuted">
                      {alert.acknowledged ? t('✓ Acknowledged by skipper') : t('Pending review')}
                    </div>

                    <div className="flex items-center gap-2">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-surface border border-borderLight font-bold text-navy text-[11px] transition-colors cursor-pointer"
                        >
                          <Check size={11} className="text-emerald-600" />
                          <span>{t('Acknowledge')}</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="p-1 rounded-lg hover:bg-surfaceMid text-textMuted hover:text-red-700 transition-colors cursor-pointer"
                        title={t('Dismiss alert')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          </div>
        </div>
      ) : feedMode === 'official_imd' ? (
        /* Official IMD Regional Bulletins Grid */
        <div className="space-y-4">
          {isBulletinsLoading ? (
            <div className="py-12 text-center text-textMuted text-xs flex items-center justify-center gap-2">
              <RefreshCw size={14} className="animate-spin text-oceanBlue" />
              <span>{t('Loading official IMD weather charts...')}</span>
            </div>
          ) : officialBulletins.length === 0 ? (
            <div className="py-8 text-center text-textMuted text-xs">
              {t('No coastal bulletins found on server cache.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {officialBulletins.map((b) => (
                <BulletinCard
                  key={b.id}
                  bulletin={b}
                  onOpenModal={handleOpenBulletinModal}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* INCOIS Indian Tsunami Early Warning System (ITEWS) Section */
        <TsunamiSection 
          tsunamiData={tsunamiPayload} 
          isLoading={isTsunamiLoading} 
          onRefresh={refetchTsunami} 
        />
      )}

      {/* Modal Dialog for full-size inspection with multi-page navigation */}
      {selectedBulletinModal && (() => {
        const modalPages = selectedBulletinModal.pages && selectedBulletinModal.pages.length > 0
          ? selectedBulletinModal.pages
          : [{
              page_number: 1,
              title: selectedBulletinModal.title,
              image_url: selectedBulletinModal.image_url,
              synoptic_situation: selectedBulletinModal.synoptic_situation,
              markdown_content: selectedBulletinModal.markdown_content
            }]
        const currentModalPage = modalPages[modalPageIndex] || modalPages[0]
        const totalModalPages = modalPages.length

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-borderLight animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-4 sm:px-6 border-b border-borderLight flex items-center justify-between bg-slate-50">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-oceanBlue font-bold text-[10px] uppercase">
                      {selectedBulletinModal.region}
                    </span>
                    {totalModalPages > 1 && (
                      <span className="px-2 py-0.5 rounded-md bg-navy text-white font-bold text-[10px] flex items-center gap-1">
                        <Layers size={10} />
                        Page {modalPageIndex + 1} of {totalModalPages}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-navy mt-1">
                    {currentModalPage.title || selectedBulletinModal.title}
                  </h3>
                  <p className="text-[10px] text-textMuted">
                    Issued: {selectedBulletinModal.issued_at} &bull; IMD Cyclone Warning Division
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {totalModalPages > 1 && (
                    <div className="flex items-center gap-1 bg-white border border-borderLight rounded-xl p-1 shadow-xs">
                      <button
                        onClick={() => setModalPageIndex(p => Math.max(0, p - 1))}
                        disabled={modalPageIndex === 0}
                        className="p-1 rounded-lg hover:bg-surfaceMid text-navy disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                        title={t('Previous Page')}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-[11px] font-bold text-navy px-1">
                        {modalPageIndex + 1} / {totalModalPages}
                      </span>
                      <button
                        onClick={() => setModalPageIndex(p => Math.min(totalModalPages - 1, p + 1))}
                        disabled={modalPageIndex === totalModalPages - 1}
                        className="p-1 rounded-lg hover:bg-surfaceMid text-navy disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                        title={t('Next Page')}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => { setSelectedBulletinModal(null); setModalPageIndex(0); }}
                    className="w-8 h-8 rounded-full bg-surfaceMid hover:bg-slate-200 flex items-center justify-center text-textMuted hover:text-navy transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Page Selection Tabs (if multi-page) */}
              {totalModalPages > 1 && (
                <div className="px-6 py-2 bg-slate-100/70 border-b border-borderLight flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] font-bold text-textMuted uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                    <Layers size={12} /> Pages:
                  </span>
                  {modalPages.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setModalPageIndex(idx)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        modalPageIndex === idx
                          ? 'bg-oceanBlue text-white shadow-sm'
                          : 'bg-white text-navy hover:bg-slate-200 border border-borderLight/80'
                      }`}
                    >
                      <span>Page {idx + 1}</span>
                      {idx === 0 ? (
                        <span className="text-[10px] opacity-80">(Advisory Text)</span>
                      ) : (
                        <span className="text-[10px] opacity-80">(Weather Chart)</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                {currentModalPage.image_url && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center p-2 group/modalimg">
                    <img
                      src={currentModalPage.image_url}
                      alt={currentModalPage.title}
                      className="max-h-[500px] w-auto object-contain rounded-lg"
                    />
                    {totalModalPages > 1 && (
                      <>
                        <button
                          onClick={() => setModalPageIndex(p => Math.max(0, p - 1))}
                          disabled={modalPageIndex === 0}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur disabled:opacity-0 cursor-pointer transition-all shadow-lg"
                          title={t('Previous Page')}
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          onClick={() => setModalPageIndex(p => Math.min(totalModalPages - 1, p + 1))}
                          disabled={modalPageIndex === totalModalPages - 1}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur disabled:opacity-0 cursor-pointer transition-all shadow-lg"
                          title={t('Next Page')}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {currentModalPage.synoptic_situation && (
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                    <h4 className="text-xs font-bold text-navy mb-1 flex items-center gap-1.5">
                      <FileText size={13} className="text-oceanBlue" />
                      {modalPageIndex === 0 ? 'Synoptic Meteorological Situation' : `Page ${modalPageIndex + 1} Weather Guidance`}
                    </h4>
                    <p className="text-xs text-textSecond leading-relaxed whitespace-pre-line">
                      {currentModalPage.synoptic_situation}
                    </p>
                  </div>
                )}

                {currentModalPage.markdown_content && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-borderLight">
                    <h4 className="text-xs font-bold text-navy mb-2 flex items-center gap-1.5">
                      <FileText size={13} className="text-navy" />
                      Official IMD Transcript (Page {modalPageIndex + 1})
                    </h4>
                    <div className="text-xs text-textSecond font-mono leading-relaxed whitespace-pre-line bg-white p-3 rounded-xl border border-borderLight/60 max-h-60 overflow-y-auto">
                      {currentModalPage.markdown_content}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-borderLight flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  {totalModalPages > 1 && (
                    <>
                      <button
                        onClick={() => setModalPageIndex(p => Math.max(0, p - 1))}
                        disabled={modalPageIndex === 0}
                        className="px-3 py-1.5 rounded-xl border border-borderLight bg-white hover:bg-slate-100 text-xs font-bold text-navy flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                      >
                        <ChevronLeft size={13} /> Previous Page
                      </button>
                      <button
                        onClick={() => setModalPageIndex(p => Math.min(totalModalPages - 1, p + 1))}
                        disabled={modalPageIndex === totalModalPages - 1}
                        className="px-3 py-1.5 rounded-xl border border-borderLight bg-white hover:bg-slate-100 text-xs font-bold text-navy flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                      >
                        Next Page <ChevronRight size={13} />
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedBulletinModal(null); setModalPageIndex(0); }}
                  className="px-4 py-1.5 rounded-xl bg-navy text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close Bulletin
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
