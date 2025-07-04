// **COMPLETE FILE** - TreeWrapper with best practice Observable architecture
// RESPONSIBILITY: Manages SyncFusion tree UI, drag operations, and node actions for a single course.
// DOES NOT: Handle data storage, API calls, or cross-course operations.
// CALLED BY: CourseList for each active course, displays hierarchical course structure.

import { Component, OnInit, AfterViewInit, Input, ViewChild, computed, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TreeViewComponent, TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { TreeExpansionService } from '../services/ui/tree-expansion.service';
import { TreeSyncService } from '../services/ui/tree-sync.service';
import { TreeEffectsService, TreeEffectCallbacks } from '../services/ui/tree-effect.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CourseSignalService, EntityMoveSignalPayload, EntitySignalPayload } from '../services/course-data/course-signal.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EntityType, PanelStateService } from '../../info-panel/panel-state.service';
import { Course } from '../../models/course';
import { TreeNode, TreeData } from '../../models/tree-node';
import { CourseDataService, OperationType } from '../services/course-data/course-data.service';
import { CourseCrudService } from '../services/course-operations/course-crud.service';
import { TreeDataService } from '../services/ui/tree-data.service';
import {DragState, TreeDragDropService} from '../services/ui/tree-drag-drop.service';
import {NodeOperationClassifierService} from '../services/business/node-operations-classifier.service';
import {EntitySelectionService} from '../services/state/entity-selection.service';
import {TreeNodeActionsService} from '../services/coordination/tree-node-actions.service';

