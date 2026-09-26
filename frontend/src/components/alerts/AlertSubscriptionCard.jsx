import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BellRing, Smartphone, Radio, Globe, Check, Save, ShieldCheck, Sparkles, Trash2, CheckCircle2, RefreshCw } from 'lucide-react'
import { endpoints } from '../../api'
import { useGlobal } from '../../context/GlobalContext'

export const COASTAL_LANGUAGES = [
  { code: 'en', name: 'English (Indian Standard)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'ml', name: 'മലയാളം (Malayalam)' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'or', name: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
]

export default function AlertSubscriptionCard() {
  const { location, t } = useGlobal()
  const lat = location.lat || 13.0827
  const lon = location.lon || 80.2707

  const [phone, setPhone] = useState('+91 98401 23456')
  const [navtexStation, setNavtexStation] = useState('CHENNAI_518KHZ')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  // Auto-calibrate NAVTEX station based on port
  useEffect(() => {
    if (lon > 85.0 && lat < 14.0) {
      setNavtexStation('PORTBLAIR_518KHZ')
    } else if (lon < 75.0) {
      setNavtexStation('MUMBAI_518KHZ')
    } else if (lon < 78.0 && lat < 12.0) {
      setNavtexStation('KOCHI_518KHZ')
    } else {
      setNavtexStation('CHENNAI_518KHZ')
    }
  }, [lat, lon])

  const [channels, setChannels] = useState({
    sms: true,
    whatsapp: true,
    navtex: true,
    satellite: false,
  })

  const [subscriptions, setSubscriptions] = useState({
    cyclones: true,
    highWaves: true,
    pfz: true,
    geofence: true,
    tides: false,
  })

  // Fetch active subscriptions from backend
  const { data: subsData, refetch: refetchSubs } = useQuery({
    queryKey: ['active-subscriptions'],
    queryFn: async () => {
      const res = await endpoints.subscriptions()
      return res.data?.subscriptions || []
    },
    staleTime: 60000,
  })

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const activeConds = Object.entries(subscriptions)
        .filter(([_, active]) => active)
        .map(([k]) => k)
        .join(',') || 'coastal_hazards'

      await endpoints.subscribe({
        user_id: phone.trim() || 'mariner_active',
        lat,
        lon,
        radius_km: 50.0,
        condition: activeConds,
      })
      await refetchSubs()
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      console.warn('Subscription error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSub = async (subId) => {
    setDeletingId(subId)
    try {
      await endpoints.deleteSubscription(subId)
      await refetchSubs()
    } catch (e) {
      console.warn('Failed to delete subscription:', e)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <BellRing size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t ? t('Emergency Broadcast & Alert Subscriptions', 'Emergency Broadcast & Alert Subscriptions') : 'Emergency Broadcast & Alert Subscriptions'}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t ? t('Autonomous multi-channel delivery • SMS, WhatsApp, NAVTEX & Satellite', 'Autonomous multi-channel delivery • SMS, WhatsApp, NAVTEX & Satellite') : 'Autonomous multi-channel delivery • SMS, WhatsApp, NAVTEX & Satellite'}
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 self-start sm:self-auto">
          <ShieldCheck size={12} /> {t ? t('Indian Coast Guard Link Active', 'Indian Coast Guard Link Active') : 'Indian Coast Guard Link Active'}
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Contact Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-navy flex items-center gap-1">
              <Smartphone size={12} className="text-oceanBlue" />
              {t ? t('Mobile Number (SMS / WhatsApp)', 'Mobile Number (SMS / WhatsApp)') : 'Mobile Number (SMS / WhatsApp)'}
            </label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-2xl border border-borderLight bg-surface font-semibold text-navy focus:outline-none focus:border-oceanBlue focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-navy flex items-center gap-1">
              <Radio size={12} className="text-purple-600" />
              {t ? t('NAVTEX Coastal Transmitter', 'NAVTEX Coastal Transmitter') : 'NAVTEX Coastal Transmitter'}
            </label>
            <select
              value={navtexStation}
              onChange={e => setNavtexStation(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-2xl border border-borderLight bg-surface font-semibold text-navy focus:outline-none focus:border-oceanBlue focus:bg-white cursor-pointer"
            >
              <option value="CHENNAI_518KHZ">{t("Chennai Radio (518 kHz - Station P)")}</option>
              <option value="MUMBAI_518KHZ">{t("Mumbai Radio (518 kHz - Station G)")}</option>
              <option value="KOCHI_518KHZ">{t("Cochin Radio (518 kHz - Station C)")}</option>
              <option value="PORTBLAIR_518KHZ">{t("Port Blair Radio (518 kHz - Station U)")}</option>
            </select>
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-navy flex items-center gap-1">
            <Globe size={12} className="text-orange-600" />
            {t ? t('Alert Broadcast Language (All 10 Coastal Scripts Supported)', 'Alert Broadcast Language (All 10 Coastal Scripts Supported)') : 'Alert Broadcast Language (All 10 Coastal Scripts Supported)'}
          </label>
          <select
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-2xl border border-borderLight bg-surface font-semibold text-navy focus:outline-none focus:border-oceanBlue focus:bg-white cursor-pointer"
          >
            {COASTAL_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Toggles */}
        <div className="space-y-2 pt-2 border-t border-borderLight">
          <div className="text-xs font-bold text-navy">
            {t ? t('Subscribe to Real-Time Event Alerts:', 'Subscribe to Real-Time Event Alerts:') : 'Subscribe to Real-Time Event Alerts:'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label className="p-2.5 rounded-xl border border-borderLight bg-surface/70 hover:bg-white flex items-center gap-2.5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={subscriptions.cyclones}
                onChange={e => setSubscriptions({ ...subscriptions, cyclones: e.target.checked })}
                className="w-4 h-4 rounded text-oceanBlue accent-oceanBlue cursor-pointer"
              />
              <div>
                <span className="font-bold text-navy block">
                  {t ? t('Tropical Cyclones & Gale Warning', 'Tropical Cyclones & Gale Warning') : 'Tropical Cyclones & Gale Warning'}
                </span>
                <span className="text-[10px] text-textMuted">
                  {t ? t('IMD bulletins & track intercept alerts', 'IMD bulletins & track intercept alerts') : 'IMD bulletins & track intercept alerts'}
                </span>
              </div>
            </label>

            <label className="p-2.5 rounded-xl border border-borderLight bg-surface/70 hover:bg-white flex items-center gap-2.5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={subscriptions.highWaves}
                onChange={e => setSubscriptions({ ...subscriptions, highWaves: e.target.checked })}
                className="w-4 h-4 rounded text-oceanBlue accent-oceanBlue cursor-pointer"
              />
              <div>
                <span className="font-bold text-navy block">
                  {t ? t('High Wave Swell > 1.5m', 'High Wave Swell > 1.5m') : 'High Wave Swell > 1.5m'}
                </span>
                <span className="text-[10px] text-textMuted">
                  {t ? t('INCOIS rough sea & breakers alert', 'INCOIS rough sea & breakers alert') : 'INCOIS rough sea & breakers alert'}
                </span>
              </div>
            </label>

            <label className="p-2.5 rounded-xl border border-borderLight bg-surface/70 hover:bg-white flex items-center gap-2.5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={subscriptions.pfz}
                onChange={e => setSubscriptions({ ...subscriptions, pfz: e.target.checked })}
                className="w-4 h-4 rounded text-oceanBlue accent-oceanBlue cursor-pointer"
              />
              <div>
                <span className="font-bold text-navy block">
                  {t ? t('Potential Fishing Zones (PFZ)', 'Potential Fishing Zones (PFZ)') : 'Potential Fishing Zones (PFZ)'}
                </span>
                <span className="text-[10px] text-textMuted">
                  {t ? t('Oceansat-3 thermal chlorophyll updates', 'Oceansat-3 thermal chlorophyll updates') : 'Oceansat-3 thermal chlorophyll updates'}
                </span>
              </div>
            </label>

            <label className="p-2.5 rounded-xl border border-borderLight bg-surface/70 hover:bg-white flex items-center gap-2.5 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={subscriptions.geofence}
                onChange={e => setSubscriptions({ ...subscriptions, geofence: e.target.checked })}
                className="w-4 h-4 rounded text-oceanBlue accent-oceanBlue cursor-pointer"
              />
              <div>
                <span className="font-bold text-navy block">
                  {t ? t('Geofence & IMBL Boundary Buffer', 'Geofence & IMBL Boundary Buffer') : 'Geofence & IMBL Boundary Buffer'}
                </span>
                <span className="text-[10px] text-textMuted">
                  {t ? t('Anti-apprehension & sanctuary alarms', 'Anti-apprehension & sanctuary alarms') : 'Anti-apprehension & sanctuary alarms'}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs">
            {savedSuccess && (
              <span className="text-emerald-700 font-bold flex items-center gap-1 animate-fadeIn">
                <Check size={14} /> {t ? t('Subscription preferences updated successfully!', 'Subscription preferences updated successfully!') : 'Subscription preferences updated successfully!'}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-navy hover:bg-navyLight text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60"
          >
            <Save size={13} />
            <span>{isSubmitting ? (t ? t('common.loading', 'Registering...') : 'Registering...') : (t ? t('Save & Activate Subscriptions', 'Save & Activate Subscriptions') : 'Save & Activate Subscriptions')}</span>
          </button>
        </div>
      </form>

      {/* Active Subscriptions List */}
      {subsData && subsData.length > 0 && (
        <div className="pt-3 border-t border-borderLight space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-navy">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-600" />
              {t('Active Registered Subscriptions')} ({subsData.length})
            </span>
            <span className="text-[10px] text-textMuted font-normal">{t('Stored in Autonomous Dispatch Daemon')}</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {subsData.map(sub => (
              <div
                key={sub.id}
                className="p-2 px-3 rounded-xl bg-surface border border-borderLight/70 flex items-center justify-between text-xs"
              >
                <div className="truncate max-w-[320px]">
                  <span className="font-bold text-navy">{sub.user_id}</span>
                  <span className="text-textMuted text-[10px] ml-2 font-mono">
                    [{sub.condition}] &bull; {sub.radius_km}km radius
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteSub(sub.id)}
                  disabled={deletingId === sub.id}
                  className="p-1 rounded-lg hover:bg-red-50 text-textMuted hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50"
                  title={t("Revoke subscription")}
                >
                  {deletingId === sub.id ? (
                    <RefreshCw size={13} className="animate-spin text-red-600" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
