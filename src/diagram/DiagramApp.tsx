/**
 * DiagramApp.tsx
 * 
 * Main application shell that composes all diagram components
 * into a FigJam-like layout:
 * 
 *  ┌──────────┬─────────────────────┬────────────┐
 *  │          │     Toolbar         │            │
 *  │  Palette │─────────────────────│  Property  │
 *  │          │                     │   Panel    │
 *  │          │      Canvas         │            │
 *  │          │                     │            │
 *  │          │              Minimap│            │
 *  └──────────┴─────────────────────┴────────────┘
 * 
 * This is a client component wrapping all the diagram pieces.
 * It manages context menu and tooltip state that floats above everything.
 */
'use client';

import React, { useState, useCallback } from 'react';
import { dia } from '@joint/core';
import styled, { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { GlobalStyles } from '@/styles/GlobalStyles';
import { DiagramProvider } from '@/diagram/context/DiagramProvider';
import Canvas from '@/diagram/components/Canvas';
import Palette from '@/diagram/components/Palette';
import ContextMenu from '@/diagram/components/ContextMenu';
import Tooltip from '@/diagram/components/Tooltip';
import WorkbenchLayout from '@/diagram/components/WorkbenchLayout';
import ConfigModal from '@/diagram/components/ConfigModal';
import Minimap from '@/diagram/components/Minimap';
import type { ContextMenuEvent, TooltipEvent } from '@/diagram/engine/interactions';

// ============================================================
// LAYOUT STYLED COMPONENTS
// ============================================================

const CanvasContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const VerticalToolbarWrapper = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: ${({ theme }) => theme.zIndex.panels};
`;


// ============================================================
// COMPONENT
// ============================================================

export default function DiagramApp() {
  // Context menu state
  const [contextMenuEvent, setContextMenuEvent] = useState<ContextMenuEvent | null>(null);
  const [tooltipEvent, setTooltipEvent] = useState<TooltipEvent | null>(null);
  const [configuringCell, setConfiguringCell] = useState<dia.Cell | null>(null);

  const handleContextMenu = useCallback((event: ContextMenuEvent) => {
    setContextMenuEvent(event);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuEvent(null);
  }, []);

  const handleTooltipShow = useCallback((event: TooltipEvent) => {
    setTooltipEvent(event);
  }, []);

  const handleTooltipHide = useCallback(() => {
    setTooltipEvent(null);
  }, []);

  const designerContent = (
    <CanvasContainer>
      <Canvas
        onContextMenu={handleContextMenu}
        onTooltipShow={handleTooltipShow}
        onTooltipHide={handleTooltipHide}
        onConfigure={setConfiguringCell}
      />

      <VerticalToolbarWrapper>
        <Palette />
      </VerticalToolbarWrapper>

      {/* Floating overlays */}
      <ContextMenu event={contextMenuEvent} onClose={handleCloseContextMenu} />
      <Tooltip event={tooltipEvent} />
      {configuringCell && <ConfigModal cell={configuringCell} onClose={() => setConfiguringCell(null)} />}
    </CanvasContainer>
  );

  const repositoryContent = (
    <div style={{ flex: 1, padding: '24px', color: '#888' }}>
      <h2>Repository Explorer</h2>
      <p>This is a placeholder for the repository file browser.</p>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <DiagramProvider>
        <WorkbenchLayout 
          designerContent={designerContent} 
          repositoryContent={repositoryContent}
          minimapContent={<Minimap />}
        />
      </DiagramProvider>
    </ThemeProvider>
  );
}
