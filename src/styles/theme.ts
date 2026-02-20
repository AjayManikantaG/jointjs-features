/**
 * Theme tokens for the diagramming application.
 * Dark-mode first, FigJam-inspired palette.
 * All spacing uses 4px base for consistency.
 */
export const theme = {
    colors: {
        // Background layers (darkest → lightest)
        bg: {
            primary: '#0D0D0F',
            secondary: '#16161A',
            tertiary: '#1E1E24',
            elevated: '#232329',
            canvas: '#1A1A20',
        },
        // Accent colors
        accent: {
            primary: '#7B61FF',       // Purple accent (FigJam-like)
            primaryHover: '#9580FF',
            secondary: '#00C2FF',     // Cyan accent
            success: '#2DD4A8',
            warning: '#FFB224',
            danger: '#FF5C5C',
        },
        // Text colors
        text: {
            primary: '#EDEDEF',
            secondary: '#9B9BA4',
            tertiary: '#6B6B76',
            inverse: '#0D0D0F',
        },
        // Border colors
        border: {
            subtle: '#2A2A32',
            default: '#3A3A44',
            strong: '#4A4A56',
            accent: '#7B61FF',
        },
        // Node/element colors (sticky note palette)
        node: {
            yellow: '#FFE066',
            pink: '#FF8AAE',
            green: '#6FEDD6',
            blue: '#80CAFF',
            purple: '#B49CFF',
            orange: '#FFB86C',
            white: '#FFFFFF',
        },
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        xxl: '32px',
    },
    radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        sizes: {
            xs: '11px',
            sm: '12px',
            md: '14px',
            lg: '16px',
            xl: '20px',
            xxl: '24px',
        },
        weights: {
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
    },
    shadows: {
        sm: '0 1px 3px rgba(0,0,0,0.4)',
        md: '0 4px 12px rgba(0,0,0,0.5)',
        lg: '0 8px 24px rgba(0,0,0,0.6)',
        glow: '0 0 20px rgba(123, 97, 255, 0.3)',
    },
    glass: {
        background: 'rgba(22, 22, 26, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(20px)',
    },
    transitions: {
        fast: '0.15s ease',
        normal: '0.25s ease',
        slow: '0.4s ease',
    },
    zIndex: {
        canvas: 0,
        panels: 10,
        toolbar: 20,
        contextMenu: 50,
        tooltip: 60,
        modal: 100,
    },
} as const;

export type Theme = typeof theme;
