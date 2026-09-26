import React, { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useGlobal } from '../../context/GlobalContext'
import { endpoints } from '../../api'
import SystemStatus from './SystemStatus'
import LocationSelector from './LocationSelector'
import NotificationCenter from '../notifications/NotificationCenter'
import {
  Bell, Globe, HelpCircle, Menu, X, ChevronDown, Waves, Check
} from 'lucide-react'

import { LANGUAGES } from '../../i18n/translations'

export default function TopNav() {
  const {
    alertCount,
    setAlertCount,
    language,
    setLanguage,
    sidebarOpen,
    setSidebarOpen,
    location,
    vessel,
    t,
    seenAlertIds,
    dismissedAlertIds,
    markAlertsAsSeen
  } = useGlobal()
  const routerLocation = useLocation()
  const [langOpen, setLangOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const langMenuRef = useRef(null)

  const lat = location?.lat || 13.0827
  const lon = location?.lon || 80.2707

  // ── Real-time Notification Engine Query ─────────────────────────
  const {
    data: notifData,
    isLoading: notifLoading,
    refetch: refetchNotifs
  } = useQuery({
    queryKey: ['notifications-active', lat, lon, vessel],
    queryFn: async () => {
      const res = await endpoints.notificationsActive(lat, lon, vessel)
      return res.data
    },
    refetchInterval: 30000,
  })

  const rawNotifications = notifData?.active_notifications || []
  // Filter out any dismissed notifications
  const notifications = rawNotifications.filter(n => !dismissedAlertIds?.has(n.id))
  
  // Unread notifications are active, not dismissed, and not in seenAlertIds
  const unreadNotifications = notifications.filter(n => !seenAlertIds?.has(n.id))
  const isAlertsPage = routerLocation.pathname === '/alerts'
  const unreadCount = isAlertsPage ? 0 : unreadNotifications.length
  const hasUnreadCritical = !isAlertsPage && unreadNotifications.some(n => n.severity === 'CRITICAL')

  // Synchronize alertCount for Sidebar
  useEffect(() => {
    if (setAlertCount) {
      setAlertCount(unreadCount)
    }
  }, [unreadCount, setAlertCount])

  // When visiting the /alerts page, mark all current active alerts as seen
  useEffect(() => {
    if (isAlertsPage && notifications.length > 0 && markAlertsAsSeen) {
      markAlertsAsSeen(notifications.map(n => n.id))
    }
  }, [isAlertsPage, notifications, markAlertsAsSeen])

  const handleToggleNotif = () => {
    setNotifOpen(prev => {
      const nextState = !prev
      if (nextState && notifications.length > 0 && markAlertsAsSeen) {
        markAlertsAsSeen(notifications.map(n => n.id))
      }
      return nextState
    })
  }

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0]

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target)) {
        setLangOpen(false)
      }
    }
    if (langOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [langOpen])

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-borderLight shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 gap-4">

        {/* ── Left: Brand & ISRO Emblem ─────────────────────────── */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          {/* ISRO emblem */}
          {/* <div className="flex items-center gap-2 pr-3 border-r border-borderLight">
            <div className="flex flex-col items-center leading-none">
              <span className="text-[11px] font-extrabold text-saffron tracking-wider">इसरो</span>
              <span className="text-[9px] font-bold text-oceanBlue tracking-widest">ISRO</span>
            </div>
          </div> */}

          {/* ORCA Logo + Title */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 flex-shrink-0">
              <div className="w-9 h-9 rounded-2xl bg-navy flex items-center justify-center shadow-xs">
                <Waves size={18} className="text-saffron" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full bg-oceanBlue" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-lg md:text-xl font-black text-navy tracking-tight leading-none">ORCA</div>
              <div className="text-[10.5px] font-bold text-navy/90 leading-tight">
                {t ? t('topnav.subtitle', 'Oceanographic AI & Maritime Safety Platform') : 'Oceanographic AI & Maritime Safety Platform'}
              </div>
              {/* <div className="text-[9px] text-textMuted font-medium leading-none hidden lg:block">
                {t ? t('topnav.tagline', 'Autonomous Marine Decision Support') : 'Autonomous Marine Decision Support'}
              </div> */}
            </div>
          </div>
        </div>

        {/* ── Center: Location Component ─────────────────────────── */}
        <div className="flex items-center justify-center flex-1 max-w-2xl lg:max-w-3xl mx-2">
          <LocationSelector />
        </div>

        {/* ── Right: Status + Alerts + Language + Help + Toggle ──── */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* System status */}
          <div className="hidden sm:flex items-center px-2 py-1 rounded-xl bg-surface/80 border border-borderLight shadow-2xs mr-1">
            <SystemStatus compact />
          </div>

          <div className="w-px h-6 bg-borderLight hidden sm:block" />

          {/* Active Proactive Notification Bell */}
          <button
            id="alert-bell-btn"
            onClick={handleToggleNotif}
            className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer border ${
              hasUnreadCritical
                ? 'bg-red-50 text-dangerRed border-dangerRed/40 ring-2 ring-red-100 shadow-xs'
                : unreadCount > 0
                ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-xs'
                : 'hover:bg-surface text-textSecond hover:text-navy border-transparent hover:border-borderLight'
            }`}
            aria-label={`${unreadCount} unread marine alerts`}
            title="Open Proactive Notification Center"
          >
            <div className="relative">
              <Bell size={17} className={hasUnreadCritical ? 'animate-bounce text-dangerRed' : unreadCount > 0 ? 'text-amber-600 animate-swing' : 'text-textSecond'} />
              {unreadCount > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] rounded-full text-white text-[9.5px] font-black flex items-center justify-center px-0.5 leading-none shadow-sm ${
                  hasUnreadCritical ? 'bg-dangerRed animate-pulse' : 'bg-amber-600'
                }`}>
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="hidden xl:inline text-xs font-bold">
              {hasUnreadCritical ? 'Critical' : t ? t('topnav.alerts', 'Alerts') : 'Alerts'}
            </span>
          </button>

          {/* Language selector dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              id="language-btn"
              onClick={() => setLangOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer select-none ${
                langOpen
                  ? 'bg-blue-50 border-oceanBlue text-oceanBlue shadow-xs ring-2 ring-blue-100'
                  : 'bg-surface/70 hover:bg-surface border-borderLight text-navy hover:text-oceanBlue'
              }`}
              title="Change Language"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
            >
              <Globe size={14} className="text-oceanBlue flex-shrink-0" />
              <span className="leading-none">{currentLang.native || currentLang.name}</span>
              <ChevronDown size={12} className={`text-textMuted transition-transform duration-150 ${langOpen ? 'rotate-180 text-oceanBlue' : ''}`} />
            </button>

            {langOpen && (
              <div
                id="language-dropdown-menu"
                role="listbox"
                className="absolute right-0 top-11 w-52 sm:w-56 bg-white rounded-2xl shadow-2xl border border-borderLight z-50 p-1.5 max-h-[75vh] overflow-y-auto animate-slideIn"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-textMuted border-b border-borderLight mb-1">
                  {t ? t('Select Language', 'Select Language') : 'Select Language'}
                </div>
                {LANGUAGES.map(lang => {
                  const isSelected = language === lang.code
                  return (
                    <button
                      key={lang.code}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setLanguage(lang.code)
                        setLangOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/90 text-oceanBlue font-bold shadow-xs'
                          : 'text-navy hover:bg-surface hover:text-oceanBlue'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm leading-none">{lang.native}</span>
                        <span className="text-[10.5px] text-textMuted font-normal truncate">({lang.name})</span>
                      </div>
                      {isSelected && (
                        <Check size={14} className="text-oceanBlue flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Help */}
          {/* <button
            id="help-btn"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-surface text-textSecond hover:text-navy transition-colors text-xs font-semibold cursor-pointer"
          >
            <HelpCircle size={16} />
            <span className="hidden sm:inline">{t ? t('topnav.help', 'Help') : 'Help'}</span>
          </button> */}

          <div className="w-px h-6 bg-borderLight" />

          {/* Sidebar toggle */}
          <button
            id="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl hover:bg-surface text-textSecond hover:text-navy transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── Slide-Down In-Dashboard Notification Center Modal ──── */}
      <NotificationCenter
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        isLoading={notifLoading}
        refetchNotifications={refetchNotifs}
        activeOverridesCount={notifData?.simulated_overrides_count || 0}
      />
    </header>
  )
}

