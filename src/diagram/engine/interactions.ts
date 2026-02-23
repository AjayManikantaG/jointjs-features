/**
 * interactions.ts
 * 
 * User interaction handlers for the diagram canvas.
 * Each interaction is a standalone setup function that:
 * 1. Accepts paper (and optionally graph) as dependencies
 * 2. Attaches event listeners
 * 3. Returns a cleanup function for React effect teardown
 * 
 * Interactions covered:
 * - Pan & Zoom (scroll wheel + shift+drag / middle mouse)
 * - Lasso (area) selection
 * - Double-click settings (replaces inline editing)
 * - Context menu dispatching
 * - Tooltip dispatching
 * - Resize & Rotate handles (custom SVG overlay)
 */
import { dia, g } from '@joint/core';
import type { UndoRedoManager } from './commandManager';

// ============================================================
// TYPES
// ============================================================

/** Position for context menu or tooltip */
export interface Position {
    x: number;
    y: number;
}

/** Context menu event data */
export interface ContextMenuEvent {
    position: Position;
    cell: dia.Cell | null;
    cellView: dia.CellView | null;
}

/** Tooltip event data */
export interface TooltipEvent {
    position: Position;
    cell: dia.Cell;
    content: string;
}

/** Selection change callback */
export type SelectionCallback = (cells: dia.Cell[]) => void;

// ============================================================
// PAN & ZOOM
// ============================================================

/**
 * Sets up canvas panning and zooming.
 * 
 * Controls:
 * - Scroll wheel: zoom in/out (centered on cursor)
 * - Shift + drag on blank: pan the canvas
 * - Middle mouse + drag: pan the canvas
 * 
 * @param paper The dia.Paper instance
 * @returns Cleanup function
 */
