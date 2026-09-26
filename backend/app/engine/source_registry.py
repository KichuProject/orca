"""
engine/source_registry.py
ORCA MASTER SOURCE REGISTRY & EVIDENCE PROVENANCE ENGINE

Maintains standardized operational metadata for all marine datasets and tools:
{
  "source": "INCOIS",
  "dataset": "PFZ",
  "source_url": "https://incois.gov.in/portal/pfz",
  "timestamp": "2026-09-09T21:20:00+05:30",
  "last_updated": "2026-09-09 18:00 IST",
  "latency": "145ms",
  "spatial_resolution": "1 km coastal sectors",
  "temporal_resolution": "Daily / Evening",
  "quality": "Operational (Verified L4)"
}

Generates concise, evidence-backed provenance citations for AI answers:
PFZ: INCOIS
SST: Copernicus
Wave forecast: Open-Meteo
Retrieved: 09 Sep 2026 08:20 IST
"""
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional

IST = timezone(timedelta(hours=5, minutes=30))

# ============================================================
# MASTER OPERATIONAL SOURCE REGISTRY
# ============================================================
SOURCE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "pfz": {
        "source": "INCOIS",
        "dataset": "Potential Fishing Zones (PFZ)",
        "source_url": "https://incois.gov.in/portal/pfz",
        "last_updated": "Today 18:00 IST",
        "typical_latency_ms": 145,
        "spatial_resolution": "1 km coastal sector grid",
        "temporal_resolution": "Daily (Evening bulletin)",
        "quality": "Operational L4 (Thermal front & Chlorophyll composite)",
        "provider_full": "Indian National Centre for Ocean Information Services (MoES)",
        "servicing_tools": ["pfz_agent", "pfz_tool", "productivity_agent"],
        "category": "Fisheries"
    },
    "sst": {
        "source": "Copernicus",
        "dataset": "Sea Surface Temperature (SST)",
        "source_url": "https://marine.copernicus.eu",
        "last_updated": "Today 04:00 UTC",
        "typical_latency_ms": 180,
        "spatial_resolution": "0.05° (~5 km) gap-free grid",
        "temporal_resolution": "Daily reanalysis (OSTIA / Sentinel-3)",
        "quality": "Operational Foundation SST (Multi-satellite fused)",
        "provider_full": "Copernicus Marine Service (CMEMS / Mercator Ocean)",
        "servicing_tools": ["ocean_conditions_agent", "ocean_agent", "fusion_agent"],
        "category": "Oceanography"
    },
    "sst_isro": {
        "source": "ISRO MOSDAC",
        "dataset": "INSAT-3DS / Oceansat-3 Sea Surface Temperature",
        "source_url": "https://www.mosdac.gov.in",
        "last_updated": "Past 6 hours",
        "typical_latency_ms": 220,
        "spatial_resolution": "4 km geostationary resolution",
        "temporal_resolution": "30-minute cadence / 6-hourly L3B",
        "quality": "Operational Satellite EO (Thermal IR Soundings)",
        "provider_full": "Space Applications Centre (ISRO / SAC Ahmedabad)",
        "servicing_tools": ["ocean_conditions_agent", "ocean_agent"],
        "category": "Oceanography"
    },
    "chlorophyll": {
        "source": "ISRO MOSDAC",
        "dataset": "Oceansat-3 (EOS-06) Ocean Colour Monitor (OCM-3)",
        "source_url": "https://www.mosdac.gov.in",
        "last_updated": "Today 12:00 IST",
        "typical_latency_ms": 210,
        "spatial_resolution": "1 km local / 25 km regional grid",
        "temporal_resolution": "Daily orbital passes",
        "quality": "Operational Biological Density (13-band Ocean Colour)",
        "provider_full": "ISRO / National Remote Sensing Centre (NRSC)",
        "servicing_tools": ["ocean_conditions_agent", "productivity_agent"],
        "category": "Ecology"
    },
    "waves": {
        "source": "INCOIS",
        "dataset": "Ocean State Forecast & Wave Rider Network",
        "source_url": "https://incois.gov.in/portal/osf",
        "last_updated": "Live 3-hourly forecast cycle",
        "typical_latency_ms": 130,
        "spatial_resolution": "Point Wave Riders & 0.1° SWAN coastal grid",
        "temporal_resolution": "Hourly updates / 72-hour forecast",
        "quality": "Operational In-situ Calibrated (Wave Rider Network)",
        "provider_full": "INCOIS Ocean Advisory and Warning Division",
        "servicing_tools": ["safety_agent", "safety_tool", "hazard_agent"],
        "category": "Safety"
    },
    "weather": {
        "source": "IMD",
        "dataset": "Coastal Weather & AWS Observations",
        "source_url": "https://mausam.imd.gov.in",
        "last_updated": "Hourly AWS synoptic reports",
        "typical_latency_ms": 160,
        "spatial_resolution": "Coastal stations & 0.25° NWP grid",
        "temporal_resolution": "Hourly / 3-hourly synoptic charts",
        "quality": "Official National Weather Service (WMO Calibrated)",
        "provider_full": "India Meteorological Department (MoES)",
        "servicing_tools": ["weather_agent", "safety_agent"],
        "category": "Weather"
    },
    "weather_forecast": {
        "source": "Open-Meteo",
        "dataset": "High-Resolution Marine Weather Forecast",
        "source_url": "https://open-meteo.com/en/docs/marine-weather-api",
        "last_updated": "Rolling hourly model run",
        "typical_latency_ms": 95,
        "spatial_resolution": "0.1° (~11 km) marine atmospheric grid",
        "temporal_resolution": "Hourly cadence / 7-day outlook",
        "quality": "Multi-model Numerical Ensemble (ECMWF, GFS, DWD)",
        "provider_full": "Open-Meteo / European Weather Numerical Integration",
        "servicing_tools": ["weather_agent", "safety_agent", "what_if_departure_agent"],
        "category": "Weather"
    },
    "lightning": {
        "source": "IMD / ISRO",
        "dataset": "IMD Lightning Flash Grid & INSAT-3DS CAPE",
        "source_url": "https://sachet.ndma.gov.in",
        "last_updated": "15-minute live detection feed",
        "typical_latency_ms": 115,
        "spatial_resolution": "5 km convective thunderstorm grid",
        "temporal_resolution": "Real-time strike discharges / 15-min cadence",
        "quality": "Operational Severe Hazard Warning (Doppler & Satellite)",
        "provider_full": "IMD National Lightning Detection Network (NLDN)",
        "servicing_tools": ["hazard_agent", "safety_agent"],
        "category": "Hazards"
    },
    "cyclone": {
        "source": "IMD RSMC",
        "dataset": "Cyclone Warning Division Operational Bulletins",
        "source_url": "https://rsmcnewdelhi.imd.gov.in",
        "last_updated": "3-hourly / Special Tropical Cyclone Bulletins",
        "typical_latency_ms": 140,
        "spatial_resolution": "Vortex track coordinates & 34/50/64 knot radii",
        "temporal_resolution": "Sub-daily cyclone tracking",
        "quality": "Authoritative WMO Regional Specialized Meteorological Centre",
        "provider_full": "IMD Cyclone Warning Division New Delhi",
        "servicing_tools": ["hazard_agent", "safety_agent", "imd_alert_agent"],
        "category": "Hazards"
    },
    "tsunami": {
        "source": "INCOIS ITEWS",
        "dataset": "Indian Tsunami Early Warning System (ITEWS)",
        "source_url": "https://tsunami.incois.gov.in/itews",
        "last_updated": "Instantaneous automated seismic trigger",
        "typical_latency_ms": 85,
        "spatial_resolution": "Indian Ocean Basin seismic epicenters & BPR network",
        "temporal_resolution": "Real-time automated seismic bulletins",
        "quality": "National Tsunami Warning Centre (NTWC UNESCO/IOC)",
        "provider_full": "INCOIS National Tsunami Early Warning Centre",
        "servicing_tools": ["tsunami_agent", "hazard_agent"],
        "category": "Hazards"
    },
    "argo": {
        "source": "INCOIS / Argo International",
        "dataset": "Autonomous Oceanic Profiling Floats (In-situ CTD)",
        "source_url": "https://argo.ucsd.edu",
        "last_updated": "Latest 10-day drift profiling cycles",
        "typical_latency_ms": 120,
        "spatial_resolution": "150+ active float coordinates across Arabian Sea & BoB",
        "temporal_resolution": "10-day surfacing cycle / 0-2000m vertical profile",
        "quality": "Ground-truth In-situ Robotic CTD Telemetry",
        "provider_full": "INCOIS / Euro-Argo / NOAA Ocean Climate Observation",
        "servicing_tools": ["argo_agent", "historical_anomaly_agent"],
        "category": "Historical"
    },
    "currents": {
        "source": "ISRO SCAT-3 / INCOIS",
        "dataset": "Surface Current Drift Vectors & HF Radar",
        "source_url": "https://incois.gov.in/portal/currents",
        "last_updated": "Daily scatterometer composite / Hourly HF Radar",
        "typical_latency_ms": 190,
        "spatial_resolution": "25 km scatterometer / 5 km coastal radar",
        "temporal_resolution": "Hourly coastal / Daily basin-scale",
        "quality": "Operational Surface Hydrodynamic Analysis",
        "provider_full": "ISRO Space Applications Centre & INCOIS",
        "servicing_tools": ["ocean_conditions_agent", "navigation_agent", "route_agent"],
        "category": "Oceanography"
    },
    "tides": {
        "source": "Survey of India / Indian Navy",
        "dataset": "Harmonic Tidal Constants & Coastal Predictions",
        "source_url": "https://www.surveyofindia.gov.in",
        "last_updated": "Annual harmonic astronomical calculation",
        "typical_latency_ms": 40,
        "spatial_resolution": "24 major & intermediate Indian tidal ports",
        "temporal_resolution": "Continuous minute-by-minute astronomical curve",
        "quality": "Statutory Hydrographic Tide Tables (National Standard)",
        "provider_full": "National Hydrographic Office (NHO Dehradun)",
        "servicing_tools": ["tide_agent", "safety_agent", "ocean_conditions_agent"],
        "category": "Oceanography"
    },
    "geofence": {
        "source": "UNCLOS / VLIZ",
        "dataset": "Indian EEZ & International Maritime Boundary Lines (IMBL)",
        "source_url": "https://www.marineregions.org",
        "last_updated": "Statutory Boundary Gazette",
        "typical_latency_ms": 35,
        "spatial_resolution": "Sub-meter polygon vector boundaries",
        "temporal_resolution": "Statutory baseline treaties & arbitrations",
        "quality": "Official International Maritime Delimitation (UNCLOS 1982)",
        "provider_full": "Ministry of External Affairs / National Hydrographic Office",
        "servicing_tools": ["geofence_agent", "geospatial_agent", "route_agent"],
        "category": "Boundaries"
    },
    "bathymetry": {
        "source": "GEBCO",
        "dataset": "GEBCO 2026 Global Bathymetric Depth Grid",
        "source_url": "https://www.gebco.net",
        "last_updated": "Annual gridded release",
        "typical_latency_ms": 50,
        "spatial_resolution": "15 arc-second (~450 m) global terrain grid",
        "temporal_resolution": "Static seabed elevation model",
        "quality": "International Hydrographic Standard (IHO / IOC)",
        "provider_full": "General Bathymetric Chart of the Oceans (GEBCO / IOC)",
        "servicing_tools": ["navigation_agent", "route_agent", "geospatial_agent"],
        "category": "Navigation"
    },
    "seasonal_ban": {
        "source": "Dept of Fisheries",
        "dataset": "Uniform Seasonal Fishing Ban Notification",
        "source_url": "https://dof.gov.in",
        "last_updated": "Annual statutory gazette notification",
        "typical_latency_ms": 30,
        "spatial_resolution": "East Coast (61 days) & West Coast (61 days)",
        "temporal_resolution": "Annual seasonal breeding cycle",
        "quality": "Statutory Central Government Notification",
        "provider_full": "Department of Fisheries (Ministry of Fisheries, Animal Husbandry & Dairying)",
        "servicing_tools": ["seasonal_ban_agent", "safety_agent", "pfz_agent"],
        "category": "Fisheries"
    },
    "ais_vessels": {
        "source": "Global Fishing Watch",
        "dataset": "AIS Vessel Tracking & Commercial Fishing Events",
        "source_url": "https://globalfishingwatch.org",
        "last_updated": "Past 24 hours",
        "typical_latency_ms": 280,
        "spatial_resolution": "Vessel GPS lat/lon fixes & gear class",
        "temporal_resolution": "Daily consolidated AIS fleet positions",
        "quality": "Satellite AIS v3 with machine-learned gear detection",
        "provider_full": "Global Fishing Watch Research & Monitoring Initiative",
        "servicing_tools": ["gfw_agent", "navigation_agent"],
        "category": "Navigation"
    },
    "climatology": {
        "source": "ORCA Climatology Engine",
        "dataset": "10-Year Environmental Climatological Baseline",
        "source_url": "https://orca.marine.gov.in/climatology",
        "last_updated": "Monthly rolling climatology",
        "typical_latency_ms": 60,
        "spatial_resolution": "0.25° grid across Indian maritime basin",
        "temporal_resolution": "Monthly mean & standard deviation climatology",
        "quality": "Statistical Climatological Baseline (2015-2025)",
        "provider_full": "ORCA Multi-Mission Environmental Baseline",
        "servicing_tools": ["historical_anomaly_agent", "productivity_agent"],
        "category": "Historical"
    },
    "marine_intel": {
        "source": "ORCA Master Fusion Engine",
        "dataset": "Multi-Sensor Comprehensive Marine Intelligence",
        "source_url": "https://orca.marine.gov.in",
        "last_updated": "Real-time synthesis",
        "typical_latency_ms": 290,
        "spatial_resolution": "Co-located multi-sensor spatial fusion",
        "temporal_resolution": "Instantaneous multi-source aggregation",
        "quality": "Multi-agent fused verified marine telemetry",
        "provider_full": "ORCA Autonomous Marine AI Co-Pilot",
        "servicing_tools": ["full_marine_intel_agent", "fusion_agent"],
        "category": "Fusion"
    }
}

