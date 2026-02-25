// Polaris Design System - Pencil로 정의한 디자인 토큰

export const Colors = {
    // Background Colors
    bgPrimary: '#0A0A0B',
    bgSecondary: '#111113',
    bgTertiary: '#1A1A1D',
    bgCard: '#16161A',
    bgMuted: '#1F1F23',
    bgPending: '#3A3A3E',

    // Text Colors
    textPrimary: '#FFFFFF',
    textContent: '#E0E0E5',
    textSecondary: '#ADADB0',
    textTertiary: '#A0A0A5',
    textMuted: '#6B6B70',
    textOnAccent: '#000000',
    textOnDark: '#0A0A0B',

    // Accent Colors
    accent: '#FFD700',
    accentBg: '#FFD70020',

    // Status Colors
    success: '#4CAF50',
    successAlt: '#22C55E',
    successBg: '#22C55E20',
    error: '#FF5252',
    info: '#3B82F6',
    infoBg: '#3B82F620',

    // Brand Colors
    kakaoYellow: '#FEE500',
    kakaoBrown: '#3C1E1E',

    // Border Colors
    borderPrimary: '#2A2A2E',
    borderSecondary: '#1F1F23',
} as const;

export const Spacing = {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
    '2xl': 16,
    '3xl': 20,
    '4xl': 24,
} as const;

export const BorderRadius = {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 10,
    '2xl': 12,
    '3xl': 16,
    '4xl': 24,
    full: 100,
} as const;

export const FontSizes = {
    xs: 11,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 17,
    '2xl': 18,
    '3xl': 24,
    '4xl': 28,
} as const;

// 줄 간격 (fontSize * 1.55)
export const LineHeights = {
    xs: 17,
    sm: 20,
    base: 22,
    md: 23,
    lg: 25,
    xl: 26,
    '2xl': 28,
    '3xl': 37,
    '4xl': 43,
} as const;

export const FontFamily = {
    regular: 'Pretendard',
    medium: 'Pretendard-Medium',
    semiBold: 'Pretendard-SemiBold',
    bold: 'Pretendard-Bold',
    // 확언용 손글씨 폰트
    handwriting: 'HakgyoansimBareonbatang',
    handwritingBold: 'HakgyoansimBareonbatang-Bold',
} as const;
