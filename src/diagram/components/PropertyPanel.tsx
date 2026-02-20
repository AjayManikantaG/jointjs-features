/**
 * PropertyPanel.tsx
 * 
 * Right sidebar showing properties of the currently selected cell.
 * 
 * Features:
 * - Two-way sync: editing a field updates the graph model
 * - Displays: label, position (x, y), size (w, h), color
 * - Shows element type and helpful info
 * - Empty state when nothing is selected
 * - Supports multiple selection (shows count)
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { dia } from '@joint/core';
import { useDiagram } from '../context/DiagramProvider';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const PanelContainer = styled.div`
  width: 260px;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.glass.background};
  border-left: ${({ theme }) => theme.glass.border};
  backdrop-filter: ${({ theme }) => theme.glass.backdropFilter};
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
  z-index: ${({ theme }) => theme.zIndex.panels};
`;

const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.sizes.sm};
`;

const EmptyIcon = styled.div`
  font-size: 32px;
  opacity: 0.3;
`;

const PropertyGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const GroupLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.sizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const PropertyRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const PropertyLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 32px;
`;

const PropertyInput = styled.input`
  flex: 1;
  padding: 6px 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  outline: none;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const ColorInput = styled.input`
  width: 32px;
  height: 32px;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  background: transparent;
  padding: 0;

  &::-webkit-color-swatch-wrapper {
    padding: 2px;
  }
  &::-webkit-color-swatch {
    border: none;
    border-radius: 3px;
  }
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: ${({ theme }) => theme.colors.accent.primary}22;
  color: ${({ theme }) => theme.colors.accent.primary};
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: ${({ theme }) => theme.typography.sizes.xs};
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

// ============================================================
// COMPONENT
// ============================================================

export default function PropertyPanel() {
  const { selectedCells, commandManager } = useDiagram();
  const [label, setLabel] = useState('');
  const [posX, setPosX] = useState('');
  const [posY, setPosY] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [fillColor, setFillColor] = useState('#232329');

  const selectedCell = selectedCells.length === 1 ? selectedCells[0] : null;
  const isElement = selectedCell?.isElement();

  // Sync state from model
  useEffect(() => {
    if (!selectedCell || !isElement) {
      setLabel('');
      setPosX('');
      setPosY('');
      setWidth('');
      setHeight('');
      setFillColor('#232329');
      return;
    }

    const element = selectedCell as dia.Element;
    const pos = element.position();
    const size = element.size();

    setLabel(
      (element.attr('label/text') as string) ||
      (element.attr('text/text') as string) ||
      '',
    );
    setPosX(String(Math.round(pos.x)));
    setPosY(String(Math.round(pos.y)));
    setWidth(String(Math.round(size.width)));
    setHeight(String(Math.round(size.height)));
    setFillColor((element.attr('body/fill') as string) || '#232329');
  }, [selectedCell, isElement]);

  // Update handlers
  const updateLabel = useCallback(
    (value: string) => {
      setLabel(value);
      if (selectedCell && isElement) {
        commandManager.startBatch('property-edit');
        selectedCell.attr('label/text', value);
        commandManager.stopBatch();
      }
    },
    [selectedCell, isElement, commandManager],
  );

  const updatePosition = useCallback(
    (axis: 'x' | 'y', value: string) => {
      if (axis === 'x') setPosX(value);
      else setPosY(value);

      if (selectedCell && isElement) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          const element = selectedCell as dia.Element;
          commandManager.startBatch('property-edit');
          if (axis === 'x') element.position(num, element.position().y);
          else element.position(element.position().x, num);
          commandManager.stopBatch();
        }
      }
    },
    [selectedCell, isElement, commandManager],
  );

  const updateSize = useCallback(
    (dim: 'width' | 'height', value: string) => {
      if (dim === 'width') setWidth(value);
      else setHeight(value);

      if (selectedCell && isElement) {
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0) {
          const element = selectedCell as dia.Element;
          const currentSize = element.size();
          commandManager.startBatch('property-edit');
          element.resize(
            dim === 'width' ? num : currentSize.width,
            dim === 'height' ? num : currentSize.height,
          );
          commandManager.stopBatch();
        }
      }
    },
    [selectedCell, isElement, commandManager],
  );

  const updateColor = useCallback(
    (value: string) => {
      setFillColor(value);
      if (selectedCell && isElement) {
        commandManager.startBatch('property-edit');
        selectedCell.attr('body/fill', value);
        commandManager.stopBatch();
      }
    },
    [selectedCell, isElement, commandManager],
  );

  // ============================================================
  // RENDER
  // ============================================================

  if (selectedCells.length === 0) {
    return (
      <PanelContainer>
        <PanelTitle>Properties</PanelTitle>
        <EmptyState>
          <EmptyIcon>🎯</EmptyIcon>
          <span>Select an element to view its properties</span>
        </EmptyState>
      </PanelContainer>
    );
  }

  if (selectedCells.length > 1) {
    return (
      <PanelContainer>
        <PanelTitle>Properties</PanelTitle>
        <EmptyState>
          <EmptyIcon>📦</EmptyIcon>
          <span>{selectedCells.length} elements selected</span>
        </EmptyState>
      </PanelContainer>
    );
  }

  if (!isElement) {
    return (
      <PanelContainer>
        <PanelTitle>Link Properties</PanelTitle>
        <TypeBadge>Link</TypeBadge>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer>
      <PanelTitle>Properties</PanelTitle>
      <TypeBadge>{selectedCell?.get('type') || 'Element'}</TypeBadge>

      {/* Label */}
      <PropertyGroup>
        <GroupLabel>Label</GroupLabel>
        <PropertyInput
          value={label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="Enter label…"
        />
      </PropertyGroup>

      {/* Position */}
      <PropertyGroup>
        <GroupLabel>Position</GroupLabel>
        <PropertyRow>
          <PropertyLabel>X</PropertyLabel>
          <PropertyInput
            type="number"
            value={posX}
            onChange={(e) => updatePosition('x', e.target.value)}
          />
        </PropertyRow>
        <PropertyRow>
          <PropertyLabel>Y</PropertyLabel>
          <PropertyInput
            type="number"
            value={posY}
            onChange={(e) => updatePosition('y', e.target.value)}
          />
        </PropertyRow>
      </PropertyGroup>

      {/* Size */}
      <PropertyGroup>
        <GroupLabel>Size</GroupLabel>
        <PropertyRow>
          <PropertyLabel>W</PropertyLabel>
          <PropertyInput
            type="number"
            value={width}
            onChange={(e) => updateSize('width', e.target.value)}
          />
        </PropertyRow>
        <PropertyRow>
          <PropertyLabel>H</PropertyLabel>
          <PropertyInput
            type="number"
            value={height}
            onChange={(e) => updateSize('height', e.target.value)}
          />
        </PropertyRow>
      </PropertyGroup>

      {/* Color */}
      <PropertyGroup>
        <GroupLabel>Fill Color</GroupLabel>
        <PropertyRow>
          <ColorInput
            type="color"
            value={fillColor}
            onChange={(e) => updateColor(e.target.value)}
          />
          <PropertyInput
            value={fillColor}
            onChange={(e) => updateColor(e.target.value)}
            placeholder="#hex"
          />
        </PropertyRow>
      </PropertyGroup>
    </PanelContainer>
  );
}
