// **COMPLETE FILE** - TreeWrapper with Clean Boundary Enforcement
// RESPONSIBILITY: SyncFusion integration + Tree/Business boundary enforcement
// DOES NOT: Handle business logic, work with raw Entities outside boundary conversions
// CALLED BY: CourseList for each course, enforces TreeNode/TreeData/Entity boundaries

import { Component, OnInit, AfterViewInit, Input, ViewChild, computed, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TreeViewComponent, TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Course } from '../../models/course';
import { Entity, EntityType } from '../../models/entity';
import { TreeNode, TreeData, createTreeData, treeNodeToTreeData, treeDataToTreeNode, NodeMovedEvent } from '../../models/tree-node';
import { CourseSignalService, EntityMoveSignalPayload, EntitySignalPayload } from '../services/course-data/course-signal.service';
import { CourseDataService, OperationType } from '../services/course-data/course-data.service';
import { CourseCrudService } from '../services/course-operations/course-crud.service';
import {EntitySelectionService} from '../services/state/entity-selection.service';
import {DragState, TreeDragDropService} from '../services/ui/tree-drag-drop.service';
import {TreeExpansionService} from '../services/ui/tree-expansion.service';
import {TreeSyncService} from '../services/ui/tree-sync.service';
import {TreeNodeActionsService} from '../services/coordination/tree-node-actions.service';
import {NodeOperationClassifierService} from '../services/business/node-operations-classifier.service';
import {TreeEffectCallbacks, TreeEffectsService} from '../services/ui/tree-effect.service';
import {TreeNodeBuilderService} from '../services/ui/tree-node-builder.service';
import {LayoutModeService} from '../../lesson-tree-container/layout-mode.service';

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
  private course: Course | null = null;

  @ViewChild('treeview') syncFuncTree!: TreeViewComponent;

  // ✅ BOUNDARY: SyncFusion TreeNode data
  public cssClass: string = "custom";
  public treeData: TreeNode[] = [];
  public treeFields: object = {
    dataSource: this.treeData,
    id: 'id',
    text: 'text',
    child: 'child',
    hasChildren: 'hasChildren',
    iconCss: 'iconCss',
    cssClass: 'entityType',
  };

  private isViewInitialized = false;
  private dragState: DragState;
  private subscriptions: Subscription[] = [];

  // ✅ BOUNDARY: Entity signals → TreeData computed
  readonly currentCourse = computed(() => {
    if (!this.courseId) return null;
    return this.courseDataService.getCourseById(this.courseId);
  });

  constructor(
    private nodeSelectionService: EntitySelectionService,
    private courseDataService: CourseDataService,
    private courseCrudService: CourseCrudService,
    private treeNodeBuilderService: TreeNodeBuilderService,
    private treeDragDropService: TreeDragDropService,
    private treeExpansionService: TreeExpansionService,
    private treeSyncService: TreeSyncService,
    private treeNodeActionsService: TreeNodeActionsService,
    private nodeOperationClassifier: NodeOperationClassifierService,
    private treeEffectsService: TreeEffectsService,
    private courseSignalService: CourseSignalService,
    public layoutModeService: LayoutModeService
  ) {
    this.dragState = this.treeDragDropService.initializeDragState();
  }

  ngOnInit() {
    console.log(`🌲 [TreeWrapper-${this.instanceId}] Initializing with clean boundaries for courseId: ${this.courseId}`);

    if (!this.courseId) return;

    this.setupTreeEffects();
    this.setupEventSubscriptions();

    // ✅ BOUNDARY: Entity → Tree domain
    const courseEntity = this.courseDataService.getCourseById(this.courseId);
    if (courseEntity) {
      this.course = courseEntity;
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    if (this.courseId) {
      this.treeEffectsService.destroyEffectsForCourse(this.courseId);
    }
  }

  ngAfterViewInit() {
    this.isViewInitialized = true;
    if (this.course) {
      console.log(`🔄 [TreeWrapper-${this.instanceId}] ngAfterViewInit for courseId: ${this.courseId}`);
      this.updateTreeData();
    }
  }

  // ===== BOUNDARY SETUP =====

  private setupTreeEffects(): void {
    const callbacks: TreeEffectCallbacks = {
      onCourseDataUpdated: (course) => this.handleCourseDataChange(course),
      onCourseCleared: () => this.handleCourseCleared(),
      onExternalSelection: (treeData) => this.handleExternalSelection(treeData),
      onInternalTreeChange: () => this.handleInternalTreeChange(),
    };

    const result = this.treeEffectsService.setupEffects(this.courseId, callbacks);
    if (!result.success) {
      console.error(`[TreeWrapper] Failed to setup effects:`, result.error);
    }
  }

  private setupEventSubscriptions(): void {
    // ✅ BOUNDARY: Entity signals → TreeData processing
    const nodeAddedSub = this.courseSignalService.entityAdded$.subscribe((event: EntitySignalPayload) => {
      this.handleEntityAddedEvent(event);
    });
    this.subscriptions.push(nodeAddedSub);

    const nodeEditedSub = this.courseSignalService.entityEdited$.subscribe((event: EntitySignalPayload) => {
      this.handleEntityEditedEvent(event);
    });
    this.subscriptions.push(nodeEditedSub);

    const nodeDeletedSub = this.courseSignalService.entityDeleted$.subscribe((event: EntitySignalPayload) => {
      this.handleEntityDeletedEvent(event);
    });
    this.subscriptions.push(nodeDeletedSub);

    const nodeMovedSub = this.courseSignalService.entityMoved$.subscribe((event: EntityMoveSignalPayload) => {
      this.handleEntityMovedEvent(event);
    });
    this.subscriptions.push(nodeMovedSub);
  }

  // ===== BOUNDARY: Entity Events → TreeData Processing =====

  private handleEntityAddedEvent(event: EntitySignalPayload): void {
    if (!this.isEventForThisCourse(event)) return;

    console.log(`🌲 [TreeWrapper-${this.instanceId}] RECEIVED entityAdded EVENT`, {
      courseId: this.courseId,
      entityType: event.entity.entityType,
      entityId: event.entity.id,
      entityTitle: event.entity.title,
      source: event.source
    });

    // ✅ REMOVED: No longer track operation source here (it was causing the wrong logic)
    // this.treeEffectsService.trackOperationSource(this.courseId, event.source);

    // ✅ BOUNDARY: Entity → TreeData conversion
    const treeData = createTreeData(event.entity);

    const updateStrategy = this.determineUpdateStrategy(event);
    this.executeUpdateStrategy(updateStrategy, treeData, event);
  }



  private handleEntityEditedEvent(event: EntitySignalPayload): void {
    if (!this.isEventForThisCourse(event)) return;

    console.log(`🌲 [TreeWrapper-${this.instanceId}] RECEIVED entityEdited EVENT`, {
      courseId: this.courseId,
      entityType: event.entity.entityType,
      entityTitle: event.entity.title,
      source: event.source
    });

    // ✅ NEW: Track operation source
    this.treeEffectsService.trackOperationSource(this.courseId, event.source);

    // Entity edits require full sync for data consistency
    this.syncDataOnly();
  }

  private handleEntityDeletedEvent(event: EntitySignalPayload): void {
    if (!this.isEventForThisCourse(event)) return;

    console.log(`🌲 [TreeWrapper-${this.instanceId}] RECEIVED entityDeleted EVENT`, {
      courseId: this.courseId,
      entityType: event.entity.entityType,
      entityTitle: event.entity.title,
      source: event.source
    });

    // ✅ NEW: Track operation source
    this.treeEffectsService.trackOperationSource(this.courseId, event.source);

    // Entity deletions require full sync
    this.syncDataOnly();
  }

  private handleEntityMovedEvent(event: EntityMoveSignalPayload): void {
    // ✅ BOUNDARY: Check if move affects this course (handle both Entity and TreeData)
    const entityToCheck = event.entity;

    if (!entityToCheck || !this.isEntityInCourse(entityToCheck, this.courseId)) return;

    console.log(`🌲 [TreeWrapper-${this.instanceId}] RECEIVED entityMoved EVENT`, {
      courseId: this.courseId,
      entityType: entityToCheck.entityType,
      entityTitle: entityToCheck.title,
      source: event.source
    });

    // ✅ EXISTING LOGIC: Skip refresh for tree-originated moves
    if (event.source === 'tree') {
      console.log(`🌲 [TreeWrapper-${this.instanceId}] ⏭️ SKIPPING REFRESH - self-originated move`, {
        reason: 'SyncFusion already handled the visual move',
        action: 'preserving tree expansion state',
        apiUpdated: 'database already updated',
        signalsWorking: 'calendar will receive updates'
      });
      return; // ← This prevents syncDataOnly() and tree collapse
    }

    // ✅ NEW: Track operation source for external moves
    this.treeEffectsService.trackOperationSource(this.courseId, event.source);

    // ✅ ONLY refresh for external moves (calendar, infopanel, etc.)
    console.log(`🔄 [TreeWrapper-${this.instanceId}] 🔄 EXTERNAL MOVE - refreshing tree`, {
      source: event.source,
      reason: 'Tree needs to reflect external changes'
    });

    // Entity moves from external sources require full sync
    this.syncDataOnly();
  }

  // ===== UPDATE STRATEGY LOGIC =====

  private determineUpdateStrategy(event: EntitySignalPayload): 'incremental' | 'full_sync' {
    const { operationType, entity } = event;

    if (this.shouldUseIncrementalUpdate(operationType as OperationType, entity.entityType)) {
      console.log(`🌱 [TreeWrapper-${this.instanceId}] Using incremental update:`, {
        operationType,
        entityType: entity.entityType,
        entityTitle: entity.title
      });
      return 'incremental';
    }

    console.log(`🔄 [TreeWrapper-${this.instanceId}] Using full sync:`, {
      operationType,
      entityType: entity.entityType,
      reason: this.getFullSyncReason(operationType as OperationType, entity.entityType)
    });
    return 'full_sync';
  }

  private shouldUseIncrementalUpdate(operationType: OperationType, entityType: string): boolean {
    return this.nodeOperationClassifier.shouldUseIncrementalUpdate(operationType, entityType);
  }

  private getFullSyncReason(operationType: OperationType, entityType: string): string {
    if (operationType === 'BULK_LOAD') return 'Bulk operation';
    if (operationType === 'DRAG_MOVE') return 'Drag operation';
    if (entityType !== 'Lesson') return `${entityType} operations use full sync`;
    if (operationType === 'API_RESPONSE') return 'Legacy API response';
    return 'Safety fallback';
  }

  private executeUpdateStrategy(strategy: 'incremental' | 'full_sync', treeData: TreeData, event: EntitySignalPayload): void {
    if (strategy === 'incremental') {
      this.executeIncrementalUpdate(treeData, event);
    } else {
      this.syncDataOnly();
    }
  }

  private executeIncrementalUpdate(treeData: TreeData, event: EntitySignalPayload): void {
    try {
      console.log(`🚀 [TreeWrapper-${this.instanceId}] Executing incremental update:`, {
        entityType: treeData.entityType,
        entityTitle: treeData.title,
        operationType: event.operationType
      });

      // ✅ EXISTING: Lesson incremental add
      if (treeData.entityType === 'Lesson') {
        this.handleLessonAdded(treeData);
        return;
      }

      // ✅ NEW: Topic incremental add
      if (treeData.entityType === 'Topic') {
        this.handleTopicAdded(treeData);
        return;
      }

      // ✅ NEW: SubTopic incremental add
      if (treeData.entityType === 'SubTopic') {
        this.handleSubTopicAdded(treeData);
        return;
      }

      // Fallback for unsupported types
      console.warn(`[TreeWrapper] Unsupported incremental type: ${treeData.entityType}`);
      this.syncDataOnly();

    } catch (error) {
      console.error(`❌ [TreeWrapper-${this.instanceId}] Incremental update failed, falling back:`, error);
      this.syncDataOnly();
    }
  }

// ✅ NEW: Handle Topic incremental add
  handleTopicAdded(treeData: TreeData): void {
    if (!this.syncFuncTree || !this.isViewInitialized) return;

    // Topics are always added to the course root
    const parentNodeId = `course_${this.courseId}`;

    console.log(`🌱 [TreeWrapper] Adding topic incrementally:`, {
      topicTitle: treeData.title,
      parentNodeId,
      method: 'TreeSyncService.addTopicNode()'
    });

    // ✅ PROPER: Use TreeSyncService incremental method
    const result = this.treeSyncService.addTopicNode(
      treeData.entity,
      this.syncFuncTree,
      parentNodeId,
      this.courseId
    );

    if (!result.success) {
      console.error(`[TreeWrapper] Incremental topic add failed, falling back to full sync:`, result.error);
      this.syncDataOnly();
    } else {
      console.log(`✅ [TreeWrapper] Successfully added topic incrementally:`, treeData.title);
      // ✅ CRITICAL: Mark incremental success to prevent second rebind
      this.treeEffectsService.markIncrementalSuccess(this.courseId);
    }
  }

// ✅ COMPLETE: Handle SubTopic incremental add
  private handleSubTopicAdded(treeData: TreeData): void {
    if (!this.syncFuncTree || !this.isViewInitialized) return;

    const parentNodeId = this.determineSubTopicParentNodeId(treeData);

    if (parentNodeId === null) {
      console.warn(`[TreeWrapper] Could not determine parent for subtopic, falling back to full sync`);
      this.syncDataOnly();
      return;
    }

    console.log(`🌱 [TreeWrapper] Adding subtopic incrementally:`, {
      subtopicTitle: treeData.title,
      parentNodeId,
      method: 'TreeSyncService.addSubTopicNode()'
    });

    // ✅ PROPER: Use TreeSyncService incremental method
    const result = this.treeSyncService.addSubTopicNode(
      treeData.entity,
      this.syncFuncTree,
      parentNodeId,
      this.courseId
    );

    if (!result.success) {
      console.error(`[TreeWrapper] Incremental subtopic add failed, falling back to full sync:`, result.error);
      this.syncDataOnly();
    } else {
      console.log(`✅ [TreeWrapper] Successfully added subtopic incrementally:`, treeData.title);
      // ✅ CRITICAL: Mark incremental success to prevent second rebind
      this.treeEffectsService.markIncrementalSuccess(this.courseId);
    }
  }

// ✅ NEW: Determine SubTopic parent node ID
  private determineSubTopicParentNodeId(treeData: TreeData): string | null {
    const entity = treeData.entity;

    if (entity.entityType === 'SubTopic') {
      const subTopic = entity as any;

      if (subTopic.topicId) {
        return `topic_${subTopic.topicId}`;
      }
    }

    console.error('[TreeWrapper] Could not determine parent node ID for SubTopic:', entity);
    return null;
  }

  // ===== TREE OPERATION METHODS =====

  private handleCourseDataChange(course: Course | null): void {
    if (!course) return;

    this.course = course;
    if (this.isViewInitialized) {
      this.syncDataOnly();
    }
  }

  private handleLessonAdded(treeData: TreeData): void {
    if (!this.syncFuncTree || !this.isViewInitialized) return;

    const parentNodeId = this.determineParentNodeId(treeData);

    if (parentNodeId === null) {
      console.warn(`[TreeWrapper] Could not determine parent for lesson, falling back to full sync`);
      this.syncDataOnly();
      return;
    }

    // ✅ BOUNDARY: TreeData → API/Service calls (services expect Entity or TreeData)
    const result = this.treeSyncService.addLessonNode(
      treeData.entity, // Pass Entity to service
      this.syncFuncTree,
      parentNodeId,
      this.courseId
    );

    if (!result.success) {
      console.error(`[TreeWrapper] Incremental add failed, falling back to full sync:`, result.error);
      this.syncDataOnly();
    } else {
      console.log(`✅ [TreeWrapper] Successfully added lesson incrementally:`, treeData.title);

      // ✅ NEW: Mark incremental operation as successful to prevent redundant sync
      this.treeEffectsService.markIncrementalSuccess(this.courseId);
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
    console.log(`🔄 [TreeWrapper-${this.instanceId}] Internal tree change detected`);
  }

  private determineParentNodeId(treeData: TreeData): string | null {
    const entity = treeData.entity;

    // Handle Lesson entity
    if (entity.entityType === 'Lesson') {
      const lesson = entity as any; // Cast for property access

      if (lesson.subTopicId) {
        return `subtopic_${lesson.subTopicId}`;
      }

      if (lesson.topicId) {
        return `topic_${lesson.topicId}`;
      }
    }

    console.error('[TreeWrapper] Could not determine parent node ID for entity:', entity);
    return null;
  }

  private syncDataOnly(): void {
    console.log(`🔄 [TreeWrapper-${this.instanceId}] syncDataOnly called for courseId: ${this.courseId}`);
    console.trace('📍 CALL STACK - Who called syncDataOnly():'); // ← Add this line

    if (!this.courseId || !this.isViewInitialized) return;

    const updatedCourse = this.courseDataService.getCourseById(this.courseId);
    if (updatedCourse) {
      this.course = updatedCourse;
      const result = this.treeSyncService.syncDataOnly(updatedCourse, this.syncFuncTree, this.courseId);
      if (!result.success) {
        console.error(`[TreeWrapper] Sync failed:`, result.error);
      } else {
        // ✅ BOUNDARY: Update local TreeNode array from SyncFusion
        this.treeData = (this.syncFuncTree.fields as any)?.dataSource || [];
        console.log('[TreeWrapper] Data synced successfully', {
          courseId: this.courseId,
          nodeCount: this.treeData.length
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
          // ✅ BOUNDARY: Update local TreeNode array from SyncFusion
          this.treeData = (this.syncFuncTree.fields as any).dataSource || [];
          this.treeFields = this.syncFuncTree.fields;

          console.log('[TreeWrapper] Tree data bound successfully (initial load)', {
            courseId: this.courseId,
            nodeCount: this.treeData.length
          });
        } else if (!result.success) {
          console.error(`[TreeWrapper] Update failed:`, result.error);
        }
      });
  }

  // ===== BOUNDARY: SyncFusion Event Handlers =====

  public onDataBound(): void {
    const syncFusionData = (this.syncFuncTree?.fields as any)?.dataSource || [];

    console.log('[TreeWrapper] onDataBound called', {
      courseId: this.courseId,
      localTreeDataLength: this.treeData.length,
      syncFusionDataLength: syncFusionData.length
    });
    console.trace('📍 CALL STACK - Who called onDataBound():'); // ← Add this line


    this.treeSyncService.handleDataBound(syncFusionData, this.course?.id);
  }

  public emitNodeSelected(args: any): void {
    if (!this.isViewInitialized || !this.syncFuncTree) return;

    try {
      // ✅ FIXED: Use SyncFusion's official getTreeData() method
      const nodeId = args.nodeData?.id;
      if (!nodeId) {
        console.error('🚨 [TreeWrapper] emitNodeSelected - No node ID available');
        return;
      }

      // Get node data using SyncFusion's documented method for custom properties
      const nodeDataArray = this.syncFuncTree.getTreeData(nodeId);
      if (!nodeDataArray || nodeDataArray.length === 0) {
        console.error('🚨 [TreeWrapper] emitNodeSelected - getTreeData returned empty array');
        return;
      }

      // ✅ FIXED: Cast SyncFusion return type to TreeNode
      const syncFusionNode: TreeNode = nodeDataArray[0] as TreeNode;

      // 🔍 DEBUG: Verify we now have the original property
      console.log('✅ [TreeWrapper] emitNodeSelected - Using getTreeData():', {
        nodeId,
        hasOriginal: !!syncFusionNode?.original,
        originalType: typeof syncFusionNode?.original,
        originalKeys: Object.keys(syncFusionNode?.original || {}),
        retrievalMethod: 'getTreeData()'
      });

      // ✅ BOUNDARY: SyncFusion TreeNode → TreeData conversion
      const treeData = treeNodeToTreeData(syncFusionNode);

      const result = this.treeNodeActionsService.handleNodeSelected(args, this.treeData, this.courseId);

      if (!result.success) {
        console.error(`[TreeWrapper] Selection failed:`, result.error);
      }
    } catch (error) {
      console.error('🚨 [TreeWrapper] emitNodeSelected - Conversion FAILED:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async handleExternalSelection(treeData: TreeData): Promise<void> {
    if (!this.isViewInitialized) return;

    const result = await this.treeExpansionService.handleExternalSelection(
      treeData, this.syncFuncTree, this.treeData, this.courseId
    );

    if (!result.success) {
      console.error(`[TreeWrapper] External selection failed:`, result.error);
    }
  }

  // ===== BOUNDARY: Drag and Drop Handlers =====

  public onNodeDragStart(args: any): void {
    if (!this.isViewInitialized || !this.syncFuncTree) {
      args.cancel = true;
      return;
    }

    try {
      // ✅ FIXED: Use SyncFusion's getTreeData() for drag operations if needed
      // Note: SyncFusion drag events may already provide the correct data
      // but we'll apply the same pattern for consistency

      // ✅ BOUNDARY: SyncFusion provides TreeNode, convert to TreeData for internal processing
      this.treeDragDropService.handleDragStart(args, this.dragState);
    } catch (error) {
      console.error('🚨 [TreeWrapper] onNodeDragStart - Error:', error);
      args.cancel = true;
    }
  }

  public nodeDragging(args: any): void {
    if (!this.isViewInitialized) {
      args.cancel = true;
      return;
    }
    this.treeDragDropService.handleDragging(args, this.dragState);
  }

  // **PARTIAL FILE** - tree-wrapper.component.ts
  // Use SyncFusion's official getTreeData() method for drag operations
  onNodeDragStop(args: any): void {
    console.log('[TreeWrapper] onNodeDragStop called', {
      draggedNodeData: args.draggedNodeData,
      droppedNodeData: args.droppedNodeData,
      courseId: this.courseId
    });

    try {
      const draggedNodeId = args.draggedNodeData?.id;
      const targetNodeId = args.droppedNodeData?.id;

      if (!draggedNodeId || !targetNodeId) {
        console.warn('[TreeWrapper] Missing node IDs in drag operation');
        return;
      }

      // ✅ USE SYNCFUSION'S OFFICIAL METHOD
      const draggedTreeData = this.syncFuncTree?.getTreeData(draggedNodeId);
      const targetTreeData = this.syncFuncTree?.getTreeData(targetNodeId);

      console.log(`✅ [TreeWrapper] onNodeDragStop - Using SyncFusion getTreeData():`, {
        draggedNodeId,
        targetNodeId,
        draggedHasOriginal: !!draggedTreeData?.[0]?.['original'],
        targetHasOriginal: !!targetTreeData?.[0]?.['original'],
        retrievalMethod: 'syncFuncTree.getTreeData()'
      });

      if (!draggedTreeData?.[0] || !targetTreeData?.[0]) {
        console.warn('[TreeWrapper] getTreeData() returned invalid data');
        return;
      }

      // ✅ FIXED: Cast SyncFusion objects to TreeNode type
      const draggedNode = treeNodeToTreeData(draggedTreeData[0] as TreeNode);
      const targetNode = treeNodeToTreeData(targetTreeData[0] as TreeNode);

      console.log(`🔍 [TreeWrapper] Converted node data:`, {
        draggedEntityType: draggedNode.entityType,
        targetEntityType: targetNode.entityType,
        draggedEntityId: draggedNode.id,
        targetEntityId: targetNode.id
      });

      // Proceed with drag operation using TreeDragDropService
      const result = this.treeDragDropService.handleDragStop(
          args,
          this.dragState,
          this.treeData,
          this.courseId
      );

      if (result) {
        result.subscribe({
          next: (success) => {
            if (success) {
              console.log('[TreeWrapper] Drag operation completed successfully');
            } else {
              console.warn('[TreeWrapper] Drag operation failed');
            }
          },
          error: (error) => {
            console.error('[TreeWrapper] Drag operation error:', error);
          }
        });
      }

    } catch (error) {
      console.error(`🚨 [TreeWrapper] onNodeDragStop - Error:`, error);
    }
  }

  // ===== BOUNDARY: Node Action Handlers =====

  public initiateAddChildNode(syncFusionNodeData: any, childType: EntityType): void {
    if (!this.isViewInitialized) return;

    // ✅ BOUNDARY: SyncFusion node data → TreeData conversion
    const treeData = treeNodeToTreeData(syncFusionNodeData);

    const result = this.treeNodeActionsService.initiateAddChildNode(
      syncFusionNodeData, childType, this.treeData, this.courseId
    );
    if (!result.success) {
      console.error(`[TreeWrapper] Add child failed:`, result.error);
    }
  }

  public deleteNode(syncFusionNodeData: any): void {
    if (!this.isViewInitialized) return;

    // ✅ BOUNDARY: SyncFusion node data → TreeData conversion
    const treeData = treeNodeToTreeData(syncFusionNodeData);

    const result = this.treeNodeActionsService.deleteNode(
      syncFusionNodeData, this.treeData, this.courseId
    );
    if (!result.success) {
      console.error(`[TreeWrapper] Delete failed:`, result.error);
    }
  }

  public getEntityTypeIcon(entityType: string): string {
    return this.treeNodeActionsService.getEntityTypeIcon(entityType);
  }

  // === COURSE FOCUS MODE METHODS ===

  /**
   * Enter course focus mode for a specific course
   */
  enterCourseFocus(courseId: number, event: Event): void {
    event.stopPropagation();
    console.log('[TreeWrapper] 🎯 Entering course focus mode for course:', courseId);
    this.layoutModeService.toggleCourseFocusMode(courseId);
    
    // Expand all nodes in the tree when entering focus mode
    if (this.syncFuncTree && this.isViewInitialized) {
      setTimeout(() => {
        this.syncFuncTree.expandAll();
        console.log('[TreeWrapper] 🌳 Expanded all tree nodes for focused course');
      }, 100); // Small delay to ensure layout mode change is processed first
    }
  }

  /**
   * Exit course focus mode
   */
  exitCourseFocus(event: Event): void {
    event.stopPropagation();
    console.log('[TreeWrapper] 🎯 Exiting course focus mode');
    this.layoutModeService.exitCourseFocusMode();
  }

  public onNodeExpanded(args: any): void {
    if (!this.isViewInitialized || !this.syncFuncTree) return;

    try {
      // ✅ FIXED: Use SyncFusion's official getTreeData() method
      const nodeId = args.nodeData?.id;
      if (!nodeId) {
        console.error('🚨 [TreeWrapper] onNodeExpanded - No node ID available');
        return;
      }

      // Get node data using SyncFusion's documented method for custom properties
      const nodeDataArray = this.syncFuncTree.getTreeData(nodeId);
      if (!nodeDataArray || nodeDataArray.length === 0) {
        console.error('🚨 [TreeWrapper] onNodeExpanded - getTreeData returned empty array');
        return;
      }

      // ✅ FIXED: Cast SyncFusion return type to TreeNode
      const syncFusionNode: TreeNode = nodeDataArray[0] as TreeNode;

      // 🔍 DEBUG: Verify we now have the original property
      console.log('✅ [TreeWrapper] onNodeExpanded - Using getTreeData():', {
        nodeId,
        hasOriginal: !!syncFusionNode?.original,
        originalType: typeof syncFusionNode?.original,
        originalKeys: Object.keys(syncFusionNode?.original || {}),
        retrievalMethod: 'getTreeData()'
      });

      // ✅ BOUNDARY: SyncFusion TreeNode → TreeData conversion
      const treeData = treeNodeToTreeData(syncFusionNode);

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
    } catch (error) {
      console.error('🚨 [TreeWrapper] onNodeExpanded - Conversion FAILED:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // ===== UTILITY METHODS =====

  private isEventForThisCourse(event: EntitySignalPayload): boolean {
    return this.isEntityInCourse(event.entity, this.courseId);
  }

  private isEntityInCourse(entity: Entity, courseId: number): boolean {
    // ✅ BOUNDARY: Entity property access
    const entityCourseId = (entity as any).courseId || entity.id;
    return entityCourseId === courseId;
  }

  private findFirstLessonValidation(treeData: any[]): any {
    // Find first lesson node for comparison
    const findLesson = (nodes: any[]): any => {
      for (const node of nodes) {
        if (node.id && node.id.includes('lesson_')) {
          return {
            id: node.id,
            text: node.text,
            sortOrder: node['original']?.sortOrder,  // ✅ FIXED: Use bracket notation
            parentId: node['original']?.topicId || node['original']?.subTopicId  // ✅ FIXED: Use bracket notation
          };
        }
        if (node.child) {
          const found = findLesson(node.child);
          if (found) return found;
        }
      }
      return null;
    };
    return findLesson(treeData);
  }

}

export default TreeWrapperComponent;
