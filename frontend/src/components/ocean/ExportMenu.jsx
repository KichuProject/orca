import React, { useState } from 'react'
import { Download, FileText, Check, Share2, Printer, MapPin } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export default function ExportMenu({ oceanData, safetyData }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { location, vessel, timeOffset, t } = useGlobal()

  const handleExportCSV = () => {
    const isro = oceanData?.isro || {}
    const conditions = safetyData?.conditions || {}
    const rows = [
      ['Parameter', 'Value', 'Unit', 'Source'],
      ['Latitude', location.lat?.toFixed(5), 'deg N', 'User GPS'],
      ['Longitude', location.lon?.toFixed(5), 'deg E', 'User GPS'],
      ['Location Name', `"${location.name}"`, '', 'Nominatim'],
      ['Vessel Profile', vessel, '', 'ORCA Settings'],
      ['Forecast Offset', `+${timeOffset}h`, 'hours', 'Model'],
      ['Sea Surface Temperature', isro.sst_c || conditions.temp_c || 28.9, 'deg C', 'Oceansat-3 / Copernicus'],
      ['Chlorophyll-a', isro.chlorophyll || 0.093, 'mg/m3', 'ISRO OCM-3'],
      ['Significant Wave Height', conditions.wave_m || 0.9, 'm', 'Open-Meteo Marine'],
      ['Wind Speed', conditions.wind_kmh || 11.2, 'km/h', 'Open-Meteo Weather'],
      ['Safety Verdict', safetyData?.verdict || 'SAFE', '', 'ORCA Decision Engine'],
      ['Export Timestamp', new Date().toISOString(), 'UTC', 'ISRO ORCA Platform'],
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `ORCA_Ocean_Telemetry_${location.lat?.toFixed(2)}_${location.lon?.toFixed(2)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setOpen(false)
  }

  const handleCopyTelemetry = () => {
    const isro = oceanData?.isro || {}
    const conditions = safetyData?.conditions || {}
    const sst = isro.sst_c ?? conditions.temp_c ?? 28.5
    const wave = conditions.wave_m ?? 0.9
    const text = `ORCA Marine Intel | ${location.name} (${location.lat?.toFixed(4)}°N, ${location.lon?.toFixed(4)}°E) | SST: ${sst}°C | Wave: ${wave}m | Verdict: ${safetyData?.verdict || 'SAFE'}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="relative pointer-events-auto">
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 rounded-2xl bg-white/95 backdrop-blur-md text-navy border border-borderLight shadow-md hover:bg-surface transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        title="Export GIS view or oceanographic telemetry"
      >
        <Download size={15} className="text-oceanBlue" />
        <span className="hidden sm:inline">{t('Export')}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-borderLight p-2 z-40 animate-slideIn text-xs">
          <div className="text-[10px] font-bold text-textMuted uppercase px-2 py-1 border-b border-borderLight">
            {t('Export Data & View')}
          </div>
          <div className="space-y-1 mt-1">
            <button
              onClick={handleExportCSV}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-surface text-textSecond hover:text-navy cursor-pointer"
            >
              <FileText size={14} className="text-oceanBlue" />
              <div>
                <div className="font-semibold">{t('Export CSV Report')}</div>
                <div className="text-[10px] text-textMuted">{t('Point oceanographic telemetry')}</div>
              </div>
            </button>

            <button
              onClick={handleCopyTelemetry}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-left hover:bg-surface text-textSecond hover:text-navy cursor-pointer"
            >
              {copied ? <Check size={14} className="text-safeGreen" /> : <Share2 size={14} className="text-oceanBlue" />}
              <div>
                <div className="font-semibold">{copied ? t('Copied to Clipboard!') : t('Copy Summary Link')}</div>
                <div className="text-[10px] text-textMuted">{t('Share coordinates & readings')}</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
