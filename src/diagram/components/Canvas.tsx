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
  setupResizeRotate,
  highlightCells,
  type ContextMenuEvent,
  type TooltipEvent,
} from '../engine/interactions';
import { setupSnaplines } from '../engine/snaplines';

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
    copy,
    paste,
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
        onCopy: copy,
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
      }),
    );

    // 9. Snaplines (Alignment Guides)
    cleanups.push(setupSnaplines(newPaper, graph));

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
    // ── EVENTS ─────────────────────────────────────────────
    case 'startEvent':
      return new shapes.standard.Circle({
        position: { x, y },
        size: { width: 60, height: 60 },
        attrs: {
          body: {
            fill: '#232329',
            stroke: '#2DD4A8',
            strokeWidth: 2,
          },
          label: {
            text: label || 'Start',
            fill: '#EDEDEF',
            fontSize: 11,
            fontFamily: FONT,
            refY: '120%',
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'endEvent':
      return new shapes.standard.Circle({
        position: { x, y },
        size: { width: 60, height: 60 },
        attrs: {
          body: {
            fill: '#232329',
            stroke: '#FF5C5C',
            strokeWidth: 4,
          },
          label: {
            text: label || 'End',
            fill: '#EDEDEF',
            fontSize: 11,
            fontFamily: FONT,
            refY: '120%',
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'intermediateEvent':
      return new shapes.standard.Circle({
        position: { x, y },
        size: { width: 60, height: 60 },
        attrs: {
          body: {
            fill: '#232329',
            stroke: '#FFB224',
            strokeWidth: 2,
          },
          label: {
            text: label || 'Intermediate',
            fill: '#EDEDEF',
            fontSize: 11,
            fontFamily: FONT,
            refY: '120%',
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
            fill: '#232329',
            stroke: '#3A3A44',
            strokeWidth: 1.5,
            rx: 10,
            ry: 10,
          },
          label: {
            text: label || 'Task',
            fill: '#EDEDEF',
            fontSize: 13,
            fontFamily: FONT,
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
            fill: '#232329',
            stroke: '#3A3A44',
            strokeWidth: 1.5,
            rx: 10,
            ry: 10,
          },
          label: {
            text: label || 'Sub-Process',
            fill: '#EDEDEF',
            fontSize: 13,
            fontFamily: FONT,
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
            fill: '#232329',
            stroke: '#9B9BA4',
            strokeWidth: 3.5,
            rx: 10,
            ry: 10,
          },
          label: {
            text: label || 'Call Activity',
            fill: '#EDEDEF',
            fontSize: 13,
            fontFamily: FONT,
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
            fill: '#232329',
            stroke: '#FFB224',
            strokeWidth: 2,
            refPoints: '50,0 100,50 50,100 0,50',
          },
          label: {
            text: '✕',
            fill: '#FFB224',
            fontSize: 20,
            fontFamily: FONT,
            fontWeight: 'bold',
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
            fill: '#232329',
            stroke: '#FFB224',
            strokeWidth: 2,
            refPoints: '50,0 100,50 50,100 0,50',
          },
          label: {
            text: '+',
            fill: '#FFB224',
            fontSize: 24,
            fontFamily: FONT,
            fontWeight: 'bold',
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
            fill: '#232329',
            stroke: '#FFB224',
            strokeWidth: 2,
            refPoints: '50,0 100,50 50,100 0,50',
          },
          label: {
            text: '○',
            fill: '#FFB224',
            fontSize: 20,
            fontFamily: FONT,
            fontWeight: 'bold',
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
            fill: '#232329',
            stroke: '#9B9BA4',
            strokeWidth: 1.5,
            rx: 2,
            ry: 2,
          },
          label: {
            text: label || 'Data Object',
            fill: '#EDEDEF',
            fontSize: 11,
            fontFamily: FONT,
            refY: '110%',
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
            fill: '#232329',
            stroke: '#9B9BA4',
            strokeWidth: 1.5,
          },
          label: {
            text: label || 'Data Store',
            fill: '#EDEDEF',
            fontSize: 11,
            fontFamily: FONT,
            refY: '130%',
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
            fill: '#232329',
            stroke: '#4A90E2',
            strokeWidth: 2,
            rx: 2,
            ry: 2,
          },
          label: {
            text: label || 'Business Object',
            fill: '#EDEDEF',
            fontSize: 13,
            fontFamily: FONT,
            fontWeight: 'bold',
            refY: 20,
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
            fill: '#A0A0A0',
            fontSize: 12,
            fontFamily: FONT,
            textAnchor: 'start',
            refX: 10,
          },
        },
        ports: BPM_PORT_CONFIG, // Simplified ports might be better here later
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
            fill: '#A0A0A0',
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
            fill: '#232329',
            stroke: '#F5A623',
            strokeWidth: 2,
            rx: 4,
            ry: 4,
          },
          label: {
            text: label || 'Org Unit',
            fill: '#EDEDEF',
            fontSize: 13,
            fontFamily: FONT,
            fontWeight: 'bold',
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
            fill: '#232329',
            stroke: '#F5A623',
            strokeWidth: 1.5,
            strokeDasharray: '4,4',
            rx: 4,
            ry: 4,
          },
          label: {
            text: label || 'Role',
            fill: '#EDEDEF',
            fontSize: 12,
            fontFamily: FONT,
          },
        },
        ports: BPM_PORT_CONFIG,
      });

    case 'orgPerson':
      return new shapes.standard.Rectangle({ // Simulating a person node with icon space
        position: { x, y },
        size: { width: 120, height: 60 },
        attrs: {
          body: {
            fill: '#232329',
            stroke: '#F5A623',
            strokeWidth: 1.5,
            rx: 30, // Pill shape
            ry: 30,
          },
          label: {
            text: label || 'Person',
            fill: '#EDEDEF',
            fontSize: 12,
            fontFamily: FONT,
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
            fill: '#232329',
            stroke: '#F5A623',
            strokeWidth: 1.5,
            refPoints: '0,0 100,0 100,60 50,100 0,60', // Pin shape
          },
          label: {
            text: label || 'Location',
            fill: '#EDEDEF',
            fontSize: 12,
            fontFamily: FONT,
            refY: '40%',
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
            fill: '#232329',
            stroke: '#7ED321',
            strokeWidth: 2,
            rx: 6,
            ry: 6,
          },
          label: {
            text: label || 'IT System',
            fill: '#EDEDEF',
            fontSize: 13,
            fontFamily: FONT,
            fontWeight: 'bold',
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
            fill: '#232329',
            stroke: '#7ED321',
            strokeWidth: 2,
          },
          top: {
            fill: '#232329',
            stroke: '#7ED321',
            strokeWidth: 2,
          },
          label: {
            text: label || 'Database',
            fill: '#EDEDEF',
            fontSize: 12,
            fontFamily: FONT,
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
            refY: 20,
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
            fill: '#232329',
            stroke: '#BD10E0', // Purple for technical rules/converters
            strokeWidth: 2,
            refPoints: '0,50 20,0 100,0 120,50 100,100 20,100', // Hexagon
          },
          label: {
            text: label || 'Converter',
            fill: '#EDEDEF',
            fontSize: 12,
            fontFamily: FONT,
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
            fill: '#232329',
            stroke: '#BD10E0',
            strokeWidth: 3, // Thicker border for system connectors
            rx: 0,
            ry: 0,
          },
          label: {
            text: label || 'Connector',
            fill: '#EDEDEF',
            fontSize: 12,
            fontFamily: FONT,
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
            fontFamily: FONT,
          },
        },
        ports: BPM_PORT_CONFIG,
      });
  }
}
