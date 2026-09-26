/**
 * Base map tile providers and GIS layers configuration
 */

export const BASE_MAPS = [
  {
    id: 'bhuvan',
    label: 'ISRO Bhuvan Satellite',
    sub: 'NRSC Indian Remote Sensing',
    url: 'https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wmts/?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=india3&STYLE=_null&TILEMATRIXSET=EPSG%3A900913&TILEMATRIX=EPSG%3A900913%3A{z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg',
    attribution: '&copy; <a href="https://bhuvan.nrsc.gov.in/" target="_blank" rel="noreferrer">ISRO / NRSC Bhuvan</a> Indian Earth Observation',
    maxZoom: 18,
  },
  {
    id: 'satellite',
    label: 'ESRI Satellite',
    sub: 'True Color Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
  {
    id: 'carto_dark',
    label: 'Carto Dark',
    sub: 'ISRO Mission Control',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; OSM contributors',
    maxZoom: 19,
  },
  {
    id: 'osm',
    label: 'OpenStreetMap',
    sub: 'Standard Navigation',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  {
    id: 'terrain',
    label: 'OpenTopoMap',
    sub: 'Bathymetric & Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
]

export const GEO_LAYERS = [
  {
    id: 'eez',
    name: 'Exclusive Economic Zone (EEZ)',
    endpoint: '/api/layer/eez',
    color: '#00e5ff', // Electric Cyan
    defaultActive: true,
    defaultOpacity: 0.75,
    category: 'Boundaries',
    description: 'India 200 nautical miles maritime economic zone boundary (VLIZ / Marine Regions)',
  },
  {
    id: 'territorial',
    name: '12nm Territorial Waters',
    endpoint: '/api/layer/territorial',
    color: '#0284c7', // Deep Azure Blue
    defaultActive: false,
    defaultOpacity: 0.8,
    category: 'Boundaries',
    description: 'Sovereign coastal territory zone up to 12 nautical miles from baseline',
  },
  {
    id: 'contiguous',
    name: '24nm Contiguous Zone',
    endpoint: '/api/layer/contiguous',
    color: '#38bdf8', // Sky Blue
    defaultActive: false,
    defaultOpacity: 0.7,
    category: 'Boundaries',
    description: 'Customs, immigration, and fiscal enforcement jurisdiction (24nm)',
  },
  {
    id: 'internal',
    name: 'Internal Waters',
    endpoint: '/api/layer/internal',
    color: '#67e8f9', // Pale Aquamarine
    defaultActive: false,
    defaultOpacity: 0.6,
    category: 'Boundaries',
    description: 'Bays, ports, and internal estuaries landward of baseline',
  },
  {
    id: 'mpa',
    name: 'Marine Protected Areas (MPA)',
    endpoint: '/api/layer/mpa',
    color: '#00c853', // Vivid Emerald Green
    defaultActive: true,
    defaultOpacity: 0.8,
    category: 'Ecology',
    description: 'Protected marine sanctuaries, national parks, and biosphere reserves (WDPA)',
  },
  {
    id: 'wetlands',
    name: 'Eco-Sensitive Wetlands',
    endpoint: '/api/layer/wetlands',
    color: '#14b8a6', // Deep Teal
    defaultActive: false,
    defaultOpacity: 0.75,
    category: 'Ecology',
    description: 'Coastal eco-sensitive lagoons, mangrove forests, and backwaters',
  },
  {
    id: 'ramsar',
    name: 'Ramsar Wetland Sites',
    endpoint: '/api/layer/ramsar',
    color: '#d946ef', // Fuchsia Magenta
    defaultActive: false,
    defaultOpacity: 0.9,
    category: 'Ecology',
    description: 'Wetlands of international significance recognized under Ramsar Convention',
  },
  {
    id: 'ports',
    name: 'Major & Minor Ports',
    endpoint: '/api/layer/ports',
    color: '#f59e0b', // Warm Amber Gold
    defaultActive: true,
    defaultOpacity: 0.9,
    category: 'Navigation',
    description: 'Commercial ports, fishing harbours, and anchorages (OSM / Ministry of Ports)',
  },
  {
    id: 'cyclone_tracks',
    name: 'Cyclone Storm Track',
    endpoint: '/api/layer/cyclone_tracks',
    color: '#e11d48', // Rose Red
    defaultActive: true,
    defaultOpacity: 0.9,
    category: 'Hazards',
    description: 'Historical and active storm tracks with wind intensity (NOAA IBTrACS / IMD)',
  },
  {
    id: 'lightning',
    name: 'Live Lightning & Thunderstorms',
    endpoint: '/api/layer/lightning',
    color: '#facc15', // Vivid Electric Amber / Gold
    defaultActive: false,
    defaultOpacity: 0.85,
    category: 'Hazards',
    description: 'Live detected lightning strikes, cloud-to-ground discharges, and convective thunderstorm cells (ISRO INSAT-3DS & Open-Meteo)',
  },
  {
    id: 'coral',
    name: 'Coral Reef Occurrences',
    endpoint: '/api/layer/coral',
    color: '#ff6d00', // Electric Coral Orange
    defaultActive: false,
    defaultOpacity: 0.85,
    category: 'Ecology',
    description: 'Coral occurrences in Lakshadweep, Andaman & Nicobar, Gulf of Mannar (UNEP-WCMC)',
  },
  {
    id: 'high_seas',
    name: 'International High Seas',
    endpoint: '/api/layer/high_seas',
    color: '#8b5cf6', // Royal Violet
    defaultActive: false,
    defaultOpacity: 0.45,
    category: 'Boundaries',
    description: 'International waters beyond the 200nm Indian Exclusive Economic Zone (VLIZ)',
  },
  {
    id: 'seas',
    name: 'Indian Ocean Sub-Seas',
    endpoint: '/api/layer/seas',
    color: '#6366f1', // Indigo / Cobalt
    defaultActive: false,
    defaultOpacity: 0.4,
    category: 'Boundaries',
    description: 'Named sea basins: Arabian Sea, Bay of Bengal, and Andaman Sea (IHO / Marine Regions)',
  },
  {
    id: 'nautical_marks',
    name: 'Nautical Marks & Beacons',
    endpoint: '/api/layer/nautical_marks',
    color: '#ffd600', // Bright Canary Yellow
    defaultActive: false,
    defaultOpacity: 0.95,
    category: 'Navigation',
    description: '600+ lighthouses, navigation buoys, cardinal marks, and beacons (OpenSeaMap)',
  },
  {
    id: 'fishing_events',
    name: 'Commercial Fishing Activity',
    endpoint: '/api/layer/fishing_events',
    color: '#ff3d00', // Blaze Red-Orange
    defaultActive: true,
    defaultOpacity: 0.85,
    category: 'Fisheries',
    description: 'Monitored commercial fishing vessels and AIS-tracked gear deployments (Global Fishing Watch)',
  },
  {
    id: 'biodiversity_points',
    name: 'OBIS Marine Biodiversity',
    endpoint: '/api/layer/biodiversity_points',
    color: '#84cc16', // Lime Chartreuse
    defaultActive: false,
    defaultOpacity: 0.8,
    category: 'Ecology',
    description: '5,000+ scientific marine species observation records across Indian waters (UNESCO-IOC OBIS)',
  },
  {
    id: 'fao_areas',
    name: 'FAO Major Fishing Areas (51 & 57)',
    endpoint: '/api/layer/fao_areas',
    color: '#2563eb', // Royal Blue
    defaultActive: false,
    defaultOpacity: 0.4,
    category: 'Fisheries',
    description: 'UN FAO Major Statistical Fishing Areas 51 (Western Indian Ocean) and 57 (Eastern Indian Ocean)',
  },
  {
    id: 'pfz',
    name: 'Potential Fishing Zones (PFZ Square Areas)',
    endpoint: '/api/layer/pfz',
    color: '#630596ff', // Vivid Emerald Green
    defaultActive: true,
    defaultOpacity: 0.45,
    category: 'Fisheries',
    description: 'INCOIS & Copernicus satellite thermal-chlorophyll potential fishing zones rendered as translucent dark green square areas',
  },
  {
    id: 'ocean_basin',
    name: 'IHO Indian Ocean Basin Limits',
    endpoint: '/api/layer/ocean_basin',
    color: '#c084fc', // Soft Orchid
    defaultActive: false,
    defaultOpacity: 0.35,
    category: 'Boundaries',
    description: 'International Hydrographic Organization (IHO) official Indian Ocean geographic basin limits (GOaS)',
  },
  {
    id: 'current_vectors',
    name: 'Surface Current Drift Vectors',
    endpoint: '/api/layer/current_vectors',
    color: '#06b6d4', // Turquoise Flow
    defaultActive: true,
    defaultOpacity: 0.9,
    category: 'Oceanography',
    description: 'Copernicus & ISRO 390 surface current vector flow lines with drift velocity in knots and compass heading',
  },
  {
    id: 'argo_floats',
    name: 'Argo Profiling Floats (In-situ CTD)',
    endpoint: '/api/layer/argo_floats',
    color: '#0284c7', // Deep Ocean Blue
    defaultActive: false,
    defaultOpacity: 0.9,
    category: 'Oceanography',
    description: '150+ operational in-situ robotic Argo profiling floats with subsurface temperature and salinity profiles (INCOIS / Euro-Argo / NOAA)',
  },
  {
    id: 'tsunami_epicenters',
    name: 'INCOIS Tsunami & Seismic Epicenters',
    endpoint: '/api/layer/tsunami_epicenters',
    color: '#f43f5e', // Vibrant Rose / Red
    defaultActive: false,
    defaultOpacity: 0.95,
    category: 'Hazards',
    description: 'Real-time seismic epicenters & tsunami bulletins across the Indian Ocean Basin (INCOIS ITEWC / MoES)',
  },
  {
    id: 'sst',
    name: 'Sea Surface Temperature (SST)',
    endpoint: '/api/layer/sst',
    color: '#ff5722', // Deep Coral / Thermal Red
    defaultActive: false,
    defaultOpacity: 0.85,
    category: 'Oceanography',
    description: 'MODIS & INSAT-3DS multi-satellite thermal sea surface temperature contours (°C) across the Indian Ocean',
  },
  {
    id: 'chlorophyll',
    name: 'Chlorophyll-a Concentration',
    endpoint: '/api/layer/chlorophyll',
    color: '#10b981', // Phytoplankton Emerald
    defaultActive: false,
    defaultOpacity: 0.8,
    category: 'Oceanography',
    description: 'Copernicus & ISRO Oceansat-3 satellite ocean color chlorophyll-a concentration (mg/m³) tracing fertile upwelling plumes',
  },
  {
    id: 'wind',
    name: 'Marine Wind Vector Field',
    endpoint: '/api/layer/wind',
    color: '#06b6d4', // Cyan Breeze
    defaultActive: false,
    defaultOpacity: 0.85,
    category: 'Oceanography',
    description: 'Open-Meteo & IMD coastal surface wind vectors with velocity (knots / km/h), gusts, and meteorological direction',
  },
  {
    id: 'waves',
    name: 'Significant Wave Height (Waves)',
    endpoint: '/api/layer/waves',
    color: '#3b82f6', // Wave Blue
    defaultActive: false,
    defaultOpacity: 0.8,
    category: 'Oceanography',
    description: 'INCOIS wave model significant wave heights (SWH in meters) and coastal breaking sea states',
  },
  {
    id: 'swell',
    name: 'Ocean Swell & Period',
    endpoint: '/api/layer/swell',
    color: '#8b5cf6', // Deep Violet
    defaultActive: false,
    defaultOpacity: 0.8,
    category: 'Oceanography',
    description: 'Southern Ocean long-period swells entering Arabian Sea & Bay of Bengal with period (seconds) and swell direction',
  },
  {
    id: 'high_wave_alerts',
    name: 'High-Wave & Swell Surge Alerts',
    endpoint: '/api/layer/high_wave_alerts',
    color: '#f97316', // Warning Orange
    defaultActive: false,
    defaultOpacity: 0.85,
    category: 'Hazards',
    description: 'Official INCOIS coastal high-wave and swell surge warning bulletins and active advisory zones',
  },
  {
    id: 'restricted_zones',
    name: 'Restricted Maritime Zones & Firing Ranges',
    endpoint: '/api/layer/restricted_zones',
    color: '#ef4444', // Danger Crimson
    defaultActive: false,
    defaultOpacity: 0.75,
    category: 'Boundaries',
    description: 'Sovereign naval firing ranges, missile test standoff buffers (ITR Chandipur), and designated military exclusion corridors',
  },
  {
    id: 'bathymetry',
    name: 'Bathymetry Depth Contours (Isobaths)',
    endpoint: '/api/layer/bathymetry',
    color: '#0284c7', // Ocean Depth Cobalt
    defaultActive: false,
    defaultOpacity: 0.75,
    category: 'Oceanography',
    description: 'GEBCO 2026 bathymetric depth isobath contours (10m, 20m, 50m, 100m, 200m, 1000m) for keel clearance verification',
  },
  {
    id: 'coastline',
    name: 'High-Resolution 10m Coastline',
    endpoint: '/api/layer/coastline',
    color: '#64748b', // Slate Baseline
    defaultActive: false,
    defaultOpacity: 0.9,
    category: 'Boundaries',
    description: 'Natural Earth 10m high-resolution nautical coastline baseline covering the Indian subcontinent and island territories',
  },
  {
    id: 'landing_centres',
    name: 'Designated Fish Landing Centres (FLC)',
    endpoint: '/api/layer/landing_centres',
    color: '#eab308', // Harbor Yellow
    defaultActive: false,
    defaultOpacity: 0.9,
    category: 'Fisheries',
    description: '150+ Ministry of Fisheries & CMFRI designated coastal fish landing centres and traditional landing jetties',
  },
  {
    id: 'ais',
    name: 'Live AIS Vessel Positions & Traffic',
    endpoint: '/api/layer/ais',
    color: '#ec4899', // AIS Pink
    defaultActive: false,
    defaultOpacity: 0.95,
    category: 'Navigation',
    description: 'Live AIS vessel broadcast tracking: commercial tankers, cargo carriers, tugs, and deep-sea trawlers',
  },
  {
    id: 'imbl',
    name: 'International Maritime Boundary Lines (IMBL)',
    endpoint: '/api/layer/imbl',
    color: '#ef4444', // Crimson Red
    defaultActive: false,
    defaultOpacity: 0.85,
    category: 'Boundaries',
    description: 'Statutory UNCLOS border treaties & arbitrations (India - Sri Lanka 1976 Treaty, Maldives, Bangladesh, Myanmar, Thailand, Indonesia)',
  },
]

/**
 * Returns the first layer in each category
 * (Boundaries -> eez, Ecology -> mpa, Navigation -> ports, Hazards -> cyclone_tracks, Fisheries -> fishing_events, Oceanography -> current_vectors)
 */
export const getFirstLayerPerCategory = () => {
  const seen = new Set()
  const res = []
  GEO_LAYERS.forEach(l => {
    const cat = l.category || 'General'
    if (!seen.has(cat)) {
      seen.add(cat)
      res.push(l.id)
    }
  })
  return res
}

/**
 * Contextual layer presets for specific pages & analytical workflows
 */
export const PAGE_DEFAULT_LAYERS = {
  // Operational dashboard overview: Sovereign EEZ, Ports, Treaty Border, Storm Hazards
  home: ['eez', 'ports', 'imbl', 'lightning'],

  // Marine Ecology: ONLY ecology related layers
  ecology: GEO_LAYERS.filter(l => l.category === 'Ecology').map(l => l.id),

  // Fisheries Intelligence: ONLY fishing related layers
  fisheries: GEO_LAYERS.filter(l => l.category === 'Fisheries').map(l => l.id),

  // Ocean Explorer & General: First layer in each category
  ocean: getFirstLayerPerCategory(),
  oceanMaster: getFirstLayerPerCategory(),
  general: getFirstLayerPerCategory(),

  // Ocean Explorer Compare Pane A: High-risk hazards & boundaries
  oceanHazards: ['eez', 'cyclone_tracks', 'lightning', 'ports', 'mpa'],

  // Ocean Explorer Compare Pane B: Thermal, biological & ecological frontiers
  oceanEcology: GEO_LAYERS.filter(l => l.category === 'Ecology').map(l => l.id),

  // Chat Workstation (AI Map): Minimal starter — AI adds layers as needed via commands
  chatWorkstation: ['bathymetry', 'chlorophyll', 'eez'],
}


