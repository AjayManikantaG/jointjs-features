'use client';

import React, { useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useDiagram } from '@/diagram/context/DiagramProvider';

// ============================================================
// STYLED COMPONENTS — matches Palette (FloatingToolbarContainer)
// ============================================================

const ToolbarContainer = styled.div`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
  pointer-events: auto;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ToolGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 6px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};

  &:last-child {
    border-right: none;
    padding-right: 0;
  }

  &:first-child {
    padding-left: 0;
  }
`;

const ToolbarButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: ${({ theme, $active }) => ($active ? theme.colors.bg.canvas : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : 'inherit')};
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bg.canvas};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ZoomValue = styled.button`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  min-width: 42px;
  text-align: center;
  font-weight: 500;
  font-family: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 2px;
  border-radius: 4px;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.canvas};
  }
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const TooltipText = styled.span`
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: ${({ theme }) => theme.colors.bg.elevated};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  font-size: 11px;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 200;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);

  ${TooltipWrapper}:hover & {
    opacity: 1;
  }
`;

// ============================================================
// COMPONENT
// ============================================================

export default function TopToolbar() {
  const { graph, paper, selectedCells, undo, redo, copy, cut, paste, canUndo, canRedo, doubleClickMode, setDoubleClickMode, diagramType, commandManager } = useDiagram();
  const [zoomLevel, setZoomLevel] = React.useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export: download diagram as JSON ────────────────────
  const handleExport = useCallback(() => {
    if (!graph) return;

    const workflow = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      diagramType,
      viewport: paper ? {
        zoom: paper.scale().sx,
        pan: paper.translate(),
      } : null,
      graph: graph.toJSON(),
    };

    const jsonStr = JSON.stringify(workflow, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${diagramType.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [graph, paper, diagramType]);

  // ── Import: upload JSON and restore diagram ─────────────
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !graph) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);

        // Support both raw graph JSON and our wrapper format
        const graphData = json.graph || json;
        graph.fromJSON(graphData);

        // Restore viewport if present
        if (json.viewport && paper) {
          paper.scale(json.viewport.zoom || 1, json.viewport.zoom || 1);
          if (json.viewport.pan) {
            paper.translate(json.viewport.pan.tx || 0, json.viewport.pan.ty || 0);
          }
        }

        // Clear undo history since we loaded a new diagram
        commandManager.clear();
      } catch (err) {
        console.error('Failed to import workflow JSON:', err);
        alert('Invalid workflow JSON file. Please check the file format.');
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-imported
    e.target.value = '';
  }, [graph, paper, commandManager]);

  React.useEffect(() => {
    if (!paper) return;
    const updateZoom = () => setZoomLevel(Math.round(paper.scale().sx * 100));
    paper.on('scale', updateZoom);
    return () => { paper.off('scale', updateZoom); };
  }, [paper]);

  const zoomToCenter = (newScale: number) => {
    if (!paper) return;
    const clamped = Math.max(0.1, Math.min(3, newScale));
    const elRect = (paper.el as HTMLElement).getBoundingClientRect();
    const cx = elRect.width / 2;
    const cy = elRect.height / 2;
    const currentScale = paper.scale().sx;
    const currentTranslate = paper.translate();
    const factor = clamped / currentScale;
    const newTx = cx - factor * (cx - currentTranslate.tx);
    const newTy = cy - factor * (cy - currentTranslate.ty);
    paper.scale(clamped, clamped);
    paper.translate(newTx, newTy);
  };

  const toggleDoubleClickMode = () => {
    setDoubleClickMode(doubleClickMode === 'inline' ? 'configure' : 'inline');
  };

  return (
    <ToolbarContainer onClick={(e) => e.stopPropagation()}>
      {/* Double-Click Mode Toggle */}
      <ToolGroup>
        <TooltipWrapper>
          <ToolbarButton $active={doubleClickMode === 'inline'} onClick={toggleDoubleClickMode}>
            {doubleClickMode === 'inline' ? (
              /* Text cursor icon — inline editing mode */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 6H7m5-4v20M7 18h10"/>
                <path d="M12 2a2 2 0 0 1 2 2M12 2a2 2 0 0 0-2 2m2 16a2 2 0 0 1-2-2m2 2a2 2 0 0 0 2-2"/>
              </svg>
            ) : (
              /* Settings gear icon — config modal mode */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            )}
          </ToolbarButton>
          <TooltipText>{doubleClickMode === 'inline' ? 'Mode: Inline Edit' : 'Mode: Config Modal'}</TooltipText>
        </TooltipWrapper>
      </ToolGroup>

      {/* Clipboard Group */}
      <ToolGroup>
        <TooltipWrapper>
          <ToolbarButton disabled={selectedCells.length === 0} onClick={cut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
          </ToolbarButton>
          <TooltipText>Cut ⌘X</TooltipText>
        </TooltipWrapper>

        <TooltipWrapper>
          <ToolbarButton disabled={selectedCells.length === 0} onClick={copy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </ToolbarButton>
          <TooltipText>Copy ⌘C</TooltipText>
        </TooltipWrapper>

        <TooltipWrapper>
          <ToolbarButton onClick={paste}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </ToolbarButton>
          <TooltipText>Paste ⌘V</TooltipText>
        </TooltipWrapper>
      </ToolGroup>

      {/* Undo/Redo Group */}
      <ToolGroup>
        <TooltipWrapper>
          <ToolbarButton disabled={!canUndo} onClick={undo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
          </ToolbarButton>
          <TooltipText>Undo ⌘Z</TooltipText>
        </TooltipWrapper>

        <TooltipWrapper>
          <ToolbarButton disabled={!canRedo} onClick={redo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
            </svg>
          </ToolbarButton>
          <TooltipText>Redo ⌘⇧Z</TooltipText>
        </TooltipWrapper>
      </ToolGroup>

      {/* Zoom Group */}
      <ToolGroup>
        <TooltipWrapper>
          <ToolbarButton onClick={() => zoomToCenter(paper!.scale().sx - 0.1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </ToolbarButton>
          <TooltipText>Zoom Out</TooltipText>
        </TooltipWrapper>

        <ZoomValue onClick={() => zoomToCenter(1.0)}>
          {zoomLevel}%
        </ZoomValue>

        <TooltipWrapper>
          <ToolbarButton onClick={() => zoomToCenter(paper!.scale().sx + 0.1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </ToolbarButton>
          <TooltipText>Zoom In</TooltipText>
        </TooltipWrapper>
      </ToolGroup>

      {/* Import/Export Group */}
      <ToolGroup>
        <TooltipWrapper>
          <ToolbarButton onClick={handleExport}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </ToolbarButton>
          <TooltipText>Export JSON</TooltipText>
        </TooltipWrapper>

        <TooltipWrapper>
          <ToolbarButton onClick={handleImport}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </ToolbarButton>
          <TooltipText>Import JSON</TooltipText>
        </TooltipWrapper>
      </ToolGroup>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />
    </ToolbarContainer>
  );
}
