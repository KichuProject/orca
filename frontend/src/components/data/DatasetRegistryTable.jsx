import { useGlobal } from '../../context/GlobalContext'
import React, { useState, useMemo, useEffect } from 'react'
import { 
  Database, Search, Filter, ExternalLink, Code2, 
  Layers, Globe, CheckCircle2, FileText, ChevronRight, X,
  Activity, Clock, ShieldCheck, Sparkles, RefreshCw, Copy, Check, Radio
} from 'lucide-react'
import { endpoints } from '../../api'

export const DATASETS = [
  {
    id: 'isro-oceansat3',
    name: 'ISRO MOSDAC Oceansat-3 (EOS-06) OCM-3 & SSTM',
    category: 'Oceanography',
    provider: 'ISRO MOSDAC / SAC Ahmedabad',
    coverage: 'Indian Ocean Region (0°N - 30°N, 60°E - 100°E)',
    resolution: '1 km Spatial / Daily Passes',
    format: 'HDF5 / NetCDF-4',
    license: 'Government Open Data (ISRO/DOS)',
    freshness: '12 - 24 Hours',
    description: 'Thermal infrared sea surface temperature (SSTM) and 13-band Ocean Colour Monitor (OCM-3) capturing oceanic fronts, thermal eddies, and chlorophyll-a concentrations.',
    schemaSample: {
      parameter: 'sst_celsius & chlorophyll_mg_m3',
      bands: ['B1_412nm', 'B2_443nm', 'B3_490nm', 'B8_670nm', 'B12_11um', 'B13_12um'],
      sensor: 'Ocean Colour Monitor-3 / Thermal Infrared Sensor',
      platform: 'EOS-06 (Oceansat-3)',
      projection: 'EPSG:4326 (WGS 84)'
    }
  },
  {
    id: 'isro-bhuvan',
    name: 'ISRO NRSC Bhuvan Coastal LULC (1:50K) & Geoportal Tile Services',
    category: 'Biodiversity & Conservation',
    provider: 'National Remote Sensing Centre (NRSC) / ISRO Hyderabad',
    coverage: 'All Indian Maritime States & Coastal Districts (1:50,000 Scale)',
    resolution: '1:50,000 Scale District Vectors / WMTS Tile Basemap',
    format: 'REST JSON / WMTS Tiles / GeoJSON',
    license: 'ISRO / DOS National Open Geoportal Access',
    freshness: 'Statutory Cycle Synchronized & On-Demand REST',
    description: 'High-resolution Land Use / Land Cover (LULC) coastal inventory capturing mangrove forests, coastal wetlands, mudflats, and shoreline geomorphology used for ecological nursery stand-off compliance.',
    schemaSample: {
      endpoint: 'https://bhuvan-app1.nrsc.gov.in/api/lulc/curljson.php',
      districts_covered: ['Chennai (3302)', 'Kanniyakumari (3330)', 'Kachchh (2401)'],
      parameters: ['mangrove_km2', 'coastal_wetland_km2', 'forest_km2', 'totalarea'],
      advisory: 'Maintain 500 m stand-off buffer from coastal mangrove roots',
      wmts_layer: 'india3 (EPSG:900913)'
    }
  },
  {
    id: 'incois-pfz',
    name: 'INCOIS Potential Fishing Zones (PFZ) & Ocean State Forecast',
    category: 'Fisheries & Industry',
    provider: 'INCOIS / MoES Hyderabad',
    coverage: 'All 13 Maritime States & UTs of India',
    resolution: '10 - 25 km Coastal Sectors',
    format: 'GeoJSON / REST JSON',
    license: 'MoES Government Advisory Data',
    freshness: 'Daily (Every Evening 18:00 IST)',
    description: 'Multi-satellite fused thermal front and chlorophyll gradient vectors pointing Indian fishermen directly to pelagic fish aggregation lines with bearing and distance from landing centers.',
    schemaSample: {
      sector: 'Chennai_Sector',
      points: [{ name: 'Kasikoilkuppam', lat: 13.15, lon: 80.52, depth_m: 35, bearing_deg: 85, distance_km: 30.1 }],
      validity: '2026-09-03 to 2026-09-05',
      target_species: ['Mackerel', 'Tuna', 'Sardine']
    }
  },
  {
    id: 'copernicus-cmems',
    name: 'Copernicus Marine Service (CMEMS) Global Ocean Analysis',
    category: 'Oceanography',
    provider: 'European Union / Mercator Ocean International',
    coverage: 'Global Oceans & Arabian Sea / Bay of Bengal',
    resolution: '0.083° (~9 km) / Hourly & Daily',
    format: 'NetCDF-4 / OPeNDAP',
    license: 'Copernicus Open Access (CC-BY 4.0)',
    freshness: '3 - 6 Hours',
    description: 'High-resolution reanalysis combining OSTIA SST, multi-altimeter sea surface height anomalies, surface salinity, and ocean current velocity vectors.',
    schemaSample: {
      variables: ['thetao (SST)', 'so (salinity)', 'uo (eastward velocity)', 'vo (northward velocity)'],
      source: 'GLOBAL_ANALYSISFORECAST_PHY_001_024',
      vertical_levels: '50 depth levels (0.5m to 5500m)'
    }
  },
  {
    id: 'imd-cyclone-cape',
    name: 'IMD Marine Warnings, Squall Bulletins & Convective CAPE',
    category: 'Meteorological & Marine Hazards',
    provider: 'India Meteorological Department (IMD) New Delhi',
    coverage: 'North Indian Ocean (Arabian Sea & Bay of Bengal)',
    resolution: 'Port Warnings & Sub-division Grid (0.25°)',
    format: 'JSON / IMD Coastal Bulletins',
    license: 'Government Public Safety Feed',
    freshness: '3 Hours (Squall / Gale / Cyclone Alert)',
    description: 'Real-time operational alerts for sea fishermen, deep depression advisories, CAPE convective storm indices, gale wind warnings, and local caution signal numbers (LC-I through LC-XI).',
    schemaSample: {
      bulletin_type: 'Severe Convective & Squall Advisory',
      cape_j_kg: 3970,
      squall_risk: 'High',
      wind_gust_kmh: 45,
      port_signals: { Chennai: 'Cautionary LC-I', Ennore: 'Cautionary LC-I' }
    }
  },
  {
    id: 'noaa-oisst',
    name: 'NOAA Daily Optimum Interpolation SST (DOISST v2.1)',
    category: 'Oceanography',
    provider: 'NOAA NCEI / Coral Reef Watch',
    coverage: 'Global Marine Grid (0.25° x 0.25°)',
    resolution: '0.25 Degree Grid / Daily',
    format: 'NetCDF-4 / GeoTIFF',
    license: 'US Public Domain Data',
    freshness: 'Daily 24h lag',
    description: 'Blended AVHRR + Argo float SST providing baseline sea surface temperatures, SST anomalies, and Degree Heating Weeks (DHW) coral thermal bleaching indices.',
    schemaSample: {
      variables: ['sst', 'anom', 'err'],
      baseline_climatology: '1971-2000 Base Period',
      accuracy_rmse: '0.23 Kelvin vs in-situ Argo buoys'
    }
  },
  {
    id: 'nasa-oceancolor',
    name: 'NASA OceanColor VIIRS & MODIS-Aqua Chlorophyll-a',
    category: 'Oceanography',
    provider: 'NASA Goddard Space Flight Center (OB.DAAC)',
    coverage: 'Global Marine & Coastal Waters',
    resolution: '4 km / 1 km Daily L3 SMI',
    format: 'NetCDF-4 / HDF-EOS',
    license: 'NASA Open Science Data Policy',
    freshness: 'Daily',
    description: 'Near-surface phytoplankton concentration derived from normalized water-leaving radiances (nLw) at blue/green spectral channels.',
    schemaSample: {
      algorithm: 'OC3 / OC4v6 bio-optical band ratio',
      unit: 'mg / m^3',
      valid_range: '[0.01, 100.0]'
    }
  },
  {
    id: 'openmeteo-marine',
    name: 'Open-Meteo Marine & ECMWF Wave Model (WAM / WaveWatch III)',
    category: 'Meteorological & Marine Hazards',
    provider: 'Open-Meteo / ECMWF / DWD',
    coverage: 'Global Marine Coordinates',
    resolution: '0.05° (~5 km) / Hourly 7-Day Forecast',
    format: 'REST JSON',
    license: 'Open Database License (ODbL)',
    freshness: 'Hourly Updates',
    description: 'Significant wave height, mean wave period, peak wave direction, wind wave vs primary and secondary ocean swell wave partitioning.',
    schemaSample: {
      variables: ['wave_height_m', 'wave_period_s', 'wave_direction_deg', 'swell_wave_height_m', 'wind_wave_height_m'],
      forecast_horizon: '168 hours (7 days)',
      temporal_step: '1 hour'
    }
  },
  {
    id: 'marine-regions-eez',
    name: 'Marine Regions UNCLOS Maritime Boundaries & Indian EEZ',
    category: 'Maritime Law & Geofencing',
    provider: 'Flanders Marine Institute (VLIZ) / UNCLOS 1982',
    coverage: 'India Exclusive Economic Zone, 12nm Territorial, 24nm Contiguous',
    resolution: 'High-Precision Vector Boundaries (WGS 84)',
    format: 'GeoJSON Polygon Layers',
    license: 'CC-BY 4.0 Open Maritime Geography',
    freshness: 'Static Statutory Treaty Baseline',
    description: 'Official sovereign maritime jurisdictions covering 2,305,143 km² of India EEZ, International Maritime Boundary Line (IMBL) with Sri Lanka and Pakistan, and Baseline archipelagos.',
    schemaSample: {
      type: 'FeatureCollection',
      features: ['EEZ (200nm)', 'Territorial Sea (12nm)', 'Contiguous Zone (24nm)', 'Internal Waters'],
      sovereign: 'India',
      mrgid: 8480
    }
  },
  {
    id: 'wdpa-marine-mpas',
    name: 'UNEP-WCMC World Database on Protected Areas (WDPA) & Ramsar',
    category: 'Biodiversity & Conservation',
    provider: 'UNEP-WCMC / IUCN WCPA / Ramsar Convention',
    coverage: 'India Marine National Parks, Sanctuaries & Coastal Wetlands',
    resolution: 'Vector Polygons & Points',
    format: 'GeoJSON',
    license: 'UNEP-WCMC Terms of Use (Non-commercial & Public Research)',
    freshness: 'Monthly Synchronized',
    description: 'Boundary demarcations and IUCN category listings for Gulf of Mannar, Mahatma Gandhi Marine Park (A&N), Gahirmatha Turtle Sanctuary, and 75 Ramsar coastal wetlands.',
    schemaSample: {
      designation: ['Marine National Park', 'Wildlife Sanctuary', 'Ramsar Wetland'],
      iucn_cat: ['Ia', 'II', 'IV'],
      governance: 'Ministry of Environment, Forest and Climate Change (MoEFCC)'
    }
  },
  {
    id: 'fao-marine-capture',
    name: 'FAO FishStatJ Indian Ocean Capture & Aquaculture Statistics',
    category: 'Fisheries & Industry',
    provider: 'Food and Agriculture Organization of the United Nations (FAO)',
    coverage: 'Western & Eastern Indian Ocean (Major Fishing Areas 51 & 57)',
    resolution: 'Annual Historical Time-Series (1980 - 2024)',
    format: 'Structured CSV / JSON Data Pipeline',
    license: 'FAO Open Access',
    freshness: 'Annual Statistical Revision',
    description: '41-year longitudinal database monitoring marine landings, aquaculture yields, total biomass exploitation rates, and export volume dynamics.',
    schemaSample: {
      time_series: '1980 - 2021',
      total_records: 41,
      ten_year_growth: { marine_capture: '+73.6%', aquaculture: '+121.5%' },
      fao_area: ['Area 51 (Western Indian Ocean)', 'Area 57 (Eastern Indian Ocean)']
    }
  },
  {
    id: 'ibtracs-cyclones',
    name: 'NOAA IBTrACS North Indian Ocean Historical Tropical Cyclones',
    category: 'Meteorological & Marine Hazards',
    provider: 'NOAA NCEI & WMO World Weather Watch',
    coverage: 'North Indian Ocean Basins (Bay of Bengal & Arabian Sea)',
    resolution: '3-Hour Best-Track Fixes (1980 - Present)',
    format: 'GeoJSON LineStrings / NetCDF',
    license: 'NOAA NCEI Public Domain',
    freshness: 'Post-Season & Post-Event Reanalysis',
    description: 'Comprehensive track paths, central pressures, maximum sustained wind speeds, and storm category classifications for all named tropical cyclones (Michaung, Vardah, Thane, Madi).',
    schemaSample: {
      total_storms_indexed: 54,
      parameters: ['lat', 'lon', 'max_wind_kt', 'min_pressure_mb', 'storm_name', 'season'],
      cyclone_names: ['MICHAUNG', 'VARDAH', 'THANE', 'MADI', 'JAL', 'NILAM']
    }
  },
  {
    id: 'gfw-ais-vessels',
    name: 'Global Fishing Watch (GFW) Automated Identification System (AIS)',
    category: 'Fisheries & Industry',
    provider: 'Global Fishing Watch (Oceana / SkyTruth / Google)',
    coverage: 'India EEZ & High Seas Surveillance',
    resolution: 'Individual MMSI Vessel Trajectories / 100m Resolution',
    format: 'REST API / Vector Points',
    license: 'GFW Research & Open API Tier',
    freshness: 'Near Real-Time (5-minute Cache)',
    description: 'Machine learning classified fishing effort, gear categorization (trawlers, longliners, purse seiners), vessel flag states, and loitering anomaly detection.',
    schemaSample: {
      attributes: ['mmsi', 'vessel_class', 'apparent_fishing_hours', 'flag_state', 'speed_knots'],
      ai_classification: 'Convolutional Neural Network on AIS kinematics'
    }
  },
  {
    id: 'osm-ports-infrastructure',
    name: 'OpenStreetMap World Maritime Ports & Navigational Aids',
    category: 'Maritime Law & Geofencing',
    provider: 'OpenStreetMap Foundation (OSMF)',
    coverage: 'Major, Intermediate & Minor Indian Ports',
    resolution: 'Vector Point Geometries & Attribute Tables',
    format: 'GeoJSON',
    license: 'Open Database License (ODbL)',
    freshness: 'Continually Updated Community Spatial Baseline',
    description: 'Verified harbour locations, unctad locodes, channel depths, VHF communication channels, pilot boarding positions, and berthing coordinates.',
    schemaSample: {
      port_count: 148,
      major_ports: ['Chennai', 'Mumbai (JNPT)', 'Visakhapatnam', 'Kolkata', 'Kochi', 'Kandla'],
      attributes: ['name', 'harbour_type', 'max_draft_m', 'vhf_channel']
    }
  },
  {
    id: 'tide-harmonic-engine',
    name: 'Harmonic Equilibrium Tide Model (FES2014 & Survey of India Datums)',
    category: 'Oceanography',
    provider: 'National Institute of Oceanography (CSIR-NIO) & INCOIS',
    coverage: 'Major Indian Ports & Coastal Baseline Gauges',
    resolution: '15-Minute Harmonic Predictions',
    format: 'Harmonic Coefficients / Local REST Engine',
    license: 'Open Oceanographic Prediction Standard',
    freshness: 'Real-Time Calculated',
    description: 'Astronomical tidal harmonic predictions computed from M2, S2, N2, K1, and O1 constituents referenced to Chart Datum (CD).',
    schemaSample: {
      constituents: ['M2', 'S2', 'N2', 'K1', 'O1'],
      output: 'water_level_m_above_chart_datum',
      high_low_detection: 'Automated 1st derivative zero-crossing'
    }
  },
  {
    id: 'openseamap-nautical-marks',
    name: 'OpenSeaMap Indian Nautical Marks & Aids to Navigation (AtoN)',
    category: 'Maritime Law & Geofencing',
    provider: 'OpenSeaMap / International Hydrographic Organization (IHO)',
    coverage: 'Entire 7,516 km Indian Coastline & Major Sea Lanes',
    resolution: '618 Vector Point Aids to Navigation',
    format: 'GeoJSON',
    license: 'Open Database License (ODbL)',
    freshness: 'Verified Hydrographic Navigation Baseline',
    description: 'Comprehensive georeferenced inventory of lighthouses, lightbuoys, cardinal marks, leading lights, and lateral markers defining safe harbour approaches and navigational hazards.',
    schemaSample: {
      feature_count: 618,
      types: ['lighthouse', 'beacon_cardinal', 'buoy_lateral', 'light_float'],
      attributes: ['name', 'seamark:type', 'seamark:light:colour', 'seamark:light:range']
    }
  },
  {
    id: 'vliz-high-seas-seas',
    name: 'VLIZ Marine Regions High Seas & Indian Ocean Sub-Seas',
    category: 'Maritime Law & Geofencing',
    provider: 'Flanders Marine Institute (VLIZ) / IHO',
    coverage: 'Arabian Sea, Bay of Bengal, Andaman Sea, & International High Seas',
    resolution: 'Global Maritime Sub-division Polygons (EPSG:4326)',
    format: 'GeoJSON',
    license: 'Creative Commons Attribution 4.0 International',
    freshness: 'Standard UNCLOS & IHO Baseline',
    description: 'Official international maritime boundary polygons demarcating the high seas commons beyond India 200nm EEZ alongside major named sea basins.',
    schemaSample: {
      water_bodies: ['Arabian Sea', 'Bay of Bengal', 'Andaman Sea', 'High Seas beyond 200nm'],
      unclos_regime: 'Article 86 High Seas Commons / UNCLOS Sovereign EEZ',
      projection: 'EPSG:4326 (WGS 84)'
    }
  },
  {
    id: 'gfw-fishing-events',
    name: 'Global Fishing Watch (GFW) Commercial Fishing Activity & Fleet Events',
    category: 'Fisheries & Industry',
    provider: 'Global Fishing Watch / Oceana / Google',
    coverage: 'Indian Ocean Exclusive Economic Zone & Adjacent International Waters',
    resolution: 'AIS Vessel Geolocation & Machine-Learned Gear Detections',
    format: 'GeoJSON',
    license: 'Creative Commons Attribution-ShareAlike 4.0',
    freshness: 'Continually Monitored AIS Stream',
    description: 'Spatial coordinate telemetry of commercial trawlers, longliners, purse seiners, and squid jiggers operating across Indian coastal and pelagic zones.',
    schemaSample: {
      monitored_events: 73,
      gear_types: ['trawlers', 'drifting_longlines', 'purse_seines', 'squid_jiggers'],
      attributes: ['mmsi', 'vessel_class', 'fishing_hours', 'flag_state']
    }
  },
  {
    id: 'copernicus-biogeochemistry-physics',
    name: 'Copernicus Marine Salinity, Dissolved Oxygen, Nitrate & Surface Drift',
    category: 'Oceanography',
    provider: 'Copernicus Marine Service (CMEMS) / Mercator Ocean International',
    coverage: 'Indian Coast & Northern Indian Ocean Shelf (5°N - 25°N, 65°E - 95°E)',
    resolution: '0.25° Daily Global Biogeochemistry & Physical Analysis',
    format: 'NetCDF-4 (so, no3, o2, uo, vo)',
    license: 'EU Copernicus Open Access License',
    freshness: 'Daily Live Assimilation (< 24 Hours)',
    description: 'Operational 3D oceanographic simulation data delivering practical salinity units (PSU), dissolved nitrate, dissolved oxygen with hypoxia risk evaluation, and surface current velocities.',
    schemaSample: {
      parameters: ['so (Salinity PSU)', 'o2 (Dissolved Oxygen mmol/m³)', 'no3 (Nitrate mmol/m³)', 'uo/vo (Velocity m/s)'],
      thresholds: { severe_hypoxia: '< 62.5 mmol/m³', normoxic: '> 125.0 mmol/m³' },
      spatial_grid: '0.25° Regular Lat/Lon Grid'
    }
  },
  {
    id: 'fao-aquaculture-value',
    name: 'FAO FishStatJ Aquaculture Production & Monetary Valuation Time-Series',
    category: 'Fisheries & Industry',
    provider: 'Food and Agriculture Organization of the United Nations (FAO)',
    coverage: 'National Republic of India (1984 – 2024)',
    resolution: 'Annual Historical Series (41 Years Continuous)',
    format: 'CSV (Value in USD Millions & Biomass in Tonnes)',
    license: 'FAO Open Access Terms of Use',
    freshness: 'Official Annual Verified Statistics',
    description: 'Comprehensive 41-year longitudinal record documenting Indian aquaculture production volume expansion alongside monetary market valuation reaching $28.38 Billion USD.',
    schemaSample: {
      years_covered: '1984 - 2024 (41 Years)',
      latest_valuation: '$28,379.9 Million USD (2024)',
      capture_latest: '846,228 Tonnes',
      aquaculture_tonnes: '12,094,195 Tonnes'
    }
  },
  {
    id: 'fao-major-areas-51-57',
    name: 'FAO Major Fishing Areas (Indian Ocean Statistical Areas 51 & 57)',
    category: 'Fisheries & Industry',
    provider: 'Food and Agriculture Organization (FAO) Fisheries Division',
    coverage: 'Western Indian Ocean (Area 51) & Eastern Indian Ocean (Area 57)',
    resolution: 'Statistical Sub-divisions & Marine Sub-areas',
    format: 'GeoJSON (Simplified WGS 84 Polygon Boundaries)',
    license: 'FAO Open Access Terms of Use',
    freshness: 'Global Statistical Standard',
    description: 'Internationally recognized statistical reporting boundaries used by United Nations FAO, CMFRI, and regional fisheries management organizations (IOTC) for marine stock assessment.',
    schemaSample: {
      statistical_areas: ['Area 51 (Western Indian Ocean)', 'Area 57 (Eastern Indian Ocean)'],
      subareas_indexed: 20,
      reporting_standard: 'UN FAO CWP Statistical Classification',
      projection: 'EPSG:4326 (WGS 84)'
    }
  },
  {
    id: 'imd-coastal-bulletins-graphics',
    name: 'IMD Coastal Marine Weather Bulletins & Scanned Synoptic Charts',
    category: 'Meteorological & Marine Hazards',
    provider: 'India Meteorological Department (IMD) Cyclone Warning Division',
    coverage: 'All 11 Coastal Warning Zones (Gujarat to West Bengal & Islands)',
    resolution: 'Regional Coastal Sub-division Bulletins & Daily Synoptic Graphics',
    format: 'High-Resolution PNG Charts & Daily Text Bulletins',
    license: 'Government of India Public Safety Feed',
    freshness: 'Daily Operational (Twice Daily & On-Demand)',
    description: 'Official Government of India cyclone division coastal bulletins, fishermen warnings, sea state advisories, and scanned meteorological synoptic analysis charts.',
    schemaSample: {
      bulletins_active: 11,
      regions: ['Gujarat', 'Maharashtra-Goa', 'Karnataka', 'Kerala-Lakshadweep', 'Tamil Nadu-Puducherry', 'Andhra Pradesh', 'Odisha', 'West Bengal'],
      data_fields: ['synoptic_situation', 'wind_direction_speed', 'weather_squall', 'sea_condition', 'port_warning_signals']
    }
  },
  {
    id: 'gebco-2026-bathymetry',
    name: 'GEBCO 2026 High-Resolution Ocean Bathymetry & Depth Soundings',
    category: 'Oceanography',
    provider: 'General Bathymetric Chart of the Oceans (GEBCO) / IHO / IOC UNESCO',
    coverage: 'India Exclusive Economic Zone, Continental Shelf & Deep Ocean Trenches',
    resolution: '30 Arc-Second (~900m) Grid & Point Soundings',
    format: 'GeoTIFF Grid / Micro-Service Depth Sounding API',
    license: 'GEBCO Open Data Licence',
    freshness: '2026 Latest Reanalysis Compilation',
    description: 'Global bathymetric elevation grid providing seabed depth soundings in meters and nautical fathoms, shelf drop-off warnings, and underwater seamount identification for deep-sea and shelf navigation.',
    schemaSample: {
      datum: 'Mean Sea Level (MSL) / Chart Datum (CD)',
      measurement_units: 'Meters & Nautical Fathoms (1 fm = 1.8288 m)',
      features: ['continental_shelf_isobaths', 'shelf_break_slope', 'deep_sea_trenches'],
      coordinate_precision: 'Lat/Lon Sounding Inspector (< 1m vertical accuracy)'
    }
  },
  {
    id: 'isro-insat3ds-convection-rain',
    name: 'ISRO INSAT-3DS Cloud Top Temperature, Convection & Daily Rain',
    category: 'Meteorological & Marine Hazards',
    provider: 'ISRO MOSDAC / Space Applications Centre (SAC)',
    coverage: 'Indian Subcontinent & Northern Indian Ocean Basin',
    resolution: '4 km Spatial / 30-Minute & Daily Hydro-estimator Products',
    format: 'HDF5 / NetCDF-4',
    license: 'ISRO / DOS Open Earth Observation Policy',
    freshness: '30-Minute Refresh (Near Real-Time)',
    description: 'Geostationary meteorological satellite observations measuring cloud top temperature (°C), deep convection initiation risk for maritime thunderstorm prediction, and daily rainfall estimates (IMR).',
    schemaSample: {
      sensors: ['INSAT-3DS Imager / Sounder'],
      products: ['3SIMG_L3G_IMR_DLY (Daily Rain)', '3SIMG_L2B_CTP (Cloud Top Pressure & Temperature)'],
      variables: ['ctt (Cloud Top Temperature °C)', 'imr (Rain Rate mm/hr & mm/day)'],
      lightning_risk_criteria: 'Severe convection when CTT <= -60°C'
    }
  },
  {
    id: 'isro-oceansat3-wind-currents',
    name: 'ISRO Oceansat-3 (EOS-06) Scatterometer Winds & SAC Ocean Currents',
    category: 'Oceanography',
    provider: 'ISRO MOSDAC / SAC Ahmedabad',
    coverage: 'Indian Ocean Region (Arabian Sea & Bay of Bengal)',
    resolution: '25 km / 6-Hourly Scatterometer Grid & 0.25° Surface Currents',
    format: 'NetCDF-4 (u, v vectors)',
    license: 'ISRO / DOS Open Access',
    freshness: '6-Hour Scatterometer Cycle / Daily Current Model',
    description: 'Operational Ku-band scatterometer sea surface wind vectors (speed in m/s & direction in degrees) fused with SAC-ISRO surface current drift velocities.',
    schemaSample: {
      platform: 'EOS-06 (Oceansat-3)',
      instrument: 'Scatterometer (OSCAT-3) Ku-Band (13.515 GHz)',
      variables: ['u_wind (m/s)', 'v_wind (m/s)', 'current_u (m/s)', 'current_v (m/s)'],
      spatial_resolution: '25 km Wind Cell / 0.25° Current Velocity'
    }
  },
  {
    id: 'copernicus-current-vectors',
    name: 'Copernicus Marine & ISRO 390 Surface Current Vector Flow Field',
    category: 'Oceanography',
    provider: 'Copernicus Marine Service (CMEMS) / Mercator Ocean & ISRO SAC',
    coverage: 'Arabian Sea, Bay of Bengal, Lakshadweep Sea & Andaman Sea',
    resolution: '1.0° Regular Spatial Grid (390 Directional Vectors)',
    format: 'GeoJSON Vector Flow Lines & Point Directionals',
    license: 'EU Copernicus Open Access & ISRO',
    freshness: 'Daily Analysis Cycle',
    description: 'Pre-computed vector flow field representing surface ocean drift velocity (knots and m/s) and compass heading degrees, color-coded across the Leaflet GIS canvas.',
    schemaSample: {
      vectors_sampled: 390,
      attributes: ['speed_knots', 'speed_ms', 'heading_deg', 'heading_compass', 'u_ms', 'v_ms'],
      velocity_range: '0.04 to 2.50 knots'
    }
  },
  {
    id: 'iho-indian-ocean-basin',
    name: 'IHO / Marine Regions Official Indian Ocean Basin Limits',
    category: 'Maritime Law & Geofencing',
    provider: 'International Hydrographic Organization (IHO) & Marine Regions (GOaS)',
    coverage: 'Entire Indian Ocean Major Oceanic Basin',
    resolution: 'High-Precision Geographic Polygon Boundary (EPSG:4326)',
    format: 'GeoJSON',
    license: 'Creative Commons Attribution 4.0 International',
    freshness: 'Official IHO Special Publication S-23 Standard',
    description: 'International hydrographic standard boundary for the Indian Ocean basin, establishing the geographic demarcation between the Atlantic, Southern, and Pacific marine systems.',
    schemaSample: {
      standard: 'IHO Limits of Oceans and Seas (S-23)',
      basin: 'Indian Ocean',
      area_km2: '70,560,000 km²',
      projection: 'EPSG:4326 (WGS 84)'
    }
  },
  {
    id: 'india-imbl-treaties',
    name: 'International Maritime Boundary Lines (IMBL) & Bilateral Treaties',
    category: 'Maritime Law & Geofencing',
    provider: 'Ministry of External Affairs (MEA) & UN Division for Ocean Affairs (DOALOS)',
    coverage: 'Maritime Borders with Sri Lanka, Maldives, Bangladesh, Myanmar, Thailand & Indonesia',
    resolution: '18 Statutory Treaty LineString Geometries',
    format: 'GeoJSON',
    license: 'UN Treaties Series / UNCLOS Depositary Baseline',
    freshness: 'Statutory International Law Standard',
    description: 'Georeferenced bilateral treaties, trilateral trijunction agreements, and PCA arbitration awards demarcating Indian sovereign maritime boundaries with neighboring littoral states.',
    schemaSample: {
      treaties_indexed: 18,
      key_treaties: ['India - Sri Lanka 1976 Treaty', 'India - Maldives 1976 Treaty', 'Bay of Bengal Maritime Boundary Arbitration (2014)'],
      parameters: ['LINE_NAME', 'LINE_TYPE', 'TERRITORY1', 'TERRITORY2', 'DOC_DATE', 'LENGTH_KM']
    }
  }
]

