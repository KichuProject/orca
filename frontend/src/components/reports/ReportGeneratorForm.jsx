import React, { useState } from 'react'
import { FileText, Ship, User, Navigation, Calendar, Download, Sparkles, CheckCircle2, Clock } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

export const REPORT_TYPES = [
  {
    id: 'clearance',
    title: 'Comprehensive Pre-Voyage Clearance Report',
    desc: 'Full regulatory compliance dossier: wave, wind, cyclone risk, geofence audit and vessel limit check.',
    badge: 'Statutory Safety',
  },
  {
    id: 'fisheries',
    title: 'Fisheries Potential & PFZ Intelligence Briefing',
    desc: 'INCOIS satellite thermal fronts, chlorophyll plume analysis, target pelagic species and nearest landing centres.',
    badge: 'Commercial Operations',
  },
  {
    id: 'ecological',
    title: 'Ecological Impact & Geofence Compliance Assessment',
    desc: 'Marine Protected Area buffers, Ramsar coastal wetlands, coral reef thermal stress and speed mitigation rules.',
    badge: 'Environmental Audit',
  },
  {
    id: 'synoptic',
    title: 'Synoptic Weather & Historical Cyclone Risk Audit',
    desc: '5-day synoptic weather outlook, high CAPE convective energy tracking, and historical storm track intersection analysis.',
    badge: 'Meteorological Analysis',
  },
]

export default function ReportGeneratorForm({ onGenerate }) {
  const { location, vessel, t } = useGlobal()

  const [reportType, setReportType] = useState('clearance')
  const [vesselName, setVesselName] = useState('MV Sagar Shakthi')
  const [regNumber, setRegNumber] = useState('IND-TN-02-MM-8841')
  const [skipperName, setSkipperName] = useState('Capt. K. Ramanathan')
  const [destinationPort, setDestinationPort] = useState('Visakhapatnam Port')
  const [crewCount, setCrewCount] = useState(8)

  const handleSubmit = (e) => {
    e.preventDefault()
  }

  return (
    <div className="p-6 rounded-3xl bg-white border border-borderLight shadow-sm space-y-5">
      {/* Future Development Status Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-amber-900">
        <Clock size={19} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-amber-950 text-xs sm:text-sm">
              {t('To be developed in future')}
            </span>
            <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              {t('Roadmap Preview')}
            </span>
          </div>
          <p className="text-amber-900/85 text-[11px] leading-relaxed">
            {t('official statutory clearance dossiers, digital verification stamps, and certified vessel departure manifests are scheduled for implementation in a future update.')}
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-borderLight">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center">
            <FileText size={17} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy">
              {t('Marine Intelligence Report Generator')}
            </h3>
            <p className="text-[10px] text-textMuted">
              {t('Generate certified voyage clearance and oceanographic assessment dossiers')}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5 self-start sm:self-auto shadow-2xs">
          <Clock size={12} className="text-amber-600" />
          <span>{t('To be developed in future')}</span>
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Report Type Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-navy">{t('Select Report Specification:')}</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {REPORT_TYPES.map(r => {
              const isSelected = reportType === r.id

              return (
                <div
                  key={r.id}
                  onClick={() => setReportType(r.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                    isSelected
                      ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-300/30 shadow-xs'
                      : 'bg-surface/70 hover:bg-surface border-borderLight'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="text-xs font-bold text-navy">{t(r.title)}</h4>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[9px] font-black uppercase text-oceanBlue bg-blue-100 px-2 py-0.5 rounded-full">
                        {t(r.badge)}
                      </span>
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full">
                        {t('To be developed in future')}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-textMuted leading-relaxed">{t(r.desc)}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Vessel & Master Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-borderLight">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-navy flex items-center gap-1">
              <Ship size={12} className="text-oceanBlue" />
              {t('Vessel Name')}
            </label>
            <input
              type="text"
              value={vesselName}
              onChange={e => setVesselName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-2xl border border-borderLight bg-surface font-semibold text-navy focus:outline-none focus:border-oceanBlue focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-navy">{t('Official Reg No.')}</label>
            <input
              type="text"
              value={regNumber}
              onChange={e => setRegNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-2xl border border-borderLight bg-surface font-semibold text-navy focus:outline-none focus:border-oceanBlue focus:bg-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-navy flex items-center gap-1">
              <User size={12} className="text-safeGreen" />
              {t('Skipper / Master')}
            </label>
            <input
              type="text"
              value={skipperName}
              onChange={e => setSkipperName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-2xl border border-borderLight bg-surface font-semibold text-navy focus:outline-none focus:border-oceanBlue focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-navy flex items-center gap-1">
              <Navigation size={12} className="text-dangerRed" />
              {t('Destination Port / Offshore Sector')}
            </label>
            <input
              type="text"
              value={destinationPort}
              onChange={e => setDestinationPort(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-2xl border border-borderLight bg-surface font-semibold text-navy focus:outline-none focus:border-oceanBlue focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-navy">{t('Total Persons on Board (POB)')}</label>
            <input
              type="number"
              min="1"
              max="150"
              value={crewCount}
              onChange={e => setCrewCount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-2xl border border-borderLight bg-surface font-semibold text-navy focus:outline-none focus:border-oceanBlue focus:bg-white font-mono"
            />
          </div>
        </div>

        {/* Future Development Notice & Button */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-borderLight">
          <span className="text-[11px] font-medium text-textMuted flex items-center gap-1.5 text-center sm:text-left">
            <Clock size={13} className="text-amber-500 flex-shrink-0" />
            <span>{t('official certified dossier generation will be enabled in upcoming release.')}</span>
          </span>
          <button
            type="button"
            disabled
            id="generate-marine-report-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300/80 text-xs font-bold cursor-not-allowed shadow-2xs opacity-95"
            title={t('To be developed in future')}
          >
            <Clock size={14} className="text-amber-700" />
            <span>{t('To be developed in future')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
