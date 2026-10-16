export const theme = {
  colors: {
    background: '#0B1120',
    surface: '#1E293B',
    cardBackground: '#1E293B',
    inputBackground: '#0F172A',
    primary: '#0284C7',
    primaryLight: '#38BDF8',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
    overlay: 'rgba(0, 0, 0, 0.75)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  typography: {
    sizes: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 18,
      xl: 22,
      xxl: 28,
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      heavy: '800',
    },
  },
  shadows: {
    glow: {
      boxShadow: '0px 4px 8px rgba(2, 132, 199, 0.3)',
      elevation: 4,
    },
  },
};

export const lightTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: '#F8FAFC',
    surface: '#FFFFFF',
    cardBackground: '#FFFFFF',
    inputBackground: '#F1F5F9',
    primary: '#0369A1',
    primaryLight: '#0284C7',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    border: '#CBD5E1',
    success: '#15803D',
    danger: '#B91C1C',
    warning: '#B45309',
    overlay: 'rgba(15, 23, 42, 0.65)',
  },
};

export const getTheme = (isDark) => (isDark ? theme : lightTheme);
