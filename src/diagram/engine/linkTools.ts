/**
 * linkTools.ts
 *
 * Minimal link interaction setup.
 * Currently a no-op stub — segment resizing was removed.
 * Kept as a module so Canvas.tsx import doesn't break.
 */
import { dia } from '@joint/core';

/**
 * Sets up link tools on the paper.
 * Currently returns an empty cleanup — no tools are installed.
 */
export function setupLinkTools(
    _paper: dia.Paper,
    _graph: dia.Graph,
): () => void {
    // No-op — segment resize was removed
    return () => { };
}
