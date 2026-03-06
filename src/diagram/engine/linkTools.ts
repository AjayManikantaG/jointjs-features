/**
 * linkTools.ts
 *
 * Adds interactive tools (arrowhead handles) to links on hover.
 * Users can drag the source or target arrowhead to reconnect a link
 * to a different port/element.
 */
import { dia, linkTools } from '@joint/core';

/**
 * Sets up link tools on the paper.
 *
 * On link hover, shows:
 * - TargetArrowhead — drag to reconnect the target end
 * - SourceArrowhead — drag to reconnect the source end
 *
 * Hold Ctrl and drag either arrowhead to redirect the link.
 */
export function setupLinkTools(
    paper: dia.Paper,
    _graph: dia.Graph,
): () => void {

    const onLinkMouseEnter = (linkView: dia.LinkView) => {
        const tools = new dia.ToolsView({
            tools: [
                new linkTools.TargetArrowhead(),
                new linkTools.SourceArrowhead(),
            ],
        });
        linkView.addTools(tools);
    };

    const onLinkMouseLeave = (linkView: dia.LinkView) => {
        linkView.removeTools();
    };

    paper.on('link:mouseenter', onLinkMouseEnter);
    paper.on('link:mouseleave', onLinkMouseLeave);

    return () => {
        paper.off('link:mouseenter', onLinkMouseEnter);
        paper.off('link:mouseleave', onLinkMouseLeave);
    };
}
