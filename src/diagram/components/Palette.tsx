/**
 * Palette.tsx
 * 
 * Left sidebar with draggable BPMN 2.0 shape items.
 * Users drag shapes from the palette and drop them onto the canvas.
 * 
 * Uses HTML5 Drag & Drop API:
 * - dragstart sets transfer data with shape type/label
 * - Canvas onDrop handler reads the data and creates the element
 * 
 * BPM Categories:
 * - Events: Start, End, Intermediate
 * - Activities: Task, Sub-Process, Call Activity
 * - Gateways: Exclusive, Parallel, Inclusive
 * - Data: Data Object, Data Store
 */
'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useDiagram, DiagramType } from '../context/DiagramProvider';

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

const CategoryHeader = styled.button<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 6px;
  background: none;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.sizes.xs};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &::after {
    content: '${({ $expanded }) => ($expanded ? '▾' : '▸')}';
    font-size: 10px;
  }
`;

const CategoryItems = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} 0;
`;

const ShapeItem = styled.div`
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

const ShapePreviewSVG = styled.svg`
  width: 36px;
  height: 36px;
  overflow: visible;
`;

const ShapeLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  line-height: 1.2;
`;

// ============================================================
// BPM SHAPE DEFINITIONS
// ============================================================

interface BPMShape {
  type: string;
  label: string;
  category: string;
}

interface BPMCategory {
  name: string;
  shapes: BPMShape[];
}

const PALETTE_DEFINITIONS: Record<DiagramType, BPMCategory[]> = {
  BPMN: [
    {
      name: 'Events',
      shapes: [
        { type: 'startEvent', label: 'Start Event', category: 'Events' },
        { type: 'endEvent', label: 'End Event', category: 'Events' },
        { type: 'intermediateEvent', label: 'Intermediate', category: 'Events' },
      ],
    },
    {
      name: 'Activities',
      shapes: [
        { type: 'task', label: 'Task', category: 'Activities' },
        { type: 'subProcess', label: 'Sub-Process', category: 'Activities' },
        { type: 'callActivity', label: 'Call Activity', category: 'Activities' },
      ],
    },
    {
      name: 'Gateways',
      shapes: [
        { type: 'exclusiveGateway', label: 'Exclusive', category: 'Gateways' },
        { type: 'parallelGateway', label: 'Parallel', category: 'Gateways' },
        { type: 'inclusiveGateway', label: 'Inclusive', category: 'Gateways' },
      ],
    },
    {
      name: 'Data',
      shapes: [
        { type: 'dataObject', label: 'Data Object', category: 'Data' },
        { type: 'dataStore', label: 'Data Store', category: 'Data' },
      ],
    },
  ],
  'Business Object': [
    {
      name: 'Structure',
      shapes: [
        { type: 'businessObject', label: 'Object', category: 'Structure' },
        { type: 'businessAttribute', label: 'Attribute', category: 'Structure' },
        { type: 'businessMethod', label: 'Method', category: 'Structure' },
      ],
    },
  ],
  Organization: [
    {
      name: 'Structure',
      shapes: [
        { type: 'orgUnit', label: 'Org Unit', category: 'Structure' },
        { type: 'orgRole', label: 'Role', category: 'Structure' },
        { type: 'orgPerson', label: 'Person', category: 'Structure' },
        { type: 'orgLocation', label: 'Location', category: 'Structure' },
      ],
    },
  ],
  System: [
    {
      name: 'Architecture',
      shapes: [
        { type: 'sysITSystem', label: 'IT System', category: 'Architecture' },
        { type: 'sysDatabase', label: 'Database', category: 'Architecture' },
        { type: 'sysCluster', label: 'Cluster', category: 'Architecture' },
      ],
    },
  ],
  'Technical Workflow': [
    {
      name: 'Adapters',
      shapes: [
        { type: 'techDataConverter', label: 'Data Converter', category: 'Adapters' },
        { type: 'techFormatAdapter', label: 'Format Adapter', category: 'Adapters' },
        { type: 'techSystemConnector', label: 'Sys Connector', category: 'Adapters' },
      ],
    },
    {
      name: 'Routing',
      shapes: [
        { type: 'exclusiveGateway', label: 'Exclusive', category: 'Routing' },
        { type: 'parallelGateway', label: 'Parallel', category: 'Routing' },
      ],
    },
  ],
};

// ============================================================
// SVG PREVIEW RENDERERS
// ============================================================

