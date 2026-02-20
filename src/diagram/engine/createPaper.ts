/**
 * createPaper.ts
 * 
 * Factory function for creating a dia.Paper instance.
 * Paper is the view layer that renders the graph's cells as SVG.
 * 
 * Key features:
 * - Async rendering for performance with large graphs
 * - Grid snapping enabled
 * - Interactive elements with magnet connections
 * - Default link styling and router configuration
 */
import { dia, shapes } from '@joint/core';
import { getObstacleRouterConfig } from './obstacleRouter';

/** Options for paper creation */
export interface CreatePaperOptions {
    /** The HTML element to render the paper into */
    el: HTMLElement;
    /** The graph model to render */
    graph: dia.Graph;
    /** Paper width (default: container width or 3000) */
    width?: number;
    /** Paper height (default: container height or 3000) */
    height?: number;
    /** Grid size in pixels (default: 20) */
    gridSize?: number;
    /** Enable async rendering (default: true) */
    async?: boolean;
    /** Background color (default: transparent) */
    background?: { color: string };
}

/**
 * Creates a dia.Paper with production-ready defaults.
 * Async rendering is enabled for smooth performance with many elements.
 */
export function createPaper(options: CreatePaperOptions): dia.Paper {
    const {
        el,
        graph,
        width = 4000,
        height = 4000,
        gridSize = 20,
        async: asyncRendering = true,
        background = { color: 'transparent' },
    } = options;

    const paper = new dia.Paper({
        el,
        model: graph,
        width,
        height,
        gridSize,
        async: asyncRendering,
        background,
        cellViewNamespace: shapes,

        // Snap elements to grid on move
        snapLabels: true,

        // Allow link creation from magnets (ports)
        linkPinning: false,
        magnetThreshold: 'onleave',

        // Default link appearance
        defaultLink: () =>
            new shapes.standard.Link({
                attrs: {
                    line: {
                        stroke: '#4A4A56',
                        strokeWidth: 2,
                        targetMarker: {
                            type: 'path',
                            d: 'M 10 -5 0 0 10 5 z',
                            fill: '#4A4A56',
                        },
                    },
                },
                // Apply obstacle-aware routing by default
                router: getObstacleRouterConfig(graph),
                connector: { name: 'rounded', args: { radius: 8 } },
            }),

        // Validate new connections
        validateConnection: (
            cellViewS: dia.CellView,
            _magnetS: SVGElement | null,
            cellViewT: dia.CellView,
            _magnetT: SVGElement | null,
        ) => {
            // Prevent self-connections
            return cellViewS !== cellViewT;
        },

        // Make elements interactive
        interactive: {
            linkMove: true,
            labelMove: true,
            elementMove: true,
        },

        // Frozen initially — unfreeze after setup
        frozen: true,
    });

    return paper;
}
