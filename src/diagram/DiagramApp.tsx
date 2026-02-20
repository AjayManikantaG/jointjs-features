/**
 * DiagramApp.tsx
 * 
 * Main application shell that composes all diagram components
 * into a FigJam-like layout:
 * 
 *  ┌──────────┬─────────────────────┬────────────┐
 *  │          │     Toolbar          │            │
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
import styled, { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { GlobalStyles } from '@/styles/GlobalStyles';
import { DiagramProvider } from '@/diagram/context/DiagramProvider';
import Canvas from '@/diagram/components/Canvas';
import Toolbar from '@/diagram/components/Toolbar';
import Palette from '@/diagram/components/Palette';
import Minimap from '@/diagram/components/Minimap';
import PropertyPanel from '@/diagram/components/PropertyPanel';
import ContextMenu from '@/diagram/components/ContextMenu';
import Tooltip from '@/diagram/components/Tooltip';
import WorkbenchLayout from '@/diagram/components/WorkbenchLayout';
import type { ContextMenuEvent, TooltipEvent } from '@/diagram/engine/interactions';

// ============================================================
// LAYOUT STYLED COMPONENTS
// ============================================================

const AppShell = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.bg.primary};
`;

const CenterColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const ToolbarRow = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.sm};
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: ${({ theme }) => theme.zIndex.toolbar};
`;

const MinimapWrapper = styled.div`
  position: absolute;
  bottom: 16px;
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
    <AppShell>
      {/* Left: Shape palette */}
      <Palette />

      {/* Center: Canvas + Toolbar + Minimap */}
      <CenterColumn>
        <ToolbarRow>
          <Toolbar />
        </ToolbarRow>

        <Canvas
          onContextMenu={handleContextMenu}
          onTooltipShow={handleTooltipShow}
          onTooltipHide={handleTooltipHide}
        />

        <MinimapWrapper>
          <Minimap />
        </MinimapWrapper>
      </CenterColumn>

      {/* Right: Property panel */}
      <PropertyPanel />

      {/* Floating overlays */}
      <ContextMenu event={contextMenuEvent} onClose={handleCloseContextMenu} />
      <Tooltip event={tooltipEvent} />
    </AppShell>
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
        />
      </DiagramProvider>
    </ThemeProvider>
  );
}
