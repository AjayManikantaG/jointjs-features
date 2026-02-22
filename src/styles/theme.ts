/**
 * Theme tokens for the diagramming application.
 * Dark-mode first, FigJam-inspired palette.
 * All spacing uses 4px base for consistency.
 */
export const theme = {
    colors: {
        // Background layers (lightest → slightly darker)
        bg: {
            primary: '#F4F5F7',       // Main app background
            secondary: '#FFFFFF',     // Panels, Modals
            tertiary: '#FAFBFC',      // Sidebars
            elevated: '#FFFFFF',      // Dropdowns, floating
            canvas: '#EAECEF',        // Diagram canvas background
        },
        // Accent colors
        accent: {
            primary: '#D3A33A',       // Golden/Orange accent from wireframe (Finish button)
            primaryHover: '#C29329',
            secondary: '#4A90E2',     // Blue accent
            success: '#00C853',
            warning: '#F5A623',
            danger: '#D0021B',
        },
        // Text colors
        text: {
            primary: '#172B4D',
            secondary: '#42526E',
            tertiary: '#7A869A',
            inverse: '#FFFFFF',
        },
        // Border colors
        border: {
            subtle: '#DFE1E6',
            default: '#C1C7D0',
            strong: '#97A0AF',
            accent: '#D3A33A',
        },
        // Node/element colors (sticky note palette)
        node: {
            yellow: '#FFF0B3',
            pink: '#FFC4E2',
            green: '#ABF5D1',
            blue: '#B3D4FF',
            purple: '#E3DAFF',
            orange: '#FFE2BD',
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
        sm: '0 1px 3px rgba(9, 30, 66, 0.1)',
        md: '0 4px 8px -2px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
        lg: '0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
        glow: '0 0 20px rgba(211, 163, 58, 0.3)',
    },
    glass: {
        background: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid rgba(9, 30, 66, 0.08)',
        backdropFilter: 'blur(10px)',
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
