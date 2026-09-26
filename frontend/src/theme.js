/**
 * ISRO ORCA Brand Design Tokens & Palette
 */
export const THEME = {
  brand: {
    name: 'ORCA — Ocean Intelligence Agentic AI',
    sub: 'Oceanographic & Real-Time Coastal Analytics',
    isro: 'ISRO — Department of Space, Govt of India',
  },
  colors: {
    // Primary ISRO & Ocean Palettes
    navy: '#0a2540',
    deepOcean: '#0d2137',
    oceanBlue: '#1e60d5',
    skyBlue: '#0284c7',
    
    // ISRO Accents
    saffron: '#ff9933',
    accentOrange: '#ff6f00',
    
    // Surface & Layout
    surface: '#f0f4f9',
    surfaceCard: '#ffffff',
    surfaceMid: '#e8eef6',
    surfaceDark: '#dce6f0',
    borderLight: '#e2eaf4',
    borderMid: '#c8d8e8',
    
    // Semantic Status Indicators
    safeGreen: '#00c853',
    safeLight: '#e8f5e9',
    warningAmber: '#ffb300',
    warningLight: '#fff8e1',
    dangerRed: '#e53935',
    dangerLight: '#ffebee',
    moderateOrange: '#ff7043',
    
    // Typography
    textPrimary: '#0a2540',
    textSecond: '#4a6080',
    textMuted: '#8aa0b8',
  },
  fonts: {
    primary: "'Noto Sans', Inter, system-ui, sans-serif",
  },
}

// Log tokens to console on load as required by Phase F0 specification
if (typeof window !== 'undefined') {
  console.log('🌊 [ORCA Theme Loaded]', THEME.colors)
}

export default THEME
