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
  setupDoubleClickSettings,
  setupContextMenu,
  setupTooltips,
  setupKeyboardShortcuts,
  setupResizeRotate,
  highlightCells,
  type ContextMenuEvent,
  type TooltipEvent,
  setupMultiSelectionMove,
} from '../engine/interactions';
import { setupSnaplines } from '../engine/snaplines';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.bg.canvas};
  cursor: default;
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
  onConfigure?: (cell: dia.Cell) => void;
}

export default function Canvas({ onContextMenu, onTooltipShow, onTooltipHide, onConfigure }: CanvasProps) {
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
    copy,
    cut,
    paste,
    interactionMode,
    undoRedoManager,
  } = useDiagram();

  // Stable references for callbacks
  const onContextMenuRef = useRef(onContextMenu);
  const onTooltipShowRef = useRef(onTooltipShow);
  const onTooltipHideRef = useRef(onTooltipHide);
  const onConfigureRef = useRef(onConfigure);
  
  const interactionModeRef = useRef(interactionMode);
  interactionModeRef.current = interactionMode;
  
  onContextMenuRef.current = onContextMenu;
  onTooltipShowRef.current = onTooltipShow;
  onTooltipHideRef.current = onTooltipHide;
  onConfigureRef.current = onConfigure;

  // Ref to access paper without causing re-render loop in callbacks
  const paperRef = useRef<dia.Paper | null>(null);
  paperRef.current = paper;

  // Ref to access selected cells in interaction callbacks
  const selectedCellsRef = useRef<dia.Cell[]>(selectedCells);
  selectedCellsRef.current = selectedCells;

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
      drawGrid: { 
        name: 'dot', 
        args: [
          { color: '#C8C8D0', thickness: 2, scaleFactor: 5 },
          { color: '#C8C8D0', thickness: 2, scaleFactor: 2 },
          { color: '#C8C8D0', thickness: 1, scaleFactor: 1 },
          { color: '#C8C8D0', thickness: 1, scaleFactor: 0.5 },
          { color: '#C8C8D0', thickness: 1, scaleFactor: 0.1 }
        ]
      },
    });

    // Register with context
    setPaper(newPaper);

    // Unfreeze to start rendering
    newPaper.unfreeze();

    // ---- Setup all interactions ----
    const cleanups: (() => void)[] = [];

    // 1. Pan & Zoom
    cleanups.push(setupPanZoom(newPaper, () => interactionModeRef.current));

    // 2. Lasso selection
    cleanups.push(
      setupLassoSelection(newPaper, graph, () => interactionModeRef.current, (cells) => {
        setSelectedCells(cells);
      }),
    );

    // 3. Double-click to configure
    cleanups.push(setupDoubleClickSettings(newPaper));

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
        onCopy: copy,
        onCut: cut,
        onPaste: paste,
        onEscape: clearSelection,
      }),
    );

    // 7. Obstacle-aware routing listeners
    cleanups.push(applyRoutingListeners(newPaper, graph));

    // 8. Resize & Rotate handles
    cleanups.push(
      setupResizeRotate(newPaper, graph, (cells) => {
        setSelectedCells(cells);
      }, undoRedoManager || undefined),
    );

    // 9. Snaplines (Alignment Guides)
    cleanups.push(setupSnaplines(newPaper, graph));

    // 10. Multi-selection Drag
    cleanups.push(
      setupMultiSelectionMove(newPaper, graph, () => selectedCellsRef.current, undoRedoManager || undefined),
    );

    // 11. Configuration Modal listener
    newPaper.on('element:configure', (elementView: dia.ElementView | dia.Element) => {
      // It might pass the element directly depending on how we triggered it
      const cell = elementView instanceof dia.Element ? elementView : elementView.model;
      if (onConfigureRef.current) {
        onConfigureRef.current(cell);
      }
    });

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
      
      // AUTO-INSERT ON LINK LOGIC
      // Check if dropped near any existing links
      const elementBBox = element.getBBox();
      let targetLink: dia.Link | null = null;
      let minDistance = Infinity;

      const links = graph.getLinks();
      for (const link of links) {
        const linkView = currentPaper.findViewByModel(link) as dia.LinkView;
        if (!linkView) continue;

        // Try to find the closest point on the link connection path
        // For simplicity, we check if the element's center is close to the link's bounding box
        // A more robust approach would use geometry intersections, but this works for basic dropping
        const linkBBox = linkView.getBBox();
        const center = elementBBox.center();
        
        // Check if the center of the dropped element is inside the link's bounding box (with some padding)
        const paddedLinkBBox = linkBBox.inflate(10);
        
        if (paddedLinkBBox.containsPoint(center)) {
          // It's close enough to trigger insert
          targetLink = link;
          break; // Take the first one we find
        }
      }

      if (targetLink) {
        const source = targetLink.source();
        const target = targetLink.target();

        // 1. Add the new element to the graph
        graph.addCell(element);

        // 2. Create link from original source -> new element
        const newLink1 = new shapes.standard.Link({
          source: source,
          target: { id: element.id, port: 'in1' },
          attrs: {
            line: {
              stroke: '#A262FF', // Default link styling
              strokeWidth: 2,
              targetMarker: { type: 'path', d: 'M 10 -5 0 0 10 5 Z', fill: '#A262FF' },
              strokeDasharray: '0',
            },
          },
          router: { name: 'manhattan' },
          connector: { name: 'rounded' },
        });

        // 3. Create link from new element -> original target
        const newLink2 = new shapes.standard.Link({
          source: { id: element.id, port: 'out1' },
          target: target,
          attrs: {
            line: {
              stroke: '#A262FF',
              strokeWidth: 2,
              targetMarker: { type: 'path', d: 'M 10 -5 0 0 10 5 Z', fill: '#A262FF' },
              strokeDasharray: '0',
            },
          },
          router: { name: 'manhattan' },
          connector: { name: 'rounded' },
        });

        // 4. Copy routing/connection attributes if needed
        if (targetLink.get('router')) newLink1.set('router', targetLink.get('router'));
        if (targetLink.get('connector')) newLink1.set('connector', targetLink.get('connector'));
        if (targetLink.get('router')) newLink2.set('router', targetLink.get('router'));
        if (targetLink.get('connector')) newLink2.set('connector', targetLink.get('connector'));

        // 5. Add new links and remove the old one (wrapped in a batch for undo)
        graph.startBatch('auto-insert-link');
        targetLink.remove();
        graph.addCells([newLink1, newLink2]);
        graph.stopBatch('auto-insert-link');
        
      } else {
        // Normal drop, just add the element
        graph.addCell(element);
      }
    },
    [graph],
  );

  // Handle drag enter to allow drop in all browsers
  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle drag over to allow drop
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  return (
    <CanvasContainer
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
    >
      <PaperWrapper ref={paperContainerRef} />
    </CanvasContainer>
  );
}

