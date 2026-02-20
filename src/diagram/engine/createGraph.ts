/**
 * createGraph.ts
 * 
 * Factory function for creating a dia.Graph instance.
 * The graph is the data model holding all cells (elements + links).
 * 
 * Why a factory?
 * - Centralizes default configuration
 * - Easy to swap or extend for testing
 * - Decouples graph creation from React components
 */
import { dia, shapes } from '@joint/core';

/** Options for graph creation */
export interface CreateGraphOptions {
    /** Custom cell namespace (defaults to shapes) */
    cellNamespace?: Record<string, unknown>;
}

/**
 * Creates and returns a new dia.Graph instance with sensible defaults.
 * All standard shapes are registered in the cell namespace.
 */
export function createGraph(options: CreateGraphOptions = {}): dia.Graph {
    const { cellNamespace = shapes } = options;

    const graph = new dia.Graph({}, { cellNamespace });

    return graph;
}