export function setupPanZoom(paper: dia.Paper, getInteractionMode: () => 'pointer' | 'pan'): () => void {
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let originStart = { tx: 0, ty: 0 };

    const el = paper.el as HTMLElement;

    // --- ZOOM via scroll wheel ---
    const onWheel = (e: WheelEvent) => {
        e.preventDefault();

        const currentScale = paper.scale().sx;
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newScale = Math.max(0.1, Math.min(3, currentScale + delta));

        // Zoom centered on cursor position
        const paperRect = el.getBoundingClientRect();
        const offsetX = e.clientX - paperRect.left;
        const offsetY = e.clientY - paperRect.top;

        const currentTranslate = paper.translate();
        const scaleFactor = newScale / currentScale;

        const newTx = offsetX - scaleFactor * (offsetX - currentTranslate.tx);
        const newTy = offsetY - scaleFactor * (offsetY - currentTranslate.ty);

        paper.scale(newScale, newScale);
        paper.translate(newTx, newTy);
    };

    el.addEventListener('wheel', onWheel, { passive: false });

    // --- PAN via shift+drag or middle mouse on blank area ---
    const onBlankPointerDown = (evt: dia.Event, x: number, y: number) => {
        const originalEvent = evt.originalEvent as MouseEvent;
        // Shift+left click, middle mouse button, or pan mode
        if (originalEvent.shiftKey || originalEvent.button === 1 || getInteractionMode() === 'pan') {
            isPanning = true;
            panStart = { x: originalEvent.clientX, y: originalEvent.clientY };
            const translate = paper.translate();
            originStart = { tx: translate.tx, ty: translate.ty };
            el.style.cursor = 'grabbing';
        }
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        paper.translate(originStart.tx + dx, originStart.ty + dy);
    };

    const onMouseUp = () => {
        if (isPanning) {
            isPanning = false;
            el.style.cursor = '';
        }
    };

    paper.on('blank:pointerdown', onBlankPointerDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
        el.removeEventListener('wheel', onWheel);
        paper.off('blank:pointerdown', onBlankPointerDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };
}

// ============================================================
// LASSO (AREA) SELECTION
// ============================================================

/** Minimum drag distance (in screen px) before a lasso is recognized */
const LASSO_THRESHOLD = 5;

/**
 * Sets up rubber-band (lasso) area selection.
 * 
 * Click + drag on blank area draws a selection rectangle.
 * All elements within the rectangle are selected on mouse up.
 * Click on blank area clears selection.
 * 
 * @param paper The dia.Paper instance
 * @param graph The dia.Graph instance
 * @param onSelectionChange Callback when selection changes
 * @returns Cleanup function
 */
export function setupLassoSelection(
    paper: dia.Paper,
    graph: dia.Graph,
    getInteractionMode: () => 'pointer' | 'pan',
    onSelectionChange: SelectionCallback,
): () => void {
    let isSelecting = false;
    let didLasso = false;           // True when a real lasso drag occurred
    let justLassoed = false;        // Blocks the next blank:pointerclick after a lasso
    let startPoint = { x: 0, y: 0 };
    let startClient = { x: 0, y: 0 };
    let selectionRect: SVGRectElement | null = null;

    const el = paper.el as HTMLElement;

    // Create the selection rectangle SVG element inside the transformed layer
    const createSelectionRect = () => {
        const layers = el.querySelector('svg .joint-layers');
        if (!layers) return null;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'joint-selection-frame');
        rect.setAttribute('fill', 'rgba(123, 97, 255, 0.08)');
        rect.setAttribute('stroke', '#7B61FF');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('stroke-dasharray', '4 3');
        rect.setAttribute('pointer-events', 'none');
        layers.appendChild(rect);
        return rect;
    };

    const onBlankPointerDown = (evt: dia.Event, x: number, y: number) => {
        const originalEvent = evt.originalEvent as MouseEvent;
        // Only lasso on plain left click (not shift, which is pan), and only if pointer mode
        if (originalEvent.shiftKey || originalEvent.button !== 0 || getInteractionMode() === 'pan') return;

        isSelecting = true;
        didLasso = false;
        startPoint = { x, y };
        startClient = { x: originalEvent.clientX, y: originalEvent.clientY };
        selectionRect = createSelectionRect();
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isSelecting || !selectionRect) return;

        // Check minimum drag threshold before showing lasso
        const screenDx = e.clientX - startClient.x;
        const screenDy = e.clientY - startClient.y;
        const screenDist = Math.sqrt(screenDx * screenDx + screenDy * screenDy);
        if (screenDist < LASSO_THRESHOLD) return;

        didLasso = true;

        const clientPoint = paper.clientToLocalPoint({ x: e.clientX, y: e.clientY });
        const x = Math.min(startPoint.x, clientPoint.x);
        const y = Math.min(startPoint.y, clientPoint.y);
        const width = Math.abs(clientPoint.x - startPoint.x);
        const height = Math.abs(clientPoint.y - startPoint.y);

        selectionRect.setAttribute('x', String(x));
        selectionRect.setAttribute('y', String(y));
        selectionRect.setAttribute('width', String(width));
        selectionRect.setAttribute('height', String(height));
    };

    const onMouseUp = (e: MouseEvent) => {
        if (!isSelecting) return;
        isSelecting = false;

        if (selectionRect) {
            selectionRect.remove();
            selectionRect = null;
        }

        if (!didLasso) return; // Was just a click, not a drag

        // Mark that a lasso just finished — block the next blank:pointerclick
        justLassoed = true;
        setTimeout(() => { justLassoed = false; }, 0);

        const clientPoint = paper.clientToLocalPoint({ x: e.clientX, y: e.clientY });
        const rect = new g.Rect(
            Math.min(startPoint.x, clientPoint.x),
            Math.min(startPoint.y, clientPoint.y),
            Math.abs(clientPoint.x - startPoint.x),
            Math.abs(clientPoint.y - startPoint.y),
        );

        // Find elements within the selection rectangle
        const selected = graph.getElements().filter((element) => {
            const bbox = element.getBBox();
            return rect.containsRect(bbox);
        });

        if (selected.length > 0) {
            onSelectionChange(selected);
        }
    };

    // Click on element to select it
    const onElementPointerClick = (elementView: dia.ElementView) => {
        onSelectionChange([elementView.model]);
    };

    // Click on blank to clear selection — but not right after a lasso
    const onBlankPointerClick = () => {
        if (justLassoed) return;
        onSelectionChange([]);
    };

    paper.on('blank:pointerdown', onBlankPointerDown);
    paper.on('element:pointerclick', onElementPointerClick);
    paper.on('blank:pointerclick', onBlankPointerClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
        paper.off('blank:pointerdown', onBlankPointerDown);
        paper.off('element:pointerclick', onElementPointerClick);
        paper.off('blank:pointerclick', onBlankPointerClick);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (selectionRect) selectionRect.remove();
    };
}

// ============================================================
// DOUBLE-CLICK SETTINGS
// ============================================================

/**
 * Trigger element:configure on double-click instead of inline editing.
 */
export function setupDoubleClickSettings(paper: dia.Paper): () => void {
    const onElementDblClick = (elementView: dia.ElementView) => {
        const targetElement = elementView.model;
        if (targetElement) {
            paper.trigger('element:configure', targetElement);
        }
    };

    paper.on('element:pointerdblclick', onElementDblClick);

    return () => {
        paper.off('element:pointerdblclick', onElementDblClick);
    };
}

// ============================================================
// CONTEXT MENU
// ============================================================

/**
 * Sets up right-click context menu dispatching.
 * Prevents default browser menu and calls the callback with event data.
 * 
 * @param paper The dia.Paper instance
 * @param onContextMenu Callback with context menu data
 * @returns Cleanup function
 */
export function setupContextMenu(
    paper: dia.Paper,
    onContextMenu: (event: ContextMenuEvent) => void,
): () => void {
    const el = paper.el as HTMLElement;

    const onContextMenuEvent = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const localPoint = paper.clientToLocalPoint({ x: e.clientX, y: e.clientY });

        // Find what's under the cursor
        const views = paper.findViewsFromPoint(localPoint);
        const cellView = views.length > 0 ? views[0] : null;
        const cell = cellView ? cellView.model : null;

        onContextMenu({
            position: { x: e.clientX, y: e.clientY },
            cell,
            cellView,
        });
    };

    el.addEventListener('contextmenu', onContextMenuEvent);

    return () => {
        el.removeEventListener('contextmenu', onContextMenuEvent);
    };
}

