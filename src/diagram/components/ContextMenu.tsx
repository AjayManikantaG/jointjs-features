/**
 * ContextMenu.tsx
 *
 * Right-click context menu for diagram elements and blank canvas.
 *
 * Features:
 * - Positioned at cursor location
 * - Different options for elements vs blank area
 * - Glassmorphism dark styling
 * - Keyboard accessible
 * - Closes on click outside, escape, or action
 */
"use client";

import React, { useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import { dia, shapes } from "@joint/core";
import { useDiagram } from "../context/DiagramProvider";
import { getObstacleRouterConfig } from "../engine/obstacleRouter";
import type { ContextMenuEvent } from "../engine/interactions";

// ============================================================
// STYLED COMPONENTS
// ============================================================

const MenuOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: ${({ theme }) => theme.zIndex.contextMenu};
`;

const MenuContainer = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  min-width: 180px;
  background: ${({ theme }) => theme.glass.background};
  border: ${({ theme }) => theme.glass.border};
  backdrop-filter: ${({ theme }) => theme.glass.backdropFilter};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: 4px;
  z-index: ${({ theme }) => theme.zIndex.contextMenu + 1};
  animation: scaleIn 0.12s ease;
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  color: ${({ theme, $danger }) =>
    $danger ? theme.colors.accent.danger : theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  text-align: left;

  &:hover {
    background: ${({ theme, $danger }) =>
      $danger ? `${theme.colors.accent.danger}15` : theme.colors.bg.elevated};
    color: ${({ theme, $danger }) =>
      $danger ? theme.colors.accent.danger : theme.colors.text.primary};
  }
`;

const MenuIcon = styled.span`
  font-size: 14px;
  width: 20px;
  text-align: center;
`;

const MenuDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.subtle};
  margin: 4px 8px;
