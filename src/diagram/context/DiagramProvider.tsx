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
  // Create graph and command manager once
  const graphRef = useRef<dia.Graph>(createGraph());
  const cmdRef = useRef<UndoRedoManager>(createCommandManager(graphRef.current));

  const [paper, setPaperState] = useState<dia.Paper | null>(null);
  const [selectedCells, setSelectedCells] = useState<dia.Cell[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Subscribe to command manager state changes
  useEffect(() => {
    const unsubscribe = cmdRef.current.subscribe(() => {
      setCanUndo(cmdRef.current.canUndo());
      setCanRedo(cmdRef.current.canRedo());
    });
    return unsubscribe;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cmdRef.current.destroy();
      graphRef.current.clear();
    };
  }, []);

  const setPaper = useCallback((p: dia.Paper) => {
    setPaperState(p);
  }, []);

  const undo = useCallback(() => {
    cmdRef.current.undo();
  }, []);

  const redo = useCallback(() => {
    cmdRef.current.redo();
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedCells.length === 0) return;
    const graph = graphRef.current;
    graph.startBatch('delete');
    cmdRef.current.startBatch('delete');
    selectedCells.forEach((cell) => cell.remove());
    cmdRef.current.stopBatch();
    graph.stopBatch('delete');
    setSelectedCells([]);
  }, [selectedCells]);

  const selectAll = useCallback(() => {
    const elements = graphRef.current.getElements();
    setSelectedCells(elements);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCells([]);
  }, []);

  const value: DiagramContextValue = {
    graph: graphRef.current,
    paper,
    commandManager: cmdRef.current,
    selectedCells,
    setPaper,
    setSelectedCells,
    undo,
    redo,
    deleteSelected,
    selectAll,
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
