/**
 * LinkContextMenu.tsx
 *
 * Right-click context menu shown specifically for links (connectors).
 * Displays link-specific actions separate from the element/canvas menu.
 */
"use client";

import React, { useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import { dia } from "@joint/core";
import { useDiagram } from "../context/DiagramProvider";
import type { LinkContextMenuEvent } from "../engine/interactions";

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
  min-width: 200px;
  background: ${({ theme }) => theme.glass.background};
  border: ${({ theme }) => theme.glass.border};
  backdrop-filter: ${({ theme }) => theme.glass.backdropFilter};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: 4px;
  z-index: ${({ theme }) => theme.zIndex.contextMenu + 1};
  animation: scaleIn 0.12s ease;
`;

const MenuHeader = styled.div`
  padding: 6px 12px 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  user-select: none;
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

interface LinkContextMenuProps {
  event: LinkContextMenuEvent | null;
  onClose: () => void;
}

export default function LinkContextMenu({
  event,
  onClose,
}: LinkContextMenuProps) {
  const { commandManager, setSelectedCells } = useDiagram();
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

  const handleConnectModule = useCallback(() => {
    // Placeholder: connect module action
    console.log("Connect Module clicked for link:", event?.link.id);
    onClose();
  }, [event, onClose]);

  const handleStopLink = useCallback(() => {
    // Placeholder: stop link action
    console.log("Stop Link clicked for link:", event?.link.id);
    onClose();
  }, [event, onClose]);

  const handleStraightRouting = useCallback(() => {
    if (!event) return;
    commandManager.startBatch("routing");
    event.link.set("router", { name: "normal" });
    event.link.set("connector", { name: "normal" });
    commandManager.stopBatch();
    onClose();
  }, [event, commandManager, onClose]);

  const handleOrthogonalRouting = useCallback(() => {
    if (!event) return;
    commandManager.startBatch("routing");
    event.link.set("router", { name: "manhattan" });
    event.link.set("connector", {
      name: "jumpover",
      args: { jump: "arc", radius: 8, size: 8 },
    });
    commandManager.stopBatch();
    onClose();
  }, [event, commandManager, onClose]);

  const handleReverseDirection = useCallback(() => {
    if (!event) return;
    const source = event.link.source();
    const target = event.link.target();
    commandManager.startBatch("reverse-link");
    event.link.source(target);
    event.link.target(source);
    commandManager.stopBatch();
    onClose();
  }, [event, commandManager, onClose]);

  const handleDeleteLink = useCallback(() => {
    if (!event) return;
    commandManager.startBatch("delete");
    event.link.remove();
    commandManager.stopBatch();
    setSelectedCells([]);
    onClose();
  }, [event, commandManager, setSelectedCells, onClose]);

  if (!event) return null;

  return (
    <MenuOverlay onClick={onClose}>
      <MenuContainer
        ref={menuRef}
        $x={event.position.x}
        $y={event.position.y}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuHeader>Link</MenuHeader>

        <MenuItem onClick={handleConnectModule}>
          <MenuIcon>🔗</MenuIcon> Connect Module
        </MenuItem>
        <MenuItem onClick={handleStopLink}>
          <MenuIcon>⏹</MenuIcon> Stop Link
        </MenuItem>

        <MenuDivider />

        <MenuItem onClick={handleOrthogonalRouting}>
          <MenuIcon>↱</MenuIcon> Orthogonal Routing
        </MenuItem>
        <MenuItem onClick={handleStraightRouting}>
          <MenuIcon>╱</MenuIcon> Straight Routing
        </MenuItem>

        <MenuDivider />

        <MenuItem onClick={handleReverseDirection}>
          <MenuIcon>🔄</MenuIcon> Reverse Direction
        </MenuItem>

        <MenuDivider />

        <MenuItem onClick={handleDeleteLink} $danger>
          <MenuIcon>🗑</MenuIcon> Delete Link
          <MenuShortcut>⌫</MenuShortcut>
        </MenuItem>
      </MenuContainer>
    </MenuOverlay>
  );
}
