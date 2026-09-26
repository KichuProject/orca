import React, { useEffect } from 'react'
import { Bell, MapPin, RefreshCw, ShieldAlert, Radio, BellRing } from 'lucide-react'
import { useGlobal } from '../context/GlobalContext'
import ActiveMarineAlertsCard from '../components/alerts/ActiveMarineAlertsCard'
import AlertsFeedCard from '../components/alerts/AlertsFeedCard'
import AlertSubscriptionCard from '../components/alerts/AlertSubscriptionCard'

export default function AlertsPage() {
  const { location, t, setAlertCount } = useGlobal()
  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  useEffect(() => {
    if (setAlertCount) {
      setAlertCount(0)
    }
  }, [setAlertCount])

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-12">
      {/* ── Top Header Strip ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shadow-xs flex-shrink-0">
            <BellRing size={19} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-navy leading-tight tracking-tight">
              {t ? t('pages.alerts_title', 'Active Marine Alerts & Weather Warnings') : 'Active Marine Alerts & Weather Warnings'}
            </h1>
            <p className="text-[11px] text-textMuted mt-0.5 flex items-center gap-1">
              <MapPin size={11} className="text-oceanBlue" />
              {t ? t('common.coordinates', 'Active Surveillance Sector') : 'Active Surveillance Sector'}: <strong className="text-navy">{location.name}</strong> ({lat.toFixed(4)}°N, {lon.toFixed(4)}°E)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-2xl bg-white border border-borderLight text-textMuted font-mono flex items-center gap-1.5">
            <Radio size={12} className="text-oceanBlue animate-pulse" />
            <span>{t ? t('NAVTEX 518 kHz Broadcast Active', 'NAVTEX 518 kHz Broadcast Active') : 'NAVTEX 518 kHz Broadcast Active'}</span>
          </span>
        </div>
      </div>

      {/* ── 1. Proactive Active Marine Alerts Dashboard (Feature 27 & 28) ── */}
      <ActiveMarineAlertsCard />

      {/* ── 2. Live Tactical Alert Feed ────────────────────────────── */}
      <AlertsFeedCard />

      {/* ── 3. Multi-Channel Emergency Subscription Manager ────────── */}
      <AlertSubscriptionCard />
    </div>
  )
}
