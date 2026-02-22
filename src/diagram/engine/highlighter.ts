import { dia, highlighters } from '@joint/core';

export function highlightCells(paper: dia.Paper, cells: dia.Cell[]) {
    // Clear existing
    const elements = paper.model.getElements();
    elements.forEach(el => {
        const view = el.findView(paper);
        if (view) {
            highlighters.mask.remove(view);
        }
    });

    // Apply new highlight
    cells.forEach(cell => {
        if (!cell.isElement()) return;
        const view = cell.findView(paper);
        if (view) {
            highlighters.mask.add(view, { selector: 'root' }, 'selection-mask', {
                padding: 4,
                layer: 'front',
                attrs: {
                    stroke: '#7B61FF',
                    'stroke-width': 2,
                    'stroke-linejoin': 'round',
                    'stroke-dasharray': '5,5',
                    fill: 'rgba(123, 97, 255, 0.1)',
                }
            });
        }
    });
}
