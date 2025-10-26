// UI Constants and Design Tokens

// Animation Durations (in milliseconds)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 1000
} as const

// Z-Index Layers
export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080
} as const

// Breakpoints (matching Tailwind CSS)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536
} as const

// Common Sizes
export const SIZES = {
  HEADER_HEIGHT: 64,
  FOOTER_HEIGHT: 200,
  SIDEBAR_WIDTH: 256,
  CONTAINER_MAX_WIDTH: 1280,
  CARD_BORDER_RADIUS: 8,
  BUTTON_BORDER_RADIUS: 6
} as const

// Color Palette
export const COLORS = {
  PRIMARY: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706', // Main amber
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },
  GRAY: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
} as const

// Typography Scale
export const FONT_SIZES = {
  XS: '0.75rem',    // 12px
  SM: '0.875rem',   // 14px
  BASE: '1rem',     // 16px
  LG: '1.125rem',   // 18px
  XL: '1.25rem',    // 20px
  '2XL': '1.5rem',  // 24px
  '3XL': '1.875rem', // 30px
  '4XL': '2.25rem', // 36px
  '5XL': '3rem',    // 48px
  '6XL': '3.75rem', // 60px
  '7XL': '4.5rem'   // 72px
} as const

// Spacing Scale (matching Tailwind)
export const SPACING = {
  0: '0px',
  1: '0.25rem',     // 4px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  32: '8rem',       // 128px
  40: '10rem',      // 160px
  48: '12rem',      // 192px
  56: '14rem',      // 224px
  64: '16rem'       // 256px
} as const