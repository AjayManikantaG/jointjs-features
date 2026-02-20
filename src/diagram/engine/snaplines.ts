/**
 * snaplines.ts
 * 
 * Implements magnetic alignment guides (snaplines) during element drag.
 * Emulates the commercial JointJS+ Snaplines plugin.
 */
import { dia, g } from '@joint/core';

const SNAP_TOLERANCE = 10;
const SNAPLINE_COLOR = '#7B61FF';
const SNAPLINE_STYLE = 'dashed';

interface SnaplineNode {
    line: SVGLineElement;
    axis: 'x' | 'y';
}

/**
 * Sets up snaplines for the given paper and graph.
 * Draws magnetic guidelines when moving an element near others.
 * 
 * @param paper The dia.Paper instance
 * @param graph The dia.Graph instance
 * @returns Cleanup function
 */
export function setupSnaplines(paper: dia.Paper, graph: dia.Graph): () => void {
    let overlayGroup: SVGGElement | null = null;
    let activeSnaplines: SnaplineNode[] = [];
    let isDragging = false;
    let dragElement: dia.Element | null = null;
    let originalPosition: g.Point | null = null;

    const el = paper.el as HTMLElement;

    // Helper to create the SVG overlay container
    const ensureOverlay = () => {
        if (overlayGroup) return;
        const layers = el.querySelector('svg .joint-layers');
        if (!layers) return;

        overlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        overlayGroup.setAttribute('class', 'joint-snaplines-layer');
        overlayGroup.style.pointerEvents = 'none';
        layers.appendChild(overlayGroup);
    };

    const clearSnaplines = () => {
        activeSnaplines.forEach(node => node.line.remove());
        activeSnaplines = [];
        if (overlayGroup) {
            overlayGroup.remove();
            overlayGroup = null;
        }
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number, axis: 'x' | 'y') => {
        ensureOverlay();
        if (!overlayGroup) return;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(x1));
        line.setAttribute('y1', String(y1));
        line.setAttribute('x2', String(x2));
        line.setAttribute('y2', String(y2));
        line.setAttribute('stroke', SNAPLINE_COLOR);
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', SNAPLINE_STYLE === 'dashed' ? '4 4' : 'none');
        overlayGroup.appendChild(line);

        activeSnaplines.push({ line, axis });
    };

    const onPointerDown = (elementView: dia.ElementView) => {
        isDragging = true;
        dragElement = elementView.model;
        originalPosition = dragElement.position();
    };

    const onPointerMove = (elementView: dia.ElementView) => {
        if (!isDragging || !dragElement || dragElement !== elementView.model) return;

        clearSnaplines(); // Clear previous frame's lines

        const movingBBox = dragElement.getBBox();
        const otherElements = graph.getElements().filter(e => e.id !== dragElement!.id);

        let snappedX: number | null = null;
        let snappedY: number | null = null;

        // Collect coordinates of all other elements
        const targetXs = new Set<number>();
        const targetYs = new Set<number>();

        otherElements.forEach(el => {
            const bbox = el.getBBox();
            targetXs.add(bbox.x); // Left
            targetXs.add(bbox.x + bbox.width / 2); // Center X
            targetXs.add(bbox.x + bbox.width); // Right

            targetYs.add(bbox.y); // Top
            targetYs.add(bbox.y + bbox.height / 2); // Center Y
            targetYs.add(bbox.y + bbox.height); // Bottom
        });

        // Points on the moving element we want to snap
        const sourceXs = [
            { val: movingBBox.x, offset: 0 }, // Snap left edge
            { val: movingBBox.x + movingBBox.width / 2, offset: movingBBox.width / 2 }, // Snap center
            { val: movingBBox.x + movingBBox.width, offset: movingBBox.width } // Snap right edge
        ];

        const sourceYs = [
            { val: movingBBox.y, offset: 0 }, // Snap top edge
            { val: movingBBox.y + movingBBox.height / 2, offset: movingBBox.height / 2 }, // Snap center
            { val: movingBBox.y + movingBBox.height, offset: movingBBox.height } // Snap bottom edge
        ];

        // Find best X snap
        for (const targetX of targetXs) {
            for (const sourceX of sourceXs) {
                if (Math.abs(targetX - sourceX.val) < SNAP_TOLERANCE) {
                    snappedX = targetX - sourceX.offset;
                    // Draw vertical guideline covering the view height
                    const paperRect = el.getBoundingClientRect();
                    const scale = paper.scale().sx;
                    const translate = paper.translate();
                    const startY = -translate.ty / scale;
                    const endY = startY + paperRect.height / scale;
                    drawLine(targetX, startY, targetX, endY, 'x');
                    break;
                }
            }
            if (snappedX !== null) break;
        }

        // Find best Y snap
        for (const targetY of targetYs) {
            for (const sourceY of sourceYs) {
                if (Math.abs(targetY - sourceY.val) < SNAP_TOLERANCE) {
                    snappedY = targetY - sourceY.offset;
                    // Draw horizontal guideline covering the view width
                    const paperRect = el.getBoundingClientRect();
                    const scale = paper.scale().sx;
                    const translate = paper.translate();
                    const startX = -translate.tx / scale;
                    const endX = startX + paperRect.width / scale;
                    drawLine(startX, targetY, endX, targetY, 'y');
                    break;
                }
            }
            if (snappedY !== null) break;
        }

        // Apply snapping
        if (snappedX !== null || snappedY !== null) {
            const finalX = snappedX !== null ? snappedX : movingBBox.x;
            const finalY = snappedY !== null ? snappedY : movingBBox.y;
            // Prevent recursive events by passing { snappoint: true } and checking it if needed
            dragElement.position(finalX, finalY, { snappoint: true });
        }
    };

    const onPointerUp = () => {
        isDragging = false;
        dragElement = null;
        originalPosition = null;
        clearSnaplines();
    };

    paper.on('element:pointerdown', onPointerDown);
    // Use graph 'change:position' instead of pointermove so we can catch keyboard nudges too,
    // but paper's pointermove is smoother for dragging. We'll use paper's element:pointermove.
    paper.on('element:pointermove', onPointerMove);
    paper.on('element:pointerup', onPointerUp);

    return () => {
        paper.off('element:pointerdown', onPointerDown);
        paper.off('element:pointermove', onPointerMove);
        paper.off('element:pointerup', onPointerUp);
        clearSnaplines();
    };
}
