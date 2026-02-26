# 🎓 Mastering the JointJS Features Project — Complete Learning Guide

> This guide takes you from zero to mastery. Follow each phase in order — each builds on the previous.

---

## Phase 1: Foundation Technologies

Before touching this project, you need solid fundamentals in these technologies.

### 1.1 TypeScript (2–3 days)
- **Why:** The entire project is TypeScript. You'll be lost without it.
- **Learn:**
  - Types, interfaces, generics, union/intersection types
  - `type` vs `interface`
  - Type assertions (`as`), type guards
  - Utility types: `Partial<T>`, `Record<K,V>`, `Omit<T,K>`, `Pick<T,K>`
- **Resource:** [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- **Practice:** Rewrite any small JS project in TypeScript

### 1.2 React 19 + Hooks (2–3 days)
- **Why:** All UI components use React functional components with hooks
- **Learn:**
  - `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`
  - `useContext` + Context API (used heavily in `DiagramProvider`)
  - `createContext` / `useContext` pattern
  - Refs for imperative DOM access (`useRef`)
  - Cleanup functions in `useEffect` (critical for JointJS lifecycle)
- **Resource:** [React.dev](https://react.dev/learn)

### 1.3 Next.js App Router (1–2 days)
- **Why:** The app uses Next.js 16 with the App Router
- **Learn:**
  - `app/` directory structure: `page.tsx`, `layout.tsx`
  - `'use client'` directive (every diagram file uses this)
  - Server vs Client components
  - Why SSR matters for styled-components (see `registry.tsx`)
- **Resource:** [Next.js Docs](https://nextjs.org/docs)

### 1.4 Styled Components (1 day)
- **Why:** All styling uses `styled-components` v6
- **Learn:**
  - `styled.div`, `styled.button`, template literals for CSS
  - ThemeProvider + accessing theme via `${({ theme }) => ...}`
  - Transient props (`$active`, `$open`) to avoid DOM warnings
  - SSR setup in Next.js (see `src/lib/registry.tsx`)
- **Resource:** [Styled Components Docs](https://styled-components.com/docs)

### 1.5 SVG Basics (1 day)
- **Why:** JointJS renders everything as SVG. Understanding SVG is essential.
- **Learn:**
  - SVG coordinate system, viewBox, transforms
  - Basic shapes: `<rect>`, `<circle>`, `<ellipse>`, `<path>`, `<polygon>`
  - SVG `<g>` groups, `<text>`, `<foreignObject>`
  - Path `d` attribute: M (move), L (line), C (curve), Z (close)
  - `pointer-events` attribute (critical for click handling)
- **Resource:** [MDN SVG Tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial)

---

## Phase 2: Mastering @joint/core

This is the MOST IMPORTANT phase. JointJS is the backbone of everything.

### 2.1 Core Concepts (2–3 days)

Read these in order. Each builds on the previous:

| Concept | What It Is | Where to Learn |
|---------|-----------|----------------|
| `dia.Graph` | The data model — holds all cells (elements + links) | [Graph docs](https://resources.jointjs.com/docs/jointjs/v4.0/joint.html#dia.Graph) |
| `dia.Paper` | The view — renders the graph as SVG | [Paper docs](https://resources.jointjs.com/docs/jointjs/v4.0/joint.html#dia.Paper) |
| `dia.Cell` | Base class for everything on the canvas | [Cell docs](https://resources.jointjs.com/docs/jointjs/v4.0/joint.html#dia.Cell) |
| `dia.Element` | A node/shape (extends Cell) | [Element docs](https://resources.jointjs.com/docs/jointjs/v4.0/joint.html#dia.Element) |
| `dia.Link` | A connector between elements (extends Cell) | [Link docs](https://resources.jointjs.com/docs/jointjs/v4.0/joint.html#dia.Link) |
| `dia.CellView` | Base view for rendering cells | |
| `dia.ElementView` | View for rendering an element | |
| `dia.LinkView` | View for rendering a link | |

**Key mental model:**
```
Graph (data)  ─────────>  Paper (view)
  ├── Element              ├── ElementView
  ├── Element              ├── ElementView
  └── Link                 └── LinkView
```

### 2.2 The Graph–Paper Relationship
```typescript
// Graph = the MODEL (stores data)
const graph = new dia.Graph();

// Paper = the VIEW (renders SVG)
const paper = new dia.Paper({
    el: document.getElementById('canvas'),
    model: graph,  // Paper renders THIS graph
    width: 800,
    height: 600,
});

// Adding to graph → automatically appears on paper
graph.addCell(new shapes.standard.Rectangle({ ... }));
```

- **Graph owns the data** — add/remove/modify cells here
- **Paper renders the graph** — handles SVG rendering, user events
- `paper.findViewByModel(cell)` — gets the view for a model cell
- `view.model` — gets the model from a view

### 2.3 Elements & Shapes (1–2 days)

```typescript
import { shapes } from '@joint/core';

// Built-in shapes
const rect = new shapes.standard.Rectangle();
const circle = new shapes.standard.Circle();
const ellipse = new shapes.standard.Ellipse();
const polygon = new shapes.standard.Polygon();
const path = new shapes.standard.Path();
```

**Key element properties:**
```typescript
element.position(100, 200);        // Set position
element.resize(120, 80);           // Set size
element.attr('body/fill', 'blue'); // Set SVG attributes
element.attr('label/text', 'Hi');  // Set label text
element.rotate(45);                // Rotate
element.getBBox();                 // Get bounding box {x, y, width, height}
element.toJSON();                  // Serialize to JSON
```

**Attrs deep dive:** The `attrs` object maps CSS-like selectors to SVG attributes:
```typescript
{
    attrs: {
        body: { fill: '#fff', stroke: '#333', rx: 8, ry: 8 },
        label: { text: 'Hello', fontSize: 14, fontFamily: 'Inter' },
    }
}
```
The selectors (`body`, `label`) correspond to parts defined in the shape's `markup`.

### 2.4 Ports (1 day)

Ports are connection points on elements. This project uses them extensively.

```typescript
element.addPort({ group: 'in', id: 'input1' });
element.addPort({ group: 'out', id: 'output1' });
```

Port groups define position and appearance:
```typescript
ports: {
    groups: {
        in:  { position: 'left',  attrs: { circle: { r: 6, fill: '#fff' } } },
        out: { position: 'right', attrs: { circle: { r: 6, fill: '#fff' } } },
    },
    items: [
        { group: 'in', id: 'in1' },
        { group: 'out', id: 'out1' },
    ]
}
```

**In this project:** See `BPM_PORT_CONFIG` in `Canvas.tsx` (line ~383).

### 2.5 Links & Routing (2 days)

```typescript
const link = new shapes.standard.Link({
    source: { id: element1.id, port: 'out1' },
    target: { id: element2.id, port: 'in1' },
    router: { name: 'manhattan' },          // Orthogonal path-finding
    connector: { name: 'rounded', args: { radius: 8 } },
    attrs: { line: { stroke: '#4A4A56', strokeWidth: 2 } },
});
```

**Router types** (how the path is calculated):
| Router | Behavior |
|--------|----------|
| `normal` | Straight lines through vertices |
| `orthogonal` | Right-angle paths through vertices |
| `manhattan` | Automatic obstacle-aware orthogonal routing |
| `metro` | Like manhattan but with diagonal shortcuts |

**Connector types** (how the path looks):
| Connector | Behavior |
|-----------|----------|
| `normal` | Straight line segments |
| `rounded` | Rounded corners (radius) |
| `smooth` | Bezier curves |
| `jumpover` | Arcs where links cross |

**In this project:** See `obstacleRouter.ts` and `createPaper.ts` (line 95–96).

### 2.6 Paper Events (2 days)

This is CRITICAL. Almost all interactivity comes from paper events.

```typescript
// Element events
paper.on('element:pointerclick', (elementView, evt) => { ... });
paper.on('element:pointerdblclick', (elementView, evt) => { ... });
paper.on('element:pointerdown', (elementView, evt, x, y) => { ... });
paper.on('element:pointermove', (elementView, evt, x, y) => { ... });
paper.on('element:pointerup', (elementView, evt, x, y) => { ... });
paper.on('element:mouseenter', (elementView, evt) => { ... });
paper.on('element:mouseleave', (elementView, evt) => { ... });

// Link events
paper.on('link:pointerclick', (linkView, evt) => { ... });
paper.on('link:mouseenter', (linkView, evt) => { ... });
paper.on('link:mouseleave', (linkView, evt) => { ... });
paper.on('link:connect', (linkView, evt) => { ... });

// Blank canvas events
paper.on('blank:pointerclick', (evt, x, y) => { ... });
paper.on('blank:pointerdown', (evt, x, y) => { ... });
paper.on('blank:pointerdblclick', (evt, x, y) => { ... });

// Graph events (on the graph, not paper)
graph.on('add', (cell) => { ... });
graph.on('remove', (cell) => { ... });
graph.on('change:position', (element) => { ... });
graph.on('change:size', (element) => { ... });
graph.on('change:attrs', (cell) => { ... });
```

**In this project:** See `interactions.ts` — the entire 1363-line file is event handlers.

### 2.7 Paper Configuration

Key paper options to understand:
```typescript
new dia.Paper({
    el,
    model: graph,
    width: 4000, height: 4000,
    gridSize: 20,               // Snap grid
    async: true,                // Async rendering for performance  
    frozen: true,               // Start frozen, unfreeze after setup
    linkPinning: false,         // Links must connect to ports
    magnetThreshold: 'onleave', // When dragging from port, connect on leave
    interactive: {              // What users can do
        linkMove: true,
        elementMove: true,
        labelMove: true,
    },
    defaultLink: () => new shapes.standard.Link({ ... }),
    validateConnection: (srcView, srcMagnet, tgtView, tgtMagnet) => { ... },
});
```

**In this project:** See `createPaper.ts`.

### 2.8 Coordinate Systems

JointJS has multiple coordinate spaces. Mastering them prevents many bugs:

```typescript
// Client → Local (viewport pixels → paper model coordinates)
const local = paper.clientToLocalPoint({ x: evt.clientX, y: evt.clientY });

// Local → Client (model coordinates → viewport pixels)
const client = paper.localToClientPoint({ x: 100, y: 200 });

// Page → Local
const local = paper.pageToLocalPoint({ x: evt.pageX, y: evt.pageY });

// Paper transforms
paper.scale(1.5);           // Zoom to 150%
paper.translate(100, 50);   // Pan by (100, 50)
const { sx, sy } = paper.scale();    // Get current zoom
const { tx, ty } = paper.translate(); // Get current pan
```

### 2.9 Useful API Reference

```typescript
// Graph queries
graph.getElements();           // All elements
graph.getLinks();              // All links
graph.getCells();              // All cells (elements + links)
graph.getConnectedLinks(element, { inbound: true }); // Incoming links
graph.getConnectedLinks(element, { outbound: true }); // Outgoing links

// Paper queries  
paper.findViewByModel(cell);   // Model → View
paper.findViewsInArea(rect);   // Elements in a rectangle
paper.getContentBBox();        // Bounding box of all content

// Cell methods
cell.isElement();              // Is it an element?
cell.isLink();                 // Is it a link?
cell.clone();                  // Deep clone
cell.remove();                 // Remove from graph
cell.toJSON();                 // Serialize
cell.id;                       // Unique ID

// Batches (group changes for undo)
graph.startBatch('operation-name');
// ... multiple changes ...
graph.stopBatch('operation-name');
```

---

## Phase 3: Project Architecture

Now that you understand the building blocks, study how this project assembles them.

### 3.1 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout — wraps with SSR registry
│   └── page.tsx                  # Entry — dynamically imports DiagramApp
├── lib/
│   └── registry.tsx              # Styled-components SSR setup
├── styles/
│   ├── theme.ts                  # Central design tokens (colors, spacing, z-index)
│   └── GlobalStyles.ts           # Global CSS reset + base styles
├── diagram/                      # ★ THE CORE — everything diagramming
│   ├── DiagramApp.tsx            # App shell — composes all components
│   ├── context/
│   │   └── DiagramProvider.tsx   # React context — global state
│   ├── components/               # UI components
│   │   ├── Canvas.tsx            # THE big one — creates Paper, sets up interactions
│   │   ├── WorkbenchLayout.tsx   # Full IDE layout (sidebar, tabs, status bar)
│   │   ├── Palette.tsx           # Shape palette (right sidebar)
│   │   ├── TopToolbar.tsx        # Toolbar (undo/redo, zoom, clipboard)
│   │   ├── Toolbar.tsx           # Secondary toolbar
│   │   ├── ConfigModal.tsx       # Element configuration modal
│   │   ├── ConnectionManager.tsx # Tree view of diagrams (left sidebar)
│   │   ├── ContextMenu.tsx       # Right-click menu
│   │   ├── Tooltip.tsx           # Hover tooltips
│   │   ├── Minimap.tsx           # Navigator minimap
│   │   └── PropertyPanel.tsx     # Property editor panel
│   └── engine/                   # ★ PURE LOGIC — no React
│       ├── createGraph.ts        # Graph factory (2 lines)
│       ├── createPaper.ts        # Paper factory with defaults
│       ├── interactions.ts       # ALL user interactions (1363 lines!)
│       ├── obstacleRouter.ts     # Manhattan routing + obstacle avoidance
│       ├── commandManager.ts     # Undo/Redo system
│       ├── clipboard.ts          # Copy/Cut/Paste
│       ├── snaplines.ts          # Magnetic alignment guides
│       ├── highlighter.ts        # Selection highlight effects
│       └── linkTools.ts          # Link interaction tools (currently stub)
```

### 3.2 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  DiagramProvider (React Context)                             │
│  ┌─────────┐ ┌─────────┐ ┌───────────────┐ ┌─────────────┐ │
│  │  graph   │ │  paper   │ │ commandManager│ │   state     │ │
│  │(dia.Graph│ │(dia.Paper│ │(UndoRedoMgr) │ │selectedCells│ │
│  │ )        │ │ | null)  │ │              │ │diagramType  │ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │interactMode │ │
│       │            │               │         └─────────────┘ │
└───────┼────────────┼───────────────┼─────────────────────────┘
        │            │               │
        ▼            ▼               ▼
   ┌─────────────────────────────────────┐
   │          Canvas.tsx                  │
   │  • Creates Paper from Graph          │
   │  • Sets up ALL interactions          │
   │  • Handles palette drop              │  
   │  • Calls setPaper() on context       │
   └──────────────┬──────────────────────┘
                  │ useEffect sets up:
        ┌─────────┼─────────────────────┐
        ▼         ▼         ▼           ▼
   interactions  snaplines  routing   linkTools
   (12 setups)              listeners
```

### 3.3 Interaction Pattern

Every interaction follows the same pattern:

```typescript
export function setupXxx(paper: dia.Paper, graph: dia.Graph, ...deps): () => void {
    // 1. Define state variables
    let someState = null;

    // 2. Define event handlers
    function onSomeEvent(...) { ... }

    // 3. Attach listeners
    paper.on('event:name', onSomeEvent);

    // 4. Return cleanup function
    return () => {
        paper.off('event:name', onSomeEvent);
        // cleanup state
    };
}
```

In `Canvas.tsx`, they're wired as:
```typescript
useEffect(() => {
    const cleanups: (() => void)[] = [];
    cleanups.push(setupPanZoom(paper, ...));
    cleanups.push(setupLassoSelection(paper, graph, ...));
    // ... more setups
    return () => cleanups.forEach(fn => fn());
}, [paper]);
```

---

## Phase 4: Deep Dive Into Each Engine Module

Read these files in this order, studying each function:

### 4.1 `createGraph.ts` — Start here (simplest)
Just creates a `new dia.Graph()`. Understand why it's a separate file (dependency injection).

### 4.2 `createPaper.ts` — Paper factory
Study every option. Key things:
- `defaultLink` — how new connections look
- `validateConnection` — port-to-port rules
- `interactive` — what users can do
- `frozen: true` — paper starts frozen, Canvas unfreezes it

### 4.3 `highlighter.ts` — Selection visuals
Simple but teaches the CellView highlighting API.

### 4.4 `clipboard.ts` — Copy/Cut/Paste
Study `cell.toJSON()` / `graph.addCell(json)` serialization.
Understand paste offset logic.

### 4.5 `snaplines.ts` — Alignment guides
Study how it:
- Creates SVG overlay elements manually
- Computes alignment between bounding boxes
- Snaps element position during drag

### 4.6 `obstacleRouter.ts` — Routing engine
This is critical. Study:
- Manhattan router configuration options
- `startDirections` / `endDirections` (why right→left)
- `excludeEnds` — obstacle exclusion
- `rerouteAllLinks` — how routes update when elements move
- Debounced vs immediate recalculation

### 4.7 `commandManager.ts` — Undo/Redo
Study the Command pattern:
- How graph events (`add`, `remove`, `change`) create Commands
- Batching multiple changes into one undo step
- `reverseCommand` / `applyCommand` — undo/redo mechanics
- React integration via `subscribe()` pattern

### 4.8 `interactions.ts` — THE BIG ONE (1363 lines)
Study each setup function in order:

| # | Function | Lines | What It Does |
|---|----------|-------|-------------|
| 1 | `setupPanZoom` | 52–132 | Scroll zoom + shift/middle-click pan |
| 2 | `setupLassoSelection` | 141–277 | Rubber-band area selection |
| 3 | `setupDoubleClickSettings` | 283–406 | Inline edit OR config modal on dblclick |
| 4 | `setupContextMenu` | 414–451 | Right-click menu dispatching |
| 5 | `setupTooltips` | 457–505 | Hover tooltip on elements |
| 6 | `highlightCells` | 511–531 | Visual selection highlighting |
| 7 | `setupResizeRotate` | 602–1162 | Resize/rotate handles + mini toolbar |
| 8 | `setupKeyboardShortcuts` | ~1163+ | Ctrl+Z, Ctrl+C, Delete, etc. |
| 9 | `setupMultiSelectionMove` | ~1280+ | Drag multiple selected elements |

### 4.9 `Canvas.tsx` — The orchestrator
The most important component. Study:
- How it creates the Paper in `useEffect`
- How it wires up all 12+ interactions
- `createElementFromPalette` — the element factory (how shapes are defined)
- Drop handling for palette drag-and-drop
- How it calls `setPaper()` to share Paper with context

---

## Phase 5: Key Concepts You Must Master

### 5.1 React ↔ JointJS Integration

The tricky part: JointJS is an imperative SVG library, React is declarative.

**Pattern:** JointJS objects live OUTSIDE React's render cycle:
```typescript
// ✅ Correct: create in useState lazy initializer
const [graph] = useState(() => new dia.Graph());

// ✅ Correct: create Paper in useEffect (needs DOM)
useEffect(() => {
    const paper = new dia.Paper({ el: containerRef.current, model: graph });
    return () => paper.remove(); // cleanup
}, []);

// ❌ Wrong: don't create in render body
const graph = new dia.Graph(); // recreated every render!
```

### 5.2 React Strict Mode

Next.js runs Strict Mode by default — `useEffect` runs TWICE in development.
This means:
- Paper gets created → destroyed → created again
- Event listeners attach → detach → attach again
- **Always return cleanup functions** from `useEffect`

### 5.3 Coordinate Transforms

When the user clicks the screen at (clientX=500, clientY=300), you need to convert to paper-local coordinates accounting for:
- Paper pan (translate)
- Paper zoom (scale)
- Container offset

Use: `paper.clientToLocalPoint({ x: evt.clientX, y: evt.clientY })`

### 5.4 Batch Operations

When making multiple graph changes that should be one undo step:
```typescript
graph.startBatch('my-operation');
commandManager.startBatch('my-operation');
// ... make changes ...
commandManager.stopBatch();
graph.stopBatch('my-operation');
```

---

## Phase 6: Hands-On Exercises

### Exercise 1: Add a new shape type
1. Open `Canvas.tsx` → `createElementFromPalette()`
2. Add a new case (e.g., `'Database'`)
3. Use `shapes.standard.Cylinder` or create a custom shape
4. Add it to the palette in `Palette.tsx`

### Exercise 2: Add a new interaction
1. Create `src/diagram/engine/myInteraction.ts`
2. Follow the `setupXxx` pattern
3. Wire it up in `Canvas.tsx`'s `useEffect`
4. Example: double-click blank canvas → add an element at that position

### Exercise 3: Custom link styling
1. Modify `createPaper.ts` → `defaultLink`
2. Try different router/connector combinations
3. Add custom marker shapes (arrowheads)

### Exercise 4: Add a keyboard shortcut
1. Find `setupKeyboardShortcuts` in `interactions.ts`
2. Add a new shortcut (e.g., `Ctrl+D` to duplicate)
3. Use clipboard manager's copy+paste with offset

### Exercise 5: Implement link tools
1. Rewrite `linkTools.ts` from the no-op stub
2. Use `linkTools.Vertices` and `linkTools.Segments` from `@joint/core`
3. Show tools on `link:pointerclick`, hide on `blank:pointerclick`

---

## Phase 7: Essential Resources

### Official Documentation
- [JointJS API Reference](https://resources.jointjs.com/docs/jointjs/v4.0/joint.html)
- [JointJS Tutorials](https://resources.jointjs.com/tutorial)
- [JointJS Demo Apps](https://www.jointjs.com/demos)

### Source Code Reading
- [JointJS GitHub](https://github.com/clientIO/joint) — read the source
- **Type definitions:** `node_modules/@joint/core/types/joint.d.ts` (5000+ lines of API surface)

### Key Type Definition Sections
| Section | Lines (approx) | Content |
|---------|---------------|---------|
| `dia.Graph` | 200–350 | Graph methods |
| `dia.Paper` | 400–800 | Paper options, methods, events |
| `dia.Element` | 850–1000 | Element methods |
| `dia.Link` | 950–1100 | Link methods, router/connector |
| `dia.CellView` | 1100–1300 | View methods |
| `shapes.standard` | 1600–1800 | Built-in shapes |
| `routers` | 3950–4050 | Router types |
| `connectors` | 4050–4100 | Connector types |
| `linkTools` | 4800–5000 | Link tool classes |

### Debugging Tips
- **Browser DevTools → Elements tab:** Inspect the SVG structure JointJS generates
- **Console:** `paper.model.toJSON()` dumps the entire graph as JSON
- **Console:** `paper.findViewByModel(cell)` to inspect a specific cell's view
- **Console:** `paper.scale()` and `paper.translate()` to check transformation state

---

## Phase 8: Reading Order Checklist

Check each off as you complete it:

- [ ] Read `package.json` — understand all dependencies
- [ ] Read `src/app/page.tsx` → `layout.tsx` — understand entry point
- [ ] Read `src/lib/registry.tsx` — understand SSR setup
- [ ] Read `src/styles/theme.ts` → `GlobalStyles.ts` — understand design tokens
- [ ] Read `src/diagram/DiagramApp.tsx` — understand component composition
- [ ] Read `src/diagram/context/DiagramProvider.tsx` — understand state management
- [ ] Read `src/diagram/engine/createGraph.ts` — simplest engine file
- [ ] Read `src/diagram/engine/createPaper.ts` — paper configuration
- [ ] Read `src/diagram/engine/highlighter.ts` — simple CellView API usage
- [ ] Read `src/diagram/engine/clipboard.ts` — JSON serialization pattern
- [ ] Read `src/diagram/engine/snaplines.ts` — custom SVG overlay pattern
- [ ] Read `src/diagram/engine/obstacleRouter.ts` — manhattan routing
- [ ] Read `src/diagram/engine/commandManager.ts` — undo/redo system
- [ ] Read `src/diagram/engine/interactions.ts` — ALL interactions (study each setup function)
- [ ] Read `src/diagram/components/Canvas.tsx` — the orchestrator
- [ ] Read `src/diagram/components/Palette.tsx` — drag-and-drop palette
- [ ] Read `src/diagram/components/WorkbenchLayout.tsx` — IDE-style layout
- [ ] Read `src/diagram/components/TopToolbar.tsx` — toolbar with undo/redo
- [ ] Read `src/diagram/components/ConfigModal.tsx` — element config dialog
- [ ] Read `src/diagram/components/ConnectionManager.tsx` — tree sidebar
- [ ] Read `src/diagram/components/Minimap.tsx` — navigator minimap
- [ ] Read `src/diagram/components/ContextMenu.tsx` — right-click menu
- [ ] Read `node_modules/@joint/core/types/joint.d.ts` — full API surface

---

> **Estimated total time:** 2–3 weeks of focused study to go from beginner to confidently modifying this project.