export const FALLBACK_OPERATIONAL_FEEDS = [
  {
    source: "INCOIS",
    dataset: "Potential Fishing Zones (PFZ)",
    source_url: "https://incois.gov.in/portal/pfz",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Today 18:00 IST",
    latency: "145ms",
    spatial_resolution: "1 km coastal sector grid",
    temporal_resolution: "Daily (Evening bulletin)",
    quality: "Operational L4 (Thermal front & Chlorophyll composite)"
  },
  {
    source: "Copernicus",
    dataset: "Sea Surface Temperature (SST)",
    source_url: "https://marine.copernicus.eu",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Today 04:00 UTC",
    latency: "180ms",
    spatial_resolution: "0.05° (~5 km) gap-free grid",
    temporal_resolution: "Daily reanalysis (OSTIA / Sentinel-3)",
    quality: "Operational Foundation SST (Multi-satellite fused)"
  },
  {
    source: "ISRO MOSDAC",
    dataset: "INSAT-3DS / Oceansat-3 Sea Surface Temperature",
    source_url: "https://www.mosdac.gov.in",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Past 6 hours",
    latency: "220ms",
    spatial_resolution: "4 km geostationary resolution",
    temporal_resolution: "30-minute cadence / 6-hourly L3B",
    quality: "Operational Satellite EO (Thermal IR Soundings)"
  },
  {
    source: "ISRO MOSDAC",
    dataset: "Oceansat-3 (EOS-06) Ocean Colour Monitor (OCM-3)",
    source_url: "https://www.mosdac.gov.in",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Today 12:00 IST",
    latency: "210ms",
    spatial_resolution: "1 km local / 25 km regional grid",
    temporal_resolution: "Daily orbital passes",
    quality: "Operational Biological Density (13-band Ocean Colour)"
  },
  {
    source: "Open-Meteo",
    dataset: "Wave, Swell & Period Forecast (ECMWF & GFS)",
    source_url: "https://open-meteo.com/en/docs/marine-weather-api",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Past 1 hour",
    latency: "85ms",
    spatial_resolution: "0.05° (~5 km) global marine grid",
    temporal_resolution: "Hourly updates / 7-day outlook",
    quality: "Operational Numerical Wave Model (WMO Verified)"
  },
  {
    source: "Copernicus",
    dataset: "Ocean Surface Currents (CMEMS Global PHY)",
    source_url: "https://marine.copernicus.eu",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Today 00:00 UTC",
    latency: "195ms",
    spatial_resolution: "0.083° (~9 km) 3D hydrodynamic model",
    temporal_resolution: "Daily mean velocities (uo, vo)",
    quality: "Operational Physics Analysis (NEMO Hydrodynamic Model)"
  },
  {
    source: "Open-Meteo",
    dataset: "Marine Surface Wind & Gust Dynamics",
    source_url: "https://open-meteo.com",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Past 1 hour",
    latency: "75ms",
    spatial_resolution: "0.1° (~11 km) NWP grid",
    temporal_resolution: "Hourly updates to 168 hours",
    quality: "Operational NWP Ensemble (ECMWF IFS / NOAA GFS)"
  },
  {
    source: "IMD",
    dataset: "Coastal Weather & AWS Observations",
    source_url: "https://mausam.imd.gov.in",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Hourly AWS synoptic reports",
    latency: "160ms",
    spatial_resolution: "Coastal stations & 0.25° NWP grid",
    temporal_resolution: "Hourly / 3-hourly synoptic charts",
    quality: "Official National Weather Service (WMO Calibrated)"
  },
  {
    source: "IMD RSMC",
    dataset: "Cyclone Warning Division Operational Bulletins",
    source_url: "https://rsmcnewdelhi.imd.gov.in",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "3-hourly / Special Tropical Cyclone Bulletins",
    latency: "140ms",
    spatial_resolution: "Vortex track coordinates & 34/50/64 knot radii",
    temporal_resolution: "Sub-daily cyclone tracking",
    quality: "Authoritative WMO Regional Specialized Meteorological Centre"
  },
  {
    source: "INCOIS",
    dataset: "High Wave Alerts & Coastal Warning System",
    source_url: "https://incois.gov.in/portal/osf/hwa.jsp",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Active synoptic watch cycle",
    latency: "110ms",
    spatial_resolution: "Coastal district & offshore sectors",
    temporal_resolution: "Immediate issue upon threshold exceedance (Hs > 3.0m)",
    quality: "Operational Warning System (MoES Verified)"
  },
  {
    source: "INCOIS ITEWS",
    dataset: "Indian Tsunami Early Warning System (ITEWS)",
    source_url: "https://tsunami.incois.gov.in/itews",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Instantaneous automated seismic trigger",
    latency: "85ms",
    spatial_resolution: "Indian Ocean Basin seismic epicenters & BPR network",
    temporal_resolution: "Real-time automated seismic bulletins",
    quality: "National Tsunami Warning Centre (NTWC UNESCO/IOC)"
  },
  {
    source: "Survey of India / Indian Navy",
    dataset: "Harmonic Tidal Constants & Coastal Predictions",
    source_url: "https://www.surveyofindia.gov.in",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Annual harmonic astronomical calculation",
    latency: "40ms",
    spatial_resolution: "24 major & intermediate Indian tidal ports",
    temporal_resolution: "Continuous minute-by-minute astronomical curve",
    quality: "Statutory Hydrographic Tide Tables (National Standard)"
  },
  {
    source: "INCOIS / CMFRI",
    dataset: "Fish Landing Centres & Coastal Infrastructure Database",
    source_url: "https://incois.gov.in/portal/flc.jsp",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "National Marine Fisheries Census Baseline",
    latency: "50ms",
    spatial_resolution: "High-precision GPS coordinates for 1,582 landing centres",
    temporal_resolution: "Statutory baseline census revision",
    quality: "Official National Fishery Census (CMFRI / ICAR Verified)"
  },
  {
    source: "UNCLOS / VLIZ",
    dataset: "Indian EEZ & International Maritime Boundary Lines (IMBL)",
    source_url: "https://www.marineregions.org",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Statutory Boundary Gazette",
    latency: "35ms",
    spatial_resolution: "Sub-meter polygon vector boundaries",
    temporal_resolution: "Statutory baseline treaties & arbitrations",
    quality: "Official International Maritime Delimitation (UNCLOS 1982)"
  },
  {
    source: "UNEP-WCMC / MoEFCC",
    dataset: "Marine Protected Areas & Coastal Ecologically Sensitive Zones",
    source_url: "https://www.protectedplanet.net",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Statutory Conservation Gazette",
    latency: "45ms",
    spatial_resolution: "High-resolution polygon sanctuary boundaries",
    temporal_resolution: "Statutory environmental notifications",
    quality: "Official Statutory Sanctuary Demarcation (WLPA 1972)"
  },
  {
    source: "GEBCO",
    dataset: "GEBCO 2026 Global Bathymetric Depth Grid",
    source_url: "https://www.gebco.net",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Annual gridded release",
    latency: "50ms",
    spatial_resolution: "15 arc-second (~450 m) global terrain grid",
    temporal_resolution: "Static seabed elevation model",
    quality: "International Hydrographic Standard (IHO / IOC)"
  },
  {
    source: "ISRO Bhuvan",
    dataset: "Coastal Land Use / Land Cover (LULC) & Mangrove Extent",
    source_url: "https://bhuvan.nrsc.gov.in",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "1:50,000 Scale National Mapping Cycle",
    latency: "90ms",
    spatial_resolution: "1:50,000 Scale Cartographic Vectors",
    temporal_resolution: "Annual statutory satellite inventory",
    quality: "National Remote Sensing Centre (NRSC / ISRO Approved)"
  },
  {
    source: "Global Fishing Watch",
    dataset: "AIS Vessel Tracking & Commercial Fishing Events",
    source_url: "https://globalfishingwatch.org",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Past 24 hours",
    latency: "280ms",
    spatial_resolution: "Vessel GPS lat/lon fixes & gear class",
    temporal_resolution: "Daily consolidated AIS fleet positions",
    quality: "Satellite AIS v3 with machine-learned gear detection"
  },
  {
    source: "INCOIS / Argo International",
    dataset: "Autonomous Oceanic Profiling Floats (In-situ CTD)",
    source_url: "https://argo.ucsd.edu",
    timestamp: "2026-09-09T20:56:00+05:30",
    last_updated: "Latest 10-day drift profiling cycles",
    latency: "120ms",
    spatial_resolution: "150+ active float coordinates across Arabian Sea & BoB",
    temporal_resolution: "10-day surfacing cycle / 0-2000m vertical profile",
    quality: "Ground-truth In-situ Robotic CTD Telemetry"
  }
]