// ============================================================
// BPM ELEMENT FACTORY (for palette drops)
// ============================================================

/** Standard port configuration for BPM elements */
const BPM_PORT_CONFIG = {
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

const START_PORT_CONFIG = {
  ...BPM_PORT_CONFIG,
  items: [
    { group: 'out', id: 'out1' },
  ],
};

const END_PORT_CONFIG = {
  ...BPM_PORT_CONFIG,
  items: [
    { group: 'in', id: 'in1' },
  ],
};

const FONT = "'Inter', sans-serif";

/**
 * Creates a JointJS element based on the BPM shape type.
 * Maps BPMN 2.0 element types to JointJS shapes with correct styling.
 */
function createElementFromPalette(
  type: string,
  x: number,
  y: number,
  label: string,
): dia.Element {
  switch (type) {
    case 'httpConnector':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 80, height: 40 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#4A90E2',
            strokeWidth: 2,
            rx: 4,
            ry: 4,
          },
          label: {
            text: label || 'HTTP',
            fill: '#1A1A1A',
            fontSize: 11,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'module':
      return new shapes.standard.Polygon({
        position: { x, y },
        size: { width: 80, height: 60 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#7CB342', // Green stroke like in the image
            strokeWidth: 2,
            refPoints: '20,0 80,0 100,20 100,80 80,100 20,100 0,80 0,20',
          },
          label: {
            text: label || 'Module',
            fill: '#1A1A1A',
            fontSize: 11,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10, // Positioned above the shape
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    // ── EVENTS ─────────────────────────────────────────────
    case 'startEvent':
      return new shapes.standard.Circle({
        position: { x, y },
        size: { width: 60, height: 60 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#2DD4A8',
            strokeWidth: 2,
          },
          label: {
            text: label || 'Start',
            fill: '#1A1A1A',
            fontSize: 11,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: START_PORT_CONFIG,
      });

    case 'endEvent':
      return new shapes.standard.Circle({
        position: { x, y },
        size: { width: 60, height: 60 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#FF5C5C',
            strokeWidth: 4,
          },
          label: {
            text: label || 'End',
            fill: '#1A1A1A',
            fontSize: 11,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: END_PORT_CONFIG,
      });

    case 'intermediateEvent':
      return new shapes.standard.Circle({
        position: { x, y },
        size: { width: 60, height: 60 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#FFB224',
            strokeWidth: 2,
          },
          label: {
            text: label || 'Intermediate',
            fill: '#1A1A1A',
            fontSize: 11,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    // ── ACTIVITIES ──────────────────────────────────────────
    case 'task':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 160, height: 80 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#3A3A44',
            strokeWidth: 1.5,
            rx: 10,
            ry: 10,
          },
          label: {
            text: label || 'Task',
            fill: '#1A1A1A',
            fontSize: 13,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'subProcess':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 180, height: 100 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#3A3A44',
            strokeWidth: 1.5,
            rx: 10,
            ry: 10,
          },
          label: {
            text: label || 'Sub-Process',
            fill: '#1A1A1A',
            fontSize: 13,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'callActivity':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 160, height: 80 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#9B9BA4',
            strokeWidth: 3.5,
            rx: 10,
            ry: 10,
          },
          label: {
            text: label || 'Call Activity',
            fill: '#1A1A1A',
            fontSize: 13,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    // ── GATEWAYS ────────────────────────────────────────────
    case 'exclusiveGateway':
      return new shapes.standard.Polygon({
        position: { x, y },
        size: { width: 80, height: 80 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#FFB224',
            strokeWidth: 2,
            refPoints: '50,0 100,50 50,100 0,50',
          },
          label: {
            text: label || 'Exclusive',
            fill: '#1A1A1A',
            fontSize: 11,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'parallelGateway':
      return new shapes.standard.Polygon({
        position: { x, y },
        size: { width: 80, height: 80 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#FFB224',
            strokeWidth: 2,
            refPoints: '50,0 100,50 50,100 0,50',
          },
          label: {
            text: label || 'Parallel',
            fill: '#1A1A1A',
            fontSize: 11,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'inclusiveGateway':
      return new shapes.standard.Polygon({
        position: { x, y },
        size: { width: 80, height: 80 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#FFB224',
            strokeWidth: 2,
            refPoints: '50,0 100,50 50,100 0,50',
          },
          label: {
            text: label || 'Inclusive',
            fill: '#1A1A1A',
            fontSize: 11,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    // ── DATA ────────────────────────────────────────────────
    case 'dataObject':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 80, height: 100 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#9B9BA4',
            strokeWidth: 1.5,
            rx: 2,
            ry: 2,
          },
          label: {
            text: label || 'Data Object',
            fill: '#1A1A1A',
            fontSize: 11,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'dataStore':
      return new shapes.standard.Circle({
        position: { x, y },
        size: { width: 80, height: 60 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#9B9BA4',
            strokeWidth: 1.5,
          },
          label: {
            text: label || 'Data Store',
            fill: '#1A1A1A',
            fontSize: 11,
            fontFamily: FONT,
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    // ── BUSINESS OBJECT ──────────────────────────────────────
    case 'businessObject':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 140, height: 100 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#4A90E2',
            strokeWidth: 2,
            rx: 2,
            ry: 2,
          },
          label: {
            text: label || 'Business Object',
            fill: '#1A1A1A',
            fontSize: 13,
            fontFamily: FONT,
            fontWeight: 'bold',
            textVerticalAnchor: 'bottom',
            refY: 0,
            y: -10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'businessAttribute':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 120, height: 40 },
        attrs: {
          body: {
            fill: 'transparent',
            stroke: 'transparent',
          },
          label: {
            text: `• ${label || 'Attribute'}`,
            fill: '#333333',
            fontSize: 12,
            fontFamily: FONT,
            textAnchor: 'start',
            refX: 10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'businessMethod':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 120, height: 40 },
        attrs: {
          body: {
            fill: 'transparent',
            stroke: 'transparent',
          },
          label: {
            text: `+ ${label || 'Method'}()`,
            fill: '#333333',
            fontSize: 12,
            fontFamily: FONT,
            textAnchor: 'start',
            refX: 10,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    // ── ORGANIZATION ─────────────────────────────────────────
    case 'orgUnit':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 160, height: 80 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#F5A623',
            strokeWidth: 2,
            rx: 4,
            ry: 4,
          },
          label: {
            text: label || 'Org Unit',
            fill: '#1A1A1A',
            fontSize: 13,
            fontFamily: FONT,
            fontWeight: 'bold',
            refY: -25,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'orgRole':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 140, height: 60 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#F5A623',
            strokeWidth: 1.5,
            strokeDasharray: '4,4',
            rx: 4,
            ry: 4,
          },
          label: {
            text: label || 'Role',
            fill: '#1A1A1A',
            fontSize: 12,
            fontFamily: FONT,
            refY: -20,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'orgPerson':
      return new shapes.standard.Rectangle({ 
        position: { x, y },
        size: { width: 120, height: 60 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#F5A623',
            strokeWidth: 1.5,
            rx: 10,
            ry: 10,
          },
          label: {
            text: label || 'Person',
            fill: '#1A1A1A',
            fontSize: 12,
            fontFamily: FONT,
            refY: -20,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'orgLocation':
      return new shapes.standard.Polygon({
        position: { x, y },
        size: { width: 100, height: 80 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#F5A623',
            strokeWidth: 1.5,
            refPoints: '0,0 100,0 100,60 50,100 0,60', // Pin shape
          },
          label: {
            text: label || 'Location',
            fill: '#1A1A1A',
            fontSize: 12,
            fontFamily: FONT,
            refY: -20,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    // ── SYSTEM ARCHITECTURE ──────────────────────────────────
    case 'sysITSystem':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 160, height: 100 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#7ED321',
            strokeWidth: 2,
            rx: 6,
            ry: 6,
          },
          label: {
            text: label || 'IT System',
            fill: '#1A1A1A',
            fontSize: 13,
            fontFamily: FONT,
            fontWeight: 'bold',
            refY: -25,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'sysDatabase':
      return new shapes.standard.Cylinder({
        position: { x, y },
        size: { width: 100, height: 120 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#7ED321',
            strokeWidth: 2,
          },
          top: {
            fill: '#EAEDF1',
            stroke: '#7ED321',
            strokeWidth: 2,
          },
          label: {
            text: label || 'Database',
            fill: '#1A1A1A',
            fontSize: 12,
            fontFamily: FONT,
            refY: -20,
          },
        },
        ports: {
          ...BPM_PORT_CONFIG,
          items: [ // Adjust port positions for cylinder
            { group: 'in', id: 'in1', args: { y: '50%' } },
            { group: 'out', id: 'out1', args: { y: '50%' } },
          ],
        },
      });

    case 'sysCluster':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 240, height: 160 },
        attrs: {
          body: {
            fill: 'rgba(126, 211, 33, 0.05)',
            stroke: '#7ED321',
            strokeWidth: 2,
            strokeDasharray: '5,5',
            rx: 10,
            ry: 10,
          },
          label: {
            text: label || 'Cluster',
            fill: '#7ED321',
            fontSize: 14,
            fontFamily: FONT,
            fontWeight: 'bold',
            refY: -30,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    // ── TECHNICAL ADAPTERS ───────────────────────────────────
    case 'techDataConverter':
    case 'techFormatAdapter':
      return new shapes.standard.Polygon({
        position: { x, y },
        size: { width: 140, height: 80 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#BD10E0', // Purple for technical rules/converters
            strokeWidth: 2,
            refPoints: '0,50 20,0 100,0 120,50 100,100 20,100', // Hexagon
          },
          label: {
            text: label || 'Converter',
            fill: '#1A1A1A',
            fontSize: 12,
            fontFamily: FONT,
            refY: -20,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'techSystemConnector':
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 120, height: 60 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#BD10E0',
            strokeWidth: 3, // Thicker border for system connectors
            rx: 0,
            ry: 0,
          },
          label: {
            text: label || 'Connector',
            fill: '#1A1A1A',
            fontSize: 12,
            fontFamily: FONT,
            refY: -20,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    default:
      return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 160, height: 80 },
        attrs: {
          body: {
            fill: '#F5F7FA',
            stroke: '#3A3A44',
            strokeWidth: 1.5,
            rx: 8,
            ry: 8,
          },
          label: {
            text: label || 'Node',
            fill: '#1A1A1A',
            fontSize: 13,
            fontFamily: FONT,
            refY: -25,
          },
        },
        ports: BPM_PORT_CONFIG,
      });
  }
}
