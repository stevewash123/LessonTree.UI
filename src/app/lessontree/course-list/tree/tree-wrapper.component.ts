// RESPONSIBILITY: Manages SyncFusion tree UI, drag operations, and node actions for a single course.
// DOES NOT: Handle data storage, API calls, or cross-course operations.
// CALLED BY: CourseList for each active course, displays hierarchical course structure.

import { Component, OnInit, AfterViewInit, Input, ViewChild, computed, effect, OnDestroy } from '@angular/core';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { Topic } from '../../../models/topic';
import { NodeType, TreeData, TreeNode } from '../../../models/tree-node';
import { createSubTopicNode, SubTopic } from '../../../models/subTopic';
import { createLessonNode, Lesson } from '../../../models/lesson';
import { TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { Course } from '../../../models/course';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { PanelStateService } from '../../../core/services/panel-state.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { CourseCrudService } from '../../../core/services/course-crud.service';
import { TreeDataService } from './services/tree-data.service';
import { TreeDragDropService, DragState } from './services/tree-drag-drop.service';
import { TreeExpansionService } from './services/tree-expansion.service';
import { TreeSyncService } from './services/tree-sync.service';
import { TreeNodeActionsService } from './services/tree-node-actions.service';
import { TreeEffectsService, TreeEffectCallbacks } from './services/tree-effect.service';


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

    // Component lifecycle state
    private isViewInitialized = false;
    private pendingCourseData: Course | null = null;

    // Drag and drop state
    private dragState: DragState;

    // Computed signals for reactive data access
    readonly currentCourse = computed(() => {
        if (!this.courseId) return null;
        return this.courseDataService.getCourseById(this.courseId);
    });

    readonly isCourseAvailable = computed(() => {
        const course = this.currentCourse();
        return course !== null && !course.archived;
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
        console.log('[TreeWrapper] Component initialized with TreeDataService and TreeDragDropService', { 
            timestamp: new Date().toISOString() 
        });

        // Initialize drag state
        this.dragState = this.treeDragDropService.initializeDragState();
    }

    ngOnInit() {
        console.log(`[TreeWrapper] Component initialized for course ${this.courseId}`, {
            timestamp: new Date().toISOString()
        });
        
        // Setup reactive effects
        if (this.courseId) {
            const callbacks: TreeEffectCallbacks = {
                onCourseDataUpdated: (course) => this.handleCourseDataUpdated(course),
                onCourseCleared: () => this.handleCourseCleared(),
                onExternalSelection: (node) => this.handleExternalSelection(node),
                onInternalTreeChange: () => this.handleInternalTreeChange(),
                onExternalTreeChange: () => this.handleExternalTreeChange()
            };
            
            const result = this.treeEffectsService.setupEffects(this.courseId, callbacks);
            
            if (!result.success) {
                console.error(`[TreeWrapper] Failed to setup effects:`, result.error);
            } else {
                console.log(`[TreeWrapper] Effects setup completed`, {
                    courseId: this.courseId,
                    effectsCreated: result.effectsCreated,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Get initial course data but don't try to update tree yet
        if (this.courseId) {
            this.course = this.courseDataService.getCourseById(this.courseId);
            // Store course data for when view is ready
            this.pendingCourseData = this.course;
        }
    }
    
    ngOnDestroy() {
        console.log(`[TreeWrapper] Component destroying for course ${this.courseId}`, {
            timestamp: new Date().toISOString()
        });
        
        if (this.courseId) {
            this.treeEffectsService.destroyEffectsForCourse(this.courseId);
        }
    }

    ngAfterViewInit() {
        console.log(`[TreeWrapper] AfterViewInit - syncFuncTree exists: ${!!this.syncFuncTree}`, {
            courseId: this.courseId,
            timestamp: new Date().toISOString()
        });
        
        // Mark view as initialized
        this.isViewInitialized = true;
        
        // Process any pending course data now that view is ready
        if (this.pendingCourseData) {
            console.log('[TreeWrapper] Processing pending course data in AfterViewInit');
            this.updateTreeData();
            this.pendingCourseData = null;
        }
    }

    private handleCourseDataUpdated(course: Course): void {
        console.log(`[TreeWrapper] Course data updated`, {
            courseId: course.id,
            courseTitle: course.title,
            viewInitialized: this.isViewInitialized,
            timestamp: new Date().toISOString()
        });
        
        this.course = course;
        
        if (this.isViewInitialized) {
            // View is ready, update immediately
            this.updateTreeData();
        } else {
            // View not ready yet, store for later
            this.pendingCourseData = course;
            console.log('[TreeWrapper] Storing course data for later processing');
        }
    }
    
    private handleCourseCleared(): void {
        console.log(`[TreeWrapper] Course cleared`, {
            courseId: this.courseId,
            viewInitialized: this.isViewInitialized,
            timestamp: new Date().toISOString()
        });
        
        this.course = null;
        this.pendingCourseData = null;
        
        if (this.isViewInitialized) {
            this.clearTreeData();
        }
    }
    
    private handleInternalTreeChange(): void {
        console.log(`[TreeWrapper] Internal tree change - syncing data only`, {
            courseId: this.courseId,
            viewInitialized: this.isViewInitialized,
            timestamp: new Date().toISOString()
        });
        
        if (this.isViewInitialized) {
            this.syncDataOnly();
        }
    }
    
    private handleExternalTreeChange(): void {
        console.log(`[TreeWrapper] External change - rebuilding tree`, {
            courseId: this.courseId,
            viewInitialized: this.isViewInitialized,
            timestamp: new Date().toISOString()
        });
        
        if (this.isViewInitialized) {
            this.updateTreeData();
        } else {
            // Store the current course for later processing
            const updatedCourse = this.courseDataService.getCourseById(this.courseId);
            if (updatedCourse) {
                this.pendingCourseData = updatedCourse;
                this.course = updatedCourse;
            }
        }
    }

    // Helper methods with view initialization checks
    private syncDataOnly(): void {
        if (!this.courseId || !this.isViewInitialized) {
            console.log('[TreeWrapper] Skipping syncDataOnly - view not ready', {
                courseId: this.courseId,
                viewInitialized: this.isViewInitialized,
                timestamp: new Date().toISOString()
            });
            return;
        }
        
        const updatedCourse = this.courseDataService.getCourseById(this.courseId);
        if (updatedCourse) {
            this.course = updatedCourse;
            
            const result = this.treeSyncService.syncDataOnly(
                updatedCourse, 
                this.syncFuncTree, 
                this.courseId
            );
            
            if (!result.success) {
                console.error(`[TreeWrapper] Failed to sync data:`, result.error);
            }
        }
    }

    private clearTreeData(): void {
        if (!this.isViewInitialized) {
            console.log('[TreeWrapper] Skipping clearTreeData - view not ready', {
                courseId: this.courseId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        const result = this.treeSyncService.clearTreeData(this.syncFuncTree, this.courseId);
        
        if (!result.success) {
            console.error(`[TreeWrapper] Failed to clear tree data:`, result.error);
        }
    }
    
    private updateTreeData(): void {
        if (!this.isViewInitialized) {
            console.log('[TreeWrapper] Skipping updateTreeData - view not ready', {
                courseId: this.courseId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        this.treeSyncService.updateTreeData(this.course, this.syncFuncTree, this.courseId)
            .then(result => {
                if (result.success) {
                    console.log(`[TreeWrapper] Tree data updated successfully`, {
                        courseId: this.courseId,
                        nodeCount: result.nodeCount,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Update local reference for other operations
                    if (this.syncFuncTree && this.syncFuncTree.fields) {
                        this.treeData = (this.syncFuncTree.fields as any).dataSource || [];
                        this.treeFields = this.syncFuncTree.fields;
                    }
                } else {
                    console.error(`[TreeWrapper] Failed to update tree data:`, result.error);
                }
            });
    }

    public onDataBound(): void {
        this.treeSyncService.handleDataBound(this.treeData, this.course?.id);
    }

    // SyncFusion event handlers
    public emitNodeSelected(args: any): void {
        if (!this.isViewInitialized) {
            console.log('[TreeWrapper] Skipping node selection - view not ready');
            return;
        }

        const result = this.treeNodeActionsService.handleNodeSelected(
            args, 
            this.treeData, 
            this.courseId
        );
        
        if (!result.success) {
            console.error(`[TreeWrapper] Node selection failed:`, result.error);
        }
    }

    private async handleExternalSelection(node: TreeData): Promise<void> {
        if (!this.isViewInitialized) {
            console.log('[TreeWrapper] Skipping external selection - view not ready', {
                nodeId: node.nodeId,
                courseId: this.courseId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log(`[TreeWrapper] Delegating external selection to TreeExpansionService`, { 
            nodeId: node.nodeId,
            nodeType: node.nodeType,
            courseId: this.courseId,
            timestamp: new Date().toISOString() 
        });
        
        const result = await this.treeExpansionService.handleExternalSelection(
            node,
            this.syncFuncTree,
            this.treeData,
            this.courseId
        );
        
        if (!result.success) {
            console.error(`[TreeWrapper] External selection failed:`, {
                nodeId: node.nodeId,
                error: result.error,
                courseId: this.courseId,
                timestamp: new Date().toISOString()
            });
        } else {
            console.log(`[TreeWrapper] External selection completed successfully`, {
                nodeId: node.nodeId,
                expandedNodes: result.expandedNodes,
                targetNodeId: result.targetNodeId,
                courseId: this.courseId,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Drag and drop handlers - now using TreeDragDropService
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
            args, 
            this.dragState, 
            this.treeData, 
            this.courseId
        );

        if (operation) {
            operation.subscribe({
                next: (result) => {
                    console.log('[TreeWrapper] Drag operation completed successfully', {
                        courseId: this.courseId,
                        timestamp: new Date().toISOString()
                    });
                },
                error: (error) => {
                    console.error('[TreeWrapper] Drag operation failed:', error, {
                        courseId: this.courseId,
                        timestamp: new Date().toISOString()
                    });
                }
            });
        }
    }

    // Node action handlers
    public initiateAddChildNode(data: any, childType: NodeType): void {
        if (!this.isViewInitialized) {
            console.log('[TreeWrapper] Skipping add child node - view not ready');
            return;
        }

        const result = this.treeNodeActionsService.initiateAddChildNode(
            data,
            childType,
            this.treeData,
            this.courseId
        );
        
        if (!result.success) {
            console.error(`[TreeWrapper] Add child node failed:`, result.error);
        }
    }
    
    public deleteNode(data: any): void {
        if (!this.isViewInitialized) {
            console.log('[TreeWrapper] Skipping delete node - view not ready');
            return;
        }

        const result = this.treeNodeActionsService.deleteNode(
            data,
            this.treeData,
            this.courseId
        );
        
        if (!result.success) {
            console.error(`[TreeWrapper] Delete node failed:`, result.error);
        }
    }

    // Template helper methods - delegate to TreeDataService
    public getNodeTypeIcon(nodeType: string): string {
        return this.treeNodeActionsService.getNodeTypeIcon(nodeType);
    }

    private sortTreeData(): void {
        if (!this.isViewInitialized) {
            return;
        }

        const result = this.treeSyncService.sortAndRebind(this.treeData, this.syncFuncTree);
        
        if (!result.success) {
            console.error(`[TreeWrapper] Failed to sort and rebind tree data:`, result.error);
        }
    }

    public onNodeExpanded(args: any): void {
        if (!this.isViewInitialized) {
            return;
        }

        const result = this.treeNodeActionsService.handleAutoSelectOnExpand(
            args,
            this.treeData,
            this.courseId,
            this.nodeSelectionService.hasSelection()
        );
        
        if (result.success) {
            // Update SyncFusion's selectedNodes array for visual feedback
            try {
                this.syncFuncTree.selectedNodes = [args.nodeData.id];
                console.log('[TreeWrapper] Updated SyncFusion selectedNodes array for auto-selection');
            } catch (err) {
                console.warn('[TreeWrapper] Failed to update SyncFusion selectedNodes:', err);
            }
        }
        // Note: Don't log errors for auto-select failures - they're expected when selection exists
    }
}

export default TreeWrapperComponent;