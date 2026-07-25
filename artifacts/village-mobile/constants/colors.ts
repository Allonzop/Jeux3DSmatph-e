/**
 * Design tokens synced from the Village Spatial 3D web artifact (index.css).
 * Dark space-game palette: deep navy black + indigo + gold accents.
 */

const colors = {
  light: {
    // Legacy alias
    text: '#c8d0e8',
    tint: '#4d70d9',

    background: '#0d1117',
    foreground: '#c8d0e8',

    card: '#18203a',
    cardForeground: '#c8d0e8',

    primary: '#4d70d9',
    primaryForeground: '#ffffff',

    secondary: '#2a2060',
    secondaryForeground: '#c8d0e8',

    muted: '#1e2740',
    mutedForeground: '#8890a8',

    accent: '#ffcc1a',
    accentForeground: '#1a1408',

    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    border: '#1e2c5e',
    input: '#1e2740',
  },

  dark: {
    text: '#c8d0e8',
    tint: '#4d70d9',

    background: '#0d1117',
    foreground: '#c8d0e8',

    card: '#18203a',
    cardForeground: '#c8d0e8',

    primary: '#4d70d9',
    primaryForeground: '#ffffff',

    secondary: '#2a2060',
    secondaryForeground: '#c8d0e8',

    muted: '#1e2740',
    mutedForeground: '#8890a8',

    accent: '#ffcc1a',
    accentForeground: '#1a1408',

    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    border: '#1e2c5e',
    input: '#1e2740',
  },

  // Matches --radius: 0.5rem from the web artifact
  radius: 8,
};

export default colors;