// ============================================================
// TOOLTIPS
// ============================================================

/**
 * Sets up hover tooltips on elements.
 * Dispatches tooltip show/hide events via callbacks.
 * 
 * @param paper The dia.Paper instance
 * @param onTooltipShow Callback when tooltip should show
 * @param onTooltipHide Callback when tooltip should hide
 * @returns Cleanup function
 */
export function setupTooltips(
    paper: dia.Paper,
    onTooltipShow: (event: TooltipEvent) => void,
    onTooltipHide: () => void,
): () => void {
    let hoverTimer: ReturnType<typeof setTimeout>;

    const onElementMouseEnter = (elementView: dia.ElementView, evt: dia.Event) => {
        const originalEvent = evt.originalEvent as MouseEvent;
        clearTimeout(hoverTimer);

        hoverTimer = setTimeout(() => {
            const model = elementView.model;
            const label =
                (model.attr('label/text') as string) ||
                (model.attr('text/text') as string) ||
                model.get('type') || 'Element';

            onTooltipShow({
                position: { x: originalEvent.clientX, y: originalEvent.clientY },
                cell: model,
                content: label as string,
            });
        }, 600); // 600ms hover delay
    };

    const onElementMouseLeave = () => {
        clearTimeout(hoverTimer);
        onTooltipHide();
    };

    paper.on('element:mouseenter', onElementMouseEnter);
    paper.on('element:mouseleave', onElementMouseLeave);

    return () => {
        clearTimeout(hoverTimer);
        paper.off('element:mouseenter', onElementMouseEnter);
        paper.off('element:mouseleave', onElementMouseLeave);
    };
}

// ============================================================
// ELEMENT CLICK SELECTION WITH HIGHLIGHT
// ============================================================

/**
 * Highlights selected elements by adding a visual indicator.
 * 
 * @param paper The dia.Paper instance
 * @param cells The cells to highlight
 */
export function highlightCells(paper: dia.Paper, cells: dia.Cell[]): void {
    // Clear all existing highlights
    const allViews = paper.el.querySelectorAll('.joint-element');
    allViews.forEach((view) => {
        (view as HTMLElement).style.filter = '';
    });

    // Apply highlight to selected cells
    cells.forEach((cell) => {
        const view = paper.findViewByModel(cell);
        if (view) {
            (view.el as unknown as HTMLElement).style.filter = 'drop-shadow(0 0 4px rgba(123, 97, 255, 0.6))';
        }
    });
}

// ============================================================
// ELEMENT ACTION TOOLBAR + RESIZE & ROTATE HANDLES
// ============================================================

/** Handle position identifiers */
type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface HandleInfo {
    pos: HandlePosition;
    cursor: string;
    getXY: (bbox: g.Rect) => { x: number; y: number };
}

/** The 8 resize handle definitions */
const RESIZE_HANDLES: HandleInfo[] = [
    { pos: 'nw', cursor: 'nwse-resize', getXY: (b) => ({ x: b.x, y: b.y }) },
    { pos: 'n', cursor: 'ns-resize', getXY: (b) => ({ x: b.x + b.width / 2, y: b.y }) },
    { pos: 'ne', cursor: 'nesw-resize', getXY: (b) => ({ x: b.x + b.width, y: b.y }) },
    { pos: 'e', cursor: 'ew-resize', getXY: (b) => ({ x: b.x + b.width, y: b.y + b.height / 2 }) },
    { pos: 'se', cursor: 'nwse-resize', getXY: (b) => ({ x: b.x + b.width, y: b.y + b.height }) },
    { pos: 's', cursor: 'ns-resize', getXY: (b) => ({ x: b.x + b.width / 2, y: b.y + b.height }) },
    { pos: 'sw', cursor: 'nesw-resize', getXY: (b) => ({ x: b.x, y: b.y + b.height }) },
    { pos: 'w', cursor: 'ew-resize', getXY: (b) => ({ x: b.x, y: b.y + b.height / 2 }) },
];

const HANDLE_SIZE = 8;
const MIN_SIZE = 40;
const ROTATE_HANDLE_OFFSET = 30;
const ACCENT_COLOR = '#7B61FF';
const ACCENT_HOVER = '#9580FF';

/** Active interaction mode */
type ToolMode = 'none' | 'resize' | 'rotate';

