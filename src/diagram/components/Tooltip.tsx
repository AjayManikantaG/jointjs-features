/**
 * Tooltip.tsx
 * 
 * Floating tooltip component that appears on element hover.
 * Positioned near the cursor, auto-adjusts to stay in viewport.
 */
'use client';

import React from 'react';
import styled from 'styled-components';
import type { TooltipEvent } from '../engine/interactions';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const TooltipContainer = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${({ $x }) => $x + 12}px;
  top: ${({ $y }) => $y - 32}px;
  padding: 4px 10px;
  background: ${({ theme }) => theme.colors.bg.elevated};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  pointer-events: none;
  z-index: ${({ theme }) => theme.zIndex.tooltip};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  white-space: nowrap;
  animation: fadeIn 0.15s ease;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// ============================================================
// COMPONENT
// ============================================================

interface TooltipProps {
  event: TooltipEvent | null;
}

export default function Tooltip({ event }: TooltipProps) {
  if (!event) return null;

  return (
    <TooltipContainer $x={event.position.x} $y={event.position.y}>
      {event.content}
    </TooltipContainer>
  );
}
