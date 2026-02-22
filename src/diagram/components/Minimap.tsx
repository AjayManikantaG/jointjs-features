/**
 * Navigator.tsx
 * 
 * Replicates the JointJS+ Navigator widget.
 * Displays a small overview of the entire diagram with a draggable viewport
 * representing the current viewing area of the main paper.
 */
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { dia } from '@joint/core';
import { useDiagram } from '../context/DiagramProvider';
import { createPaper } from '../engine/createPaper';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const NavigatorContainer = styled.div`
  width: 100%;
  height: 220px;
  position: relative;
  background: transparent;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PaperWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none; /* Let the viewport handle panning */
  opacity: 0.7;
`;

const ViewportBox = styled.div`
  position: absolute;
  border: 2px solid ${({ theme }) => theme.colors.accent.primary};
  background: rgba(123, 97, 255, 0.1);
  box-sizing: border-box;
  cursor: grab;
  z-index: 21;
  transition: opacity 0.2s ease;

  &:active {
    cursor: grabbing;
    background: rgba(123, 97, 255, 0.2);
  }
`;

// ============================================================
// COMPONENT
// ============================================================

export default function Minimap() {
  const { graph, paper } = useDiagram();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for the viewport overlay box
  const [viewportStyle, setViewportStyle] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialTranslateRef = useRef({ tx: 0, ty: 0 });

  // Store the secondary paper instance
  const navPaperRef = useRef<dia.Paper | null>(null);

  // Sync the secondary paper scale to fit all contents
  const syncNavPaperScale = useCallback(() => {
    const navPaper = navPaperRef.current;
    const container = containerRef.current;
    
    if (!navPaper || !container) return;
    
    const elements = graph.getElements();
    if (elements.length === 0) {
      // Empty graph
      navPaper.scale(1, 1);
      navPaper.translate(0, 0);
      return;
    }
    
    // 1. Get exact logical bounds of the graph content
    const bbox = graph.getBBox();
    if (!bbox || bbox.width === 0 || bbox.height === 0) return;

    // 2. Add padding around the bounding box
    const padding = 20;
    const bboxWidth = bbox.width + padding * 2;
    const bboxHeight = bbox.height + padding * 2;

    // 3. Get exact pixel dimensions of the container
    const viewWidth = Math.max(container.clientWidth || 1, 1);
    const viewHeight = Math.max(container.clientHeight || 1, 1);

    // 4. Calculate ratio to fit (preserve aspect ratio)
    const scaleX = viewWidth / bboxWidth;
    const scaleY = viewHeight / bboxHeight;
    // Don't let it scale to 0
    let finalScale = Math.max(Math.min(scaleX, scaleY), 0.01);
    
    // Prevent zooming in infinitely if the shape is tiny
    const safeScale = Math.min(finalScale, 1.0);

    // 5. Apply the scale
    navPaper.scale(safeScale, safeScale);

    // 6. Center it mathematically by translating the scaled bbox into the view rect
    const scaledBboxWidth = bbox.width * safeScale;
    const scaledBboxHeight = bbox.height * safeScale;
    
    const tx = (viewWidth - scaledBboxWidth) / 2 - (bbox.x * safeScale);
    const ty = (viewHeight - scaledBboxHeight) / 2 - (bbox.y * safeScale);

    navPaper.translate(tx, ty);
  }, [graph]);

  // Sync the viewport box to exactly match what the main paper shows
  const syncViewportToMainPaper = useCallback(() => {
    if (!paper || !navPaperRef.current || !containerRef.current) return;
    
    const mainEl = paper.el as HTMLElement;
    const navEl = containerRef.current;
    const navPaper = navPaperRef.current;

    // Viewport dimensions in window pixels
    const mainWidth = mainEl.clientWidth;
    const mainHeight = mainEl.clientHeight;
    
    // Main paper transform
    const mainScale = paper.scale().sx;
    const mainTranslate = paper.translate();
    
    // Nav paper transform
    const navScale = navPaper.scale().sx;
    const navTranslate = navPaper.translate();

    // Map main paper's visible area [0, 0, width, height] to nav paper coordinates
    // Top-left of main view in logical (unscaled model) coordinates:
    const logicalX = -mainTranslate.tx / mainScale;
    const logicalY = -mainTranslate.ty / mainScale;
    const logicalWidth = mainWidth / mainScale;
    const logicalHeight = mainHeight / mainScale;

    // Convert those logical coordinates into nav paper's screen coordinates
    const navX = (logicalX * navScale) + navTranslate.tx;
    const navY = (logicalY * navScale) + navTranslate.ty;
    const navW = logicalWidth * navScale;
    const navH = logicalHeight * navScale;

    setViewportStyle({
      left: navX,
      top: navY,
      width: navW,
      height: navH,
    });
  }, [paper]);


  // Effect to initialize the secondary paper
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !graph) return;

    const paperDiv = document.createElement('div');
    paperDiv.style.width = '100%';
    paperDiv.style.height = '100%';
    container.appendChild(paperDiv);

    // Create read-only paper with explicit pixel dimensions to prevent scaleContentToFit bugs
    const navPaper = createPaper({
      el: paperDiv,
      graph,
      width: container.clientWidth,
      height: container.clientHeight,
      background: { color: 'transparent' },
      async: false, // Must be false so we can instantly scale it to fit
      interactive: false,
    });
    
    // JointJS frozen:true by default; unfreeze immediately to render
    navPaper.unfreeze();
    
    navPaperRef.current = navPaper;

    // Re-sync when graph bounds change (elements added/moved)
    graph.on('add remove change:position', () => {
      syncNavPaperScale();
      syncViewportToMainPaper();
    });

    // Also sync on pointerup to ensure final positions are captured
    paper?.on('cell:pointerup', () => {
      syncNavPaperScale();
      syncViewportToMainPaper();
    });

    // Fallback timer for robust initial rendering (DOM might not be ready)
    const timer = setTimeout(() => {
      syncNavPaperScale();
      syncViewportToMainPaper();
    }, 1000);

    return () => {
      clearTimeout(timer);
      navPaper.remove();
      if (navPaperRef.current === navPaper) navPaperRef.current = null;
    };
  }, [graph, syncNavPaperScale, syncViewportToMainPaper, paper]);


  // Effect to sync viewport when main paper pans/zooms
  useEffect(() => {
    if (!paper) return;

    const onTransform = () => syncViewportToMainPaper();
    
    paper.on('translate', onTransform);
    paper.on('scale', onTransform);
    
    // Also sync and resize paper when container resizes
    const resizeObserver = new ResizeObserver(() => {
      if (navPaperRef.current && containerRef.current) {
         navPaperRef.current.setDimensions(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
      syncNavPaperScale();
      syncViewportToMainPaper();
    });
    
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    return () => {
      paper.off('translate', onTransform);
      paper.off('scale', onTransform);
      resizeObserver.disconnect();
    };
  }, [paper, syncViewportToMainPaper, syncNavPaperScale]);


  // Handle Viewport Dragging (pans the main paper)
  const onPointerDown = (e: React.PointerEvent) => {
    if (!paper || !navPaperRef.current) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialTranslateRef.current = paper.translate();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !paper || !navPaperRef.current) return;

    // Calculate how far the mouse moved on the screen
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Convert nav screen delta to logical delta
    const navScale = navPaperRef.current.scale().sx;
    const logicalDx = dx / navScale;
    const logicalDy = dy / navScale;

    // Apply logical delta to main paper, adjusting for main scale
    // Note: To pan the viewport right, we translate the paper left (negative)
    const mainScale = paper.scale().sx;
    const newTx = initialTranslateRef.current.tx - (logicalDx * mainScale);
    const newTy = initialTranslateRef.current.ty - (logicalDy * mainScale);

    paper.translate(newTx, newTy);
    // (syncViewportToMainPaper is called automatically by paper 'translate' event)
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <NavigatorContainer>
      <PaperWrapper ref={containerRef} />
      <ViewportBox
        style={{
          left: `${viewportStyle.left}px`,
          top: `${viewportStyle.top}px`,
          width: `${viewportStyle.width}px`,
          height: `${viewportStyle.height}px`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </NavigatorContainer>
  );
}
