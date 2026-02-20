/**
 * Toolbar.tsx
 * 
 * Floating action toolbar positioned at the top of the canvas.
 * Provides quick access to common diagram operations.
 * 
 * Features:
 * - Undo/Redo with disabled states
 * - Zoom In/Out/Fit
 * - Delete selected
 * - Dividers between groups
 * - Glassmorphism dark styling
 * - Tooltip labels on hover
 */
'use client';

import React from 'react';
import styled from 'styled-components';
import { useDiagram, DiagramType } from '../context/DiagramProvider';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: ${({ theme }) => theme.glass.background};
  border: ${({ theme }) => theme.glass.border};
  backdrop-filter: ${({ theme }) => theme.glass.backdropFilter};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
  z-index: ${({ theme }) => theme.zIndex.toolbar};
  animation: scaleIn 0.2s ease;
`;

const ToolButton = styled.button<{ $disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.text.tertiary : theme.colors.text.secondary};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: all ${({ theme }) => theme.transitions.fast};
  font-size: 18px;
  position: relative;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bg.elevated};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  /* Tooltip */
  &::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    padding: 3px 8px;
    background: ${({ theme }) => theme.colors.bg.elevated};
    color: ${({ theme }) => theme.colors.text.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.subtle};
    border-radius: ${({ theme }) => theme.radius.sm};
    font-size: ${({ theme }) => theme.typography.sizes.xs};
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity ${({ theme }) => theme.transitions.fast};
  }

  &:hover::after {
    opacity: 1;
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 24px;
  background: ${({ theme }) => theme.colors.border.subtle};
  margin: 0 4px;
`;

const SelectType = styled.select`
  appearance: none;
  background: ${({ theme }) => theme.colors.bg.elevated};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 4px 28px 4px 12px;
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  cursor: pointer;
  outline: none;
  transition: all ${({ theme }) => theme.transitions.fast};

  /* Custom dropdown arrow */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 14px;

  &:hover {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.accent.primary}33;
  }
`;

// ============================================================
// COMPONENT
// ============================================================

export default function Toolbar() {
  const { 
    paper, canUndo, canRedo, undo, redo, deleteSelected, selectAll, selectedCells,
    diagramType, setDiagramType
  } = useDiagram();

  const handleZoomIn = () => {
    if (!paper) return;
    const currentScale = paper.scale().sx;
    const newScale = Math.min(3, currentScale + 0.15);
    zoomToCenter(paper, newScale);
  };

  const handleZoomOut = () => {
    if (!paper) return;
    const currentScale = paper.scale().sx;
    const newScale = Math.max(0.1, currentScale - 0.15);
    zoomToCenter(paper, newScale);
  };

  /** Zoom keeping the viewport center fixed */
  const zoomToCenter = (p: NonNullable<typeof paper>, newScale: number) => {
    const elRect = (p.el as HTMLElement).getBoundingClientRect();
    const cx = elRect.width / 2;
    const cy = elRect.height / 2;
    const currentScale = p.scale().sx;
    const currentTranslate = p.translate();
    const factor = newScale / currentScale;
    const newTx = cx - factor * (cx - currentTranslate.tx);
    const newTy = cy - factor * (cy - currentTranslate.ty);
    p.scale(newScale, newScale);
    p.translate(newTx, newTy);
  };

  const handleFitContent = () => {
    if (!paper) return;
    paper.scaleContentToFit({
      padding: 60,
      maxScale: 1.5,
      minScale: 0.3,
    });
  };

  return (
    <ToolbarContainer>
      <SelectType 
        value={diagramType} 
        onChange={(e) => setDiagramType(e.target.value as DiagramType)}
        data-tooltip="Diagram Type"
      >
        <option value="BPMN">BPMN Diagram</option>
        <option value="Business Object">Business Object</option>
        <option value="Organization">Organization</option>
        <option value="System">System Diagram</option>
        <option value="Technical Workflow">Technical Workflow</option>
      </SelectType>

      <Divider />

      {/* Undo/Redo */}
      <ToolButton onClick={undo} $disabled={!canUndo} data-tooltip="Undo (⌘Z)">
        ↩
      </ToolButton>
      <ToolButton onClick={redo} $disabled={!canRedo} data-tooltip="Redo (⌘⇧Z)">
        ↪
      </ToolButton>

      <Divider />

      {/* Zoom */}
      <ToolButton onClick={handleZoomIn} data-tooltip="Zoom In">
        🔍+
      </ToolButton>
      <ToolButton onClick={handleZoomOut} data-tooltip="Zoom Out">
        🔍−
      </ToolButton>
      <ToolButton onClick={handleFitContent} data-tooltip="Fit Content">
        ⊞
      </ToolButton>

      <Divider />

      {/* Selection */}
      <ToolButton onClick={selectAll} data-tooltip="Select All (⌘A)">
        ☐
      </ToolButton>
      <ToolButton
        onClick={deleteSelected}
        $disabled={selectedCells.length === 0}
        data-tooltip="Delete (⌫)"
      >
        🗑
      </ToolButton>
    </ToolbarContainer>
  );
}
