/**
 * linkUtils.ts
 *
 * Shared link utilities for the diagram engine.
 * Centralises link styling, closest-link detection, and link-splitting
 * so every consumer (createPaper, Canvas palette-drop, setupDropOnLink)
 * stays DRY and portable.
 */
import { dia, shapes } from '@joint/core';

// ============================================================
// DEFAULT LINK CONFIGURATION
// ============================================================

/** Default stroke colour for programmatically-created links */
const LINK_STROKE = '#A262FF';

/** Default link style attributes (line appearance + arrow marker) */
export const DEFAULT_LINK_ATTRS = {
    line: {
        stroke: LINK_STROKE,
        strokeWidth: 2,
        targetMarker: {
            type: 'path',
            d: 'M 10 -5 0 0 10 5 Z',
            fill: LINK_STROKE,
        },
        strokeDasharray: '0',
    },
} as const;

/** Default router applied to new links */
export const DEFAULT_LINK_ROUTER = { name: 'manhattan' } as const;

/** Default connector applied to new links */
export const DEFAULT_LINK_CONNECTOR = {
    name: 'jumpover',
    args: { jump: 'arc', radius: 8, size: 8 },
} as const;

// ============================================================
// FIND CLOSEST LINK
// ============================================================

/** Distance threshold (px) for snapping to a link */
const SNAP_THRESHOLD = 40;

/**
 * Returns the link whose rendered path is closest to `point`,
 * provided the distance is within `threshold` px.
 *
 * @param paper   The dia.Paper (needed to look up LinkViews)
 * @param graph   The dia.Graph (source of all links)
 * @param point   The reference point (usually element centre)
 * @param threshold  Maximum snap distance in local coords (default 40)
 * @returns The closest link, or `null` if none within threshold
 */
export function findClosestLink(
    paper: dia.Paper,
    graph: dia.Graph,
    point: { x: number; y: number },
    threshold = SNAP_THRESHOLD,
): dia.Link | null {
    let closest: dia.Link | null = null;
    let minDistance = Infinity;

    for (const link of graph.getLinks()) {
        const linkView = paper.findViewByModel(link) as dia.LinkView | null;
        if (!linkView) continue;

        try {
            const cp = linkView.getClosestPoint(point);
            if (!cp) continue;
            const dx = point.x - cp.x;
            const dy = point.y - cp.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < threshold && distance < minDistance) {
                minDistance = distance;
                closest = link;
            }
        } catch {
            // Link may not be rendered yet — skip silently
        }
    }

    return closest;
}

// ============================================================
// SPLIT LINK WITH ELEMENT
// ============================================================

/**
 * Splits `targetLink` by inserting `element` in the middle.
 * Removes the original link and creates two new links:
 *   originalSource → element.inPort
 *   element.outPort → originalTarget
 *
 * The entire operation is wrapped in a graph batch so it can be
 * undone/redone as a single step.
 *
 * @param graph       The dia.Graph
 * @param targetLink  The link to split
 * @param element     The element to insert
 */
export function splitLinkWithElement(
    graph: dia.Graph,
    targetLink: dia.Link,
    element: dia.Element,
): void {
    const source = targetLink.source();
    const target = targetLink.target();

    // Resolve ports dynamically
    const ports = element.getPorts();
    const inPortId = ports.find((p) => p.group === 'in')?.id || 'in1';
    const outPortId = ports.find((p) => p.group === 'out')?.id || 'out1';

    // Inherit router/connector from the original link when available
    const router = targetLink.get('router') || DEFAULT_LINK_ROUTER;
    const connector = targetLink.get('connector') || DEFAULT_LINK_CONNECTOR;

    const linkProps = (
        src: dia.Link.EndJSON,
        tgt: dia.Link.EndJSON,
    ) => ({
        source: src,
        target: tgt,
        attrs: DEFAULT_LINK_ATTRS,
        router,
        connector,
    });

    const newLink1 = new shapes.standard.Link(
        linkProps(source, { id: element.id as string, port: inPortId }),
    );
    const newLink2 = new shapes.standard.Link(
        linkProps({ id: element.id as string, port: outPortId }, target),
    );

    graph.startBatch('auto-insert-link');
    targetLink.remove();
    graph.addCells([newLink1, newLink2]);
    graph.stopBatch('auto-insert-link');
}
