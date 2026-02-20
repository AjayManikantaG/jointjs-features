/**
 * DiagramProvider.tsx
 * 
 * Central React context for the diagramming application.
 * 
 * Provides:
 * - graph: dia.Graph instance (the data model)
 * - paper: dia.Paper instance (the view/renderer) — set after Canvas mounts
 * - commandManager: UndoRedoManager for undo/redo
 * - selectedCells: currently selected cells
 * - actions: undo, redo, deleteSelected, selectAll, clearSelection, setPaper, setSelectedCells
 * 
 * Lifecycle:
 * 1. On mount: creates graph + command manager
 * 2. Canvas component calls setPaper() after creating the paper
 * 3. On unmount: destroys everything
 */
'use client';

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { dia } from '@joint/core';
import { createGraph } from '../engine/createGraph';
import { UndoRedoManager, createCommandManager } from '../engine/commandManager';
import { ClipboardManager } from '../engine/clipboard';

export type DiagramType = 'BPMN' | 'Business Object' | 'Organization' | 'System' | 'Technical Workflow';

// ============================================================
// CONTEXT TYPES
// ============================================================

interface DiagramContextValue {
  /** The data model holding all cells */
  graph: dia.Graph;
  /** The SVG paper renderer (null until Canvas mounts) */
  paper: dia.Paper | null;
  /** Undo/redo history manager */
  commandManager: UndoRedoManager;
  /** Currently selected cells */
  selectedCells: dia.Cell[];
  /** The current diagram type being modeled */
  diagramType: DiagramType;
  /** Set the active diagram type */
  setDiagramType: (type: DiagramType) => void;
  /** Set the paper instance (called by Canvas after mount) */
  setPaper: (paper: dia.Paper) => void;
  /** Update the selected cells */
  setSelectedCells: (cells: dia.Cell[]) => void;
  /** Undo the last action */
  undo: () => void;
  /** Redo the last undone action */
  redo: () => void;
  /** Delete currently selected cells */
  deleteSelected: () => void;
  /** Select all elements in the graph */
  selectAll: () => void;
  /** Copy selected cells */
  copy: () => void;
  /** Paste cells from clipboard */
  paste: () => void;
  /** Clear the selection */
  clearSelection: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
}

// ============================================================
// CONTEXT
// ============================================================

const DiagramContext = createContext<DiagramContextValue | null>(null);

/**
 * Hook to access the diagram context.
 * Must be used within a <DiagramProvider>.
 */
export function useDiagram(): DiagramContextValue {
  const ctx = useContext(DiagramContext);
  if (!ctx) {
    throw new Error('useDiagram must be used within a <DiagramProvider>');
  }
  return ctx;
}

// ============================================================
// PROVIDER
// ============================================================

interface DiagramProviderProps {
  children: React.ReactNode;
}

export function DiagramProvider({ children }: DiagramProviderProps) {
  // Use state with lazy initializer so they survive Strict Mode double-invocations without being recreated/cleared unexpectedly.
  const [graph] = useState(() => createGraph());
  const [cmdManager] = useState(() => createCommandManager(graph));
  const [clipboardManager] = useState(() => new ClipboardManager(graph));

  const [paper, setPaperState] = useState<dia.Paper | null>(null);
  const [selectedCells, setSelectedCells] = useState<dia.Cell[]>([]);
  const [diagramType, setDiagramType] = useState<DiagramType>('BPMN');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Subscribe to command manager state changes and manage listener lifecycle
  useEffect(() => {
    // Re-attach listeners in case Strict Mode unmounted and detached them
    cmdManager.attachListeners();
    
    // Set initial state
    setCanUndo(cmdManager.canUndo());
    setCanRedo(cmdManager.canRedo());

    const unsubscribe = cmdManager.subscribe(() => {
      setCanUndo(cmdManager.canUndo());
      setCanRedo(cmdManager.canRedo());
    });
    
    return () => {
      cmdManager.detachListeners();
      unsubscribe();
    };
  }, [cmdManager]);

  const setPaper = useCallback((p: dia.Paper) => {
    setPaperState(p);
  }, []);

  const undo = useCallback(() => {
    cmdManager.undo();
  }, [cmdManager]);

  const redo = useCallback(() => {
    cmdManager.redo();
  }, [cmdManager]);

  const deleteSelected = useCallback(() => {
    if (selectedCells.length === 0) return;
    
    graph.startBatch('delete');
    cmdManager.startBatch('delete');

    selectedCells.forEach((cell) => {
      // Auto-Close Gaps logic (only for elements, not links)
      if (cell.isElement()) {
        const incoming = graph.getConnectedLinks(cell, { inbound: true });
        const outgoing = graph.getConnectedLinks(cell, { outbound: true });
        
        // If exactly 1 incoming and 1 outgoing, wire them together
        if (incoming.length === 1 && outgoing.length === 1) {
          const inLink = incoming[0];
          const outLink = outgoing[0];
          
          const source = inLink.source();
          const target = outLink.target();
          
          // Connect only if they are valid elements/ports (not pointing to nothing)
          if (source.id && target.id) {
            const newLink = inLink.clone();
            newLink.set('source', source);
            newLink.set('target', target);
            graph.addCell(newLink);
          }
        }
      }

      // Remove the cell
      cell.remove();
    });

    cmdManager.stopBatch();
    graph.stopBatch('delete');
    setSelectedCells([]);
  }, [selectedCells, graph, cmdManager]);

  const selectAll = useCallback(() => {
    const elements = graph.getElements();
    setSelectedCells(elements);
  }, [graph]);

  const copy = useCallback(() => {
    if (selectedCells.length > 0) {
      clipboardManager.copy(selectedCells);
    }
  }, [clipboardManager, selectedCells]);

  const paste = useCallback(() => {
    const pastedCells = clipboardManager.paste();
    if (pastedCells.length > 0) {
      setSelectedCells(pastedCells);
    }
  }, [clipboardManager]);

  const clearSelection = useCallback(() => {
    setSelectedCells([]);
  }, []);

  const value: DiagramContextValue = {
    graph,
    paper,
    commandManager: cmdManager,
    selectedCells,
    diagramType,
    setDiagramType,
    setPaper,
    setSelectedCells,
    undo,
    redo,
    deleteSelected,
    selectAll,
    copy,
    paste,
    clearSelection,
    canUndo,
    canRedo,
  };

  return (
    <DiagramContext.Provider value={value}>
      {children}
    </DiagramContext.Provider>
  );
}
