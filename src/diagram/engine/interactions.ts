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
 * - Inline text editing (double-click)
 * - Context menu dispatching
 * - Tooltip dispatching
 * - Resize & Rotate handles
 */
import { dia, g } from '@joint/core';

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
export function setupPanZoom(paper: dia.Paper): () => void {
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
        // Shift+left click or middle mouse button
        if (originalEvent.shiftKey || originalEvent.button === 1) {
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
    onSelectionChange: SelectionCallback,
): () => void {
    let isSelecting = false;
    let startPoint = { x: 0, y: 0 };
    let selectionRect: SVGRectElement | null = null;

    const el = paper.el as HTMLElement;

    // Create the selection rectangle SVG element
    const createSelectionRect = () => {
        const svg = el.querySelector('svg');
        if (!svg) return null;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'joint-selection-frame');
        rect.setAttribute('fill', 'rgba(123, 97, 255, 0.08)');
        rect.setAttribute('stroke', '#7B61FF');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('stroke-dasharray', '4 3');
        rect.setAttribute('pointer-events', 'none');
        svg.appendChild(rect);
        return rect;
    };

    const onBlankPointerDown = (evt: dia.Event, x: number, y: number) => {
        const originalEvent = evt.originalEvent as MouseEvent;
        // Only lasso on plain left click (not shift, which is pan)
        if (originalEvent.shiftKey || originalEvent.button !== 0) return;

        isSelecting = true;
        startPoint = { x, y };
        selectionRect = createSelectionRect();
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!isSelecting || !selectionRect) return;

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

            onSelectionChange(selected);

            // Remove visual selection rect
            selectionRect.remove();
            selectionRect = null;
        }
    };

    // Click on element to select it
    const onElementPointerClick = (elementView: dia.ElementView) => {
        onSelectionChange([elementView.model]);
    };

    // Click on blank to clear selection
    const onBlankPointerClick = () => {
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
// INLINE TEXT EDITING
// ============================================================

/**
 * Sets up double-click inline text editing on elements.
 * Creates an overlay <input> positioned over the element's label.
 * On blur/enter, updates the element's label attribute.
 * 
 * @param paper The dia.Paper instance
 * @returns Cleanup function
 */
export function setupInlineEdit(paper: dia.Paper): () => void {
    let activeInput: HTMLInputElement | null = null;

    const onElementDblClick = (elementView: dia.ElementView) => {
        if (activeInput) {
            activeInput.blur();
            return;
        }

        const model = elementView.model;
        const bbox = elementView.getBBox();
        const paperRect = (paper.el as HTMLElement).getBoundingClientRect();
        const scale = paper.scale().sx;
        const translate = paper.translate();

        // Get current label text
        const currentText =
            (model.attr('label/text') as string) ||
            (model.attr('text/text') as string) ||
            (model.attr('body/text') as string) ||
            '';

        // Create input element
        const input = document.createElement('input');
        input.className = 'joint-inline-editor';
        input.value = currentText;
        input.style.left = `${bbox.x * scale + translate.tx + paperRect.left - (paper.el as HTMLElement).offsetLeft}px`;
        input.style.top = `${bbox.y * scale + translate.ty + paperRect.top - (paper.el as HTMLElement).offsetTop}px`;
        input.style.width = `${bbox.width * scale}px`;
        input.style.height = `${bbox.height * scale}px`;
        input.style.fontSize = `${13 * scale}px`;

        const container = paper.el as HTMLElement;
        container.style.position = 'relative';
        container.appendChild(input);
        input.focus();
        input.select();
        activeInput = input;

        const finishEdit = () => {
            const newText = input.value;
            // Update the element's label
            if (model.attr('label/text') !== undefined) {
                model.attr('label/text', newText);
            } else {
                model.attr('label/text', newText);
            }
            input.remove();
            activeInput = null;
        };

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                input.value = currentText; // Restore original
                input.blur();
            }
        });
    };

    paper.on('element:pointerdblclick', onElementDblClick);

    return () => {
        paper.off('element:pointerdblclick', onElementDblClick);
        if (activeInput) activeInput.remove();
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
    onEscape: () => void;
}): () => void {
    const onKeyDown = (e: KeyboardEvent) => {
        const isMod = e.metaKey || e.ctrlKey;

        // Ignore if typing in an input
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
