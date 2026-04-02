// Advanced Design System - Inspired by Modern Dashboard Aesthetics
// Single source of truth for font family, colors, and sizes ("same" across app)
export const designSystem = {
  typography: {
    fontFamily: {
      sans: "Inter, ui-sans-serif, system-ui, sans-serif, 'Helvetica Neue', Arial",
    },
    fontSize: {
      xs: "0.75rem",   // 12px - labels, captions
      sm: "0.875rem",  // 14px - body secondary, form labels
      base: "1rem",    // 16px - body
      lg: "1.125rem",  // 18px - subheadings
      xl: "1.25rem",   // 20px - section titles
      "2xl": "1.5rem", // 24px - card titles
      "3xl": "1.875rem", // 30px - page titles
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    textColor: {
      primary: "#333333",
      secondary: "#666666",
      muted: "#999999",
      inverse: "#FFFFFF",
    },
  },
  colors: {
    // Trinai Survey Dashboard - light grey background
    background: {
      primary: "#F8F9FA",
      secondary: "#F0F0F0",
      tertiary: "#E8E8E8",
      card: "#FFFFFF",
      cardHover: "#FFFFFF",
    },
    // Primary action - blue gradient (New Survey, active nav, Active Cameras)
    primary: {
      from: "#3A8DFF",
      to: "#2196F3",
    },
    // KPI / accent colors
    accent: {
      orange: "#FFC107",   // Total Surveys, Pending, progress fill
      green: "#4CAF50",   // GPS Connected, Completed
      purple: "#7B61FF",   // Team Members
      blue: "#2196F3",     // Active Cameras, primary actions
    },
    // Text
    dark: {
      primary: "#333333",
      secondary: "#666666",
      tertiary: "#999999",
      text: "#333333",
    },
    status: {
      success: "#4CAF50",
      warning: "#FFC107",
      error: "#EF4444",
      info: "#2196F3",
    },
    // Progress bar unfilled
    progressTrack: "#E0E0E0",
    neutral: {
      50: "#FAFAFA",
      100: "#F5F5F5",
      200: "#EEEEEE",
      300: "#E0E0E0",
      400: "#BDBDBD",
      500: "#999999",
      600: "#757575",
      700: "#616161",
      800: "#424242",
      900: "#333333",
    },
  },
  gradients: {
    primary: "bg-gradient-to-r from-[#3A8DFF] to-[#2196F3]",
    primaryHover: "bg-gradient-to-r from-[#2d7ae8] to-[#1a7ad9]",

    card: "bg-white",
    cardHover: "bg-white",

    accent: "bg-gradient-to-r from-[#3A8DFF] to-[#2196F3]",
    accentDark: "bg-gradient-to-r from-[#2196F3] to-[#1976D2]",

    dark: "bg-gradient-to-r from-gray-700 to-gray-800",
    darkCard: "bg-white",
  },
  borderRadius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "2rem",
    "3xl": "3rem",
    full: "9999px",
  },
  shadows: {
    soft: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
    medium: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    large: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    glow: "0 0 20px rgba(245, 158, 11, 0.3)",
  },
  backdrop: {
    blur: "backdrop-blur-sm",
    blurMd: "backdrop-blur-md",
    blurLg: "backdrop-blur-lg",
  },
}

export const animations = {
  fadeIn: "animate-in fade-in duration-500",
  slideUp: "animate-in slide-in-from-bottom-4 duration-500",
  slideDown: "animate-in slide-in-from-top-4 duration-500",
  scaleIn: "animate-in zoom-in-95 duration-300",
  bounce: "animate-bounce",
  pulse: "animate-pulse",
}
