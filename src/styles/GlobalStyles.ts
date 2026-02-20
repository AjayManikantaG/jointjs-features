'use client';

import { createGlobalStyle } from 'styled-components';
import { theme } from './theme';

/**
 * GlobalStyles
 * 
 * Custom global styles replacing ALL default JointJS CSS.
 * We own every visual aspect — no external JointJS stylesheets needed.
 * Includes: reset, body, SVG element styles, selection, ports, links.
 */
export const GlobalStyles = createGlobalStyle`
  /* ========== RESET ========== */
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    height: 100%;
    width: 100%;
    overflow: hidden;
    font-family: ${theme.typography.fontFamily};
    font-size: ${theme.typography.sizes.md};
    color: ${theme.colors.text.primary};
    background: ${theme.colors.bg.primary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  #__next {
    height: 100%;
  }

  /* ========== SCROLLBAR ========== */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.border.default};
    border-radius: ${theme.radius.pill};
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${theme.colors.border.strong};
  }

  /* ========== JOINTJS PAPER CONTAINER ========== */
  .joint-paper {
    user-select: none;
  }

  /* SVG root inside paper */
  .joint-paper svg {
    overflow: visible;
  }

  /* ========== ELEMENT STYLES ========== */
  /* Base element body */
  .joint-element .joint-body,
  .joint-element body {
    cursor: move;
  }

  /* Element label text */
  .joint-element text,
  .joint-element .joint-label {
    font-family: ${theme.typography.fontFamily};
    font-size: 13px;
    fill: ${theme.colors.text.primary};
    pointer-events: none;
    user-select: none;
  }

  /* ========== LINK STYLES ========== */
  .joint-link .connection-wrap {
    stroke: transparent;
    stroke-width: 20;
    fill: none;
    cursor: pointer;
  }

  .joint-link .connection {
    stroke: ${theme.colors.border.strong};
    stroke-width: 2;
    fill: none;
  }

  /* Link markers (arrowheads) */
  .joint-link .marker-target,
  .joint-link .marker-source {
    fill: ${theme.colors.border.strong};
    stroke: none;
  }

  /* Link labels */
  .joint-link .label text {
    font-family: ${theme.typography.fontFamily};
    font-size: 12px;
    fill: ${theme.colors.text.secondary};
  }

  /* Link tools (shown on hover/select) */
  .joint-link .link-tools {
    opacity: 0;
    transition: opacity ${theme.transitions.fast};
  }
  .joint-link:hover .link-tools {
    opacity: 1;
  }

  /* ========== PORT STYLES ========== */
  .joint-port circle {
    fill: ${theme.colors.bg.elevated};
    stroke: ${theme.colors.accent.primary};
    stroke-width: 2;
    r: 6;
    cursor: crosshair;
    transition: all ${theme.transitions.fast};
  }
  .joint-port circle:hover {
    fill: ${theme.colors.accent.primary};
    r: 8;
  }

  /* ========== SELECTION ========== */
  /* Lasso selection rectangle */
  .joint-selection-frame {
    fill: rgba(123, 97, 255, 0.08);
    stroke: ${theme.colors.accent.primary};
    stroke-width: 1;
    stroke-dasharray: 4 3;
    pointer-events: none;
  }

  /* Selected element highlight */
  .joint-highlight-stroke {
    stroke: ${theme.colors.accent.primary};
    stroke-width: 2;
    fill: none;
  }

  /* ========== INTERACTIVE HANDLES ========== */
  /* Resize handles */
  .joint-resize-handle {
    fill: ${theme.colors.accent.primary};
    stroke: ${theme.colors.bg.primary};
    stroke-width: 2;
    cursor: nwse-resize;
  }

  /* Rotate handle */
  .joint-rotate-handle {
    fill: ${theme.colors.accent.secondary};
    stroke: ${theme.colors.bg.primary};
    stroke-width: 2;
    cursor: grab;
  }

  /* ========== TOOLTIPS & CONTEXT MENU ========== */
  .diagram-tooltip {
    position: absolute;
    padding: ${theme.spacing.xs} ${theme.spacing.sm};
    background: ${theme.colors.bg.elevated};
    color: ${theme.colors.text.primary};
    border: 1px solid ${theme.colors.border.subtle};
    border-radius: ${theme.radius.sm};
    font-size: ${theme.typography.sizes.sm};
    pointer-events: none;
    z-index: ${theme.zIndex.tooltip};
    box-shadow: ${theme.shadows.md};
    white-space: nowrap;
  }

  /* ========== INLINE TEXT EDITING ========== */
  .joint-inline-editor {
    position: absolute;
    background: transparent;
    border: 1px solid ${theme.colors.accent.primary};
    border-radius: ${theme.radius.sm};
    color: ${theme.colors.text.primary};
    font-family: ${theme.typography.fontFamily};
    font-size: 13px;
    padding: 2px 4px;
    outline: none;
    z-index: ${theme.zIndex.toolbar};
    text-align: center;
  }

  /* ========== ANIMATIONS ========== */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;
