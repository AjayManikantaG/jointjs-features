/**
 * Canvas.tsx
 * 
 * The main diagram canvas component.
 * 
 * Responsibilities:
 * 1. Renders the container <div> for the JointJS Paper
 * 2. Creates the Paper instance on mount
 * 3. Sets up all interactions (pan/zoom, selection, inline edit, etc.)
 * 4. Handles drag-and-drop from the Palette
 * 5. Sets up obstacle-aware routing listeners
 * 6. Cleans up everything on unmount
 */
'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { dia, shapes } from '@joint/core';
import { useDiagram } from '../context/DiagramProvider';
import { createPaper } from '../engine/createPaper';
import { applyRoutingListeners } from '../engine/obstacleRouter';
import {
  setupPanZoom,
  setupLassoSelection,
  setupInlineEdit,
  setupContextMenu,
  setupTooltips,
  setupKeyboardShortcuts,
  highlightCells,
  type ContextMenuEvent,
  type TooltipEvent,
} from '../engine/interactions';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const CanvasContainer = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.bg.canvas};
  cursor: default;

  /* Dot grid background pattern */
  background-image: radial-gradient(
    circle,
    ${({ theme }) => theme.colors.border.subtle} 1px,
    transparent 1px
  );
  background-size: 20px 20px;
`;

const PaperWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
`;

// ============================================================
// COMPONENT
// ============================================================

interface CanvasProps {
  onContextMenu?: (event: ContextMenuEvent) => void;
  onTooltipShow?: (event: TooltipEvent) => void;
  onTooltipHide?: () => void;
}

