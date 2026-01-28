/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                // Background Colors
                'bg-primary': '#0A0A0B',
                'bg-secondary': '#111113',
                'bg-tertiary': '#1A1A1D',
                'bg-card': '#16161A',
                'bg-muted': '#1F1F23',
                'bg-pending': '#3A3A3E',

                // Text Colors
                'text-primary': '#FFFFFF',
                'text-content': '#E0E0E5',
                'text-secondary': '#ADADB0',
                'text-tertiary': '#A0A0A5',
                'text-muted': '#6B6B70',
                'text-on-accent': '#000000',
                'text-on-dark': '#0A0A0B',

                // Accent Colors
                'accent': '#FFD700',
                'accent-bg': '#FFD70020',

                // Status Colors
                'success': '#4CAF50',
                'success-alt': '#22C55E',
                'success-bg': '#22C55E20',
                'error': '#FF5252',
                'info': '#3B82F6',
                'info-bg': '#3B82F620',

                // Brand Colors
                'kakao-yellow': '#FEE500',
                'kakao-brown': '#3C1E1E',

                // Border Colors
                'border-primary': '#2A2A2E',
                'border-secondary': '#1F1F23',
            },
        },
    },
    plugins: [],
};
