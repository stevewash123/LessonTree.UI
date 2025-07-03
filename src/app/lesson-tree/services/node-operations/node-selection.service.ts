// **COMPLETE FILE** - NodeSelectionService with Dual Signal/Observable Pattern
// RESPONSIBILITY: Tracks selected tree nodes across all components with source tracking and history.
// DOES NOT: Handle node data or API operations - only selection state management.
// CALLED BY: TreeWrapper, Calendar, InfoPanel, PanelStateService

import { computed, Injectable, signal } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { TreeData } from '../../../models/tree-node';

export type NodeType = 'Course' | 'Topic' | 'SubTopic' | 'Lesson';
export type SelectionSource = 'tree' | 'calendar' | 'infopanel' | 'programmatic';

export interface SelectionEvent {
  node: TreeData | null;
  source: SelectionSource;
  timestamp: Date;
}

// ✅ Observable event interfaces
export interface NodeSelectionChangeEvent {
  previousNode: TreeData | null;
  newNode: TreeData | null;
  source: SelectionSource;
  changeType: 'select' | 'clear' | 'switch';
  timestamp: Date;
}

export interface SelectionSourceChangeEvent {
  node: TreeData | null;
  previousSource: SelectionSource;
  newSource: SelectionSource;
  timestamp: Date;
}

export interface CrossComponentNavigationEvent {
  fromComponent: SelectionSource;
  toComponent: SelectionSource;
  node: TreeData | null;
  navigationReason: 'user-click' | 'programmatic' | 'coordination';
  timestamp: Date;
}

