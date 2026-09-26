/**
 * ORCA Marine Starter Prompts
 * UI starter chips to guide user maritime queries without hardcoding AI responses.
 */

export const STARTER_PROMPTS = [
  {
    id: 'pfz',
    title: 'Find Nearest PFZ',
    subtitle: 'High chlorophyll & fish aggregation zones',
    query: 'What is the nearest Potential Fishing Zone (PFZ) from my current location, and what are the coordinates?',
    icon: 'compass',
  },
  {
    id: 'safety',
    title: 'Check Sea Conditions',
    subtitle: 'Swell, wave height & tomorrow outlook',
    query: 'Is it safe to venture into the sea tomorrow morning? Check wind, wave heights, and weather forecast.',
    icon: 'shield',
  },
  {
    id: 'cyclone',
    title: 'Cyclone & Hazard Alert',
    subtitle: 'IMD storm alerts & lightning risks',
    query: 'Are there any active cyclone, depression, or severe weather advisories issued for the coast?',
    icon: 'alert-triangle',
  },
  {
    id: 'route',
    title: 'Safe Navigation Route',
    subtitle: 'Avoid hazardous shallows & boundaries',
    query: 'Calculate the safest navigable route for a fishing trawler avoiding restricted zones and bad weather.',
    icon: 'navigation',
  },
  {
    id: 'tide',
    title: 'Tide & Ocean Telemetry',
    subtitle: 'High/low tides & sea temperature',
    query: 'What are the current tide timings and sea surface temperatures along the Tamil Nadu coast?',
    icon: 'activity',
  },
  {
    id: 'productivity',
    title: 'Fisheries Advisory',
    subtitle: 'Species abundance & water quality',
    query: 'Provide a marine productivity briefing on pelagic fish concentrations and seasonal ban compliance.',
    icon: 'anchor',
  },
];

export default STARTER_PROMPTS;
