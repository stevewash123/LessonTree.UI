// RESPONSIBILITY: Manages SyncFusion tree UI, drag operations, and node actions for a single course.
// DOES NOT: Handle data storage, API calls, or cross-course operations.
// CALLED BY: CourseList for each active course, displays hierarchical course structure.

import { Component, OnInit, AfterViewInit, Input, ViewChild, computed, OnDestroy } from '@angular/core';
import { TreeViewComponent, TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { TreeDragDropService, DragState } from '../services/tree-drag-drop.service';
import { TreeExpansionService } from '../services/tree-expansion.service';
import { TreeSyncService } from '../services/tree-sync.service';
import { TreeNodeActionsService } from '../services/tree-node-actions.service';
import { TreeEffectsService, TreeEffectCallbacks } from '../services/tree-effect.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PanelStateService } from '../../info-panel/panel-state.service';
import { Course } from '../../models/course';
import { TreeNode, TreeData } from '../../models/tree-node';
import { CourseCrudService } from '../services/course-crud.service';
import { CourseDataService } from '../../shared/services/course-data.service';
import { NodeSelectionService, NodeType } from '../services/node-selection.service';
import { TreeDataService } from '../services/tree-data.service';

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
    private instanceId = Math.random().toString(36).substr(2, 9); // Add unique ID
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

    // Simplified computed signals - removed unused isCourseAvailable
    readonly currentCourse = computed(() => {
        if (!this.courseId) return null;
        return this.courseDataService.getCourseById(this.courseId);
    });

    constructor(
        private nodeSelectionService: NodeSelectionService,
        private panelStateService: PanelStateService,
        private courseDataService: CourseDataService,
        private courseCrudService: CourseCrudService,
        private treeDataService: TreeDataService,
        private treeDragDropService: TreeDragDropService,
        private treeExpansionService: TreeExpansionService,
        private treeSyncService: TreeSyncService,
        private treeNodeActionsService: TreeNodeActionsService,
        private treeEffectsService: TreeEffectsService  
    ) {
        this.dragState = this.treeDragDropService.initializeDragState();
    }

    ngOnInit() {
        console.log(`🌲 [TreeWrapper-${this.instanceId}] Initializing for courseId: ${this.courseId}`);

        if (!this.courseId) return;
        
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
        
        this.course = this.courseDataService.getCourseById(this.courseId);
    }
    
    ngOnDestroy() {
        if (this.courseId) {
            this.treeEffectsService.destroyEffectsForCourse(this.courseId);
        }
    }

    ngAfterViewInit() {
        this.isViewInitialized = true;
        if (this.course) {
            console.log(`🔄 [TreeWrapper-${this.instanceId}] ngAfterViewInit called for courseId: ${this.courseId}`);

            // CORRECT: Only use full dataBind() on initial load
            this.updateTreeData();
        }
    }

    private handleCourseDataChange(course: Course | null): void {
        if (!course) return;
        
        this.course = course;
        if (this.isViewInitialized) {
            // Check what type of change occurred to decide between incremental vs full sync
            const addedInfo = this.courseDataService.nodeAdded();
            
            if (addedInfo && this.isRecentLessonAdd(addedInfo)) {
                // Use incremental update for recent lesson additions
                console.log(`🌱 [TreeWrapper-${this.instanceId}] Using incremental update for lesson: ${addedInfo.node.title}`);
                this.handleLessonAdded(addedInfo.node);
            } else {
                // Use full sync for other changes (topic additions, major structural changes, etc.)
                console.log(`🔄 [TreeWrapper-${this.instanceId}] Using full sync for structural change`);
                this.syncDataOnly();
            }
        }
    }
    
    private isRecentLessonAdd(addedInfo: any): boolean {
        if (!addedInfo || !addedInfo.node) return false;
        
        // Check if it's a lesson
        const isLesson = addedInfo.node.nodeType === 'Lesson' || 
                        addedInfo.entityType === 'Lesson' ||
                        addedInfo.node.lessonId !== undefined;
        
        if (!isLesson) return false;
        
        // Check if it's recent (within last 100ms to catch the current operation)
        const now = Date.now();
        const addedTime = new Date(addedInfo.timestamp || addedInfo.node.timestamp || now).getTime();
        const isRecent = (now - addedTime) < 100;
        
        console.log(`🔍 [TreeWrapper] Lesson add check:`, {
            isLesson,
            isRecent,
            timeDiff: now - addedTime,
            addedInfo
        });
        
        return isLesson && isRecent;
    }
    
    private handleLessonAdded(lessonNode: any): void {
        if (!this.syncFuncTree || !this.isViewInitialized) return;
        
        // Determine parent node ID
        const parentNodeId = this.determineParentNodeId(lessonNode);
        
        if (parentNodeId === null) {
            console.warn(`[TreeWrapper] Could not determine parent for lesson, falling back to full sync`);
            this.syncDataOnly();
            return;
        }
        
        // TypeScript now knows parentNodeId is definitely a string here
        const result = this.treeSyncService.addLessonNode(
            lessonNode,
            this.syncFuncTree,
            parentNodeId, // No .toString() needed since it's already a string
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
        
        // Check what type of change occurred
        const addedInfo = this.courseDataService.nodeAdded();
        
        if (addedInfo && addedInfo.node.nodeType === 'Lesson') {
            // Use incremental update for lesson additions
            const parentNodeId = this.determineParentNodeId(addedInfo.node);
            const result = this.treeSyncService.addLessonNode(
                addedInfo.node, 
                this.syncFuncTree, 
                parentNodeId, 
                this.courseId
            );
            
            if (!result.success) {
                console.error(`[TreeWrapper] Incremental add failed, falling back to full sync:`, result.error);
                this.syncDataOnly(); // Fallback to full sync
            }
        } else {
            // For other changes, use full sync
            this.syncDataOnly();
        }
    }
    
    private determineParentNodeId(lessonNode: any): string {
        // Try SubTopic first, then Topic
        if (lessonNode.subTopicId) {
            return `subtopic_${lessonNode.subTopicId}`;
        }
        
        if (lessonNode.topicId) {
            return `topic_${lessonNode.topicId}`;
        }
        
        // Look in the lesson data for parent info (different casing)
        if (lessonNode.SubTopicId) {
            return `subtopic_${lessonNode.SubTopicId}`;
        }
        
        if (lessonNode.TopicId) {
            return `topic_${lessonNode.TopicId}`;
        }
        
        // If we can't determine the parent, throw an error
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
                // Update local treeData reference to match what's in SyncFusion
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
    
    // CORRECT: Only use updateTreeData (with dataBind) for initial load and major structural changes
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

    // Drag and drop handlers
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
        const x = JSON.stringify(args, null, 2);
        console.log('FULL DRAG ARGS:', x);
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

    // Node action handlers
    public initiateAddChildNode(data: any, childType: NodeType): void {
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

    // Template helper method - RESTORED (used in template)
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