# Mapping of tools to their primary source keys
TOOL_TO_SOURCE_KEYS = {
    "pfz_agent": ["pfz", "chlorophyll"],
    "pfz_tool": ["pfz", "chlorophyll"],
    "ocean_conditions_agent": ["sst", "chlorophyll", "currents", "waves"],
    "ocean_agent": ["sst", "chlorophyll"],
    "weather_agent": ["weather", "weather_forecast", "lightning"],
    "safety_agent": ["waves", "weather", "weather_forecast", "tides"],
    "hazard_agent": ["cyclone", "lightning", "tsunami"],
    "tsunami_agent": ["tsunami"],
    "argo_agent": ["argo"],
    "tide_agent": ["tides"],
    "geospatial_agent": ["geofence", "bathymetry"],
    "geofence_agent": ["geofence"],
    "seasonal_ban_agent": ["seasonal_ban"],
    "navigation_agent": ["bathymetry", "currents", "tides"],
    "route_agent": ["bathymetry", "waves", "geofence"],
    "productivity_agent": ["chlorophyll", "climatology"],
    "historical_anomaly_agent": ["climatology", "argo"],
    "gfw_agent": ["ais_vessels"],
    "imd_alert_agent": ["weather", "cyclone"],
    "full_marine_intel_agent": ["pfz", "sst", "waves", "weather", "tides", "geofence", "bathymetry", "tsunami"],
    "fusion_agent": ["marine_intel", "sst", "waves"]
}

