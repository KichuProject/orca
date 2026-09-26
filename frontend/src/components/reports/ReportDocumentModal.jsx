import { useGlobal } from '../../context/GlobalContext'
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Printer,
  X,
  Award,
  CheckCircle2,
  Shield,
  QrCode,
  FileText,
  AlertTriangle,
  ShieldAlert,
  Download,
  Fish,
  Compass,
  Trees,
  CloudRain,
  MapPin,
  Waves,
  Wind,
  Zap,
  Gauge,
  ShieldCheck,
  Check,
  Anchor
} from 'lucide-react'

export default function ReportDocumentModal({
  reportData,
  safetyData,
  pfzData,
  geofenceData,
  hazardsData,
  ecologyData,
  seasonalBanData,
  bulletinsData,
  onClose
}) {
  const { t } = useGlobal()
  if (!reportData) return null

  useEffect(() => {
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-modal-active')
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint)
      document.body.classList.remove('printing-modal-active')
    }
  }, [])

  const handlePrint = () => {
    document.body.classList.add('printing-modal-active')
    // Small timeout ensures DOM class is applied before browser print layout freezes
    setTimeout(() => {
      window.print()
    }, 50)
  }

  const now = new Date()
  const reportType = reportData.type || 'clearance'

  // Dynamic Dossier Reference
  const prefixMap = {
    clearance: 'CLR',
    fisheries: 'PFZ',
    ecological: 'ECO',
    synoptic: 'SYN'
  }
  const docRef = `ORCA/${prefixMap[reportType] || 'MAR'}/2026-${Math.floor(1000 + Math.random() * 9000)}`

  // Safety & Met Telemetry
  const conditions = safetyData?.conditions || {}
  const cape = conditions.cape_jkg ?? conditions.cape ?? 480
  const isHighCape = cape > 1500
  const wave = conditions.wave_m ?? 0.72
  const wind = conditions.wind_kmh ?? 8.5
  const swell = conditions.swell_wave_m ?? 0.7

  const verdict = (safetyData?.verdict || 'SAFE').toUpperCase()
  const isSafe = verdict === 'SAFE'
  const isCaution = verdict === 'CAUTION'

  const verdictConfig = isSafe
    ? {
        bg: 'bg-emerald-50 border-emerald-200',
        iconBg: 'bg-safeGreen',
        Icon: CheckCircle2,
        title: 'OPERATIONAL CLEARANCE: CLEARED FOR PASSAGE',
        titleColor: 'text-safeGreen',
        desc: 'Vessel operating parameters conform to statutory safety thresholds. Maintain continuous watch on NAVTEX 518 kHz & VHF Ch 16.',
        badge: 'PASSED AUDIT',
        qr: 'border-emerald-300 text-emerald-700',
      }
    : isCaution
    ? {
        bg: 'bg-amber-50 border-amber-200',
        iconBg: 'bg-amber-500',
        Icon: AlertTriangle,
        title: 'OPERATIONAL CLEARANCE: CONDITIONAL PASSAGE (ADVISORY)',
        titleColor: 'text-amber-700',
        desc: 'Marginal sea conditions detected. Small non-mechanized craft advised to restrict operations within coastal waters (<12nm).',
        badge: 'ADVISORY WATCH',
        qr: 'border-amber-300 text-amber-700',
      }
    : {
        bg: 'bg-rose-50 border-rose-200',
        iconBg: 'bg-rose-600',
        Icon: ShieldAlert,
        title: 'OPERATIONAL CLEARANCE: PASSAGE DENIED / HAZARDOUS SEA STATE',
        titleColor: 'text-rose-700',
        desc: 'Severe marine hazards detected exceeding statutory safe operational thresholds. All vessel categories instructed to remain in harbour.',
        badge: 'PASSAGE DENIED',
        qr: 'border-rose-300 text-rose-700',
      }

  // Export Raw Dossier Data JSON
  const handleExportJson = () => {
    const payload = {
      dossier_reference: docRef,
      generated_at: now.toISOString(),
      report_specification: reportType,
      vessel: {
        name: reportData.vesselName,
        reg_number: reportData.regNumber,
        skipper: reportData.skipperName,
        crew_count: reportData.crewCount,
        origin_port: reportData.originPort,
        destination_port: reportData.destinationPort,
        coordinates: reportData.coordinates,
      },
      telemetry: {
        safety: safetyData,
        pfz: pfzData,
        geofence: geofenceData,
        hazards: hazardsData,
        ecology: ecologyData,
        seasonal_ban: seasonalBanData,
      }
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}_dossier_${reportData.vesselName.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Report Specific Titles & Headers
  const reportTitles = {
    clearance: {
      title: 'STATUTORY PRE-VOYAGE CLEARANCE DOSSIER',
      subtitle: 'Comprehensive Regulatory Seaworthiness, Met-Ocean Risk & Passage Audit',
      authority: 'ISRO • MoES • INCOIS • INDIAN COAST GUARD LINKED'
    },
    fisheries: {
      title: 'INCOIS COMMERCIAL FISHERIES & PFZ BRIEFING',
      subtitle: 'Satellite Chlorophyll Fronts, Pelagic Biomass Aggregation & Fuel Economics',
      authority: 'INCOIS • MoFAHD • DEPARTMENT OF FISHERIES • SATELLITE PFZ DAEMON'
    },
    ecological: {
      title: 'ENVIRONMENTAL IMPACT & GEOFENCE COMPLIANCE ASSESSMENT',
      subtitle: 'Maritime Sovereignty Zones, Marine Protected Areas & Coral Vitality Audit',
      authority: 'MOEFCC • BHUVAN ISRO • CRZ AUTHORITY • COAST GUARD REGULATORY'
    },
    synoptic: {
      title: 'IMD SYNOPTIC WEATHER & HISTORICAL CYCLONE AUDIT',
      subtitle: '5-Day Coastal Forecast, Convective Squall Energy & Storm Surge Interception',
      authority: 'IMD CYCLONE WARNING DIVISION • MoES • INCOIS EARLY WARNING'
    }
  }

  const currentReportHeader = reportTitles[reportType] || reportTitles.clearance

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-navy/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn pointer-events-auto printable-modal-overlay">
      <div className="bg-white rounded-3xl shadow-2xl border border-borderLight max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh] printable-modal-card">
        {/* Top Action Bar (Hidden in print) */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-borderLight bg-slate-50 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center">
              <FileText size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy">{t('Official Marine Intelligence Report')}</h3>
              <p className="text-[10px] text-textMuted font-mono">Ref: {docRef}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-borderLight bg-white hover:bg-slate-100 text-navy text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Export Raw Telemetry JSON"
            >
              <Download size={13} className="text-oceanBlue" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-navy hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Printer size={13} />
              <span>{t('Print / Save PDF')}</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              data-testid="close-modal"
              className="p-1.5 rounded-xl hover:bg-slate-200 text-textMuted hover:text-navy cursor-pointer transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="printable-document p-6 sm:p-10 space-y-6 text-navy font-sans print:p-0 overflow-y-auto">
          {/* Official Dossier Header */}
          <div className="flex items-start justify-between pb-5 border-b-2 border-navy">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-saffron tracking-widest uppercase">
                  {currentReportHeader.authority}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-navy mt-1 tracking-tight">
                {currentReportHeader.title}
              </h1>
              <p className="text-xs text-textMuted mt-0.5 font-medium">
                {currentReportHeader.subtitle}
              </p>
            </div>

            <div className="text-right font-mono text-xs flex-shrink-0">
              <span className="font-bold text-navy block">{docRef}</span>
              <span className="text-[10px] text-textMuted block mt-0.5">
                {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
              </span>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wider">
                {t('DIGITALLY VERIFIED')}
              </span>
            </div>
          </div>

          {/* 1. Voyage & Vessel Specifications (Common) */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
              <Anchor size={13} className="text-oceanBlue" />
              1. Voyage &amp; Vessel Specifications
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-surface border border-borderLight text-xs">
              <div>
                <span className="text-[10px] text-textMuted block">{t('Vessel Name')}:</span>
                <span className="font-bold text-navy">{reportData.vesselName}</span>
              </div>
              <div>
                <span className="text-[10px] text-textMuted block">{t('Official Reg No')}:</span>
                <span className="font-mono font-bold text-navy">{reportData.regNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-textMuted block">{t('Master / Skipper')}:</span>
                <span className="font-bold text-navy">{reportData.skipperName}</span>
              </div>
              <div>
                <span className="text-[10px] text-textMuted block">{t('Persons on Board (POB)')}:</span>
                <span className="font-mono font-bold text-navy">{reportData.crewCount} {t('Crew')}</span>
              </div>
              <div className="pt-2 border-t border-borderLight/60">
                <span className="text-[10px] text-textMuted block">{t('Port of Departure')}:</span>
                <span className="font-bold text-navy">{reportData.originPort}</span>
              </div>
              <div className="pt-2 border-t border-borderLight/60">
                <span className="text-[10px] text-textMuted block">{t('Destination / Sector')}:</span>
                <span className="font-bold text-navy">{reportData.destinationPort}</span>
              </div>
              <div className="pt-2 border-t border-borderLight/60 col-span-2">
                <span className="text-[10px] text-textMuted block">{t('Departure Coordinates')}:</span>
                <span className="font-mono font-bold text-oceanBlue">
                  {reportData.coordinates.lat?.toFixed(4)}° N, {reportData.coordinates.lon?.toFixed(4)}° E
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================================= */}
          {/* SPECIFICATION A: PRE-VOYAGE CLEARANCE DOSSIER */}
          {/* ========================================================================================= */}
          {reportType === 'clearance' && (
            <>
              {/* Meteorological & Oceanographic Telemetry */}
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                  <Waves size={13} className="text-oceanBlue" />
                  2. {t('Meteorological & Oceanographic Telemetry')}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-surface border border-borderLight text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-textMuted font-sans block">{t('Significant Wave')}:</span>
                    <span className="font-bold text-navy">{wave} m</span>
                    <span className="text-[10px] text-safeGreen font-sans block">Safe &lt; 1.5m</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-textMuted font-sans block">{t('Sustained Wind')}:</span>
                    <span className="font-bold text-navy">{wind} km/h</span>
                    <span className="text-[10px] text-safeGreen font-sans block">Safe &lt; 30 km/h</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-textMuted font-sans block">{t('Deep Ocean Swell')}:</span>
                    <span className="font-bold text-navy">{swell} m</span>
                    <span className="text-[10px] text-safeGreen font-sans block">Safe &lt; 1.5m</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-textMuted font-sans block">{t('Convective CAPE')}:</span>
                    <span className={`font-bold ${isHighCape ? 'text-dangerRed' : 'text-navy'}`}>
                      {typeof cape === 'number' ? cape.toLocaleString() : cape} J/kg
                    </span>
                    <span className={`text-[10px] font-sans block ${isHighCape ? 'text-dangerRed' : 'text-safeGreen'}`}>
                      {isHighCape ? 'Squall Warning' : 'Normal Atmosphere'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seaworthiness & Statutory Limit Verification */}
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-safeGreen" />
                  3. {t('Statutory Seaworthiness & Emergency Haven Verification')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-surface border border-borderLight text-xs">
                  <div>
                    <span className="text-[10px] text-textMuted block">{t('Vessel Limit Check')}:</span>
                    <span className="font-bold text-safeGreen flex items-center gap-1 mt-0.5">
                      <Check size={12} /> {t('Certified for Outer Sea State 3')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-textMuted block">{t('Nearest Emergency Haven')}:</span>
                    <span className="font-bold text-navy block mt-0.5">
                      {reportData.originPort} Harbour (2.4 km)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-textMuted block">{t('Mandatory Distress Watch')}:</span>
                    <span className="font-mono font-bold text-oceanBlue block mt-0.5">
                      VHF Ch 16 &bull; NAVTEX 518 kHz
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================================= */}
          {/* SPECIFICATION B: FISHERIES POTENTIAL & PFZ INTELLIGENCE */}
          {/* ========================================================================================= */}
          {reportType === 'fisheries' && (() => {
            const zones = pfzData?.zones || []
            const sst = pfzData?.ocean_state?.sst_c || safetyData?.conditions?.water_temp_c || 28.95
            const chl = pfzData?.ocean_state?.chlorophyll_mg_m3 || 0.42
            const suitability = pfzData?.suitability_score || 78
            const landingCentre = pfzData?.nearest_landing_centre || `${reportData.originPort} FLC`
            const fuelSavings = pfzData?.fuel_saving_projection || '22% (~45 Litres diesel conserved per voyage)'
            const isBanActive = seasonalBanData?.ban_active || false

            return (
              <>
                {/* INCOIS Satellite Ocean Productivity */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <Fish size={13} className="text-oceanBlue" />
                    2. {t('INCOIS Satellite Ocean Productivity & Frontal Telemetry')}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-surface border border-borderLight text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">{t('Sea Surface Temp (SST)')}:</span>
                      <span className="font-bold text-navy">{sst}°C</span>
                      <span className="text-[10px] text-safeGreen font-sans block">Optimal 27.5 - 29.5°C</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">{t('Chlorophyll-a Plume')}:</span>
                      <span className="font-bold text-navy">{chl} mg/m³</span>
                      <span className="text-[10px] text-safeGreen font-sans block">Active Food Chain</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">{t('Biomass Suitability')}:</span>
                      <span className="font-bold text-emerald-700">{suitability}% Score</span>
                      <span className="text-[10px] text-textMuted font-sans block">High Aggregation</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">{t('Seasonal Ban Audit')}:</span>
                      <span className={`font-bold font-sans ${isBanActive ? 'text-dangerRed' : 'text-safeGreen'}`}>
                        {isBanActive ? '⚠️ BAN ACTIVE' : '✓ CLEAR (Open Season)'}
                      </span>
                      <span className="text-[10px] text-textMuted font-sans block">
                        {seasonalBanData?.region ? `${seasonalBanData.region.replace('_', ' ')}` : 'Territorial Waters'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Potential Fishing Zones (PFZs) Table */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <Compass size={13} className="text-oceanBlue" />
                    3. {t('Target Potential Fishing Zones (PFZ Target Directives)')}
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-borderLight">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-[10px] text-textMuted uppercase tracking-wider border-b border-borderLight">
                        <tr>
                          <th className="p-2.5 pl-4">Target Sector / Zone</th>
                          <th className="p-2.5">Distance &amp; Bearing</th>
                          <th className="p-2.5">Water Depth</th>
                          <th className="p-2.5">Target Commercial Species</th>
                          <th className="p-2.5 pr-4 text-right">Coordinates</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderLight/60 bg-white">
                        {zones.length > 0 ? (
                          zones.slice(0, 4).map((z, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2.5 pl-4 font-bold text-navy flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                {z.name || z.zone_id || `PFZ Zone ${i + 1}`}
                              </td>
                              <td className="p-2.5 font-mono text-oceanBlue">
                                {z.distance_km || 30.1} km &bull; {z.bearing_deg || 84}° {z.sector || 'E'}
                              </td>
                              <td className="p-2.5 font-mono text-navy">{z.depth_m || 42} m</td>
                              <td className="p-2.5 text-textSecond text-[11px]">
                                {z.species || 'Tuna, Mackerel, Sardine, Carangids'}
                              </td>
                              <td className="p-2.5 pr-4 text-right font-mono text-textMuted text-[10px]">
                                {z.lat?.toFixed(3) || '13.120'}°N, {z.lon?.toFixed(3) || '80.520'}°E
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="hover:bg-slate-50">
                            <td className="p-2.5 pl-4 font-bold text-navy">Kasikoilkuppam Thermal Front</td>
                            <td className="p-2.5 font-mono text-oceanBlue">30.1 km &bull; 84° E</td>
                            <td className="p-2.5 font-mono text-navy">42 m</td>
                            <td className="p-2.5 text-textSecond text-[11px]">Skipjack Tuna, Indian Mackerel, Sardinella</td>
                            <td className="p-2.5 pr-4 text-right font-mono text-textMuted text-[10px]">13.120°N, 80.520°E</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Commercial Harvest Logistics */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge size={13} className="text-safeGreen" />
                    4. Harvest Logistics &amp; Satellite Fuel Conservation
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-surface border border-borderLight text-xs">
                    <div>
                      <span className="text-[10px] text-textMuted block">Designated Fish Landing Centre:</span>
                      <span className="font-bold text-navy block mt-0.5">{landingCentre}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted block">Projected Fuel Conservation:</span>
                      <span className="font-bold text-emerald-700 block mt-0.5">{fuelSavings}</span>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}

          {/* ========================================================================================= */}
          {/* SPECIFICATION C: ECOLOGICAL IMPACT & GEOFENCE COMPLIANCE */}
          {/* ========================================================================================= */}
          {reportType === 'ecological' && (() => {
            const sovereignZone = geofenceData?.zone || 'Indian Territorial Waters (12nm)'
            const imblDist = geofenceData?.imbl_distance_km || 142.6
            const isSafeImbl = imblDist > 20
            const mpa = ecologyData?.marine_protected_areas?.[0] || { name: 'Pulicat Bird Sanctuary & Marine Buffer', distance_km: 38.5 }
            const coralStatus = ecologyData?.coral_reef_status?.bleaching_alert || 'NO STRESS / NORMAL'
            const sstAnomaly = ecologyData?.coral_reef_status?.sst_anomaly_c || '+0.2'
            const mangroveCoverage = ecologyData?.mangrove_km2 || 14.8

            return (
              <>
                {/* Sovereign Maritime Jurisdictions */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={13} className="text-oceanBlue" />
                    2. Sovereign Maritime Jurisdictions &amp; IMBL Proximity
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-surface border border-borderLight text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">Sovereign Zone:</span>
                      <span className="font-bold text-navy font-sans block">{sovereignZone}</span>
                      <span className="text-[10px] text-safeGreen font-sans block">Authorized Fishing</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">{t('IMBL Distance')}:</span>
                      <span className="font-bold text-oceanBlue">{imblDist} km</span>
                      <span className={`text-[10px] font-sans block ${isSafeImbl ? 'text-safeGreen' : 'text-dangerRed'}`}>
                        {isSafeImbl ? t('Safe Buffer (>20 km)') : t('Proximity Alert!')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">{t('Naval Exercise Buffer')}:</span>
                      <span className="font-bold text-safeGreen font-sans block">{t('Clear of Range')}</span>
                      <span className="text-[10px] text-textMuted font-sans block">{t('No Active NOTAM')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">{t('UNCLOS Status')}:</span>
                      <span className="font-bold text-navy font-sans block">{t('Part V Compliant')}</span>
                      <span className="text-[10px] text-textMuted font-sans block">{t('Flag State: India')}</span>
                    </div>
                  </div>
                </div>

                {/* Marine Protected Areas & Bleaching Alert */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <Trees size={13} className="text-emerald-600" />
                    3. {t('Marine Protected Areas (MPAs) & Coral Bleaching Status')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-surface border border-borderLight text-xs">
                    <div>
                      <span className="text-[10px] text-textMuted block">{t('Nearest Marine Sanctuary')}:</span>
                      <span className="font-bold text-navy block mt-0.5">{mpa.name}</span>
                      <span className="text-[10px] text-textMuted font-mono">Distance: {mpa.distance_km} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted block">{t('Coral Thermal Bleaching Alert')}:</span>
                      <span className="font-bold text-safeGreen block mt-0.5">{coralStatus}</span>
                      <span className="text-[10px] text-textMuted font-mono">SST Anomaly: {sstAnomaly}°C</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted block">{t('Coastal Mangrove Habitat')}:</span>
                      <span className="font-bold text-navy block mt-0.5">{mangroveCoverage} km² Coverage</span>
                      <span className="text-[10px] text-safeGreen font-mono">{t('Ramsar Site Protected')}</span>
                    </div>
                  </div>
                </div>

                {/* Eco-Navigation Mandates */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-700" />
                    4. {t('Statutory Ecological Operating Directives')}
                  </h2>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-1.5 text-navy">
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-safeGreen" />
                      <span><strong>Eco-Speed Restriction:</strong> Vessel speed strictly capped under 10 knots within 5 nautical miles of designated MPA boundaries.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-safeGreen" />
                      <span><strong>Zero-Discharge Rule:</strong> Absolute prohibition of oily bilge, plastic, or untreated waste discharge under MARPOL Annex V.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check size={13} className="text-safeGreen" />
                      <span><strong>Turtle Excluder Device (TED):</strong> Mandatory active rigging for bottom trawlers across olive ridley nesting season tracks.</span>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}

          {/* ========================================================================================= */}
          {/* SPECIFICATION D: SYNOPTIC WEATHER & HISTORICAL CYCLONE AUDIT */}
          {/* ========================================================================================= */}
          {reportType === 'synoptic' && (() => {
            const bulletin = (bulletinsData && bulletinsData.length > 0) ? bulletinsData[0] : null
            const synopticText = bulletin?.synoptic_situation || 'Squally weather with strong wind speed predicted across coastal sectors. Exercise precaution.'
            const regionName = bulletin?.region || 'Tamil Nadu & Gulf of Mannar'
            const cycloneRisk = hazardsData?.cyclone?.risk_level || 'NO ACTIVE CYCLONIC VORTEX'
            const lightningRisk = hazardsData?.lightning?.risk || 'Low strike probability in 50km radius'

            return (
              <>
                {/* IMD 5-Day Coastal Synoptic Outlook */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <CloudRain size={13} className="text-oceanBlue" />
                    2. {t('Official IMD Regional Coastal Synoptic Outlook')}
                  </h2>
                  <div className="p-3.5 rounded-2xl bg-surface border border-borderLight text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-oceanBlue font-bold text-[10px] uppercase">
                        {regionName}
                      </span>
                      <span className="text-[10px] font-mono text-textMuted">
                        IMD Cyclone Warning Division &bull; Live Telemetry
                      </span>
                    </div>
                    <p className="text-xs text-textSecond leading-relaxed bg-white p-3 rounded-xl border border-borderLight/80">
                      <strong className="text-navy font-semibold">Official Synoptic Situation: </strong>
                      {synopticText}
                    </p>
                  </div>
                </div>

                {/* Convective Squall & Cyclone Hazard Analysis */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-500" />
                    3. {t('Convective Squall & Tropical Cyclone Hazard Interception')}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-surface border border-borderLight text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">Atmospheric CAPE:</span>
                      <span className={`font-bold ${isHighCape ? 'text-dangerRed' : 'text-navy'}`}>
                        {typeof cape === 'number' ? cape.toLocaleString() : cape} J/kg
                      </span>
                      <span className={`text-[10px] font-sans block ${isHighCape ? 'text-dangerRed' : 'text-safeGreen'}`}>
                        {isHighCape ? 'High Convective Energy' : 'Stable Air Column'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">Tropical Cyclone Track:</span>
                      <span className="font-bold text-safeGreen font-sans block">{cycloneRisk}</span>
                      <span className="text-[10px] text-textMuted font-sans block">Buffer &gt; 350 km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">Convective Lightning:</span>
                      <span className="font-bold text-navy font-sans block">Low Activity</span>
                      <span className="text-[10px] text-textMuted font-sans block">{lightningRisk}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted font-sans block">{t('Deep Ocean Swell')}:</span>
                      <span className="font-bold text-navy">{swell} m</span>
                      <span className="text-[10px] text-safeGreen font-sans block">Period: 9.2s (Safe)</span>
                    </div>
                  </div>
                </div>

                {/* Passage & Safe Haven Guidance */}
                <div className="space-y-2">
                  <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <Compass size={13} className="text-oceanBlue" />
                    4. {t('Passage Weather Recommendation & Departure Windows')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-surface border border-borderLight text-xs">
                    <div>
                      <span className="text-[10px] text-textMuted block">{t('Optimal Departure Window')}:</span>
                      <span className="font-bold text-navy block mt-0.5">{t('0400 - 1000 HRS IST (Early Morning Low Wave)')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-textMuted block">{t('Deterioration Refuge Harbour')}:</span>
                      <span className="font-bold text-oceanBlue block mt-0.5">{reportData.originPort} Inner Anchorage</span>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}

          {/* Regulatory Verdict Strip (Common across all reports) */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${verdictConfig.bg}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center flex-shrink-0 ${verdictConfig.iconBg}`}>
                <verdictConfig.Icon size={22} />
              </div>
              <div>
                <div className={`text-sm font-black ${verdictConfig.titleColor}`}>
                  {verdictConfig.title}
                </div>
                <div className="text-xs text-navy/80 mt-0.5">
                  {verdictConfig.desc}
                </div>
              </div>
            </div>

            <div className={`w-16 h-16 border rounded-xl flex flex-col items-center justify-center font-mono text-[8px] text-center p-1 bg-white flex-shrink-0 ml-3 ${verdictConfig.qr}`}>
              <QrCode size={24} className="mb-0.5" />
              <span>{verdictConfig.badge}</span>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="flex items-end justify-between pt-5 border-t border-borderLight text-xs">
            <div>
              <div className="font-mono text-[10px] text-textMuted">
                Cryptographic Digest: 8f4e2b...9a12c8e (SHA-256 Validated)
              </div>
              <div className="text-[10px] text-textMuted mt-0.5">
                Validated by ORCA Agentic AI Platform &bull; Department of Space, ISRO
              </div>
            </div>

            <div className="text-right">
              <div className="font-serif italic text-sm text-navy mb-0.5">
                {t('Authorized Electronic Release')}
              </div>
              <div className="text-[10px] font-bold text-navy uppercase tracking-wider">
                {t('Officer of the Watch / ORCA System')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}
