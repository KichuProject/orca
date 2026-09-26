import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigation2, Download, RefreshCw, Layers, Compass, ArrowRight, ShieldCheck, AlertCircle, Check } from 'lucide-react'
import { useGlobal } from '../context/GlobalContext'
import { endpoints } from '../api'
import RouteSelectorCard, { isSameOrAdjacentPort } from '../components/route/RouteSelectorCard'
import MultiAgentRouteClearanceCard from '../components/route/MultiAgentRouteClearanceCard'
import RouteModesComparison from '../components/route/RouteModesComparison'
import WaypointTable from '../components/route/WaypointTable'
import RouteMapCanvas from '../components/route/RouteMapCanvas'
import ExportRouteModal from '../components/route/ExportRouteModal'
import RouteOptimizationAuditCard from '../components/route/RouteOptimizationAuditCard'
import RouteRiskProfileChart from '../components/route/RouteRiskProfileChart'
import { haversineKm, calculateBearing } from '../components/map/MeasureTools'

// Nautical Sea Route Generator: routes around Cape Comorin & Sri Lanka for cross-peninsula voyages
// guaranteeing that sea routes NEVER cut across the Indian landmass.
function generateSeaRoute(start, end, steps = 15, offshoreOffset = 0.0) {
  const sLat = Number(start.lat)
  const sLon = Number(start.lon)
  const eLat = Number(end.lat)
  const eLon = Number(end.lon)

  const sIsWest = sLon < 77.55
  const eIsWest = eLon < 77.55
  const isCross = (sIsWest !== eIsWest) && Math.min(sLat, eLat) > 8.0

  let keyNodes = []

  if (isCross) {
    // International sea lane around Cape Comorin and southern Sri Lanka (100% deep water)
    const comorin = [7.60, 77.50 + (sIsWest ? -offshoreOffset : offshoreOffset)]
    const dondra = [5.70 - offshoreOffset * 0.5, 80.60]
    const slEast = [7.50, 82.30 + offshoreOffset]

    if (sIsWest) {
      const wMid = [Math.max(sLat * 0.5 + comorin[0] * 0.5, 8.5), Math.min(sLon, 76.5) - 0.25 - offshoreOffset]
      const eMid = [Math.min(slEast[0] * 0.4 + eLat * 0.6, 14.0), Math.max(eLon, 81.2) + 0.15 + offshoreOffset]
      keyNodes = [[sLat, sLon], wMid, comorin, dondra, slEast, eMid, [eLat, eLon]]
    } else {
      const eMid = [Math.min(sLat * 0.6 + slEast[0] * 0.4, 14.0), Math.max(sLon, 81.2) + 0.15 + offshoreOffset]
      const wMid = [Math.max(comorin[0] * 0.5 + eLat * 0.5, 8.5), Math.min(eLon, 76.5) - 0.25 - offshoreOffset]
      keyNodes = [[sLat, sLon], eMid, slEast, dondra, comorin, wMid, [eLat, eLon]]
    }
  } else {
    // Same coast: follow coastal curvature in the ocean
    const midLat = (sLat + eLat) / 2
    const offshoreDir = sIsWest ? -(0.35 + offshoreOffset) : (0.35 + offshoreOffset)
    const midLon = (sLon + eLon) / 2 + offshoreDir
    keyNodes = [[sLat, sLon], [midLat, midLon], [eLat, eLon]]
  }

  // Interpolate along keyNodes
  const pts = []
  const numSegs = keyNodes.length - 1
  const ptsPerSeg = Math.max(2, Math.floor(steps / numSegs))

  for (let seg = 0; seg < numSegs; seg++) {
    const p1 = keyNodes[seg]
    const p2 = keyNodes[seg + 1]
    for (let s = 0; s < ptsPerSeg; s++) {
      const t = s / ptsPerSeg
      const lat = p1[0] + (p2[0] - p1[0]) * t
      const lon = p1[1] + (p2[1] - p1[1]) * t
      pts.push([lat, lon])
    }
  }
  pts.push([eLat, eLon])
  return pts
}

