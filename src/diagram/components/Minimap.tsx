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
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 240px;
  height: 160px;
  background: ${({ theme }) => theme.colors.bg.elevated};
  border: ${({ theme }) => theme.glass.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  overflow: hidden;
  z-index: 20;
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
    if (!navPaper || !graph.getElements().length) return;
    
    // Scale the overview paper to fit the whole graph
    navPaper.scaleContentToFit({ padding: 10 });
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

    // Create read-only paper
    const navPaper = createPaper({
      el: paperDiv,
      graph,
      background: { color: 'transparent' },
      interactive: false,
    });
    
    navPaperRef.current = navPaper;

    // Initial sync
    syncNavPaperScale();
    if (paper) syncViewportToMainPaper();

    // Re-sync when graph bounds change (elements added/moved)
    graph.on('add remove change:position', () => {
      syncNavPaperScale();
      syncViewportToMainPaper();
    });

    return () => {
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
    
    // Also sync on window resize
    const onResize = () => {
      syncNavPaperScale();
      syncViewportToMainPaper();
    };
    window.addEventListener('resize', onResize);

    return () => {
      paper.off('translate', onTransform);
      paper.off('scale', onTransform);
      window.removeEventListener('resize', onResize);
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
