/**
 * obstacleRouter.ts
 * 
 * CORE REQUIREMENT: Obstacle-aware Manhattan routing engine.
 * 
 * How it works:
 * 1. Uses @joint/core's built-in `routers.manhattan` as the base
 * 2. Dynamically filters obstacles per-link:
 *    - Source and target elements are NEVER treated as obstacles
 *    - All other (unconnected) elements ARE obstacles
 * 3. Recalculates routes automatically when elements move, resize, rotate,
 *    or when links are reconnected
 * 
 * Architecture:
 * - `getObstacleRouterConfig(graph, sourceId?, targetId?)` — returns router config for a single link
 * - `applyRoutingListeners(paper, graph)` — attaches event listeners for dynamic recalculation
 * - `rerouteAllLinks(graph)` — forces all links to recalculate their routes
 */
import { dia } from '@joint/core';

/** Default router options */
const ROUTER_DEFAULTS = {
    /** Grid step for pathfinding (should match paper gridSize) */
    step: 20,
    /** Padding around obstacles */
    padding: 20,
    /** Max iterations before fallback to orthogonal */
    maximumLoops: 5000,
    /** Directions links can start/end from */
    startDirections: ['top', 'right', 'bottom', 'left'] as string[],
    endDirections: ['top', 'right', 'bottom', 'left'] as string[],
    /** Don't treat source/target as obstacles */
    excludeEnds: ['source', 'target'] as ('source' | 'target')[],
    /** Prefer orthogonal lines where possible */
    perpendicular: true,
};

/**
 * Returns a manhattan router configuration object.
 * This is used as the `router` property on links.
 * 
 * @param graph - The diagram graph (used for obstacle lookup if needed)
 * @param overrides - Optional overrides for router defaults
 */
export function getObstacleRouterConfig(
    graph?: dia.Graph,
    overrides: Partial<typeof ROUTER_DEFAULTS> = {},
): { name: 'manhattan'; args: Record<string, unknown> } {
    return {
        name: 'manhattan',
        args: {
            ...ROUTER_DEFAULTS,
            ...overrides,
            // Exclude source and target from obstacles
            excludeEnds: overrides.excludeEnds ?? ROUTER_DEFAULTS.excludeEnds,
        },
    };
}

/**
 * Force all links in the graph to recalculate their routes.
 * Called after element move/resize/rotate to update obstacle avoidance.
 */
export function rerouteAllLinks(paper: dia.Paper, graph: dia.Graph): void {
    const links = graph.getLinks();
    if (links.length === 0) return;

    // We can just ask the paper to update the connection for each link view
    // without polluting the undo/redo stack or the JSON model with dummy router assignments.
    links.forEach((link) => {
        const view = paper.findViewByModel(link) as dia.LinkView;
        if (view) {
            view.requestConnectionUpdate();
        }
    });
}

/**
 * Debounce helper — delays function execution until after a quiet period.
 * Used to prevent excessive rerouting during rapid drag operations.
 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
    let timer: ReturnType<typeof setTimeout>;
    return ((...args: unknown[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    }) as unknown as T;
}

/**
 * Attaches event listeners to the paper/graph for dynamic route recalculation.
 * 
 * Listens to:
 * - element:move — when an element is dragged
 * - element:resize — when an element is resized
 * - element:rotate — when an element is rotated
 * - link:connect — when a link is connected/reconnected
 * - add/remove — when cells are added or removed
 * 
 * Returns a cleanup function to remove all listeners.
 */
export function applyRoutingListeners(
    paper: dia.Paper,
    graph: dia.Graph,
): () => void {
    // Debounced reroute to handle rapid dragging
    const debouncedReroute = debounce(() => rerouteAllLinks(paper, graph), 50);

    // Immediate reroute for discrete actions
    const immediateReroute = () => rerouteAllLinks(paper, graph);

    // Listen to element position changes (during and after drag)
    graph.on('change:position', debouncedReroute);

    // Listen to element size changes
    graph.on('change:size', immediateReroute);

    // Listen to element rotation changes
    graph.on('change:angle', immediateReroute);

    // Listen to cell addition/removal
    graph.on('add', immediateReroute);
    graph.on('remove', immediateReroute);

    // Listen to link reconnection via paper events
    paper.on('link:connect', immediateReroute);
    paper.on('link:disconnect', immediateReroute);

    // Return cleanup function
    return () => {
        graph.off('change:position', debouncedReroute);
        graph.off('change:size', immediateReroute);
        graph.off('change:angle', immediateReroute);
        graph.off('add', immediateReroute);
        graph.off('remove', immediateReroute);
        paper.off('link:connect', immediateReroute);
        paper.off('link:disconnect', immediateReroute);
    };
}
