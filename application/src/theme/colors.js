/**
 * ORCA Marine Intelligence Color System
 * Web Parity: Crisp Marine Light Theme with Navy & Ocean Blue Accents
 * Matching e:\sih\frontend\src\theme.js exactly.
 */
export const colors = {
  // Backgrounds & Surfaces
  background: '#f4f7fb',            // Web body surface (#f4f7fb)
  backgroundSecondary: '#eef3f9',   // Light marine layer
  surface: '#f0f4f9',               // Primary container surface
  surfaceElevated: '#ffffff',       // Elevated header & navbar (Pure White)
  surfaceCard: '#ffffff',           // Content cards (Pure White)
  surfaceHighlight: '#e8f1fa',      // Selected / hover state
  surfaceInput: '#ffffff',          // Chat input field background
  surfaceSubtle: '#f8fafc',

  // Borders
  border: '#e2eaf4',                // Web borderLight
  borderSubtle: '#edf2f7',          // Soft light separator
  borderActive: '#1e60d5',          // Web oceanBlue active border
  borderCyan: '#cce5fa',            // Soft sky blue card border

  // Brand Accents (Exact Web Frontend Palettes)
  primary: '#1e60d5',               // Ocean Blue (#1e60d5)
  primaryDark: '#0a2540',           // Deep Navy (#0a2540)
  primaryLight: '#0284c7',          // Sky Blue (#0284c7)
  accent: '#1e60d5',                // Web Ocean Blue Accent
  accentGlow: 'rgba(30, 96, 213, 0.15)',
  accentSubtle: '#e8f1fb',          // Light blue tint
  saffron: '#ff9933',               // ISRO Saffron
  accentOrange: '#ff6f00',
  aqua: '#0284c7',                  // Coastal Aqua

  // Typography Hierarchy (Web Navy Contrast)
  text: '#0a2540',                  // Deep Navy (#0a2540)
  textHeading: '#0a2540',           // Deep Navy Titles
  textSecondary: '#4a6080',         // Web textSecond (#4a6080)
  textMuted: '#8aa0b8',             // Web textMuted (#8aa0b8)
  textDim: '#a0aec0',               // Disabled / Placeholder

  // Marine Operational Status
  safe: '#00c853',                  // Safe Green
  safeBg: '#e8f5e9',
  safeBorder: '#a5d6a7',

  warning: '#ffb300',                // Warning Amber
  warningBg: '#fff8e1',
  warningBorder: '#ffe082',

  danger: '#e53935',                 // Danger Red
  dangerBg: '#ffebee',
  dangerBorder: '#ffcdd2',

  info: '#1e60d5',
  infoBg: '#e8f1fb',
  infoBorder: '#b9dbf8',

  // Chat Bubbles (Exact Web UI Parity)
  userBubble: '#0a2540',            // Deep Navy user bubble
  userBubbleText: '#ffffff',
  assistantBubble: '#ffffff',       // Pure White assistant card with border
  assistantBubbleText: '#0a2540',

  // Utility
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(10, 37, 64, 0.55)',
};

export default colors;