function ShapePreview({ type }: { type: string }) {
  switch (type) {
    // Events — circles
    case 'startEvent':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#2DD4A8" strokeWidth="2" />
        </ShapePreviewSVG>
      );
    case 'endEvent':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#FF5C5C" strokeWidth="3.5" />
        </ShapePreviewSVG>
      );
    case 'intermediateEvent':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#FFB224" strokeWidth="2" />
          <circle cx="18" cy="18" r="11" fill="none" stroke="#FFB224" strokeWidth="1" />
        </ShapePreviewSVG>
      );

    // Activities — rounded rectangles
    case 'task':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <rect x="2" y="6" width="32" height="24" rx="4" fill="none" stroke="#9B9BA4" strokeWidth="1.5" />
        </ShapePreviewSVG>
      );
    case 'subProcess':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <rect x="2" y="6" width="32" height="24" rx="4" fill="none" stroke="#9B9BA4" strokeWidth="1.5" />
          <rect x="14" y="26" width="8" height="8" rx="1" fill="none" stroke="#9B9BA4" strokeWidth="1" />
          <line x1="18" y1="28" x2="18" y2="32" stroke="#9B9BA4" strokeWidth="1" />
          <line x1="16" y1="30" x2="20" y2="30" stroke="#9B9BA4" strokeWidth="1" />
        </ShapePreviewSVG>
      );
    case 'callActivity':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <rect x="2" y="6" width="32" height="24" rx="4" fill="none" stroke="#9B9BA4" strokeWidth="3" />
        </ShapePreviewSVG>
      );

    // Gateways — diamonds
    case 'exclusiveGateway':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <polygon points="18,2 34,18 18,34 2,18" fill="none" stroke="#FFB224" strokeWidth="1.5" />
          <text x="18" y="22" textAnchor="middle" fill="#FFB224" fontSize="14" fontWeight="bold">✕</text>
        </ShapePreviewSVG>
      );
    case 'parallelGateway':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <polygon points="18,2 34,18 18,34 2,18" fill="none" stroke="#FFB224" strokeWidth="1.5" />
          <text x="18" y="23" textAnchor="middle" fill="#FFB224" fontSize="18" fontWeight="bold">+</text>
        </ShapePreviewSVG>
      );
    case 'inclusiveGateway':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <polygon points="18,2 34,18 18,34 2,18" fill="none" stroke="#FFB224" strokeWidth="1.5" />
          <circle cx="18" cy="18" r="6" fill="none" stroke="#FFB224" strokeWidth="1.5" />
        </ShapePreviewSVG>
      );

    // Data
    case 'dataObject':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <path d="M6,2 L24,2 L30,8 L30,34 L6,34 Z" fill="none" stroke="#9B9BA4" strokeWidth="1.5" />
          <path d="M24,2 L24,8 L30,8" fill="none" stroke="#9B9BA4" strokeWidth="1.5" />
        </ShapePreviewSVG>
      );
    case 'dataStore':
    case 'sysDatabase':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <ellipse cx="18" cy="8" rx="14" ry="5" fill="none" stroke="#9B9BA4" strokeWidth="1.5" />
          <line x1="4" y1="8" x2="4" y2="28" stroke="#9B9BA4" strokeWidth="1.5" />
          <line x1="32" y1="8" x2="32" y2="28" stroke="#9B9BA4" strokeWidth="1.5" />
          <ellipse cx="18" cy="28" rx="14" ry="5" fill="none" stroke="#9B9BA4" strokeWidth="1.5" />
        </ShapePreviewSVG>
      );

    // Business Object
    case 'businessObject':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <rect x="2" y="4" width="32" height="28" fill="none" stroke="#4A90E2" strokeWidth="1.5" />
          <line x1="2" y1="12" x2="34" y2="12" stroke="#4A90E2" strokeWidth="1.5" />
        </ShapePreviewSVG>
      );
    case 'businessAttribute':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <circle cx="10" cy="18" r="3" fill="#4A90E2" />
          <line x1="16" y1="18" x2="30" y2="18" stroke="#4A90E2" strokeWidth="1.5" strokeDasharray="2,2" />
        </ShapePreviewSVG>
      );

    // Organization
    case 'orgUnit':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <rect x="2" y="8" width="32" height="20" rx="2" fill="none" stroke="#F5A623" strokeWidth="1.5" />
          <line x1="2" y1="16" x2="34" y2="16" stroke="#F5A623" strokeWidth="1.5" />
        </ShapePreviewSVG>
      );
    case 'orgPerson':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <circle cx="18" cy="12" r="6" fill="none" stroke="#F5A623" strokeWidth="1.5" />
          <path d="M6,32 C6,22 30,22 30,32" fill="none" stroke="#F5A623" strokeWidth="1.5" />
        </ShapePreviewSVG>
      );

    // System/Technical
    case 'sysITSystem':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <rect x="4" y="4" width="28" height="28" fill="none" stroke="#7ED321" strokeWidth="1.5" />
          <rect x="8" y="8" width="20" height="20" fill="none" stroke="#7ED321" strokeWidth="1.5" />
        </ShapePreviewSVG>
      );
    case 'techDataConverter':
    case 'techFormatAdapter':
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <polygon points="2,18 10,6 26,6 34,18 26,30 10,30" fill="none" stroke="#BD10E0" strokeWidth="1.5" />
        </ShapePreviewSVG>
      );

    default:
      return (
        <ShapePreviewSVG viewBox="0 0 36 36">
          <rect x="4" y="4" width="28" height="28" rx="4" fill="none" stroke="#6B6B76" strokeWidth="1.5" />
        </ShapePreviewSVG>
      );
  }
}

// ============================================================
// COMPONENT
// ============================================================

export default function Palette() {
  const { diagramType } = useDiagram();
  
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Reset expanded categories when diagramType changes
  useEffect(() => {
    const categories = PALETTE_DEFINITIONS[diagramType] || [];
    const initial: Record<string, boolean> = {};
    categories.forEach((c) => { initial[c.name] = true; });
    setExpandedCategories(initial);
  }, [diagramType]);

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const onDragStart = (e: React.DragEvent, shape: BPMShape) => {
    e.dataTransfer.setData(
      'application/diagram-node',
      JSON.stringify({ type: shape.type, label: shape.label }),
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const activeCategories = PALETTE_DEFINITIONS[diagramType] || [];

  return (
    <PaletteContainer>
      <PaletteTitle>{diagramType} Elements</PaletteTitle>
      {activeCategories.map((category) => (
        <div key={category.name}>
          <CategoryHeader
            $expanded={!!expandedCategories[category.name]}
            onClick={() => toggleCategory(category.name)}
          >
            {category.name}
          </CategoryHeader>
          {expandedCategories[category.name] && (
            <CategoryItems>
              {category.shapes.map((shape) => (
                <ShapeItem
                  key={shape.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, shape)}
                >
                  <ShapePreview type={shape.type} />
                  <ShapeLabel>{shape.label}</ShapeLabel>
                </ShapeItem>
              ))}
            </CategoryItems>
          )}
        </div>
      ))}
    </PaletteContainer>
  );
}
