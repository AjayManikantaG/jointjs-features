/**
 * commandManager.ts
 * 
 * Custom Undo/Redo system using the Command pattern.
 * 
 * Architecture:
 * - Listens to graph model changes (add, remove, change)
 * - Stores deltas as Command objects on undoStack
 * - undo() reverses the last command, pushes to redoStack
 * - redo() re-applies from redoStack
 * - Supports batching: multiple changes become one undo step
 * 
 * Why custom instead of @joint/core's CommandManager?
 * - CommandManager is part of JointJS+ (paid)
 * - We need full control over what's tracked
 * - Custom implementation is more testable and extendable
 */
import { dia } from '@joint/core';

/** Types of changes we track */
type CommandType = 'add' | 'remove' | 'change';

/** A single recorded change */
interface Command {
    type: CommandType;
    /** The cell ID this change affects */
    cellId: string;
    /** Previous state (for undo) */
    previousState: Record<string, unknown> | null;
    /** New state (for redo) */
    newState: Record<string, unknown> | null;
    /** Full cell JSON for add/remove operations */
    cellJSON?: Record<string, unknown>;
}

/** A batch of commands that undo/redo together */
interface BatchCommand {
    commands: Command[];
    label?: string;
}

/** Callback type for state change notifications */
type StateChangeCallback = () => void;

/**
 * UndoRedoManager
 * 
 * Tracks all graph modifications and provides undo/redo capability.
 * Uses a stack-based approach with support for batch operations.
 */
export class UndoRedoManager {
    private undoStack: BatchCommand[] = [];
    private redoStack: BatchCommand[] = [];
    private graph: dia.Graph;
    private isExecuting = false; // Prevents recording undo/redo operations
    private currentBatch: Command[] | null = null;
    private batchDepth = 0;
    private listeners: StateChangeCallback[] = [];
    private graphListeners: (() => void)[] = [];
    private maxStackSize = 100; // Limit memory usage

    constructor(graph: dia.Graph) {
        this.graph = graph;
        this.attachListeners();
    }