export default function DatasetRegistryTable() {
  const { t } = useGlobal()
  const [activeTab, setActiveTab] = useState('registry') // 'registry' (Live 9-Key Source Registry) or 'contracts' (Machine Schema Contracts)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeModalItem, setActiveModalItem] = useState(null)
  const [modalMode, setModalMode] = useState('source') // 'source' or 'dataset'
  const [copiedKey, setCopiedKey] = useState(null)
  const [registryFeeds, setRegistryFeeds] = useState(FALLBACK_OPERATIONAL_FEEDS)
  const [registryLoading, setRegistryLoading] = useState(true)

  // Fetch live operational sources from backend API
  useEffect(() => {
    let isMounted = true
    endpoints.sourcesRegistry()
      .then(res => {
        if (isMounted && res?.data?.sources && Array.isArray(res.data.sources)) {
          setRegistryFeeds(res.data.sources)
        }
      })
      .catch(err => {
        console.warn('Could not load live sources registry, using fallback:', err)
      })
      .finally(() => {
        if (isMounted) setRegistryLoading(false)
      })
    return () => { isMounted = false }
  }, [])

  const contractCategories = ['All', 'Oceanography', 'Meteorological & Marine Hazards', 'Fisheries & Industry', 'Biodiversity & Conservation', 'Maritime Law & Geofencing']
  const sourceAuthorities = ['All', 'INCOIS', 'IMD', 'ISRO MOSDAC', 'Copernicus', 'Open-Meteo', 'UNCLOS / VLIZ']

  // Filtered Operational Source Registry Feeds
  const filteredFeeds = useMemo(() => {
    return registryFeeds.filter(feed => {
      const matchesAuth = selectedCategory === 'All' || feed.source.toLowerCase().includes(selectedCategory.toLowerCase())
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch = !q ||
        feed.dataset.toLowerCase().includes(q) ||
        feed.source.toLowerCase().includes(q) ||
        feed.quality.toLowerCase().includes(q) ||
        (feed.spatial_resolution && feed.spatial_resolution.toLowerCase().includes(q))
      return matchesAuth && matchesSearch
    })
  }, [registryFeeds, selectedCategory, searchQuery])

  // Filtered OGC Dataset Contracts
  const filteredDatasets = useMemo(() => {
    return DATASETS.filter(d => {
      const matchesCat = selectedCategory === 'All' || d.category === selectedCategory
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch = !q ||
        d.name.toLowerCase().includes(q) ||
        d.provider.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      return matchesCat && matchesSearch
    })
  }, [selectedCategory, searchQuery])

  const handleCopyJson = (obj, id) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(obj, null, 2))
      setCopiedKey(id)
      setTimeout(() => setCopiedKey(null), 2200)
    } catch (err) {
      console.error('Failed to copy JSON:', err)
    }
  }

  const getSourceBadgeColor = (source) => {
    const s = (source || '').toLowerCase()
    if (s.includes('incois')) return 'bg-blue-50 text-blue-700 border-blue-200'
    if (s.includes('isro')) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (s.includes('imd')) return 'bg-amber-50 text-amber-700 border-amber-200'
    if (s.includes('copernicus')) return 'bg-cyan-50 text-cyan-700 border-cyan-200'
    if (s.includes('open-meteo')) return 'bg-purple-50 text-purple-700 border-purple-200'
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  return (
    <div className="bg-white rounded-2xl border border-borderLight p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-borderLight/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-navy flex items-center gap-2">
              <Database size={16} className="text-oceanBlue" />
              <span>{t('ORCA Marine Source Registry & Provenance Architecture')}</span>
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {registryFeeds.length} {t('Active Feeds')}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-oceanBlue text-[11px] font-mono font-bold">
                {t('9-Key Metadata Standard')}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-textMuted mt-0.5">
            {t('Strict provenance tracking across INCOIS, IMD, ISRO, Copernicus, Open-Meteo, and UNCLOS for reliable, evidence-backed marine decision making.')}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-surface p-1 rounded-xl border border-borderLight self-start lg:self-auto">
          <button
            onClick={() => {
              setActiveTab('registry')
              setSelectedCategory('All')
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'registry'
                ? 'bg-oceanBlue text-white shadow-xs'
                : 'text-textSecond hover:text-navy hover:bg-slate-200/50'
            }`}
          >
            <Activity size={13} />
            <span>{t('Operational Source Registry')}</span>
            <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'registry' ? 'bg-white/20 text-white' : 'bg-slate-200 text-textSecond'
            }`}>
              {registryFeeds.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('contracts')
              setSelectedCategory('All')
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'contracts'
                ? 'bg-oceanBlue text-white shadow-xs'
                : 'text-textSecond hover:text-navy hover:bg-slate-200/50'
            }`}
          >
            <Code2 size={13} />
            <span>{t('OGC Contracts & Schemas')}</span>
            <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'contracts' ? 'bg-white/20 text-white' : 'bg-slate-200 text-textSecond'
            }`}>
              {DATASETS.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Row: Category Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {(activeTab === 'registry' ? sourceAuthorities : contractCategories).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl font-medium whitespace-nowrap transition-colors text-[11px] ${
                selectedCategory === cat
                  ? 'bg-oceanBlue text-white shadow-xs font-semibold'
                  : 'bg-surface hover:bg-slate-200/60 text-textSecond'
              }`}
            >
              {cat === 'All' ? t('All Feeds') : cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
          <input
            type="text"
            placeholder={activeTab === 'registry' ? t('Search feeds, sources, quality...') : t('Search datasets, providers...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-borderLight text-xs focus:outline-none focus:border-oceanBlue bg-surface/70"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-navy"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: OPERATIONAL SOURCE REGISTRY (9-KEY LIVE SCHEMA) */}
      {activeTab === 'registry' && (
        <div className="space-y-3">
          {/* Metadata Specification Note */}
          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-oceanBlue flex-shrink-0" />
              <div className="text-[11px] text-textSecond">
                <span className="font-semibold text-navy">{t('Standardized 9-Key Metadata Schema')}:</span>{' '}
                <code className="text-oceanBlue font-mono font-bold">{'{ source, dataset, source_url, timestamp, last_updated, latency, spatial_resolution, temporal_resolution, quality }'}</code>
              </div>
            </div>
            <span className="text-[10px] text-textMuted font-mono whitespace-nowrap">
              {t('Refreshed on each decision step')}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-borderLight/80">
            <table className="w-full min-w-[760px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-borderLight text-[11px] font-semibold text-textMuted uppercase tracking-wider">
                  <th className="py-2.5 px-3.5 w-4/12">{t('Operational Feed & Source')}</th>
                  <th className="py-2.5 px-3 w-3/12">{t('Quality & Calibration')}</th>
                  <th className="py-2.5 px-3 w-2/12">{t('Latency & Cadence')}</th>
                  <th className="py-2.5 px-3 w-2/12">{t('Spatial Resolution')}</th>
                  <th className="py-2.5 px-3.5 w-1/12 text-right">{t('9-Key Metadata')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFeeds.map((feed, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      setActiveModalItem(feed)
                      setModalMode('source')
                    }}
                  >
                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-navy group-hover:text-oceanBlue transition-colors flex items-center gap-1.5">
                        <span>{feed.dataset}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getSourceBadgeColor(feed.source)}`}>
                          {feed.source}
                        </span>
                        {feed.source_url && (
                          <a
                            href={feed.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-textMuted hover:text-oceanBlue flex items-center gap-0.5"
                          >
                            <ExternalLink size={10} />
                            <span>{t('Portal')}</span>
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50/80 border border-emerald-200/60 text-emerald-800 text-[10px] font-medium leading-tight">
                        <CheckCircle2 size={11} className="text-emerald-600 flex-shrink-0" />
                        <span className="line-clamp-1">{feed.quality}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-navy">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{feed.latency}</span>
                      </div>
                      <div className="text-[10px] text-textMuted mt-0.5 line-clamp-1">{feed.temporal_resolution}</div>
                    </td>

                    <td className="py-2.5 px-3 text-[11px] text-textSecond">
                      <div className="line-clamp-1 font-medium">{feed.spatial_resolution}</div>
                      <div className="text-[10px] text-textMuted mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        <span>{feed.last_updated}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveModalItem(feed)
                          setModalMode('source')
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface hover:bg-oceanBlue hover:text-white text-textSecond text-[11px] font-medium border border-borderLight transition-colors inline-flex items-center gap-1"
                      >
                        <Code2 size={12} />
                        <span>{t('Inspect')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OGC DATASET CONTRACTS & SCHEMAS */}
      {activeTab === 'contracts' && (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-borderLight/80">
            <table className="w-full min-w-[720px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-borderLight text-[11px] font-semibold text-textMuted uppercase tracking-wider">
                  <th className="py-2.5 px-3.5 w-4/12">{t('Dataset Name & System')}</th>
                  <th className="py-2.5 px-3 w-2/12">{t('Provider Authority')}</th>
                  <th className="py-2.5 px-3 w-2/12">{t('Resolution & Scale')}</th>
                  <th className="py-2.5 px-3 w-2/12">{t('Update Cadence')}</th>
                  <th className="py-2.5 px-3 w-1/12">{t('Format')}</th>
                  <th className="py-2.5 px-3.5 w-1/12 text-right">{t('Contract')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDatasets.map((ds) => (
                  <tr 
                    key={ds.id} 
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      setActiveModalItem(ds)
                      setModalMode('dataset')
                    }}
                  >
                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-navy group-hover:text-oceanBlue transition-colors flex items-center gap-1.5">
                        <span>{ds.name}</span>
                      </div>
                      <div className="text-[10px] text-textMuted mt-0.5 line-clamp-1">{ds.description}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-textSecond text-[10px] font-medium inline-block whitespace-nowrap">
                        {ds.provider}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-textSecond whitespace-nowrap">
                      {ds.resolution}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] whitespace-nowrap">
                      <span className="font-medium text-navy">{ds.freshness}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/50">
                        {ds.format}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveModalItem(ds)
                          setModalMode('dataset')
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface hover:bg-oceanBlue hover:text-white text-textSecond text-[11px] font-medium border border-borderLight transition-colors inline-flex items-center gap-1"
                      >
                        <Code2 size={12} />
                        <span>{t('Inspect')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECTOR MODAL: 9-KEY PROVENANCE RECORD OR DATASET CONTRACT */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-borderLight animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-borderLight flex items-start justify-between gap-3 bg-slate-50 rounded-t-2xl">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-oceanBlue/10 text-oceanBlue font-mono">
                  {modalMode === 'source' ? t('Operational Feed Provenance (9-Key Schema)') : activeModalItem.category}
                </span>
                <h3 className="text-base font-bold text-navy mt-1">
                  {modalMode === 'source' ? activeModalItem.dataset : activeModalItem.name}
                </h3>
                <p className="text-xs text-textMuted mt-0.5">
                  {modalMode === 'source' ? `${t('Authority')}: ${activeModalItem.source}` : activeModalItem.provider}
                </p>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="p-1.5 rounded-lg text-textMuted hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* OPERATIONAL SOURCE VIEW (9-KEY) */}
              {modalMode === 'source' ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-surface border border-borderLight/70">
                    <div className="p-2 rounded-lg bg-white border border-borderLight">
                      <span className="text-[10px] uppercase font-semibold text-textMuted">{t('Latency')}</span>
                      <div className="font-mono font-bold text-navy mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{activeModalItem.latency}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-borderLight">
                      <span className="text-[10px] uppercase font-semibold text-textMuted">{t('Spatial Res')}</span>
                      <div className="font-medium text-navy mt-0.5 line-clamp-1">{activeModalItem.spatial_resolution}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-borderLight">
                      <span className="text-[10px] uppercase font-semibold text-textMuted">{t('Cadence')}</span>
                      <div className="font-medium text-navy mt-0.5 line-clamp-1">{activeModalItem.temporal_resolution}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-borderLight">
                      <span className="text-[10px] uppercase font-semibold text-textMuted">{t('Last Updated')}</span>
                      <div className="font-medium text-navy mt-0.5 line-clamp-1">{activeModalItem.last_updated}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      <span>{t('Operational Quality & Calibration')}</span>
                    </span>
                    <p className="text-xs text-emerald-950 font-medium mt-0.5">{activeModalItem.quality}</p>
                    {activeModalItem.source_url && (
                      <div className="mt-2 pt-2 border-t border-emerald-200/50 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-800 font-mono">{activeModalItem.source_url}</span>
                        <a
                          href={activeModalItem.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                        >
                          <ExternalLink size={10} />
                          <span>{t('Open Portal')}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 9-Key JSON View */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-navy flex items-center gap-1.5">
                        <Code2 size={13} className="text-oceanBlue" />
                        <span>{t('Standardized 9-Key Evidence Record (JSON)')}</span>
                      </span>
                      <button
                        onClick={() => handleCopyJson(activeModalItem, 'active-source-json')}
                        className="px-2.5 py-1 rounded-lg bg-surface hover:bg-slate-200 text-textSecond text-[10px] font-medium border border-borderLight transition-colors inline-flex items-center gap-1"
                      >
                        {copiedKey === 'active-source-json' ? (
                          <>
                            <Check size={11} className="text-emerald-600" />
                            <span className="text-emerald-700 font-bold">{t('Copied!')}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>{t('Copy 9-Key JSON')}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-[11px] overflow-x-auto border border-slate-800">
                      <pre>{JSON.stringify(activeModalItem, null, 2)}</pre>
                    </div>
                  </div>
                </>
              ) : (
                /* DATASET CONTRACT VIEW */
                <>
                  <p className="text-textSecond leading-relaxed">
                    {activeModalItem.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-surface border border-borderLight/70">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-textMuted">{t('Spatial Coverage')}</span>
                      <div className="font-medium text-navy mt-0.5">{activeModalItem.coverage}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-textMuted">{t('Spatial Resolution')}</span>
                      <div className="font-medium text-navy mt-0.5">{activeModalItem.resolution}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-textMuted">{t('Update Cadence')}</span>
                      <div className="font-medium text-navy mt-0.5">{activeModalItem.freshness}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-textMuted">{t('License & Access')}</span>
                      <div className="font-medium text-navy mt-0.5">{activeModalItem.license}</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-navy flex items-center gap-1.5">
                        <Code2 size={13} className="text-oceanBlue" />
                        <span>{t('Data Contract / Machine Interface Schema')}</span>
                      </span>
                      <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                        {activeModalItem.format}
                      </span>
                    </div>
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-[11px] overflow-x-auto border border-slate-800">
                      <pre>{JSON.stringify(activeModalItem.schemaSample, null, 2)}</pre>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-borderLight flex items-center justify-end bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setActiveModalItem(null)}
                className="px-4 py-1.5 rounded-xl bg-oceanBlue text-white text-xs font-semibold hover:bg-oceanBlue/90 transition-colors"
              >
                {t('Close Inspector')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

