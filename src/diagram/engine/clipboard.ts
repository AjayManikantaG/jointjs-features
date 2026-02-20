/**
 * clipboard.ts
 *
 * Implements Copy/Paste functionality for JointJS elements.
 * Emulates the commercial JointJS+ Clipboard feature.
 */
import { dia } from '@joint/core';

export class ClipboardManager {
    private graph: dia.Graph;
    private clipboard: dia.Cell[] = [];
    private pasteOffset = 40;
    private currentPasteCount = 0;

    constructor(graph: dia.Graph) {
        this.graph = graph;
    }

    /**
     * Copies the given cells to the internal clipboard.
     * Uses JointJS graph.cloneSubgraph to maintain links between copied elements properly.
     */
    copy(cells: dia.Cell[]): void {
        if (!cells || cells.length === 0) return;

        // Clone the cells right away to get a snapshot
        // We clone the subgraph to preserve links that connect two copied elements
        const clones = this.graph.cloneSubgraph(cells);

        // Filter out links that were not fully copied (where source or target is missing)
        // because cloneSubgraph might include dangling links in some versions
        this.clipboard = Object.values(clones).filter(cell => {
            if (cell.isLink()) {
                const link = cell as dia.Link;
                const src = link.source() as { id?: string };
                const tgt = link.target() as { id?: string };
                // Keep link only if both source and target are also in the clipboard clones
                // cloneSubgraph usually handles this but it's safe to check.
                if (src.id && !clones[src.id]) return false;
                if (tgt.id && !clones[tgt.id]) return false;
            }
            return true;
        });

        this.currentPasteCount = 0; // Reset paste offset counter
    }

    /**
     * Pastes the elements currently in the clipboard into the graph.
     */
    paste(): dia.Cell[] {
        if (this.clipboard.length === 0) return [];

        this.currentPasteCount++;
        const totalOffset = this.pasteOffset * this.currentPasteCount;

        // Clone the clipboard contents for insertion
        const clonesToInsertMap = this.graph.cloneSubgraph(this.clipboard);
        const clonesToInsert = Object.values(clonesToInsertMap);

        // Apply offset translation only to elements (links auto-update if attached)
        clonesToInsert.forEach(cell => {
            if (cell.isElement()) {
                const element = cell as dia.Element;
                element.translate(this.pasteOffset, this.pasteOffset);
            }
        });

        // Insert into graph as a batch for undo/redo
        this.graph.startBatch('paste');
        this.graph.addCells(clonesToInsert);
        this.graph.stopBatch('paste');

        // We update the clipboard to these new clones so the next paste offsets from them
        this.clipboard = clonesToInsert;

        return clonesToInsert;
    }

    /**
     * Clear the clipboard contents.
     */
    clear(): void {
        this.clipboard = [];
        this.currentPasteCount = 0;
    }
}