@Component({
  selector: 'app-tree',
  standalone: true,
  imports: [
    CommonModule,
    TreeViewModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './tree-wrapper.component.html',
  styleUrls: ['./tree-wrapper.component.css']
})
export class TreeWrapperComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() courseId!: number;
  private instanceId = Math.random().toString(36).substr(2, 9);
  course: Course | null = null;

  @ViewChild('treeview') syncFuncTree!: TreeViewComponent;

  public cssClass: string = "custom";
  public treeData: TreeNode[] = [];
  public treeFields: object = {
    dataSource: this.treeData,
    id: 'id',
    text: 'text',
    child: 'child',
    hasChildren: 'hasChildren',
    iconCss: 'iconCss',
    cssClass: 'nodeType',
  };

  private isViewInitialized = false;
  private dragState: DragState;
  private subscriptions: Subscription[] = []; // ✅ Best Practice: Track subscriptions

  // Reactive course data via Signals (state monitoring)
  readonly currentCourse = computed(() => {
    if (!this.courseId) return null;
    return this.courseDataService.getCourseById(this.courseId);
  });

  constructor(
    private nodeSelectionService: EntitySelectionService,
    private panelStateService: PanelStateService,
    private courseDataService: CourseDataService,
    private courseCrudService: CourseCrudService,
    private treeDataService: TreeDataService,
    private treeDragDropService: TreeDragDropService,
    private treeExpansionService: TreeExpansionService,
    private treeSyncService: TreeSyncService,
    private treeNodeActionsService: TreeNodeActionsService,
    private nodeOperationClassifier: NodeOperationClassifierService,
    private treeEffectsService: TreeEffectsService,
    private courseSignalService: CourseSignalService
  ) {
    this.dragState = this.treeDragDropService.initializeDragState();
  }

  ngOnInit() {
    console.log(`🌲 [TreeWrapper-${this.instanceId}] Initializing with best practice Observable architecture for courseId: ${this.courseId}`);

    if (!this.courseId) return;

    // Setup TreeEffectsService for Signal-based state monitoring
    this.setupTreeEffects();

    // Setup Observable subscriptions for event handling
    this.setupEventSubscriptions();

    this.course = this.courseDataService.getCourseById(this.courseId);
  }

  ngOnDestroy() {
    // ✅ Best Practice: Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    if (this.courseId) {
      this.treeEffectsService.destroyEffectsForCourse(this.courseId);
    }
  }

  ngAfterViewInit() {
    this.isViewInitialized = true;
    if (this.course) {
      console.log(`🔄 [TreeWrapper-${this.instanceId}] ngAfterViewInit called for courseId: ${this.courseId}`);
      this.updateTreeData();
    }
  }

  /**
   * ✅ Setup TreeEffectsService for Signal-based state monitoring
   */
  private setupTreeEffects(): void {
    const callbacks: TreeEffectCallbacks = {
      onCourseDataUpdated: (course) => this.handleCourseDataChange(course),
      onCourseCleared: () => this.handleCourseCleared(),
      onExternalSelection: (node) => this.handleExternalSelection(node),
      onInternalTreeChange: () => this.handleInternalTreeChange(),
    };

    const result = this.treeEffectsService.setupEffects(this.courseId, callbacks);
    if (!result.success) {
      console.error(`[TreeWrapper] Failed to setup effects:`, result.error);
    }
  }

  /**
   * ✅ Best Practice: Observable subscriptions for event handling
   */
  private setupEventSubscriptions(): void {
    // Subscribe to node added events for intelligent tree updates
    const nodeAddedSub = this.courseSignalService.entityAdded$.subscribe((event: EntitySignalPayload) => {
      this.handleNodeAddedEvent(event);
    });
    this.subscriptions.push(nodeAddedSub);

    // Subscribe to node edited events
    const nodeEditedSub = this.courseSignalService.entityEdited$.subscribe((event: EntitySignalPayload) => {
      this.handleNodeEditedEvent(event);
    });
    this.subscriptions.push(nodeEditedSub);

    // Subscribe to node deleted events
    const nodeDeletedSub = this.courseSignalService.entityDeleted$.subscribe((event: EntitySignalPayload) => {
      this.handleNodeDeletedEvent(event);
    });
    this.subscriptions.push(nodeDeletedSub);

    // Subscribe to node moved events
    const nodeMovedSub = this.courseSignalService.entityMoved$.subscribe((event: EntityMoveSignalPayload) => {
      this.handleNodeMovedEvent(event);
    });
    this.subscriptions.push(nodeMovedSub);
  }

  /**
   * ✅ Best Practice: Handle node added events with intelligent routing
   */
  private handleNodeAddedEvent(event: EntitySignalPayload): void {
    // Only process events for this course
    if (!this.isEventForThisCourse(event)) return;

    console.log(`🌲 [TreeWrapper-${this.instanceId}] RECEIVED nodeAdded EVENT (Observable)`, {
      courseId: this.courseId,
      nodeType: event.entity.nodeType,
      nodeId: event.entity.nodeId,
      nodeTitle: event.entity.title,
      source: event.source,
      operationType: event.operationType,
      timestamp: event.timestamp.toISOString(),
      pattern: 'Observable - emit once, consume once'
    });

    const updateStrategy = this.determineUpdateStrategy(event);
    this.executeUpdateStrategy(updateStrategy, event);
  }

  /**
   * ✅ Handle node edited events
   */
  private handleNodeEditedEvent(event: EntitySignalPayload): void {
    if (!this.isEventForThisCourse(event)) return;

    console.log(`🌲 [TreeWrapper-${this.instanceId}] RECEIVED nodeEdited EVENT (Observable)`, {
      courseId: this.courseId,
      nodeType: event.entity.nodeType,
      nodeTitle: event.entity.title,
      operationType: event.operationType
    });

    // Node edits typically require full sync for data consistency
    this.syncDataOnly();
  }

  /**
   * ✅ Handle node deleted events
   */
  private handleNodeDeletedEvent(event: EntitySignalPayload): void {
    if (!this.isEventForThisCourse(event)) return;

    console.log(`🌲 [TreeWrapper-${this.instanceId}] RECEIVED nodeDeleted EVENT (Observable)`, {
      courseId: this.courseId,
      nodeType: event.entity.nodeType,
      nodeTitle: event.entity.title,
      operationType: event.operationType
    });

    // Node deletions require full sync
    this.syncDataOnly();
  }

  /**
   * ✅ Handle node moved events
   */
  private handleNodeMovedEvent(event: any): void {
    // Check if move affects this course
    if (!this.isNodeInCourse(event.node, this.courseId)) return;

    console.log(`🌲 [TreeWrapper-${this.instanceId}] RECEIVED nodeMoved EVENT (Observable)`, {
      courseId: this.courseId,
      nodeType: event.node.nodeType,
      nodeTitle: event.node.title,
      source: event.source
    });

    // Node moves require full sync
    this.syncDataOnly();
  }

  /**
   * ✅ Best Practice: Intelligent update strategy determination
   */
  private determineUpdateStrategy(event: EntitySignalPayload): 'incremental' | 'full_sync' {
    const { operationType, entity: node } = event;

    // Check if we should use incremental update
    if (this.shouldUseIncrementalUpdate(operationType as OperationType, node.nodeType)) {
      console.log(`🌱 [TreeWrapper-${this.instanceId}] Using incremental update:`, {
        operationType,
        nodeType: node.nodeType,
        nodeTitle: (node as any).title
      });
      return 'incremental';
    }

    // Default to full sync for safety
    console.log(`🔄 [TreeWrapper-${this.instanceId}] Using full sync:`, {
      operationType,
      nodeType: node.nodeType,
      reason: this.getFullSyncReason(operationType as OperationType, node.nodeType)
    });
    return 'full_sync';
  }

  /**
   * ✅ Best Practice: Use service for classification logic
   */
  private shouldUseIncrementalUpdate(operationType: OperationType, nodeType: string): boolean {
    return this.nodeOperationClassifier.shouldUseIncrementalUpdate(operationType, nodeType);
  }

  /**
   * ✅ Clear reasoning for full sync decisions
   */
  private getFullSyncReason(operationType: OperationType, nodeType: string): string {
    if (operationType === 'BULK_LOAD') return 'Bulk operation';
    if (operationType === 'DRAG_MOVE') return 'Drag operation (not yet supported incrementally)';
    if (nodeType !== 'Lesson') return `${nodeType} operations use full sync`;
    if (operationType === 'API_RESPONSE') return 'Legacy API response';
    return 'Safety fallback';
  }

  /**
   * ✅ Execute update strategy
   */
  private executeUpdateStrategy(strategy: 'incremental' | 'full_sync', event: EntitySignalPayload): void {
    if (strategy === 'incremental') {
      this.executeIncrementalUpdate(event);
    } else {
      this.syncDataOnly();
    }
  }

  /**
   * ✅ Best Practice: Safe incremental updates with fallback
   */
  private executeIncrementalUpdate(event: EntitySignalPayload): void {
    try {
      console.log(`🚀 [TreeWrapper-${this.instanceId}] Executing incremental update:`, {
        nodeType: event.entity.nodeType,
        nodeTitle: (event.entity as any).title,
        operationType: event.operationType
      });

      this.handleLessonAdded(event.entity);
    } catch (error) {
      console.error(`❌ [TreeWrapper-${this.instanceId}] Incremental update failed, falling back:`, error);
      this.syncDataOnly();
    }
  }

  /**
   * ✅ Check if event affects this course
   */
  private isEventForThisCourse(event: EntitySignalPayload): boolean {
    return this.isNodeInCourse(event.entity, this.courseId);
  }

  /**
   * ✅ Check if node belongs to this course
   */
  private isNodeInCourse(node: any, courseId: number): boolean {
    // Handle different node structures
    const actualNode = node.node ? node.node : node;
    return actualNode.courseId === courseId;
  }

  // ===== TREE OPERATION METHODS =====

  private handleCourseDataChange(course: Course | null): void {
    if (!course) return;

    this.course = course;
    if (this.isViewInitialized) {
      // Simple data sync - Observable subscriptions handle intelligent updates
      this.syncDataOnly();
    }
  }

  private handleLessonAdded(lessonNode: any): void {
    if (!this.syncFuncTree || !this.isViewInitialized) return;

    const parentNodeId = this.determineParentNodeId(lessonNode);

    if (parentNodeId === null) {
      console.warn(`[TreeWrapper] Could not determine parent for lesson, falling back to full sync`);
      this.syncDataOnly();
      return;
    }

    const result = this.treeSyncService.addLessonNode(
      lessonNode,
      this.syncFuncTree,
      parentNodeId,
      this.courseId
    );

    if (!result.success) {
      console.error(`[TreeWrapper] Incremental add failed, falling back to full sync:`, result.error);
      this.syncDataOnly();
    } else {
      console.log(`✅ [TreeWrapper] Successfully added lesson incrementally:`, lessonNode.title);
    }
  }

  private handleCourseCleared(): void {
    this.course = null;
    if (this.isViewInitialized) {
      this.clearTreeData();
    }
  }

  private handleInternalTreeChange(): void {
    if (!this.isViewInitialized) return;
    // Internal changes handled by state monitoring - no direct action needed
    console.log(`🔄 [TreeWrapper-${this.instanceId}] Internal tree change detected`);
  }

  private determineParentNodeId(lessonNode: any): string {
    if (lessonNode.subTopicId) {
      return `subtopic_${lessonNode.subTopicId}`;
    }

    if (lessonNode.topicId) {
      return `topic_${lessonNode.topicId}`;
    }

    if (lessonNode.SubTopicId) {
      return `subtopic_${lessonNode.SubTopicId}`;
    }

    if (lessonNode.TopicId) {
      return `topic_${lessonNode.TopicId}`;
    }

    console.error('[TreeWrapper] Could not determine parent node ID for lesson:', lessonNode);
    throw new Error(`Could not determine parent node ID for lesson: ${lessonNode.title || lessonNode.id || 'unknown'}`);
  }

  private syncDataOnly(): void {
    console.log(`🔄 [TreeWrapper-${this.instanceId}] syncDataOnly called for courseId: ${this.courseId}`);

    if (!this.courseId || !this.isViewInitialized) return;

    const updatedCourse = this.courseDataService.getCourseById(this.courseId);
    if (updatedCourse) {
      this.course = updatedCourse;
      const result = this.treeSyncService.syncDataOnly(updatedCourse, this.syncFuncTree, this.courseId);
      if (!result.success) {
        console.error(`[TreeWrapper] Sync failed:`, result.error);
      } else {
        this.treeData = (this.syncFuncTree.fields as any)?.dataSource || [];
        console.log('[TreeWrapper] Data synced successfully (no rebind)', {
          courseId: this.courseId,
          nodeCount: this.treeData.length,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private clearTreeData(): void {
    if (!this.isViewInitialized) return;
    const result = this.treeSyncService.clearTreeData(this.syncFuncTree, this.courseId);
    if (!result.success) {
      console.error(`[TreeWrapper] Clear failed:`, result.error);
    }
  }

  private updateTreeData(): void {
    if (!this.isViewInitialized) return;

    this.treeSyncService.updateTreeData(this.course, this.syncFuncTree, this.courseId)
      .then(result => {
        if (result.success && this.syncFuncTree?.fields) {
          this.treeData = (this.syncFuncTree.fields as any).dataSource || [];
          this.treeFields = this.syncFuncTree.fields;

          console.log('[TreeWrapper] Tree data bound successfully (initial load)', {
            courseId: this.courseId,
            localTreeDataLength: this.treeData.length,
            timestamp: new Date().toISOString()
          });
        } else if (!result.success) {
          console.error(`[TreeWrapper] Update failed:`, result.error);
        }
      });
  }

  // ===== UI EVENT HANDLERS =====

  public onDataBound(): void {
    const syncFusionData = (this.syncFuncTree?.fields as any)?.dataSource || [];

    console.log('[TreeWrapper] onDataBound called', {
      courseId: this.courseId,
      localTreeDataLength: this.treeData.length,
      syncFusionDataLength: syncFusionData.length,
      timestamp: new Date().toISOString()
    });

    this.treeSyncService.handleDataBound(syncFusionData, this.course?.id);
  }

  public emitNodeSelected(args: any): void {
    if (!this.isViewInitialized) return;
    const result = this.treeNodeActionsService.handleNodeSelected(args, this.treeData, this.courseId);
    if (!result.success) {
      console.error(`[TreeWrapper] Selection failed:`, result.error);
    }
  }

  private async handleExternalSelection(node: TreeData): Promise<void> {
    if (!this.isViewInitialized) return;

    const result = await this.treeExpansionService.handleExternalSelection(
      node, this.syncFuncTree, this.treeData, this.courseId
    );

    if (!result.success) {
      console.error(`[TreeWrapper] External selection failed:`, result.error);
    }
  }

  // ===== DRAG AND DROP HANDLERS =====

  public onNodeDragStart(args: any): void {
    if (!this.isViewInitialized) {
      args.cancel = true;
      return;
    }
    this.treeDragDropService.handleDragStart(args, this.dragState);
  }

  public nodeDragging(args: any): void {
    if (!this.isViewInitialized) {
      args.cancel = true;
      return;
    }
    this.treeDragDropService.handleDragging(args, this.dragState);
  }

  public onNodeDragStop(args: any): void {
    if (!this.isViewInitialized) {
      args.cancel = true;
      return;
    }

    const operation = this.treeDragDropService.handleDragStop(
      args, this.dragState, this.treeData, this.courseId
    );

    if (operation) {
      operation.subscribe({
        error: (error) => console.error('[TreeWrapper] Drag operation failed:', error)
      });
    }
  }

  // ===== NODE ACTION HANDLERS =====

  public initiateAddChildNode(data: any, childType: EntityType): void {
    if (!this.isViewInitialized) return;
    const result = this.treeNodeActionsService.initiateAddChildNode(data, childType, this.treeData, this.courseId);
    if (!result.success) {
      console.error(`[TreeWrapper] Add child failed:`, result.error);
    }
  }

  public deleteNode(data: any): void {
    if (!this.isViewInitialized) return;
    const result = this.treeNodeActionsService.deleteNode(data, this.treeData, this.courseId);
    if (!result.success) {
      console.error(`[TreeWrapper] Delete failed:`, result.error);
    }
  }

  public getNodeTypeIcon(nodeType: string): string {
    return this.treeNodeActionsService.getNodeTypeIcon(nodeType);
  }

  public onNodeExpanded(args: any): void {
    if (!this.isViewInitialized) return;

    const result = this.treeNodeActionsService.handleAutoSelectOnExpand(
      args, this.treeData, this.courseId, this.nodeSelectionService.hasSelection()
    );

    if (result.success) {
      try {
        this.syncFuncTree.selectedNodes = [args.nodeData.id];
      } catch (err) {
        console.warn('[TreeWrapper] Failed to update selectedNodes:', err);
      }
    }
  }
}

export default TreeWrapperComponent;