/** Button definitions for the mini toolbar */
interface ToolbarButton {
    id: string;
    svg: string;
    title: string;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
    {
        id: 'play',
        title: 'Execute / Run',
        svg: `<svg viewBox="0 0 16 16" width="14" height="14"><polygon points="3,1 14,8 3,15" fill="currentColor"/></svg>`,
    },
    {
        id: 'resize',
        title: 'Resize',
        svg: `<svg viewBox="0 0 16 16" width="14" height="14"><path d="M1,5 L1,1 L5,1 M11,1 L15,1 L15,5 M15,11 L15,15 L11,15 M5,15 L1,15 L1,11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    {
        id: 'rotate',
        title: 'Rotate',
        svg: `<svg viewBox="0 0 16 16" width="14" height="14"><path d="M13,5.5 A5.5,5.5 0 1,0 12,12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><polyline points="13,2 13,6 9,6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    {
        id: 'delete',
        title: 'Delete',
        svg: `<svg viewBox="0 0 16 16" width="14" height="14"><line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
    },
    {
        id: 'settings',
        title: 'Settings',
        svg: `<svg viewBox="0 0 16 16" width="14" height="14"><path d="M7 0h2v2c1.1.2 2 .7 2.8 1.4l1.4-1.4 1.4 1.4-1.4 1.4C13.8 5.6 14 6.3 14 7h2v2h-2c-.2.9-.6 1.7-1.2 2.3l1.4 1.4-1.4 1.4-1.4-1.4c-.6.6-1.4 1.1-2.3 1.2v2H7v-2c-.9-.2-1.7-.7-2.3-1.2l-1.4 1.4-1.4-1.4 1.4-1.4C2.7 10.7 2.2 9.9 2 9H0V7h2c.2-.9.7-1.7 1.4-2.3L2 3.3 3.4 1.9l1.4 1.4C5.4 2.6 6.1 2.2 7 2V0zm1 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3z" fill="currentColor"/></svg>`,
    },
];

/**
 * Sets up element action toolbar with resize and rotate interactions.
 * 
 * On element click:
 * - Shows a floating mini-toolbar next to the element with 5 buttons
 * - Clicking Resize toggles the 8 resize handles
 * - Clicking Rotate toggles the rotate handle
 * - Clicking Delete removes the element
 * - Clicking Settings triggers element:configure
 * 
 * @param paper The dia.Paper instance
 * @param graph The dia.Graph instance
 * @param onSelectionChange Callback to notify of selection changes
 * @returns Cleanup function
 */
export function setupResizeRotate(
    paper: dia.Paper,
    graph: dia.Graph,
    onSelectionChange: SelectionCallback,
    commandManager?: UndoRedoManager,
): () => void {
    // ── State ───────────────────────────────────────────────
    let overlayGroup: SVGGElement | null = null;
    let toolbarEl: HTMLDivElement | null = null;
    let activeElement: dia.Element | null = null;
    let currentMode: ToolMode = 'none';
    let isDragging = false;
    let dragType: 'resize' | 'rotate' | null = null;
    let dragHandle: HandlePosition | null = null;
    let dragStart = { x: 0, y: 0 };
    let origBBox = { x: 0, y: 0, width: 0, height: 0 };
    let origAngle = 0;
    let batchStarted = false;

    const el = paper.el as HTMLElement;
    const containerEl = el.parentElement as HTMLElement;

    // ── SVG Helpers ─────────────────────────────────────────
    const svgNS = 'http://www.w3.org/2000/svg';
    const createSVG = <T extends SVGElement>(tag: string): T => {
        return document.createElementNS(svgNS, tag) as T;
    };

    // ── Cleanup helpers ─────────────────────────────────────
    const removeOverlay = () => {
        if (overlayGroup) {
            overlayGroup.remove();
            overlayGroup = null;
        }
    };

    const removeToolbar = () => {
        if (toolbarEl) {
            toolbarEl.remove();
            toolbarEl = null;
        }
    };

    const cleanupAll = () => {
        removeOverlay();
        removeToolbar();
        activeElement = null;
        currentMode = 'none';
    };

    // ── Toolbar positioning ─────────────────────────────────
    const positionToolbar = () => {
        if (!toolbarEl || !activeElement) return;
        const bbox = activeElement.getBBox();
        const scale = paper.scale().sx;
        const translate = paper.translate();

        const screenX = (bbox.x + bbox.width) * scale + translate.tx + 8;
        const screenY = bbox.y * scale + translate.ty;

        toolbarEl.style.left = `${screenX}px`;
        toolbarEl.style.top = `${screenY}px`;
    };

    // ── SVG handle position updater ─────────────────────────
    const updateHandlePositions = () => {
        if (!overlayGroup || !activeElement) return;
        const bbox = activeElement.getBBox();
        const angle = activeElement.angle() || 0;

        const handles = overlayGroup.querySelectorAll('[data-handle-type="resize"]');
        handles.forEach((h) => {
            const pos = h.getAttribute('data-handle-pos') as HandlePosition;
            const info = RESIZE_HANDLES.find((rh) => rh.pos === pos);
            if (!info) return;
            const { x, y } = info.getXY(bbox);
            h.setAttribute('x', String(x - HANDLE_SIZE / 2));
            h.setAttribute('y', String(y - HANDLE_SIZE / 2));
        });

        const rotateHandle = overlayGroup.querySelector('[data-handle-type="rotate"]');
        const rotateLine = overlayGroup.querySelector('[data-handle-type="rotate-line"]');
        if (rotateHandle && rotateLine) {
            const cx = bbox.x + bbox.width / 2;
            const cy = bbox.y;
            const rad = (angle * Math.PI) / 180;
            const offsetY = -ROTATE_HANDLE_OFFSET;
            const rotatedX = -offsetY * Math.sin(rad);
            const rotatedY = offsetY * Math.cos(rad);

            rotateHandle.setAttribute('cx', String(cx + rotatedX));
            rotateHandle.setAttribute('cy', String(cy + rotatedY));
            (rotateLine as SVGLineElement).setAttribute('x1', String(cx));
            (rotateLine as SVGLineElement).setAttribute('y1', String(cy));
            (rotateLine as SVGLineElement).setAttribute('x2', String(cx + rotatedX));
            (rotateLine as SVGLineElement).setAttribute('y2', String(cy + rotatedY));
        }

        const outline = overlayGroup.querySelector('[data-handle-type="outline"]');
        if (outline) {
            outline.setAttribute('x', String(bbox.x));
            outline.setAttribute('y', String(bbox.y));
            outline.setAttribute('width', String(bbox.width));
            outline.setAttribute('height', String(bbox.height));
        }

        positionToolbar();
    };

    // ── Create the floating HTML toolbar ────────────────────
    const showToolbar = (element: dia.Element) => {
        removeToolbar();
        activeElement = element;

        const toolbar = document.createElement('div');
        toolbar.className = 'joint-element-toolbar';
        Object.assign(toolbar.style, {
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '4px',
            background: 'rgba(22, 22, 26, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            zIndex: '30',
            pointerEvents: 'auto',
            animation: 'toolbarFadeIn 0.15s ease',
        });

        if (!document.querySelector('#joint-toolbar-keyframes')) {
            const style = document.createElement('style');
            style.id = 'joint-toolbar-keyframes';
            style.textContent = `
                @keyframes toolbarFadeIn {
                    from { opacity: 0; transform: scale(0.9) translateX(-4px); }
                    to { opacity: 1; transform: scale(1) translateX(0); }
                }
                @keyframes elementPulse {
                    0% { filter: drop-shadow(0 0 0px rgba(123, 97, 255, 0)); }
                    50% { filter: drop-shadow(0 0 12px rgba(123, 97, 255, 0.8)); }
                    100% { filter: drop-shadow(0 0 0px rgba(123, 97, 255, 0)); }
                }
            `;
            document.head.appendChild(style);
        }

        for (const btn of TOOLBAR_BUTTONS) {
            const button = document.createElement('button');
            button.className = 'joint-toolbar-btn';
            button.setAttribute('data-action', btn.id);
            button.title = btn.title;
            button.innerHTML = btn.svg;
            Object.assign(button.style, {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                border: 'none',
                borderRadius: '7px',
                background: 'transparent',
                color: '#9B9BA4',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                outline: 'none',
                padding: '0',
            });

            button.addEventListener('mouseenter', () => {
                const isActive = button.getAttribute('data-active') === 'true';
                if (!isActive) {
                    button.style.background = 'rgba(255,255,255,0.06)';
                    button.style.color = '#EDEDEF';
                }
            });
            button.addEventListener('mouseleave', () => {
                const isActive = button.getAttribute('data-active') === 'true';
                if (!isActive) {
                    button.style.background = 'transparent';
                    button.style.color = '#9B9BA4';
                }
            });

            button.addEventListener('click', (e) => {
                e.stopPropagation();
                handleToolbarAction(btn.id);
            });

            toolbar.appendChild(button);
        }

        containerEl.appendChild(toolbar);
        toolbarEl = toolbar;
        positionToolbar();
    };

    const updateToolbarActiveState = () => {
        if (!toolbarEl) return;
        const buttons = toolbarEl.querySelectorAll('.joint-toolbar-btn');
        buttons.forEach((btn) => {
            const action = btn.getAttribute('data-action');
            const isActive = action === currentMode;
            (btn as HTMLElement).setAttribute('data-active', String(isActive));
            if (isActive) {
                (btn as HTMLElement).style.background = 'rgba(123, 97, 255, 0.2)';
                (btn as HTMLElement).style.color = '#7B61FF';
            } else {
                (btn as HTMLElement).style.background = 'transparent';
                (btn as HTMLElement).style.color = '#9B9BA4';
            }
        });
    };

    const handleToolbarAction = (action: string) => {
        if (!activeElement) return;

        switch (action) {
            case 'play': {
                const view = paper.findViewByModel(activeElement);
                if (view) {
                    const svgEl = view.el as unknown as HTMLElement;
                    svgEl.style.animation = 'elementPulse 0.6s ease';
                    setTimeout(() => {
                        svgEl.style.animation = '';
                    }, 600);
                }
                break;
            }
            case 'resize': {
                if (currentMode === 'resize') {
                    currentMode = 'none';
                    removeOverlay();
                } else {
                    currentMode = 'resize';
                    showResizeHandles();
                }
                updateToolbarActiveState();
                break;
            }
            case 'rotate': {
                if (currentMode === 'rotate') {
                    currentMode = 'none';
                    removeOverlay();
                } else {
                    currentMode = 'rotate';
                    showRotateHandle();
                }
                updateToolbarActiveState();
                break;
            }
            case 'delete': {
                const elementToRemove = activeElement;
                cleanupAll();
                elementToRemove.remove();
                onSelectionChange([]);
                break;
            }
            case 'settings': {
                const targetElement = activeElement;
                cleanupAll();
                if (targetElement) {
                    paper.trigger('element:configure', targetElement);
                }
                break;
            }
        }
    };

    const showResizeHandles = () => {
        removeOverlay();
        if (!activeElement) return;

        const group = createSVG<SVGGElement>('g');
        group.setAttribute('class', 'joint-resize-rotate-overlay');
        group.setAttribute('pointer-events', 'all');

        const outline = createSVG<SVGRectElement>('rect');
        outline.setAttribute('data-handle-type', 'outline');
        outline.setAttribute('fill', 'none');
        outline.setAttribute('stroke', ACCENT_COLOR);
        outline.setAttribute('stroke-width', '1');
        outline.setAttribute('stroke-dasharray', '4 3');
        outline.setAttribute('pointer-events', 'none');
        group.appendChild(outline);

        for (const handleInfo of RESIZE_HANDLES) {
            const rect = createSVG<SVGRectElement>('rect');
            rect.setAttribute('data-handle-type', 'resize');
            rect.setAttribute('data-handle-pos', handleInfo.pos);
            rect.setAttribute('width', String(HANDLE_SIZE));
            rect.setAttribute('height', String(HANDLE_SIZE));
            rect.setAttribute('fill', '#232329');
            rect.setAttribute('stroke', ACCENT_COLOR);
            rect.setAttribute('stroke-width', '1.5');
            rect.setAttribute('rx', '1.5');
            rect.setAttribute('cursor', handleInfo.cursor);
            rect.style.transition = 'fill 0.1s';
            rect.addEventListener('mouseenter', () => rect.setAttribute('fill', ACCENT_HOVER));
            rect.addEventListener('mouseleave', () => { if (!isDragging) rect.setAttribute('fill', '#232329'); });
            group.appendChild(rect);
        }

        const layersContainer = el.querySelector('svg .joint-layers');
        if (layersContainer) {
            layersContainer.appendChild(group);
        }
        overlayGroup = group;
        updateHandlePositions();
    };

    const showRotateHandle = () => {
        removeOverlay();
        if (!activeElement) return;

        const group = createSVG<SVGGElement>('g');
        group.setAttribute('class', 'joint-resize-rotate-overlay');
        group.setAttribute('pointer-events', 'all');

        const outline = createSVG<SVGRectElement>('rect');
        outline.setAttribute('data-handle-type', 'outline');
        outline.setAttribute('fill', 'none');
        outline.setAttribute('stroke', ACCENT_COLOR);
        outline.setAttribute('stroke-width', '1');
        outline.setAttribute('stroke-dasharray', '4 3');
        outline.setAttribute('pointer-events', 'none');
        group.appendChild(outline);

        const rotateLine = createSVG<SVGLineElement>('line');
        rotateLine.setAttribute('data-handle-type', 'rotate-line');
        rotateLine.setAttribute('stroke', ACCENT_COLOR);
        rotateLine.setAttribute('stroke-width', '1');
        rotateLine.setAttribute('stroke-dasharray', '3 2');
        rotateLine.setAttribute('pointer-events', 'none');
        group.appendChild(rotateLine);

        const rotateCircle = createSVG<SVGCircleElement>('circle');
        rotateCircle.setAttribute('data-handle-type', 'rotate');
        rotateCircle.setAttribute('r', '6');
        rotateCircle.setAttribute('fill', '#232329');
        rotateCircle.setAttribute('stroke', ACCENT_COLOR);
        rotateCircle.setAttribute('stroke-width', '2');
        rotateCircle.setAttribute('cursor', 'grab');
        rotateCircle.style.transition = 'fill 0.1s';
        rotateCircle.addEventListener('mouseenter', () => rotateCircle.setAttribute('fill', ACCENT_HOVER));
        rotateCircle.addEventListener('mouseleave', () => { if (!isDragging) rotateCircle.setAttribute('fill', '#232329'); });
        group.appendChild(rotateCircle);

        const layersContainer = el.querySelector('svg .joint-layers');
        if (layersContainer) {
            layersContainer.appendChild(group);
        }
        overlayGroup = group;
        updateHandlePositions();
    };

    const onOverlayMouseDown = (e: MouseEvent) => {
        const target = e.target as SVGElement;
        if (!target || !activeElement) return;

        const handleType = target.getAttribute('data-handle-type');
        if (!handleType || handleType === 'outline' || handleType === 'rotate-line') return;

        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        const localPoint = paper.clientToLocalPoint({ x: e.clientX, y: e.clientY });
        dragStart = { x: localPoint.x, y: localPoint.y };

        if (handleType === 'rotate') {
            dragType = 'rotate';
            dragHandle = null;
            origAngle = activeElement.angle() || 0;
        } else if (handleType === 'resize') {
            dragType = 'resize';
            dragHandle = target.getAttribute('data-handle-pos') as HandlePosition;
            const bbox = activeElement.getBBox();
            origBBox = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
        }

        if (commandManager) {
            commandManager.startBatch(handleType === 'rotate' ? 'rotate' : 'resize');
        }

        el.style.cursor = handleType === 'rotate' ? 'grabbing' : (target.getAttribute('cursor') || 'default');
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isDragging || !activeElement || !dragType) return;

        const localPoint = paper.clientToLocalPoint({ x: e.clientX, y: e.clientY });

        if (!batchStarted) {
            batchStarted = true;
        }

        if (dragType === 'resize' && dragHandle) {
            const dx = localPoint.x - dragStart.x;
            const dy = localPoint.y - dragStart.y;

            let newX = origBBox.x;
            let newY = origBBox.y;
            let newW = origBBox.width;
            let newH = origBBox.height;

            switch (dragHandle) {
                case 'nw':
                    newX = origBBox.x + dx; newY = origBBox.y + dy;
                    newW = origBBox.width - dx; newH = origBBox.height - dy;
                    break;
                case 'n':
                    newY = origBBox.y + dy; newH = origBBox.height - dy;
                    break;
                case 'ne':
                    newY = origBBox.y + dy; newW = origBBox.width + dx; newH = origBBox.height - dy;
                    break;
                case 'e':
                    newW = origBBox.width + dx;
                    break;
                case 'se':
                    newW = origBBox.width + dx; newH = origBBox.height + dy;
                    break;
                case 's':
                    newH = origBBox.height + dy;
                    break;
                case 'sw':
                    newX = origBBox.x + dx; newW = origBBox.width - dx; newH = origBBox.height + dy;
                    break;
                case 'w':
                    newX = origBBox.x + dx; newW = origBBox.width - dx;
                    break;
            }

            if (newW < MIN_SIZE) {
                if (dragHandle.includes('w')) newX = origBBox.x + origBBox.width - MIN_SIZE;
                newW = MIN_SIZE;
            }
            if (newH < MIN_SIZE) {
                if (dragHandle.includes('n')) newY = origBBox.y + origBBox.height - MIN_SIZE;
                newH = MIN_SIZE;
            }

            activeElement.position(newX, newY);
            activeElement.resize(newW, newH);
            updateHandlePositions();
            positionToolbar();
        }

        if (dragType === 'rotate') {
            const bbox = activeElement.getBBox();
            const center = {
                x: bbox.x + bbox.width / 2,
                y: bbox.y + bbox.height / 2,
            };
            const angleRad = Math.atan2(localPoint.y - center.y, localPoint.x - center.x);
            let angleDeg = (angleRad * 180) / Math.PI + 90;
            if (angleDeg < 0) angleDeg += 360;
            if (e.shiftKey) angleDeg = Math.round(angleDeg / 15) * 15;

            activeElement.rotate(angleDeg, true);
            updateHandlePositions();
            positionToolbar();
        }
    };

    const onMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            dragType = null;
            dragHandle = null;
            batchStarted = false;
            el.style.cursor = '';
            updateHandlePositions();
            if (commandManager) commandManager.stopBatch();
        }
    };

    const onElementPointerClick = (elementView: dia.ElementView) => {
        const element = elementView.model as dia.Element;
        if (activeElement === element && toolbarEl) {
            return;
        }
        cleanupAll();
        activeElement = element;
        showToolbar(element);
        onSelectionChange([element]);
    };

    const onBlankPointerClick = () => {
        cleanupAll();
        onSelectionChange([]);
    };

    const onElementChange = () => {
        if (activeElement) {
            if (overlayGroup) updateHandlePositions();
            positionToolbar();
        }
    };

    paper.on('element:pointerclick', onElementPointerClick);
    paper.on('blank:pointerclick', onBlankPointerClick);
    paper.on('scale', positionToolbar);
    paper.on('translate', positionToolbar);
    graph.on('change', onElementChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    const svgEl = el.querySelector('svg');
    const onSvgMouseDown = (e: Event) => {
        const mouseEvent = e as MouseEvent;
        const target = mouseEvent.target as SVGElement;
        if (target && overlayGroup && overlayGroup.contains(target)) {
            onOverlayMouseDown(mouseEvent);
        }
    };
    if (svgEl) {
        svgEl.addEventListener('mousedown', onSvgMouseDown, true);
    }

    return () => {
        paper.off('element:pointerclick', onElementPointerClick);
        paper.off('blank:pointerclick', onBlankPointerClick);
        paper.off('scale', positionToolbar);
        paper.off('translate', positionToolbar);
        graph.off('change', onElementChange);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (svgEl) {
            svgEl.removeEventListener('mousedown', onSvgMouseDown, true);
        }
        cleanupAll();
    };
}

// ============================================================
// CLIPBOARD FUNCTIONALITY
// ============================================================

let clipboard: dia.Cell[] = [];

/**
 * Copies selected cells to the internal clipboard.
 */
export function copySelectedCells(cells: dia.Cell[]): void {
    if (cells.length === 0) return;
    // Clone cells and their positions
    clipboard = cells.map(cell => cell.clone());
}

/**
 * Cuts selected cells (copy + remove).
 */
export function cutSelectedCells(cells: dia.Cell[], graph: dia.Graph): void {
    if (cells.length === 0) return;
    copySelectedCells(cells);
    graph.startBatch('cut');
    cells.forEach(cell => cell.remove());
    graph.stopBatch('cut');
}

/**
 * Pastes cells from the internal clipboard onto the graph.
 */
export function pasteCells(graph: dia.Graph, paper: dia.Paper): dia.Cell[] {
    if (clipboard.length === 0) return [];

    graph.startBatch('paste');
    const pastedCells = clipboard.map(cell => {
        const clone = cell.clone();
        // Offset for visibility if it's an element
        if (clone.isElement()) {
            (clone as dia.Element).translate(20, 20);
        }
        return clone;
    });

    graph.addCells(pastedCells);
    graph.stopBatch('paste');

    // Update clipboard with new clones for subsequent pastes
    clipboard = pastedCells.map(cell => cell.clone());

    return pastedCells;
}

/**
 * Checks if the clipboard has content.
 */
export function hasClipboardContent(): boolean {
    return clipboard.length > 0;
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

/**
 * Sets up keyboard shortcuts for the diagram.
 * 
 * Shortcuts:
 * - Ctrl/Cmd + Z: Undo
 * - Ctrl/Cmd + Shift + Z: Redo
 * - Delete/Backspace: Delete selected
 * - Ctrl/Cmd + A: Select all
 * - Ctrl/Cmd + C: Copy selected
 * - Ctrl/Cmd + V: Paste
 * - Escape: Clear selection
 * 
 * @param handlers Object with handler functions
 * @returns Cleanup function
 */
export function setupKeyboardShortcuts(handlers: {
    onUndo: () => void;
    onRedo: () => void;
    onDelete: () => void;
    onSelectAll: () => void;
    onCopy: () => void;
    onCut: () => void;
    onPaste: () => void;
    onEscape: () => void;
}): () => void {
    const onKeyDown = (e: KeyboardEvent) => {
        const isMod = e.metaKey || e.ctrlKey;

        if (
            e.target instanceof HTMLInputElement ||
            e.target instanceof HTMLTextAreaElement
        ) {
            return;
        }

        if (isMod && e.shiftKey && e.key === 'z') {
            e.preventDefault();
            handlers.onRedo();
        } else if (isMod && e.key === 'z') {
            e.preventDefault();
            handlers.onUndo();
        } else if (isMod && e.key === 'c') {
            e.preventDefault();
            handlers.onCopy();
        } else if (isMod && e.key === 'x') {
            e.preventDefault();
            handlers.onCut();
        } else if (isMod && e.key === 'v') {
            e.preventDefault();
            handlers.onPaste();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            handlers.onDelete();
        } else if (isMod && e.key === 'a') {
            e.preventDefault();
            handlers.onSelectAll();
        } else if (e.key === 'Escape') {
            handlers.onEscape();
        }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
        document.removeEventListener('keydown', onKeyDown);
    };
}

// ============================================================
// MULTI-SELECTION CONCURRENT DRAGGING
// ============================================================

/**
 * Allows multiple selected elements to be moved together seamlessly.
 */
export function setupMultiSelectionMove(
    paper: dia.Paper,
    graph: dia.Graph,
    getSelected: () => dia.Cell[],
    commandManager?: UndoRedoManager,
): () => void {
    let isDragging = false;
    let dragElementId: string | null = null;
    let lastPos: g.Point | null = null;

    const onPointerDown = (elementView: dia.ElementView) => {
        const model = elementView.model;
        const selected = getSelected();

        if (selected.length > 1 && selected.some((c) => c.id === model.id)) {
            isDragging = true;
            dragElementId = model.id as string;
            lastPos = model.position();
            graph.startBatch('multi-move');
            if (commandManager) commandManager.startBatch('multi-move');
        }
    };

    const onPointerMove = (elementView: dia.ElementView) => {
        if (!isDragging || elementView.model.id !== dragElementId || !lastPos) return;

        const currentPos = elementView.model.position();
        const dx = currentPos.x - lastPos.x;
        const dy = currentPos.y - lastPos.y;

        if (dx === 0 && dy === 0) return;

        const selected = getSelected();
        selected.forEach((cell) => {
            if (cell.id !== dragElementId && cell.isElement()) {
                (cell as dia.Element).translate(dx, dy);
            }
        });

        lastPos = currentPos;
    };

    const onPointerUp = (elementView: dia.ElementView) => {
        if (isDragging && elementView.model.id === dragElementId) {
            isDragging = false;
            dragElementId = null;
            lastPos = null;
            graph.stopBatch('multi-move');
            if (commandManager) commandManager.stopBatch();
        }
    };

    paper.on('element:pointerdown', onPointerDown);
    paper.on('element:pointermove', onPointerMove);
    paper.on('element:pointerup', onPointerUp);

    return () => {
        paper.off('element:pointerdown', onPointerDown);
        paper.off('element:pointermove', onPointerMove);
        paper.off('element:pointerup', onPointerUp);
    };
}
