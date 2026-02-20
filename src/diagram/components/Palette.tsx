/**
 * Palette.tsx
 * 
 * Left sidebar with draggable shape items.
 * Users drag shapes from the palette and drop them onto the canvas.
 * 
 * Uses HTML5 Drag & Drop API:
 * - dragstart sets transfer data with shape type/label
 * - Canvas onDrop handler reads the data and creates the element
 * 
 * Shape types: Rectangle, Circle, Diamond, Sticky Note, Text
 */
'use client';

import React from 'react';
import styled from 'styled-components';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const PaletteContainer = styled.div`
  width: 220px;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.glass.background};
  border-right: ${({ theme }) => theme.glass.border};
  backdrop-filter: ${({ theme }) => theme.glass.backdropFilter};
  padding: ${({ theme }) => theme.spacing.md};
  overflow-y: auto;
  z-index: ${({ theme }) => theme.zIndex.panels};
`;

const PaletteTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const ShapeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ShapeItem = styled.div<{ $color?: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  cursor: grab;
  transition: all ${({ theme }) => theme.transitions.fast};
  user-select: none;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.elevated};
    border-color: ${({ theme }) => theme.colors.accent.primary};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }

  &:active {
    cursor: grabbing;
    transform: scale(0.95);
  }
`;

const ShapePreview = styled.div<{ $type: string; $color?: string }>`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Shape-specific styles via CSS */
  ${({ $type, $color, theme }) => {
    switch ($type) {
      case 'rectangle':
        return `
          background: ${theme.colors.bg.elevated};
          border: 1.5px solid ${theme.colors.border.default};
          border-radius: 4px;
        `;
      case 'circle':
        return `
          background: ${theme.colors.bg.elevated};
          border: 1.5px solid ${theme.colors.border.default};
          border-radius: 50%;
        `;
      case 'diamond':
        return `
          background: ${theme.colors.bg.elevated};
          border: 1.5px solid ${theme.colors.border.default};
          transform: rotate(45deg);
          width: 28px;
          height: 28px;
          border-radius: 2px;
        `;
      case 'sticky':
        return `
          background: ${$color || theme.colors.node.yellow};
          border-radius: 3px;
          box-shadow: 1px 2px 4px rgba(0,0,0,0.3);
        `;
      case 'text':
        return `
          font-size: 16px;
          font-weight: 600;
          color: ${theme.colors.text.secondary};
          &::after { content: 'T'; }
        `;
      default:
        return '';
    }
  }}
`;

const ShapeLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

// ============================================================
// SHAPE DATA
// ============================================================

interface PaletteShape {
  type: string;
  label: string;
  color?: string;
}

const SHAPES: PaletteShape[] = [
  { type: 'rectangle', label: 'Rectangle' },
  { type: 'circle', label: 'Circle' },
  { type: 'diamond', label: 'Diamond' },
  { type: 'sticky', label: 'Sticky Note', color: '#FFE066' },
  { type: 'text', label: 'Text' },
];

// ============================================================
// COMPONENT
// ============================================================

export default function Palette() {
  const onDragStart = (e: React.DragEvent, shape: PaletteShape) => {
    e.dataTransfer.setData(
      'application/diagram-node',
      JSON.stringify({ type: shape.type, label: shape.label }),
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <PaletteContainer>
      <PaletteTitle>Shapes</PaletteTitle>
      <ShapeGrid>
        {SHAPES.map((shape) => (
          <ShapeItem
            key={shape.type}
            draggable
            onDragStart={(e) => onDragStart(e, shape)}
            $color={shape.color}
          >
            <ShapePreview $type={shape.type} $color={shape.color} />
            <ShapeLabel>{shape.label}</ShapeLabel>
          </ShapeItem>
        ))}
      </ShapeGrid>
    </PaletteContainer>
  );
}