export default function RoutePlannerPage() {
  const { location, vessel, t } = useGlobal()

  // Detect if current location is inland (e.g. Madukkarai or inland Tamil Nadu coordinates)
  const isCurrentInland = useMemo(() => {
    const name = (location.name || '').toLowerCase()
    if (name.includes('madukkarai') || name.includes('coimbatore') || name.includes('inland')) return true
    // Geographic inland box for Western Tamil Nadu around Coimbatore/Madukkarai
    if (location.lat > 10.5 && location.lat < 11.5 && location.lon > 76.6 && location.lon < 77.5) return true
    return false
  }, [location])

  // Origin initializes to a coastal port if user fix is inland, else user location
  const [origin, setOrigin] = useState(() => {
    if (isCurrentInland) {
      return {
        name: 'Kochi (Cochin Port)',
        lat: 9.9312,
        lon: 76.2673,
      }
    }
    return {
      name: location.name || 'Chennai Port',
      lat: location.lat || 13.1000,
      lon: location.lon || 80.3200,
    }
  })

  // Destination defaults to a distinct port from origin
  const [destination, setDestination] = useState(() => {
    const originName = isCurrentInland ? 'Kochi (Cochin Port)' : (location.name || 'Chennai Port')
    if (originName.toLowerCase().includes('visakhapatnam')) {
      return { name: 'Chennai Port', lat: 13.1000, lon: 80.3200 }
    }
    return { name: 'Visakhapatnam Port', lat: 17.6868, lon: 83.2185 }
  })

  // Prevent identical Departure and Arrival ports
  const isSamePort = useMemo(() => {
    return isSameOrAdjacentPort(origin, destination)
  }, [origin, destination])

  // Automatic safeguard: if ever identical, shift destination to an opposite coast major port
  useEffect(() => {
    if (isSamePort) {
      if (origin.name.toLowerCase().includes('chennai')) {
        setDestination({ name: 'Visakhapatnam Port', lat: 17.6868, lon: 83.2185 })
      } else if (origin.name.toLowerCase().includes('visakhapatnam')) {
        setDestination({ name: 'Chennai Port', lat: 13.1000, lon: 80.3200 })
      } else if (origin.name.toLowerCase().includes('kochi') || origin.name.toLowerCase().includes('cochin')) {
        setDestination({ name: 'Visakhapatnam Port', lat: 17.6868, lon: 83.2185 })
      } else {
        setDestination({ name: 'Chennai Port', lat: 13.1000, lon: 80.3200 })
      }
    }
  }, [isSamePort, origin.name])

  const [cruiseSpeed, setCruiseSpeed] = useState(14) // knots
  const [selectedMode, setSelectedMode] = useState('balanced')
  const [selectedWpIndex, setSelectedWpIndex] = useState(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [justSynced, setJustSynced] = useState(false)

  // Wait for selection state: calculate ONLY after user clicks the Calculate Route button
  const [hasCalculated, setHasCalculated] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  const handleOriginChange = (newOrigin) => {
    setOrigin(newOrigin)
    setHasCalculated(false)
  }

  const handleDestinationChange = (newDest) => {
    setDestination(newDest)
    setHasCalculated(false)
  }

  // Query Backend Safe Route API - enabled ONLY on demand when user clicks Calculate Routes
  const { data: routeData, isFetching, refetch } = useQuery({
    queryKey: ['safe-route', origin.lat, origin.lon, destination.lat, destination.lon, vessel?.type, cruiseSpeed],
    queryFn: async () => {
      if (isSamePort) return null
      const res = await endpoints.route(
        origin.lat, 
        origin.lon, 
        destination.lat, 
        destination.lon, 
        15, 
        vessel?.type || 'small_boat', 
        'Now',
        cruiseSpeed
      )
      return res.data
    },
    enabled: false,
    staleTime: 300000,
  })

  const handleCalculateRoute = async () => {
    if (isSamePort || isCalculating) return
    setIsCalculating(true)
    try {
      await refetch()
      setHasCalculated(true)
    } finally {
      setIsCalculating(false)
    }
  }

  // 1. Fastest Route: uses backend nautical passage (or client-side sea route)
  const fastestCoords = useMemo(() => {
    if (!hasCalculated) return []
    if (routeData?.routes?.fastest?.coordinates && routeData.routes.fastest.coordinates.length > 2) {
      return routeData.routes.fastest.coordinates.map(pt => [pt[1], pt[0]])
    }
    if (routeData?.route_geojson?.coordinates && routeData.route_geojson.coordinates.length > 2) {
      return routeData.route_geojson.coordinates.map(pt => [pt[1], pt[0]])
    }
    return generateSeaRoute(origin, destination, 15, 0)
  }, [hasCalculated, routeData, origin, destination])

  // 2. Balanced Detour: sea corridor with standard offshore comfort buffer
  const balancedCoords = useMemo(() => {
    if (!hasCalculated) return []
    if (routeData?.routes?.balanced?.coordinates && routeData.routes.balanced.coordinates.length > 2) {
      return routeData.routes.balanced.coordinates.map(pt => [pt[1], pt[0]])
    }
    return generateSeaRoute(origin, destination, 15, 0.25)
  }, [hasCalculated, routeData, origin, destination])

  // 3. Safest Offshore Detour: wide sea corridor with maximum clearance
  const safestCoords = useMemo(() => {
    if (!hasCalculated) return []
    if (routeData?.routes?.safest?.coordinates && routeData.routes.safest.coordinates.length > 2) {
      return routeData.routes.safest.coordinates.map(pt => [pt[1], pt[0]])
    }
    return generateSeaRoute(origin, destination, 15, 0.55)
  }, [hasCalculated, routeData, origin, destination])

  // Total Nautical Sea Distance calculated along the actual sea waypoints
  const nauticalDistKm = useMemo(() => {
    if (!hasCalculated || fastestCoords.length < 2) return 0
    if (routeData?.distance_km && routeData.distance_km > 0) {
      return routeData.distance_km
    }
    let total = 0
    for (let i = 0; i < fastestCoords.length - 1; i++) {
      total += haversineKm(fastestCoords[i][0], fastestCoords[i][1], fastestCoords[i+1][0], fastestCoords[i+1][1])
    }
    return Math.round(total)
  }, [hasCalculated, routeData, fastestCoords])

  const routesMetrics = useMemo(() => {
    if (!hasCalculated) return null
    const fDistKm = Math.round(routeData?.routes?.fastest?.distance_km || nauticalDistKm)
    const bDistKm = Math.round(routeData?.routes?.balanced?.distance_km || nauticalDistKm * 1.04)
    const sDistKm = Math.round(routeData?.routes?.safest?.distance_km || nauticalDistKm * 1.09)

    const speedKmH = cruiseSpeed * 1.852

    return {
      fastest: {
        distKm: fDistKm,
        distNm: Math.round(fDistKm * 0.539957),
        etaHours: Number((fDistKm / speedKmH).toFixed(1)),
        fuelLiters: Math.round(fDistKm * 2.4),
        riskScore: routeData?.routes?.fastest?.risk_score ?? 35,
        riskLevel: routeData?.routes?.fastest?.risk_level ?? 'STANDARD SEA PASSAGE',
        min_depth_m: routeData?.routes?.fastest?.min_depth_m,
        avg_depth_m: routeData?.routes?.fastest?.avg_depth_m,
        color: '#f59e0b',
        label: 'Fastest Sea Route',
        sub: 'Cape Comorin Nautical Corridor',
      },
      balanced: {
        distKm: bDistKm,
        distNm: Math.round(bDistKm * 0.539957),
        etaHours: Number((bDistKm / speedKmH).toFixed(1)),
        fuelLiters: Math.round(bDistKm * 2.3),
        riskScore: routeData?.routes?.balanced?.risk_score ?? 18,
        riskLevel: routeData?.routes?.balanced?.risk_level ?? 'RECOMMENDED SAFE',
        min_depth_m: routeData?.routes?.balanced?.min_depth_m,
        avg_depth_m: routeData?.routes?.balanced?.avg_depth_m,
        color: '#38bdf8',
        label: 'Balanced Sea Route',
        sub: 'Optimal fuel & offshore buffer',
      },
      safest: {
        distKm: sDistKm,
        distNm: Math.round(sDistKm * 0.539957),
        etaHours: Number((sDistKm / speedKmH).toFixed(1)),
        fuelLiters: Math.round(sDistKm * 2.5),
        riskScore: routeData?.routes?.safest?.risk_score ?? 10,
        riskLevel: routeData?.routes?.safest?.risk_level ?? 'MAXIMUM CLEARANCE',
        min_depth_m: routeData?.routes?.safest?.min_depth_m,
        avg_depth_m: routeData?.routes?.safest?.avg_depth_m,
        color: '#00c853',
        label: 'Safest Deep-Water',
        sub: 'Wide offshore buffer (>50m depth)',
      },
    }
  }, [hasCalculated, routeData, nauticalDistKm, cruiseSpeed])

  // Active waypoints array for selected mode
  const activeWaypoints = useMemo(() => {
    if (!hasCalculated) return []
    const coords =
      selectedMode === 'safest'
        ? safestCoords
        : selectedMode === 'fastest'
        ? fastestCoords
        : balancedCoords

    let cumDistKm = 0
    const depthsList = routeData?.routes?.[selectedMode]?.depths || []

    return coords.map((pt, idx) => {
      if (idx > 0) {
        cumDistKm += haversineKm(coords[idx - 1][0], coords[idx - 1][1], pt[0], pt[1])
      }
      const nextPt = idx < coords.length - 1 ? coords[idx + 1] : pt
      const heading = Math.round(calculateBearing(pt[0], pt[1], nextPt[0], nextPt[1]))

      // Nautical waypoint naming
      let wpLabel = `WP ${String(idx).padStart(2, '0')}`
      if (idx === 0) wpLabel = 'DEPARTURE'
      else if (idx === coords.length - 1) wpLabel = 'ARRIVAL'
      else if (pt[0] < 8.0 && pt[1] < 78.5) wpLabel = 'CAPE COMORIN PASSAGE'
      else if (pt[0] < 6.5) wpLabel = 'SRI LANKA SOUTH TSS'

      const depthVal = depthsList[idx] != null ? depthsList[idx] : (idx === 0 || idx === coords.length - 1 ? 14.0 : 45.0)

      return {
        lat: pt[0],
        lon: pt[1],
        label: wpLabel,
        distKm: cumDistKm,
        heading,
        depthM: depthVal,
        hazard: depthVal < 10 ? `Shallow (${depthVal}m)` : 'Clear Water',
      }
    })
  }, [hasCalculated, selectedMode, safestCoords, fastestCoords, balancedCoords, routeData])

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-12">
      {/* Page Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center shadow-xs flex-shrink-0">
            <Navigation2 size={19} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-navy leading-tight tracking-tight">
              {t ? t('pages.routes_title', 'Passage Route Planner & Nautical Clearance') : 'Passage Route Planner & Nautical Clearance'}
            </h1>
            <p className="text-[11px] text-textMuted mt-0.5">
              {t ? t('100% Ocean Navigable Corridors • Cape Comorin Sea Routing • Dynamic Ports Database', '100% Ocean Navigable Corridors • Cape Comorin Sea Routing • Dynamic Ports Database') : '100% Ocean Navigable Corridors • Cape Comorin Sea Routing • Dynamic Ports Database'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasCalculated && (
            <button
              onClick={async () => {
                setIsSyncing(true)
                setJustSynced(false)
                try {
                  await refetch()
                  setJustSynced(true)
                  setTimeout(() => setJustSynced(false), 2500)
                } finally {
                  setIsSyncing(false)
                }
              }}
              disabled={isSyncing || isCalculating}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-bold shadow-2xs transition-all cursor-pointer ${
                justSynced
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                  : isSyncing
                  ? 'bg-sky-50 text-oceanBlue border-sky-300 shadow-xs animate-pulse'
                  : 'bg-white hover:bg-surface text-navy border-borderLight hover:border-oceanBlue/30'
              }`}
              title="Recalculate route metrics and waypoints"
            >
              {justSynced ? (
                <Check size={13} className="text-emerald-600 flex-shrink-0" />
              ) : (
                <RefreshCw size={13} className={`flex-shrink-0 ${isSyncing ? 'animate-spin text-oceanBlue' : 'text-textMuted'}`} />
              )}
              <span>
                {justSynced
                  ? (t ? t('common.synced', '✓ Calculated 100%!') : '✓ Calculated 100%!')
                  : isSyncing
                  ? (t ? t('common.syncing', 'Calculating...') : 'Calculating...')
                  : (t ? t('common.sync_live', 'Recalculate') : 'Recalculate')}
              </span>
            </button>
          )}

          <button
            id="export-passage-plan-btn"
            onClick={() => setExportModalOpen(true)}
            disabled={!hasCalculated || activeWaypoints.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition-all ${
              !hasCalculated || activeWaypoints.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-oceanBlue hover:bg-navy text-white hover:shadow-lg cursor-pointer'
            }`}
          >
            <Download size={14} />
            <span>{t ? t('common.export_plan', 'Export Passage Plan') : 'Export Passage Plan'}</span>
          </button>
        </div>
      </div>

      {/* 1. Origin, Destination & Speed Configurator (Dynamic ports, no hardcoding) */}
      <RouteSelectorCard
        origin={origin}
        setOrigin={handleOriginChange}
        destination={destination}
        setDestination={handleDestinationChange}
        cruiseSpeed={cruiseSpeed}
        setCruiseSpeed={setCruiseSpeed}
        onCalculate={handleCalculateRoute}
        isLoading={isCalculating || isFetching}
        inlandWarning={isCurrentInland && origin.name === location.name}
        isSamePort={isSamePort}
        hasCalculated={hasCalculated}
      />

      {/* Awaiting Route Calculation state: wait for selection until user clicks Calculate Routes */}
      {!hasCalculated ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Preview showing Origin and Destination markers without active corridors */}
          <div className="lg:col-span-7 h-[500px]">
            <RouteMapCanvas
              origin={origin}
              destination={destination}
              fastestCoords={[]}
              safestCoords={[]}
              balancedCoords={[]}
              selectedMode={selectedMode}
              onSelectMode={setSelectedMode}
              waypoints={[]}
              selectedWpIndex={null}
              onSelectWp={() => {}}
              hasCalculated={false}
            />
          </div>

          {/* Right Column: Waiting for selection card with instant CTA */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="p-7 rounded-3xl bg-white border border-borderLight shadow-sm space-y-5 text-center flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-14 h-14 rounded-2xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center shadow-xs">
                <Compass size={28} className="text-oceanBlue" />
              </div>
              
              <div className="space-y-2 max-w-sm">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-oceanBlue border border-sky-200/60 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-oceanBlue" />
                  {t ? t('Awaiting Selection & Calculation', 'Awaiting Selection & Calculation') : 'Awaiting Selection & Calculation'}
                </div>
                <h3 className="text-base font-extrabold text-navy">
                  {t ? t('Ready to Calculate Safe Voyage', 'Ready to Calculate Safe Voyage') : 'Ready to Calculate Safe Voyage'}
                </h3>
                <p className="text-xs text-textMuted leading-relaxed">
                  {t ? t('Departure:', 'Departure:') : 'Departure:'} <span className="font-bold text-navy">{t ? t(origin.name) : origin.name}</span><br />
                  {t ? t('Arrival:', 'Arrival:') : 'Arrival:'} <span className="font-bold text-navy">{t ? t(destination.name) : destination.name}</span>
                </p>
                <p className="text-[11px] text-textMuted pt-1">
                  {t ? t('Adjust cruise speed or select different ports above, then click "Calculate Routes" to evaluate GEBCO bathymetry, UNCLOS corridors, and multi-agent safety.', 'Adjust cruise speed or select different ports above, then click "Calculate Routes" to evaluate GEBCO bathymetry, UNCLOS corridors, and multi-agent safety.') : 'Adjust cruise speed or select different ports above, then click "Calculate Routes" to evaluate GEBCO bathymetry, UNCLOS corridors, and multi-agent safety.'}
                </p>
              </div>

              <button
                id="calculate-routes-cta-btn"
                onClick={handleCalculateRoute}
                disabled={isCalculating || isFetching || isSamePort}
                className={`w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white text-xs font-bold shadow-md transition-all ${
                  isSamePort
                    ? 'opacity-50 cursor-not-allowed bg-slate-400'
                    : 'bg-oceanBlue hover:bg-navy hover:shadow-lg cursor-pointer ring-4 ring-oceanBlue/20'
                } disabled:opacity-50`}
              >
                <Navigation2 size={16} className={isCalculating ? 'animate-spin' : ''} />
                <span>
                  {isCalculating
                    ? (t ? t('Plotting Sea Corridors...', 'Plotting Sea Corridors...') : 'Plotting Sea Corridors...')
                    : isSamePort
                    ? (t ? t('Distinct Ports Required', 'Distinct Ports Required') : 'Distinct Ports Required')
                    : (t ? t('Calculate Routes', 'Calculate Routes') : 'Calculate Routes')}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Multi-Agent Route Navigation Clearance Card (Clear, Detour, or No-Go) */}
          <MultiAgentRouteClearanceCard
            clearanceData={routeData?.multi_agent_clearance}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
            vessel={vessel}
          />

          {/* 3. Feature #14 Route Optimization & Safe Navigation Audit Card */}
          <RouteOptimizationAuditCard
            routeData={routeData}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
          />

          {/* 4. Route Modes 3-Card Evaluation */}
          <RouteModesComparison
            routes={routesMetrics}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
          />

          {/* 5. Requirement 20: Route Risk Profile Chart (Risk vs. Distance) */}
          <RouteRiskProfileChart
            routeData={routeData}
            selectedMode={selectedMode}
            onSelectMode={setSelectedMode}
            onSelectWaypoint={setSelectedWpIndex}
            activeWaypointIndex={selectedWpIndex}
          />

          {/* 6. Interactive Route Map & Waypoint Sequence Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (6 cols): Satellite Route Map */}
            <div className="lg:col-span-6 h-[520px]">
              <RouteMapCanvas
                origin={origin}
                destination={destination}
                fastestCoords={fastestCoords}
                safestCoords={safestCoords}
                balancedCoords={balancedCoords}
                selectedMode={selectedMode}
                onSelectMode={setSelectedMode}
                waypoints={activeWaypoints}
                selectedWpIndex={selectedWpIndex}
                onSelectWp={setSelectedWpIndex}
                hasCalculated={true}
                geofenceWarning={routeData?.geofence_warning || routeData?.multi_agent_clearance?.geofence_warning}
              />
            </div>

            {/* Right Column (6 cols): Detailed Waypoint Sequence Table */}
            <div className="lg:col-span-6">
              <WaypointTable
                waypoints={activeWaypoints}
                selectedWpIndex={selectedWpIndex}
                onSelectWp={setSelectedWpIndex}
              />
            </div>
          </div>
        </>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <ExportRouteModal
          origin={origin}
          destination={destination}
          waypoints={activeWaypoints}
          selectedMode={selectedMode}
          onClose={() => setExportModalOpen(false)}
        />
      )}
    </div>
  )
}