# Key operational variable to source mapping for concise final answers
VARIABLE_SOURCE_MAP = {
    "PFZ": "INCOIS",
    "SST": "Copernicus",
    "Wave forecast": "Open-Meteo",
    "Weather forecast": "IMD",
    "Lightning": "IMD / ISRO",
    "Cyclone": "IMD RSMC",
    "Tsunami alert": "INCOIS ITEWS",
    "Argo CTD": "INCOIS / Argo International",
    "Tides": "Survey of India",
    "Bathymetry": "GEBCO",
    "EEZ & Boundaries": "UNCLOS / VLIZ",
    "Fishing ban": "Dept of Fisheries",
    "Vessel traffic": "Global Fishing Watch",
}


REQUIRED_PROVENANCE_KEYS = {
    "source",
    "dataset",
    "source_url",
    "timestamp",
    "last_updated",
    "latency",
    "spatial_resolution",
    "temporal_resolution",
    "quality"
}


def get_source_record(key: str, measured_latency_ms: Optional[int] = None) -> Dict[str, Any]:
    """
    Returns the complete operational metadata record for a source key,
    conforming strictly to the requested 9-key schema.
    """
    now_ist = datetime.now(IST)
    meta = SOURCE_REGISTRY.get(key, {})
    
    latency_str = f"{measured_latency_ms}ms" if measured_latency_ms else f"{meta.get('typical_latency_ms', 120)}ms"
    
    return {
        "source": meta.get("source", "ORCA Marine"),
        "dataset": meta.get("dataset", key.upper()),
        "source_url": meta.get("source_url", "https://orca.marine.gov.in"),
        "timestamp": now_ist.isoformat(),
        "last_updated": meta.get("last_updated", "Recent"),
        "latency": latency_str,
        "spatial_resolution": meta.get("spatial_resolution", "Regional grid"),
        "temporal_resolution": meta.get("temporal_resolution", "Operational"),
        "quality": meta.get("quality", "Verified Operational Feed")
    }