export default function Canvas({ onContextMenu, onTooltipShow, onTooltipHide }: CanvasProps) {
  const paperContainerRef = useRef<HTMLDivElement>(null);
  const {
    graph,
    paper,
    setPaper,
    setSelectedCells,
    undo,
    redo,
    deleteSelected,
    selectAll,
    clearSelection,
    selectedCells,
  } = useDiagram();

  // Stable references for callbacks
  const onContextMenuRef = useRef(onContextMenu);
  const onTooltipShowRef = useRef(onTooltipShow);
  const onTooltipHideRef = useRef(onTooltipHide);
  onContextMenuRef.current = onContextMenu;
  onTooltipShowRef.current = onTooltipShow;
  onTooltipHideRef.current = onTooltipHide;

  // Ref to access paper without causing re-render loop in callbacks
  const paperRef = useRef<dia.Paper | null>(null);
  paperRef.current = paper;

  // Initialize paper and all interactions
  useEffect(() => {
    const container = paperContainerRef.current;
    if (!container) return;

    // IMPORTANT: Create a child div for JointJS to own.
    // paper.remove() destroys its `el`. If we pass the React-managed
    // container directly, React Strict Mode re-mount will fail because
    // the ref points to a detached node. By creating a disposable child,
    // only the child is destroyed on cleanup — the React ref stays intact.
    const paperDiv = document.createElement('div');
    paperDiv.style.width = '100%';
    paperDiv.style.height = '100%';
    container.appendChild(paperDiv);

    // Create the paper
    const newPaper = createPaper({
      el: paperDiv,
      graph,
      background: { color: 'transparent' },
    });

    // Register with context
    setPaper(newPaper);

    // Unfreeze to start rendering
    newPaper.unfreeze();

    // ---- Setup all interactions ----
    const cleanups: (() => void)[] = [];

    // 1. Pan & Zoom
    cleanups.push(setupPanZoom(newPaper));

    // 2. Lasso selection
    cleanups.push(
      setupLassoSelection(newPaper, graph, (cells) => {
        setSelectedCells(cells);
      }),
    );

    // 3. Inline text editing
    cleanups.push(setupInlineEdit(newPaper));

    // 4. Context menu
    cleanups.push(
      setupContextMenu(newPaper, (event) => {
        onContextMenuRef.current?.(event);
      }),
    );

    // 5. Tooltips
    cleanups.push(
      setupTooltips(
        newPaper,
        (event) => onTooltipShowRef.current?.(event),
        () => onTooltipHideRef.current?.(),
      ),
    );

    // 6. Keyboard shortcuts
    cleanups.push(
      setupKeyboardShortcuts({
        onUndo: undo,
        onRedo: redo,
        onDelete: deleteSelected,
        onSelectAll: selectAll,
        onEscape: clearSelection,
      }),
    );

    // 7. Obstacle-aware routing listeners
    cleanups.push(applyRoutingListeners(newPaper, graph));

    // Center the paper view
    const containerRect = container.getBoundingClientRect();
    newPaper.translate(containerRect.width / 2 - 200, containerRect.height / 2 - 200);

    // Cleanup
    return () => {
      cleanups.forEach((fn) => fn());
      newPaper.remove(); // Only removes the disposable paperDiv, not the React container
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // Update highlights when selection changes
  useEffect(() => {
    if (paper) {
      highlightCells(paper, selectedCells);
    }
  }, [paper, selectedCells]);

  // Handle drop from palette
  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const currentPaper = paperRef.current;
      if (!currentPaper) return;

      const data = e.dataTransfer.getData('application/diagram-node');
      if (!data) return;

      const nodeData = JSON.parse(data);
      const localPoint = currentPaper.clientToLocalPoint({
        x: e.clientX,
        y: e.clientY,
      });

      // Snap to grid
      const snappedX = Math.round(localPoint.x / 20) * 20;
      const snappedY = Math.round(localPoint.y / 20) * 20;

      // Create the element based on type
      const element = createElementFromPalette(nodeData.type, snappedX, snappedY, nodeData.label);
      graph.addCell(element);
    },
    [graph],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  return (
    <CanvasContainer onDrop={onDrop} onDragOver={onDragOver}>
      <PaperWrapper ref={paperContainerRef} />
    </CanvasContainer>
  );
}

// ============================================================
// ELEMENT FACTORY (for palette drops)
// ============================================================

/**
 * Creates a JointJS element based on the palette type.
 * Each element has ports for link connections.
 */
function createElementFromPalette(
  type: string,
  x: number,
  y: number,
  label: string,
): dia.Element {
  const portConfig = {
    groups: {
      in: {
        position: 'left',
        attrs: {
          circle: {
            fill: '#232329',
            stroke: '#7B61FF',
            strokeWidth: 2,
            r: 6,
            magnet: true,
          },
        },
      },
      out: {
        position: 'right',
        attrs: {
          circle: {
            fill: '#232329',
            stroke: '#7B61FF',
            strokeWidth: 2,
            r: 6,
            magnet: true,
          },
        },
      },
    },
    items: [
      { group: 'in', id: 'in1' },
      { group: 'out', id: 'out1' },
    ],
  };

  switch (type) {
    case 'rectangle':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 160, height: 80 },
        attrs: {
          body: {
            fill: '#232329',
            stroke: '#3A3A44',
            strokeWidth: 1.5,
            rx: 8,
            ry: 8,
          },
          label: {
            text: label || 'Rectangle',
            fill: '#EDEDEF',
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
          },
        },
        ports: portConfig,
      });

    case 'circle':
      return new shapes.standard.Circle({
        position: { x, y },
        size: { width: 100, height: 100 },
        attrs: {
          body: {
            fill: '#232329',
            stroke: '#3A3A44',
            strokeWidth: 1.5,
          },
          label: {
            text: label || 'Circle',
            fill: '#EDEDEF',
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
          },
        },
        ports: portConfig,
      });

    case 'diamond': {
      return new shapes.standard.Polygon({
        position: { x, y },
        size: { width: 120, height: 120 },
        attrs: {
          body: {
            fill: '#232329',
            stroke: '#3A3A44',
            strokeWidth: 1.5,
            refPoints: '50,0 100,50 50,100 0,50',
          },
          label: {
            text: label || 'Decision',
            fill: '#EDEDEF',
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
          },
        },
        ports: portConfig,
      });
    }

    case 'sticky': {
      const colors = ['#FFE066', '#FF8AAE', '#6FEDD6', '#80CAFF', '#B49CFF', '#FFB86C'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 180, height: 140 },
        attrs: {
          body: {
            fill: color,
            stroke: 'none',
            rx: 4,
            ry: 4,
            filter: {
              name: 'dropShadow',
              args: { dx: 2, dy: 4, blur: 8, color: 'rgba(0,0,0,0.3)' },
            },
          },
          label: {
            text: label || 'Sticky Note',
            fill: '#0D0D0F',
            fontSize: 14,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            textWrap: {
              width: -20, // 20px padding
              height: -20,
              ellipsis: true,
            },
          },
        },
      });
    }

    case 'text':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 200, height: 40 },
        attrs: {
          body: {
            fill: 'transparent',
            stroke: 'none',
          },
          label: {
            text: label || 'Text',
            fill: '#EDEDEF',
            fontSize: 16,
            fontFamily: "'Inter', sans-serif",
          },
        },
      });

    default:
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 160, height: 80 },
        attrs: {
          body: {
            fill: '#232329',
            stroke: '#3A3A44',
            strokeWidth: 1.5,
            rx: 8,
            ry: 8,
          },
          label: {
            text: label || 'Node',
            fill: '#EDEDEF',
            fontSize: 13,
            fontFamily: "'Inter', sans-serif",
          },
        },
        ports: portConfig,
      });
  }
}