    /** Subscribe to state changes (for React re-renders) */
    subscribe(callback: StateChangeCallback): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
        };
    }

    /** Notify all subscribers of state change */
    private notify(): void {
        this.listeners.forEach((cb) => cb());
    }

    /** Attach graph event listeners to track changes */
    public attachListeners(): void {
        if (this.graphListeners.length > 0) return; // Already attached

        // Track cell additions
        const onAdd = (cell: dia.Cell) => {
            if (this.isExecuting) return;
            this.pushCommand({
                type: 'add',
                cellId: cell.id as string,
                previousState: null,
                newState: null,
                cellJSON: cell.toJSON(),
            });
        };

        // Track cell removals
        const onRemove = (cell: dia.Cell) => {
            if (this.isExecuting) return;
            this.pushCommand({
                type: 'remove',
                cellId: cell.id as string,
                previousState: null,
                newState: null,
                cellJSON: cell.toJSON(),
            });
        };

        // Track attribute changes
        const onChange = (cell: dia.Cell, opt: Record<string, unknown>) => {
            if (this.isExecuting || opt.dry) return;

            // Optimization: Only track specific attributes that changed in this tick
            const changed = cell.changed;
            if (!changed || Object.keys(changed).length === 0) return;

            const previousState: Record<string, unknown> = {};
            const newState: Record<string, unknown> = {};
            const prevAttrs = cell.previousAttributes();

            // Only capture the delta
            Object.keys(changed).forEach((key) => {
                // Skip internal/computed properties if necessary, but keep core attributes
                previousState[key] = JSON.parse(JSON.stringify(prevAttrs[key]));
                newState[key] = JSON.parse(JSON.stringify(cell.get(key)));
            });

            this.pushCommand({
                type: 'change',
                cellId: cell.id as string,
                previousState,
                newState,
            });
        };

        this.graph.on('add', onAdd);
        this.graph.on('remove', onRemove);
        this.graph.on('change', onChange);

        // Store cleanup functions
        this.graphListeners = [
            () => this.graph.off('add', onAdd),
            () => this.graph.off('remove', onRemove),
            () => this.graph.off('change', onChange),
        ];
    }

    /** Push a command onto the current batch or directly to undoStack */
    private pushCommand(command: Command): void {
        if (this.currentBatch !== null) {
            this.currentBatch.push(command);
        } else {
            this.undoStack.push({ commands: [command] });
            // Trim stack if too large
            if (this.undoStack.length > this.maxStackSize) {
                this.undoStack.shift();
            }
            // Clear redo stack on new action
            this.redoStack = [];
            this.notify();
        }
    }

    /**
     * Start a batch — all changes until stopBatch() become one undo step.
     * Batches can be nested; only the outermost completes the batch.
     */
    startBatch(label?: string): void {
        this.batchDepth++;
        if (this.batchDepth === 1) {
            this.currentBatch = [];
        }
        // Label is stored but only used at depth 1
        if (label && this.batchDepth === 1) {
            // Will be applied when batch completes
            (this as Record<string, unknown>)._pendingLabel = label;
        }
    }

    /** End the current batch and push it to the undo stack */
    stopBatch(): void {
        this.batchDepth = Math.max(0, this.batchDepth - 1);
        if (this.batchDepth === 0 && this.currentBatch !== null) {
            if (this.currentBatch.length > 0) {
                const label = (this as Record<string, unknown>)._pendingLabel as string | undefined;
                this.undoStack.push({ commands: this.currentBatch, label });
                if (this.undoStack.length > this.maxStackSize) {
                    this.undoStack.shift();
                }
                this.redoStack = [];
            }
            this.currentBatch = null;
            delete (this as Record<string, unknown>)._pendingLabel;
            this.notify();
        }
    }

    /** Whether undo is available */
    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /** Whether redo is available */
    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /** Undo the last batch of commands */
    undo(): void {
        const batch = this.undoStack.pop();
        if (!batch) return;

        this.isExecuting = true;
        try {
            // Reverse the commands in reverse order
            for (let i = batch.commands.length - 1; i >= 0; i--) {
                const cmd = batch.commands[i];
                this.reverseCommand(cmd);
            }
            this.redoStack.push(batch);
        } finally {
            this.isExecuting = false;
            this.notify();
        }
    }

    /** Redo the last undone batch */
    redo(): void {
        const batch = this.redoStack.pop();
        if (!batch) return;

        this.isExecuting = true;
        try {
            for (const cmd of batch.commands) {
                this.applyCommand(cmd);
            }
            this.undoStack.push(batch);
        } finally {
            this.isExecuting = false;
            this.notify();
        }
    }

    /** Reverse a single command (for undo) */
    private reverseCommand(cmd: Command): void {
        switch (cmd.type) {
            case 'add': {
                // Undo add = remove the cell
                const cell = this.graph.getCell(cmd.cellId);
                if (cell) cell.remove();
                break;
            }
            case 'remove': {
                // Undo remove = re-add the cell
                if (cmd.cellJSON) {
                    this.graph.addCell(cmd.cellJSON as unknown as dia.Cell);
                }
                break;
            }
            case 'change': {
                // Undo change = restore previous attributes
                const cell = this.graph.getCell(cmd.cellId);
                if (cell && cmd.previousState) {
                    cell.set(cmd.previousState);
                }
                break;
            }
        }
    }

    /** Apply a single command (for redo) */
    private applyCommand(cmd: Command): void {
        switch (cmd.type) {
            case 'add': {
                // Redo add = re-add the cell
                if (cmd.cellJSON) {
                    this.graph.addCell(cmd.cellJSON as unknown as dia.Cell);
                }
                break;
            }
            case 'remove': {
                // Redo remove = remove the cell
                const cell = this.graph.getCell(cmd.cellId);
                if (cell) cell.remove();
                break;
            }
            case 'change': {
                // Redo change = apply new state
                const cell = this.graph.getCell(cmd.cellId);
                if (cell && cmd.newState) {
                    cell.set(cmd.newState);
                }
                break;
            }
        }
    }

    /** Clear all history */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this.notify();
    }

    /** Detach graph event listeners */
    public detachListeners(): void {
        this.graphListeners.forEach((cleanup) => cleanup());
        this.graphListeners = [];
    }

    /** Clean up all resources */
    public destroy(): void {
        this.detachListeners();
        this.listeners = [];
    }
}

/**
 * Factory function to create an UndoRedoManager for a graph.
 */
export function createCommandManager(graph: dia.Graph): UndoRedoManager {
    return new UndoRedoManager(graph);
}