`;

const MenuShortcut = styled.span`
  margin-left: auto;
  font-size: ${({ theme }) => theme.typography.sizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

// ============================================================
// COMPONENT
// ============================================================

interface ContextMenuProps {
  event: ContextMenuEvent | null;
  onClose: () => void;
}

export default function ContextMenu({ event, onClose }: ContextMenuProps) {
  const {
    graph,
    commandManager,
    setSelectedCells,
    paper,
    copy,
    cut,
    paste,
    selectedCells,
  } = useDiagram();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!event) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [event, onClose]);

  const handleDuplicate = useCallback(() => {
    if (!event?.cell) return;
    const cell = event.cell;
    if (cell.isElement()) {
      const element = cell as dia.Element;
      const cloned = element.clone() as dia.Element;
      const pos = cloned.position();
      cloned.position(pos.x + 20, pos.y + 20);
      graph.addCell(cloned);
      setSelectedCells([cloned]);
    }
    onClose();
  }, [event, graph, setSelectedCells, onClose]);

  const handleDelete = useCallback(() => {
    if (!event?.cell) return;
    commandManager.startBatch("delete");
    event.cell.remove();
    commandManager.stopBatch();
    setSelectedCells([]);
    onClose();
  }, [event, commandManager, setSelectedCells, onClose]);

  const handleBringToFront = useCallback(() => {
    if (!event?.cell?.isElement()) return;
    event.cell.toFront();
    onClose();
  }, [event, onClose]);

  const handleSendToBack = useCallback(() => {
    if (!event?.cell?.isElement()) return;
    event.cell.toBack();
    onClose();
  }, [event, onClose]);

  const handleCopy = useCallback(() => {
    if (!event?.cell) return;
    // Set selection and copy the specific cell directly
    setSelectedCells([event.cell]);
    // Call copy directly on the cell — the clipboard manager's copy
    // is wrapped in DiagramProvider which uses selectedCells state.
    // Instead, we select the cell and trigger copy which will use the updated selection.
    // Since React state won't be set yet, we need a microtask delay.
    Promise.resolve().then(() => {
      copy();
      onClose();
    });
  }, [event, copy, setSelectedCells, onClose]);

  const handleCut = useCallback(() => {
    if (!event?.cell) return;
    setSelectedCells([event.cell]);
    Promise.resolve().then(() => {
      cut();
      onClose();
    });
  }, [event, cut, setSelectedCells, onClose]);

  const handlePaste = useCallback(() => {
    paste();
    onClose();
  }, [paste, onClose]);

  const handleAddStickyNote = useCallback(() => {
    if (!paper) return;
    const localPoint = paper.clientToLocalPoint(
      event?.position || { x: 200, y: 200 },
    );
    const colors = [
      "#FFE066",
      "#FF8AAE",
      "#6FEDD6",
      "#80CAFF",
      "#B49CFF",
      "#FFB86C",
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const sticky = new shapes.standard.Rectangle({
      position: { x: localPoint.x, y: localPoint.y },
      size: { width: 180, height: 140 },
      attrs: {
        body: { fill: color, stroke: "none", rx: 4, ry: 4 },
        label: {
          text: "Sticky Note",
          fill: "#0D0D0F",
          fontSize: 14,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          textWrap: { width: -20, height: -20, ellipsis: true },
        },
      },
    });
    graph.addCell(sticky);
    onClose();
  }, [graph, paper, event, onClose]);

  const handleAddRectangle = useCallback(() => {
    if (!paper) return;
    const localPoint = paper.clientToLocalPoint(
      event?.position || { x: 200, y: 200 },
    );

    const rect = new shapes.standard.Rectangle({
      position: { x: localPoint.x, y: localPoint.y },
      size: { width: 160, height: 80 },
      attrs: {
        body: {
          fill: "#232329",
          stroke: "#3A3A44",
          strokeWidth: 1.5,
          rx: 8,
          ry: 8,
        },
        label: {
          text: "New Node",
          fill: "#EDEDEF",
          fontSize: 13,
          fontFamily: "'Inter', sans-serif",
        },
      },
      ports: {
        groups: {
          in: {
            position: "left",
            attrs: {
              circle: {
                fill: "#232329",
                stroke: "#7B61FF",
                strokeWidth: 2,
                r: 6,
                magnet: true,
              },
            },
          },
          out: {
            position: "right",
            attrs: {
              circle: {
                fill: "#232329",
                stroke: "#7B61FF",
                strokeWidth: 2,
                r: 6,
                magnet: true,
              },
            },
          },
        },
        items: [
          { group: "in", id: "in1" },
          { group: "out", id: "out1" },
        ],
      },
    });
    graph.addCell(rect);
    onClose();
  }, [graph, paper, event, onClose]);

  // Connect two selected elements with a link
  const handleConnect = useCallback(() => {
    // Filter to only elements (not links)
    const elements = selectedCells.filter((c) =>
      c.isElement(),
    ) as dia.Element[];
    if (elements.length !== 2) return;

    const [a, b] = elements;
    // Determine direction: left-most element is the source
    const aPos = a.position();
    const bPos = b.position();
    const [source, target] = aPos.x <= bPos.x ? [a, b] : [b, a];

    commandManager.startBatch("connect");

    // Dynamically find output port on source and input port on target
    const sourcePorts = source.getPorts();
    const targetPorts = target.getPorts();
    const outPort = sourcePorts.find((p) => p.group === "out")?.id || "out1";
    const inPort = targetPorts.find((p) => p.group === "in")?.id || "in1";

    const link = new shapes.standard.Link({
      source: { id: source.id, port: outPort },
      target: { id: target.id, port: inPort },
      attrs: {
        line: {
          stroke: "#A262FF",
          strokeWidth: 2,
          targetMarker: {
            type: "path",
            d: "M 10 -5 0 0 10 5 Z",
            fill: "#A262FF",
          },
          strokeDasharray: "0",
        },
      },
      router: getObstacleRouterConfig(graph),
      connector: {
        name: "jumpover",
        args: { jump: "arc", radius: 8, size: 8 },
      },
    });

    graph.addCell(link);
    commandManager.stopBatch();
    onClose();
  }, [selectedCells, graph, commandManager, onClose]);

  const handleStraightRouting = useCallback(() => {
    if (!event?.cell?.isLink()) return;
    const link = event.cell as dia.Link;
    commandManager.startBatch("routing");
    link.set("router", { name: "normal" });
    link.set("connector", { name: "normal" });
    commandManager.stopBatch();
    onClose();
  }, [event, commandManager, onClose]);

  const handleOrthogonalRouting = useCallback(() => {
    if (!event?.cell?.isLink()) return;
    const link = event.cell as dia.Link;
    commandManager.startBatch("routing");
    link.set("router", { name: "manhattan" });
    link.set("connector", {
      name: "jumpover",
      args: { jump: "arc", radius: 8, size: 8 },
    });
    commandManager.stopBatch();
    onClose();
  }, [event, commandManager, onClose]);

  if (!event) return null;

  const hasCell = !!event.cell;
  // Check if exactly 2 elements are selected (for the Connect option)
  const selectedElements = selectedCells.filter((c) => c.isElement());
  const hasTwoElements = selectedElements.length === 2;

  return (
    <MenuOverlay onClick={onClose}>
      <MenuContainer
        ref={menuRef}
        $x={event.position.x}
        $y={event.position.y}
        onClick={(e) => e.stopPropagation()}
      >
        {hasCell ? (
          event.cell?.isLink() ? (
            <>
              <MenuItem onClick={handleOrthogonalRouting}>
                <MenuIcon>↱</MenuIcon> Orthogonal
              </MenuItem>
              <MenuItem onClick={handleStraightRouting}>
                <MenuIcon>╱</MenuIcon> Straight
              </MenuItem>
              <MenuDivider />
              <MenuItem onClick={handleDelete} $danger>
                <MenuIcon>🗑</MenuIcon> Delete Link
                <MenuShortcut>⌫</MenuShortcut>
              </MenuItem>
            </>
          ) : (
            <>
              {hasTwoElements && (
                <>
                  <MenuItem onClick={handleConnect}>
                    <MenuIcon>🔗</MenuIcon> Connect
                  </MenuItem>
                  <MenuDivider />
                </>
              )}
              <MenuItem onClick={handleCopy}>
                <MenuIcon>📋</MenuIcon> Copy
                <MenuShortcut>⌘C</MenuShortcut>
              </MenuItem>
              <MenuItem onClick={handleCut}>
                <MenuIcon>✂️</MenuIcon> Cut
                <MenuShortcut>⌘X</MenuShortcut>
              </MenuItem>
              <MenuItem onClick={handlePaste}>
                <MenuIcon>📄</MenuIcon> Paste
                <MenuShortcut>⌘V</MenuShortcut>
              </MenuItem>
              <MenuDivider />
              <MenuItem onClick={handleDuplicate}>
                <MenuIcon>⧉</MenuIcon> Duplicate
                <MenuShortcut>⌘D</MenuShortcut>
              </MenuItem>
              <MenuItem onClick={handleBringToFront}>
                <MenuIcon>⬆</MenuIcon> Bring to Front
              </MenuItem>
              <MenuItem onClick={handleSendToBack}>
                <MenuIcon>⬇</MenuIcon> Send to Back
              </MenuItem>
              <MenuDivider />
              <MenuItem onClick={handleDelete} $danger>
                <MenuIcon>🗑</MenuIcon> Delete
                <MenuShortcut>⌫</MenuShortcut>
              </MenuItem>
            </>
          )
        ) : (
          <>
            <MenuItem onClick={handlePaste}>
              <MenuIcon>📄</MenuIcon> Paste
              <MenuShortcut>⌘V</MenuShortcut>
            </MenuItem>
            <MenuDivider />
            <MenuItem onClick={handleAddRectangle}>
              <MenuIcon>▬</MenuIcon> Add Rectangle
            </MenuItem>
            <MenuItem onClick={handleAddStickyNote}>
              <MenuIcon>📝</MenuIcon> Add Sticky Note
            </MenuItem>
          </>
        )}
      </MenuContainer>
    </MenuOverlay>
  );
}
