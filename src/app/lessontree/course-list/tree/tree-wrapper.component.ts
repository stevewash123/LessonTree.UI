// RESPONSIBILITY: Manages SyncFusion tree UI, drag operations, and node actions for a single course.
// DOES NOT: Handle data storage, API calls, or cross-course operations.
// CALLED BY: CourseList for each active course, displays hierarchical course structure.

import { Component, OnInit, AfterViewInit, Input, ViewChild, computed, OnDestroy } from '@angular/core';
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
        if (!this.courseId) return;
        
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
            this.updateTreeData();
        }
    }

    private handleCourseDataUpdated(course: Course): void {
        this.course = course;
        if (this.isViewInitialized) {
            this.updateTreeData();
        }
    }
    
    private handleCourseCleared(): void {
        this.course = null;
        if (this.isViewInitialized) {
            this.clearTreeData();
        }
    }
    
    private handleInternalTreeChange(): void {
        if (this.isViewInitialized) {
            this.syncDataOnly();
        }
    }
    
    private handleExternalTreeChange(): void {
        if (this.isViewInitialized) {
            this.updateTreeData();
        } else {
            const updatedCourse = this.courseDataService.getCourseById(this.courseId);
            if (updatedCourse) {
                this.course = updatedCourse;
            }
        }
    }

    private syncDataOnly(): void {
        if (!this.courseId || !this.isViewInitialized) return;
        
        const updatedCourse = this.courseDataService.getCourseById(this.courseId);
        if (updatedCourse) {
            this.course = updatedCourse;
            const result = this.treeSyncService.syncDataOnly(updatedCourse, this.syncFuncTree, this.courseId);
            if (!result.success) {
                console.error(`[TreeWrapper] Sync failed:`, result.error);
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
                } else if (!result.success) {
                    console.error(`[TreeWrapper] Update failed:`, result.error);
                }
            });
    }

    public onDataBound(): void {
        this.treeSyncService.handleDataBound(this.treeData, this.course?.id);
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