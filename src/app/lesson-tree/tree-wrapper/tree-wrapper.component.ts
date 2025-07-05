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
    private courseSignalService: CourseSignalService
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
      entityTitle: event.entity.title
    });

    // Entity edits require full sync for data consistency
    this.syncDataOnly();
  }

  private handleEntityDeletedEvent(event: EntitySignalPayload): void {
    if (!this.isEventForThisCourse(event)) return;

    console.log(`🌲 [TreeWrapper-${this.instanceId}] RECEIVED entityDeleted EVENT`, {
      courseId: this.courseId,
      entityType: event.entity.entityType,
      entityTitle: event.entity.title
    });

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

    // Entity moves require full sync
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

      this.handleLessonAdded(treeData);
    } catch (error) {
      console.error(`❌ [TreeWrapper-${this.instanceId}] Incremental update failed, falling back:`, error);
      this.syncDataOnly();
    }
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

    this.treeSyncService.handleDataBound(syncFusionData, this.course?.id);
  }

  public emitNodeSelected(args: any): void {
    if (!this.isViewInitialized) return;

    // ✅ BOUNDARY: SyncFusion TreeNode → TreeData conversion
    const syncFusionNode: TreeNode = args.nodeData;
    const treeData = treeNodeToTreeData(syncFusionNode);

    const result = this.treeNodeActionsService.handleNodeSelected(args, this.treeData, this.courseId);

    if (!result.success) {
      console.error(`[TreeWrapper] Selection failed:`, result.error);
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
    if (!this.isViewInitialized) {
      args.cancel = true;
      return;
    }

    // ✅ BOUNDARY: SyncFusion provides TreeNode, convert to TreeData for internal processing
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

    // ✅ BOUNDARY: SyncFusion TreeNode → NodeMovedEvent with TreeData
    const draggedTreeNode: TreeNode = args.draggedNode;
    const targetTreeNode: TreeNode = args.droppedNode;

    const draggedTreeData = treeNodeToTreeData(draggedTreeNode);
    const targetTreeData = targetTreeNode ? treeNodeToTreeData(targetTreeNode) : null;

    const operation = this.treeDragDropService.handleDragStop(
      args, this.dragState, this.treeData, this.courseId
    );


    if (operation) {
      operation.subscribe({
        error: (error) => console.error('[TreeWrapper] Drag operation failed:', error)
      });
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

  public onNodeExpanded(args: any): void {
    if (!this.isViewInitialized) return;

    // ✅ BOUNDARY: SyncFusion TreeNode → TreeData conversion
    const syncFusionNode: TreeNode = args.nodeData;
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
}

export default TreeWrapperComponent;
