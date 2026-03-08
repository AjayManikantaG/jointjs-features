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
"use client";

import React, { useState, useCallback } from "react";
import { dia } from "@joint/core";
import styled, { ThemeProvider } from "styled-components";
import { theme } from "@/styles/theme";
import { GlobalStyles } from "@/styles/GlobalStyles";
import { DiagramProvider, useDiagram } from "@/diagram/context/DiagramProvider";
import Canvas from "@/diagram/components/Canvas";
import Palette from "@/diagram/components/Palette";
import ContextMenu from "@/diagram/components/ContextMenu";
import Tooltip from "@/diagram/components/Tooltip";
import WorkbenchLayout from "@/diagram/components/WorkbenchLayout";
import ConfigModal from "@/diagram/components/ConfigModal";
import Minimap from "@/diagram/components/Minimap";
import TopToolbar from "@/diagram/components/TopToolbar";
import LinkContextMenu from "@/diagram/components/LinkContextMenu";
import type {
  ContextMenuEvent,
  TooltipEvent,
  LinkContextMenuEvent,
} from "@/diagram/engine/interactions";

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
  const [contextMenuEvent, setContextMenuEvent] =
    useState<ContextMenuEvent | null>(null);
  const [linkContextMenuEvent, setLinkContextMenuEvent] =
    useState<LinkContextMenuEvent | null>(null);
  const [tooltipEvent, setTooltipEvent] = useState<TooltipEvent | null>(null);
  const [configuringCell, setConfiguringCell] = useState<dia.Cell | null>(null);

  const handleContextMenu = useCallback((event: ContextMenuEvent) => {
    setContextMenuEvent(event);
    setLinkContextMenuEvent(null); // Close link menu if open
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuEvent(null);
  }, []);

  const handleLinkContextMenu = useCallback((event: LinkContextMenuEvent) => {
    setLinkContextMenuEvent(event);
    setContextMenuEvent(null); // Close regular menu if open
  }, []);

  const handleCloseLinkContextMenu = useCallback(() => {
    setLinkContextMenuEvent(null);
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
        onLinkContextMenu={handleLinkContextMenu}
        onTooltipShow={handleTooltipShow}
        onTooltipHide={handleTooltipHide}
        onConfigure={setConfiguringCell}
      />

      <TopToolbar />

      <VerticalToolbarWrapper>
        <Palette />
      </VerticalToolbarWrapper>

      {/* Floating overlays */}
      <ContextMenu event={contextMenuEvent} onClose={handleCloseContextMenu} />
      <LinkContextMenu
        event={linkContextMenuEvent}
        onClose={handleCloseLinkContextMenu}
      />
      <Tooltip event={tooltipEvent} />
      {configuringCell && (
        <ConfigModal
          cell={configuringCell}
          onClose={() => setConfiguringCell(null)}
        />
      )}
    </CanvasContainer>
  );

  const repositoryContent = (
    <div style={{ flex: 1, padding: "24px", color: "#888" }}>
      <h2>Repository Explorer</h2>
      <p>This is a placeholder for the repository file browser.</p>
    </div>
  );

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles />
      <DiagramProvider>
        <DiagramAppContent
          designerContent={designerContent}
          repositoryContent={repositoryContent}
          setConfiguringCell={setConfiguringCell}
          configuringCell={configuringCell}
          contextMenuEvent={contextMenuEvent}
          handleCloseContextMenu={handleCloseContextMenu}
          tooltipEvent={tooltipEvent}
          handleTooltipShow={handleTooltipShow}
          handleTooltipHide={handleTooltipHide}
          handleContextMenu={handleContextMenu}
        />
      </DiagramProvider>
    </ThemeProvider>
  );
}

// Sub-component to access diagram context
function DiagramAppContent({
  designerContent,
  repositoryContent,
  setConfiguringCell,
  configuringCell,
  contextMenuEvent,
  handleCloseContextMenu,
  tooltipEvent,
  handleTooltipShow,
  handleTooltipHide,
}: any) {
  const { selectedCells } = useDiagram();

  return (
    <WorkbenchLayout
      designerContent={designerContent}
      repositoryContent={repositoryContent}
      minimapContent={<Minimap />}
    />
  );
}
