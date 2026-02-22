'use client';

import React from 'react';
import styled from 'styled-components';
import { useDiagram } from '../context/DiagramProvider';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const FloatingToolbarContainer = styled.div`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  padding: 8px 4px;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ToolButton = styled.button<{ $active?: boolean }>`
  width: 36px;
  height: 36px;
  background: ${({ theme, $active }) => ($active ? theme.colors.bg.canvas : 'transparent')};
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : 'inherit')};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.canvas};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.colors.border.subtle};
  margin: 4px 8px;
`;

const DraggableShape = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: inherit;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.canvas};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  
  &:active {
    cursor: grabbing;
  }

  svg {
    width: 20px;
    height: 20px;
    pointer-events: none;
  }
`;

// ============================================================
// COMPONENT
// ============================================================

export default function Palette() {
  const { paper, diagramType, interactionMode, setInteractionMode } = useDiagram();

  const onDragStart = (e: React.DragEvent, shapeType: string, label: string) => {
    e.dataTransfer.setData(
      'application/diagram-node',
      JSON.stringify({ type: shapeType, label })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <FloatingToolbarContainer>
      {/* Pointer tool */}
      <ToolButton 
        $active={interactionMode === 'pointer'} 
        title="Select"
        onClick={() => setInteractionMode('pointer')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
      </ToolButton>

      {/* Hand tool */}
      <ToolButton 
        $active={interactionMode === 'pan'} 
        title="Pan"
        onClick={() => setInteractionMode('pan')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0a2 2 0 0 0-2 2v0a2 2 0 0 0-2 2v5"/><path d="M14 11V6.5a2.5 2.5 0 0 0-5 0v7"/><path d="M9 13v-3a2 2 0 0 0-4 0v9a6 6 0 0 0 6-6h2a6 6 0 0 0 6-6v-5"/></svg>
      </ToolButton>

      {/* Comment tool */}
      <ToolButton title="Comment">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      </ToolButton>

      <Divider />

      {/* Draggable Shapes */}
      
      {/* Task / Box */}
      <DraggableShape
        title="Task"
        draggable
        onDragStart={(e) => onDragStart(e, 'task', 'Task')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
        </svg>
      </DraggableShape>

      {/* Event / Circle */}
      <DraggableShape
        title="Event"
        draggable
        onDragStart={(e) => onDragStart(e, 'startEvent', 'Event')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
      </DraggableShape>

      {/* Gateway / Diamond */}
      <DraggableShape
        title="Gateway"
        draggable
        onDragStart={(e) => onDragStart(e, 'exclusiveGateway', 'Gateway')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 3 21 12 12 21 3 12 12 3" />
        </svg>
      </DraggableShape>

      {/* Data Object */}
      <DraggableShape
        title="Data Object"
        draggable
        onDragStart={(e) => onDragStart(e, 'dataObject', 'Data')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </DraggableShape>

      <Divider />

      {/* Fit Content Action */}
      <ToolButton 
        title="Fit Content"
        onClick={() => paper?.scaleContentToFit({ padding: 60, maxScale: 1.5, minScale: 0.3 })}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 12h10M12 7v10"/></svg>
      </ToolButton>

      <Divider />

      <ToolButton title="More Shapes">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </ToolButton>

    </FloatingToolbarContainer>
  );
}
