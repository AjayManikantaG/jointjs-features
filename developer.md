# Diagram Studio — Developer Guide

## Overview

A **production-grade diagramming application** built with Next.js, `@joint/core`, styled-components, and TypeScript. Designed as a foundation for flow editors, BPMN designers, topology maps, or visual modeling tools.

## Architecture

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (SSR registry, fonts)
│   └── page.tsx                # Dynamic import of DiagramApp (no SSR)
├── diagram/
│   ├── DiagramApp.tsx          # Main app shell composing all components
│   ├── engine/                 # Pure TS — no React dependency
│   │   ├── createGraph.ts      # dia.Graph factory
│   │   ├── createPaper.ts      # dia.Paper factory (async rendering)
│   │   ├── commandManager.ts   # Undo/redo command pattern
│   │   ├── obstacleRouter.ts   # Manhattan obstacle-aware routing
│   │   └── interactions.ts     # Pan/zoom, lasso, inline edit, shortcuts
│   ├── context/
│   │   └── DiagramProvider.tsx  # React context (graph, paper, selection)
│   └── components/
│       ├── Canvas.tsx           # Paper container + drag-drop + interactions
│       ├── Toolbar.tsx          # Floating action toolbar
│       ├── Palette.tsx          # Draggable shape palette
│       ├── Minimap.tsx          # Bird-view navigator
│       ├── PropertyPanel.tsx    # Selected cell property editor
│       ├── ContextMenu.tsx      # Right-click context menu
│       └── Tooltip.tsx          # Hover tooltip
├── styles/
│   ├── theme.ts                # Dark theme design tokens
│   └── GlobalStyles.ts         # Global CSS replacing JointJS defaults
├── lib/
│   └── registry.tsx            # Styled-components SSR registry
└── styled.d.ts                 # Theme type augmentation
```

## Key Design Decisions

### Engine Layer (Pure TypeScript)
The `engine/` directory contains **zero React imports**. This decouples graph logic from rendering:
- Testable in isolation
- Reusable across frameworks
- Easy to swap @joint/core versions

### Obstacle-Aware Routing
`obstacleRouter.ts` uses Manhattan routing with:
- **Source/target exclusion**: connected elements are never obstacles
- **Dynamic recalculation**: listeners on `change:position`, `change:size`, `change:angle`
- **Debounced rerouting**: prevents excessive recalculation during rapid drag (50ms debounce)
- All links automatically avoid unconnected elements

### Undo/Redo (Command Pattern)
`commandManager.ts` tracks graph events (`add`, `remove`, `change`):
- Stack-based with 100-entry limit to bound memory
- Batch support for grouping multiple changes into one undo step
- Subscribable for React state sync
- `isExecuting` flag prevents recording undo/redo operations as new commands

### No JointJS CSS
We own all visual styling via `GlobalStyles.ts`:
- SVG element styles (body, labels, ports)
- Link styles (connection, markers, tools)
- Selection frame and highlights
- Inline editor overlay
- Custom scrollbar, animations

## Running

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build
```

## User Interactions

| Interaction | Trigger |
|---|---|
| Pan | Shift + drag on blank / Middle mouse drag |
| Zoom | Scroll wheel (cursor-centered) |
| Select element | Click on element |
| Multi-select | Drag on blank area (lasso) |
| Clear selection | Click on blank |
| Inline edit | Double-click element |
| Context menu | Right-click |
| Add node | Drag from Palette to Canvas |
| Undo/Redo | ⌘Z / ⌘⇧Z |
| Delete | Delete / Backspace key |
| Select all | ⌘A |

## Extending

### Adding a Custom Shape
1. Define the shape in `Canvas.tsx → createElementFromPalette()`
2. Add a palette entry in `Palette.tsx → SHAPES[]`
3. Add property handling in `PropertyPanel.tsx` if needed

### Adding a New Interaction
1. Create a `setupXxx(paper, graph)` function in `interactions.ts`
2. Return a cleanup function
3. Call it in `Canvas.tsx useEffect` and add cleanup to the array

### Custom Routing Rules
Override `ROUTER_DEFAULTS` in `obstacleRouter.ts` or pass `overrides` to `getObstacleRouterConfig()`.

### Future: Collaboration
The engine layer is designed for this:
1. Serialize graph via `graph.toJSON()`
2. Send deltas via WebSocket
3. Apply remote changes via `graph.addCell()` / `cell.set()`
4. Use `commandManager.isExecuting` pattern to ignore remote changes in local undo stack

## Performance Tips

- **Async rendering** is enabled by default in `createPaper.ts`
- **Batching**: use `graph.startBatch()` / `stopBatch()` for bulk operations
- **Debounced routing**: rerouting is debounced at 50ms during drag
- **Frozen paper**: paper starts frozen, unfreezes after setup
- **Dynamic import**: `@joint/core` is only loaded client-side (no SSR)
- For 100+ elements, consider virtualizing the minimap updates