export interface SelectionHistoryEvent {
  action: 'added' | 'cleared';
  historyLength: number;
  recentSelection: SelectionEvent | null;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NodeSelectionService {

  // ✅ Observable events for cross-component coordination
  private readonly _nodeSelectionChanged$ = new Subject<NodeSelectionChangeEvent>();
  private readonly _selectionSourceChanged$ = new Subject<SelectionSourceChangeEvent>();
  private readonly _crossComponentNavigation$ = new Subject<CrossComponentNavigationEvent>();
  private readonly _selectionHistoryChanged$ = new Subject<SelectionHistoryEvent>();

  // Public observables for business logic subscriptions
  readonly nodeSelectionChanged$ = this._nodeSelectionChanged$.asObservable();
  readonly selectionSourceChanged$ = this._selectionSourceChanged$.asObservable();
  readonly crossComponentNavigation$ = this._crossComponentNavigation$.asObservable();
  readonly selectionHistoryChanged$ = this._selectionHistoryChanged$.asObservable();

  // ✅ Signal state for reactive UI
  private readonly _selectedNode = signal<TreeData | null>(null);
  private readonly _selectionSource = signal<SelectionSource>('programmatic');
  private readonly _selectionHistory = signal<SelectionEvent[]>([]);

  // Public readonly signals for reactive UI
  readonly selectedNode = this._selectedNode.asReadonly();
  readonly selectionSource = this._selectionSource.asReadonly();
  readonly selectionHistory = this._selectionHistory.asReadonly();

  // Computed signals for derived state (keep as signals for reactive UI)
  readonly hasSelection = computed(() => this._selectedNode() !== null);
  readonly selectedNodeType = computed(() => this._selectedNode()?.nodeType || null);
  readonly selectedNodeId = computed(() => this._selectedNode()?.nodeId || null);
  readonly isSelectedNodeType = computed(() => (type: NodeType) => this._selectedNode()?.nodeType === type);

  // Course context computed signal - extracts courseId from any selected node
  readonly activeCourseId = computed(() => this._selectedNode()?.courseId ?? null);

  // Individual node type computed signals for specific type checking
  readonly selectedTopic = computed(() => {
    const node = this._selectedNode();
    return node?.nodeType === 'Topic' ? node : null;
  });

  readonly selectedSubTopic = computed(() => {
    const node = this._selectedNode();
    return node?.nodeType === 'SubTopic' ? node : null;
  });

  readonly selectedLesson = computed(() => {
    const node = this._selectedNode();
    return node?.nodeType === 'Lesson' ? node : null;
  });

  // Selection count by type (keep as computed signal for reactive statistics)
  readonly selectionStats = computed(() => {
    const history = this._selectionHistory();
    const stats = {
      total: history.length,
      byCourse: history.filter(e => e.node?.nodeType === 'Course').length,
      byTopic: history.filter(e => e.node?.nodeType === 'Topic').length,
      bySubTopic: history.filter(e => e.node?.nodeType === 'SubTopic').length,
      byLesson: history.filter(e => e.node?.nodeType === 'Lesson').length,
      bySource: {
        tree: history.filter(e => e.source === 'tree').length,
        calendar: history.filter(e => e.source === 'calendar').length,
        infopanel: history.filter(e => e.source === 'infopanel').length,
        programmatic: history.filter(e => e.source === 'programmatic').length
      }
    };
    return stats;
  });

  constructor() {
    console.log('[NodeSelectionService] Initialized with dual Signal/Observable pattern');
  }

  // ✅ ENHANCED: Select a node with Observable event emission
  selectNode(node: TreeData | null, source: SelectionSource = 'programmatic'): void {
    const previousNode = this._selectedNode();
    const previousSource = this._selectionSource();

    // Don't update if selecting the same node from the same source
    if (previousNode === node && previousSource === source) {
      return;
    }

    // Determine change type
    let changeType: 'select' | 'clear' | 'switch';
    if (node === null) {
      changeType = 'clear';
    } else if (previousNode === null) {
      changeType = 'select';
    } else {
      changeType = 'switch';
    }

    // ✅ Update signal state
    this._selectedNode.set(node);
    this._selectionSource.set(source);

    // Add to history
    const selectionEvent: SelectionEvent = {
      node,
      source,
      timestamp: new Date()
    };

    const currentHistory = this._selectionHistory();
    const updatedHistory = [...currentHistory, selectionEvent];

    // Keep only last 50 selections for performance
    if (updatedHistory.length > 50) {
      updatedHistory.shift();
    }

    this._selectionHistory.set(updatedHistory);

    // ✅ Emit Observable events for business logic coordination

    // 1. Node selection changed event
    this._nodeSelectionChanged$.next({
      previousNode,
      newNode: node,
      source,
      changeType,
      timestamp: new Date()
    });

    // 2. Selection source changed event (if source changed)
    if (previousSource !== source) {
      this._selectionSourceChanged$.next({
        node,
        previousSource,
        newSource: source,
        timestamp: new Date()
      });

      // 3. Cross-component navigation event (if both sources are component-based)
      if (this.isComponentSource(previousSource) && this.isComponentSource(source)) {
        this._crossComponentNavigation$.next({
          fromComponent: previousSource,
          toComponent: source,
          node,
          navigationReason: 'user-click',
          timestamp: new Date()
        });
      }
    }

    // 4. Selection history changed event
    this._selectionHistoryChanged$.next({
      action: 'added',
      historyLength: updatedHistory.length,
      recentSelection: selectionEvent,
      timestamp: new Date()
    });
  }

  // ✅ ENHANCED: Clear selection with Observable event emission
  clearSelection(source: SelectionSource = 'programmatic'): void {
    const previousNode = this._selectedNode();

    if (previousNode !== null) {
      // Use selectNode to handle all the event emission logic
      this.selectNode(null, source);
    }
  }

  // Helper method to determine if source is a component (not programmatic)
  private isComponentSource(source: SelectionSource): boolean {
    return source === 'tree' || source === 'calendar' || source === 'infopanel';
  }

  /**
   * Format raw ID to proper nodeId format for tree operations
   */
  private formatNodeId(id: number, nodeType: NodeType): string {
    switch (nodeType) {
      case 'Course':
        return `course_${id}`;
      case 'Topic':
        return `topic_${id}`;
      case 'SubTopic':
        return `subtopic_${id}`;
      case 'Lesson':
        return `lesson_${id}`;
      default:
        console.warn('[NodeSelectionService] Unknown node type for formatting:', nodeType);
        return id.toString();
    }
  }

  /**
   * Parse nodeId to extract nodeType and raw ID
   */
  private parseNodeId(nodeId: string): { nodeType: NodeType; id: number } | null {
    const parts = nodeId.split('_');
    if (parts.length !== 2) {
      console.warn('[NodeSelectionService] Invalid nodeId format:', nodeId);
      return null;
    }

    const [typeStr, idStr] = parts;
    const id = parseInt(idStr, 10);

    if (isNaN(id)) {
      console.warn('[NodeSelectionService] Invalid ID in nodeId:', nodeId);
      return null;
    }

    let nodeType: NodeType;
    switch (typeStr.toLowerCase()) {
      case 'course':
        nodeType = 'Course';
        break;
      case 'topic':
        nodeType = 'Topic';
        break;
      case 'subtopic':
        nodeType = 'SubTopic';
        break;
      case 'lesson':
        nodeType = 'Lesson';
        break;
      default:
        console.warn('[NodeSelectionService] Unknown node type in nodeId:', nodeId);
        return null;
    }

    return { nodeType, id };
  }

  // Select by raw database ID with nodeType (used by Calendar, etc.)
  selectById(id: number, nodeType: NodeType, source: SelectionSource = 'programmatic'): void {
    let courseId = 0; // Default for new courses or no selection

    // Try to get courseId from current selection context
    const currentNode = this._selectedNode();
    if (currentNode) {
      courseId = currentNode.courseId;
    } else if (nodeType !== 'Course') {
      // If we're selecting a non-Course node but have no context, this might be an error
      console.warn('[NodeSelectionService] Selecting non-Course node without course context');
    }

    // For Course selections, use the course's own ID
    if (nodeType === 'Course') {
      courseId = id;
    }

    // Format nodeId properly for tree compatibility
    const formattedNodeId = this.formatNodeId(id, nodeType);

    const node: TreeData = {
      id: id,
      courseId: courseId,
      nodeId: formattedNodeId,
      nodeType,
      title: `${nodeType} ${id}`,
      description: '',
      archived: false,
      visibility: 'Private',
      userId: 0,
      sortOrder: 0
    };

    this.selectNode(node, source);
  }

  // Select by formatted nodeId (used by Tree, etc.)
  selectByNodeId(nodeId: string, source: SelectionSource = 'programmatic'): void {
    const parsed = this.parseNodeId(nodeId);
    if (!parsed) {
      console.error('[NodeSelectionService] Cannot select - invalid nodeId format:', nodeId);
      return;
    }

    const { nodeType, id } = parsed;

    // Get courseId from context or parse from nodeId
    let courseId = 0;
    const currentNode = this._selectedNode();
    if (currentNode) {
      courseId = currentNode.courseId;
    } else if (nodeType === 'Course') {
      courseId = id;
    }

    const node: TreeData = {
      id: id,
      courseId: courseId,
      nodeId: nodeId, // Already formatted
      nodeType,
      title: `${nodeType} ${id}`,
      description: '',
      archived: false,
      visibility: 'Private',
      userId: 0,
      sortOrder: 0
    };

    this.selectNode(node, source);
  }

  // Check if a specific node is selected
  isNodeSelected(node: TreeData): boolean {
    const selected = this._selectedNode();
    return selected !== null &&
      selected.nodeId === node.nodeId &&
      selected.nodeType === node.nodeType;
  }

  // Check if a node with specific raw ID and type is selected
  isSelected(id: number, nodeType: NodeType): boolean {
    const selected = this._selectedNode();
    const formattedNodeId = this.formatNodeId(id, nodeType);
    return selected !== null &&
      selected.nodeId === formattedNodeId &&
      selected.nodeType === nodeType;
  }

  // Check if a node with specific formatted nodeId is selected
  isSelectedByNodeId(nodeId: string): boolean {
    const selected = this._selectedNode();
    return selected !== null && selected.nodeId === nodeId;
  }

  // Get recent selections of a specific type
  getRecentSelectionsByType(nodeType: NodeType, limit: number = 10): SelectionEvent[] {
    return this._selectionHistory()
      .filter(event => event.node?.nodeType === nodeType)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  // Get recent selections from a specific source
  getRecentSelectionsBySource(source: SelectionSource, limit: number = 10): SelectionEvent[] {
    return this._selectionHistory()
      .filter(event => event.source === source)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  // ✅ ENHANCED: Clear selection history with Observable event emission
  clearHistory(): void {
    const previousLength = this._selectionHistory().length;
    this._selectionHistory.set([]);

    // ✅ Emit history changed event
    if (previousLength > 0) {
      this._selectionHistoryChanged$.next({
        action: 'cleared',
        historyLength: 0,
        recentSelection: null,
        timestamp: new Date()
      });
    }
  }

  // ✅ ENHANCED: Reset service state with Observable events
  reset(): void {
    const hadSelection = this._selectedNode() !== null;
    const hadHistory = this._selectionHistory().length > 0;

    // ✅ Update signal state
    this._selectedNode.set(null);
    this._selectionSource.set('programmatic');
    this._selectionHistory.set([]);

    // ✅ Emit Observable events if state actually changed
    if (hadSelection) {
      this._nodeSelectionChanged$.next({
        previousNode: this._selectedNode(),
        newNode: null,
        source: 'programmatic',
        changeType: 'clear',
        timestamp: new Date()
      });
    }

    if (hadHistory) {
      this._selectionHistoryChanged$.next({
        action: 'cleared',
        historyLength: 0,
        recentSelection: null,
        timestamp: new Date()
      });
    }
  }

  // Utility method to get selection context info
  getSelectionContext() {
    const node = this._selectedNode();
    const source = this._selectionSource();
    const stats = this.selectionStats();

    return {
      hasSelection: this.hasSelection(),
      selectedNode: node,
      selectedNodeType: node?.nodeType || null,
      selectedNodeId: node?.nodeId || null,
      selectedCourseId: node?.courseId || null,
      selectionSource: source,
      selectionStats: stats,
      timestamp: new Date().toISOString()
    };
  }

  // === CLEANUP ===
  ngOnDestroy(): void {
    this._nodeSelectionChanged$.complete();
    this._selectionSourceChanged$.complete();
    this._crossComponentNavigation$.complete();
    this._selectionHistoryChanged$.complete();
    console.log('[NodeSelectionService] All Observable subjects completed');
  }
}
