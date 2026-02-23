/**
 * clipboard.ts
 *
 * Implements Copy/Paste functionality for JointJS elements.
 * Uses direct cell JSON serialization for maximum compatibility.
 */
import { dia } from '@joint/core';

export class ClipboardManager {
    private graph: dia.Graph;
    private clipboard: Record<string, unknown>[] = [];
    private pasteOffset = 40;
    private currentPasteCount = 0;

    constructor(graph: dia.Graph) {
        this.graph = graph;
    }

    /**
     * Copies the given cells to the internal clipboard.
     * Stores cell JSON for reliable cloning across shape types.
     */
    copy(cells: dia.Cell[]): void {
        if (!cells || cells.length === 0) return;

        // Store JSON snapshots of each cell
        this.clipboard = cells.map(cell => cell.toJSON());
        this.currentPasteCount = 0;
    }

    /**
     * Cuts the given cells — copies them to clipboard and removes from graph.
     */
    cut(cells: dia.Cell[]): void {
        if (!cells || cells.length === 0) return;
        this.copy(cells);
        this.graph.startBatch('cut');
        cells.forEach(cell => cell.remove());
        this.graph.stopBatch('cut');
    }

    /**
     * Checks if the clipboard has content.
     */
    hasContent(): boolean {
        return this.clipboard.length > 0;
    }

    /**
     * Pastes the elements currently in the clipboard into the graph.
     */
    paste(): dia.Cell[] {
        if (this.clipboard.length === 0) return [];

        this.currentPasteCount++;
        const offset = this.pasteOffset * this.currentPasteCount;

        this.graph.startBatch('paste');

        const pastedCells: dia.Cell[] = [];

        this.clipboard.forEach(cellJSON => {
            // Deep clone the JSON to avoid mutation
            const clonedJSON = JSON.parse(JSON.stringify(cellJSON));

            // Generate a new unique ID so it doesn't conflict
            delete clonedJSON.id;

            // Offset position for elements
            if (clonedJSON.position) {
                clonedJSON.position.x = (clonedJSON.position.x || 0) + offset;
                clonedJSON.position.y = (clonedJSON.position.y || 0) + offset;
            }

            // Add to graph — JointJS will auto-assign a new id
            const cell = this.graph.addCell(clonedJSON);
            if (cell) {
                // addCell returns the graph, we need to find the added cell
                const cells = this.graph.getCells();
                const lastCell = cells[cells.length - 1];
                if (lastCell) pastedCells.push(lastCell);
            }
        });

        this.graph.stopBatch('paste');

        return pastedCells;
    }

    /**
     * Clear the clipboard contents.
     */
    clear(): void {
        this.clipboard = [];
        this.currentPasteCount = 0;
    }
}