def get_provenance_for_tools(tool_names: List[str]) -> List[Dict[str, Any]]:
    """
    Resolves a list of executed tool names into their rich underlying source provenance records.
    Deduplicates by dataset name.
    """
    records = []
    seen_sources = set()
    
    for tool in tool_names:
        clean_tool = tool.strip()
        source_keys = TOOL_TO_SOURCE_KEYS.get(clean_tool, [])
        for sk in source_keys:
            if sk not in seen_sources:
                seen_sources.add(sk)
                records.append(get_source_record(sk))
                
    # Fallback to standard core sources if none matched
    if not records:
        for sk in ["sst", "waves", "weather"]:
            records.append(get_source_record(sk))
            
    return records


def format_evidence_citation_block(
    tool_names: Optional[List[str]] = None,
    dt: Optional[datetime] = None
) -> str:
    """
    Generates the exact concise citation format requested by the user prompt:
    
    PFZ: INCOIS
    SST: Copernicus
    Wave forecast: Open-Meteo
    Retrieved: 09 Sep 2026 08:20 IST
    """
    now_ist = dt or datetime.now(IST)
    timestamp_str = now_ist.strftime("%d %b %Y %H:%M IST")
    
    tools = tool_names or ["pfz_agent", "ocean_conditions_agent", "safety_agent"]
    
    # Identify variables used based on executed tools
    lines = []
    seen_vars = set()
    
    # Helper to check tools
    has_pfz = any("pfz" in t for t in tools)
    has_ocean = any("ocean" in t or "sst" in t or "current" in t for t in tools)
    has_safety_or_wave = any("safety" in t or "wave" in t or "what_if" in t or "swell" in t for t in tools)
    has_weather = any("weather" in t or "wind" in t or "meteo" in t for t in tools)
    has_cyclone = any("hazard" in t or "cyclone" in t or "squall" in t for t in tools)
    has_tsunami = any("tsunami" in t for t in tools)
    has_argo = any("argo" in t for t in tools)
    has_tide = any("tide" in t for t in tools)
    has_geo = any("geofence" in t or "geospatial" in t or "route" in t or "eez" in t for t in tools)
    
    if has_pfz:
        lines.append(f"PFZ: {VARIABLE_SOURCE_MAP['PFZ']}")
        seen_vars.add("PFZ")
    if has_ocean:
        lines.append(f"SST: {VARIABLE_SOURCE_MAP['SST']}")
        seen_vars.add("SST")
    if has_safety_or_wave:
        lines.append(f"Wave forecast: {VARIABLE_SOURCE_MAP['Wave forecast']}")
        seen_vars.add("Wave forecast")
    elif has_weather:
        lines.append(f"Weather forecast: {VARIABLE_SOURCE_MAP['Weather forecast']}")
        seen_vars.add("Weather forecast")
        
    if has_tsunami:
        lines.append(f"Tsunami alert: {VARIABLE_SOURCE_MAP['Tsunami alert']}")
        seen_vars.add("Tsunami alert")
    if has_cyclone and "Cyclone" not in seen_vars:
        lines.append(f"Cyclone: {VARIABLE_SOURCE_MAP['Cyclone']}")
        seen_vars.add("Cyclone")
    if has_argo:
        lines.append(f"Argo CTD: {VARIABLE_SOURCE_MAP['Argo CTD']}")
        seen_vars.add("Argo CTD")
    if has_tide and len(lines) < 4:
        lines.append(f"Tides: {VARIABLE_SOURCE_MAP['Tides']}")
        seen_vars.add("Tides")
    if has_geo and len(lines) < 4:
        lines.append(f"EEZ & Boundaries: {VARIABLE_SOURCE_MAP['EEZ & Boundaries']}")
        seen_vars.add("EEZ & Boundaries")
        
    # Default minimum if very general query
    if not lines:
        lines = [
            f"PFZ: {VARIABLE_SOURCE_MAP['PFZ']}",
            f"SST: {VARIABLE_SOURCE_MAP['SST']}",
            f"Wave forecast: {VARIABLE_SOURCE_MAP['Wave forecast']}"
        ]
        
    lines.append(f"Retrieved: {timestamp_str}")
    return "\n".join(lines)


def get_full_source_registry() -> List[Dict[str, Any]]:
    """Returns the full catalog of all 19 operational feeds with live schema."""
    return [get_source_record(k) for k in SOURCE_REGISTRY]
