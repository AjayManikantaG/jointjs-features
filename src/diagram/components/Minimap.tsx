/**
 * Minimap.tsx
 * 
 * Bird-view navigator showing a scaled-down view of the entire graph.
 * 
 * How it works:
 * 1. Renders a small <div> container
 * 2. Creates a second dia.Paper (read-only) sharing the same graph
 * 3. Draws a viewport indicator showing the current visible area
 * 4. Clicking on the minimap pans the main paper to that position
 * 
 * Performance:
 * - The minimap paper is frozen and only updated on graph changes
 * - Uses requestAnimationFrame for smooth viewport updates
 */
'use client';

import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import { dia, shapes } from '@joint/core';
import { useDiagram } from '../context/DiagramProvider';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const MinimapContainer = styled.div`
  width: 200px;
  height: 150px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: ${({ theme }) => theme.glass.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  position: relative;
  box-shadow: ${({ theme }) => theme.shadows.md};
  cursor: pointer;
  z-index: ${({ theme }) => theme.zIndex.panels};
  backdrop-filter: ${({ theme }) => theme.glass.backdropFilter};
`;

const MinimapPaperEl = styled.div`
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.6;
`;

const ViewportIndicator = styled.div`
  position: absolute;
  border: 2px solid ${({ theme }) => theme.colors.accent.primary};
  background: rgba(123, 97, 255, 0.08);
  border-radius: 2px;
  pointer-events: none;
  transition: all 0.1s ease;
`;

const MinimapLabel = styled.div`
  position: absolute;
  top: 4px;
  left: 8px;
  font-size: ${({ theme }) => theme.typography.sizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 1px;
  pointer-events: none;
`;

// ============================================================
// COMPONENT
// ============================================================

export default function Minimap() {
  const { graph, paper } = useDiagram();
  const containerRef = useRef<HTMLDivElement>(null);
  const paperElRef = useRef<HTMLDivElement>(null);
  const minimapPaperRef = useRef<dia.Paper | null>(null);
  const [viewport, setViewport] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Create minimap paper
  useEffect(() => {
    const el = paperElRef.current;
    if (!el) return;

    const minimapPaper = new dia.Paper({
      el,
      model: graph,
      width: 200,
      height: 150,
      gridSize: 1,
      interactive: false,
      async: false,
      cellViewNamespace: shapes,
      background: { color: 'transparent' },
    });

    // Scale to fit
    minimapPaper.scaleContentToFit({
      padding: 10,
      maxScale: 0.15,
      minScale: 0.02,
    });

    minimapPaperRef.current = minimapPaper;

    // Update scale when graph changes
    const onGraphChange = () => {
      requestAnimationFrame(() => {
        minimapPaper.scaleContentToFit({
          padding: 10,
          maxScale: 0.15,
          minScale: 0.02,
        });
      });
    };
    graph.on('add', onGraphChange);
    graph.on('remove', onGraphChange);
    graph.on('change:position', onGraphChange);
    graph.on('change:size', onGraphChange);

    return () => {
      graph.off('add', onGraphChange);
      graph.off('remove', onGraphChange);
      graph.off('change:position', onGraphChange);
      graph.off('change:size', onGraphChange);
      minimapPaper.remove();
    };
  }, [graph]);

  // Update viewport indicator when main paper changes
  useEffect(() => {
    if (!paper || !minimapPaperRef.current) return;

    const updateViewport = () => {
      const mainPaper = paper;
      const miniPaper = minimapPaperRef.current;
      if (!mainPaper || !miniPaper) return;

      const mainScale = mainPaper.scale();
      const mainTranslate = mainPaper.translate();
      const mainEl = mainPaper.el as HTMLElement;
      const containerRect = mainEl.getBoundingClientRect();

      const miniScale = miniPaper.scale();
      const miniTranslate = miniPaper.translate();

      // Calculate visible area in local coordinates
      const visibleLeft = -mainTranslate.tx / mainScale.sx;
      const visibleTop = -mainTranslate.ty / mainScale.sy;
      const visibleWidth = containerRect.width / mainScale.sx;
      const visibleHeight = containerRect.height / mainScale.sy;

      // Convert to minimap coordinates
      setViewport({
        left: visibleLeft * miniScale.sx + miniTranslate.tx,
        top: visibleTop * miniScale.sy + miniTranslate.ty,
        width: visibleWidth * miniScale.sx,
        height: visibleHeight * miniScale.sy,
      });
    };

    // Update on paper transformations
    const interval = setInterval(updateViewport, 200);
    updateViewport();

    return () => clearInterval(interval);
  }, [paper]);

  // Click on minimap to navigate
  const handleClick = (e: React.MouseEvent) => {
    if (!paper || !minimapPaperRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const miniScale = minimapPaperRef.current.scale();
    const miniTranslate = minimapPaperRef.current.translate();

    // Convert click to local coordinates
    const localX = (clickX - miniTranslate.tx) / miniScale.sx;
    const localY = (clickY - miniTranslate.ty) / miniScale.sy;

    // Center the main paper on this point
    const mainScale = paper.scale();
    const mainEl = paper.el as HTMLElement;
    const containerRect = mainEl.getBoundingClientRect();

    const tx = -localX * mainScale.sx + containerRect.width / 2;
    const ty = -localY * mainScale.sy + containerRect.height / 2;

    paper.translate(tx, ty);
  };

  return (
    <MinimapContainer ref={containerRef} onClick={handleClick}>
      <MinimapLabel>Navigator</MinimapLabel>
      <MinimapPaperEl ref={paperElRef} />
      <ViewportIndicator
        style={{
          left: `${viewport.left}px`,
          top: `${viewport.top}px`,
          width: `${viewport.width}px`,
          height: `${viewport.height}px`,
        }}
      />
    </MinimapContainer>
  );
}
