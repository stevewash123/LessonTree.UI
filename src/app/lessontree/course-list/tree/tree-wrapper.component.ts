// src/app/lessontree/course-list/tree/tree-wrapper.component.ts - COMPLETE FILE (Refactored with TreeDataService)
import { Component, Input, ViewChild, AfterViewInit, OnInit, effect, computed } from '@angular/core';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { Topic } from '../../../models/topic';
import { TreeData, TreeNode } from '../../../models/tree-node';
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
export class TreeWrapperComponent implements OnInit, AfterViewInit { 
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
        private treeDragDropService: TreeDragDropService
    ) {
        console.log('[TreeWrapper] Component initialized with TreeDataService and TreeDragDropService', { 
            timestamp: new Date().toISOString() 
        });

        // Initialize drag state
        this.dragState = this.treeDragDropService.initializeDragState();

        // Effect: React to course data changes from activeCourses signal
        effect(() => {
            const activeCourses = this.courseDataService.activeCourses();
            if (activeCourses.length > 0 && this.courseId) {
                const updatedCourse = activeCourses.find(c => c.id === this.courseId);
                if (updatedCourse) {
                    console.log(`[TreeWrapper] Course data updated for course ${this.courseId}`, {
                        timestamp: new Date().toISOString()
                    });
                    
                    this.course = updatedCourse;
                    this.updateTreeData();
                } else {
                    // Course is not in activeCourses (filtered out or archived)
                    console.log(`[TreeWrapper] Course ${this.courseId} not in active courses`, {
                        timestamp: new Date().toISOString()
                    });
                    this.course = null;
                    this.clearTreeData();
                }
            }
        });

        // Effect: React to external node selections
        effect(() => {
            const node = this.nodeSelectionService.selectedNode();
            const source = this.nodeSelectionService.selectionSource();
            
            // Only process selections from sources other than the tree
            if (source !== 'tree' && node && this.isNodeInThisCourse(node)) {
                this.handleExternalSelection(node);
            }
        });

        // Effect: React to node lifecycle changes
        effect(() => {
            const addedNode = this.courseDataService.nodeAdded();
            const editedNode = this.courseDataService.nodeEdited();
            const movedInfo = this.courseDataService.nodeMoved();
            const deletedNode = this.courseDataService.nodeDeleted();
            
            // Check if any changes affect this course
            const affectsThisCourse = 
                (addedNode && this.isNodeInThisCourse(addedNode)) ||
                (editedNode && this.isNodeInThisCourse(editedNode)) ||
                (movedInfo && this.isNodeInThisCourse(movedInfo.node)) ||
                (deletedNode && this.isNodeInThisCourse(deletedNode));
            
            if (affectsThisCourse) {
                console.log(`[TreeWrapper] Node changes detected for course ${this.courseId}`, {
                    added: !!addedNode,
                    edited: !!editedNode,
                    moved: !!movedInfo,
                    deleted: !!deletedNode,
                    timestamp: new Date().toISOString()
                });
                
                this.updateTreeData();
            }
        });
    }

    ngOnInit() {
        console.log(`[TreeWrapper] Component initialized for course ${this.courseId}`, {
            timestamp: new Date().toISOString()
        });
        
        // Initial tree setup will be handled by the course data effect
        if (this.courseId) {
            this.course = this.courseDataService.getCourseById(this.courseId);
            if (this.course) {
                this.updateTreeData();
            }
        }
    }

    ngAfterViewInit() {
        console.log(`[TreeWrapper] AfterViewInit - syncFuncTree exists: ${!!this.syncFuncTree}`, {
            courseId: this.courseId,
            timestamp: new Date().toISOString()
        });
        
        // If we have data ready, bind it
        if (this.syncFuncTree && this.treeData.length > 0) {
            console.log('[TreeWrapper] Binding initial tree data in AfterViewInit');
            this.syncFuncTree.dataBind();
        }
    }

    // Helper methods
    private isNodeInThisCourse(node: TreeData): boolean {
        return node.courseId === this.courseId;
    }

    private clearTreeData(): void {
        console.log(`[TreeWrapper] Clearing tree data for course ${this.courseId}`, {
            timestamp: new Date().toISOString()
        });
        
        this.treeData = [];
        this.treeFields = { ...this.treeFields, dataSource: this.treeData };
        
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }

    private updateTreeData(): void {
        if (!this.course) {
            console.warn(`[TreeWrapper] updateTreeData: No course available`);
            return;
        }

        // Use TreeDataService to build tree structure
        this.treeData = this.treeDataService.buildTreeFromCourse(this.course, this.courseId);
        this.treeFields = { ...this.treeFields, dataSource: this.treeData };
        
        // Queue the binding operation
        setTimeout(() => {
            if (this.syncFuncTree) {
                console.log(`[TreeWrapper] Binding tree data for course ${this.course!.id}`);
                this.syncFuncTree.dataBind();
            } else {
                console.error(`[TreeWrapper] SyncFusion tree component not initialized for course ${this.course!.id}`);
            }
        }, 0);
    }

    public onDataBound(): void {
        console.log(`[TreeWrapper] Tree data bound completed for course ${this.course?.id}`, {
            timestamp: new Date().toISOString()
        });
        
        // Use TreeDataService for logging statistics
        this.treeDataService.logTreeStatistics(this.treeData);
    }

    // SyncFusion event handlers
    public emitNodeSelected(args: any): void {
        console.log('[TreeWrapper] Node selected in tree:', {
            nodeId: args.nodeData?.id || 'none',
            courseId: this.courseId,
            timestamp: new Date().toISOString()
        });
        
        if (args.nodeData && args.nodeData.id) {
            // Use TreeDataService to find the node
            const selectedTreeNode = this.treeDataService.findNodeById(this.treeData, args.nodeData.id);
            
            if (selectedTreeNode && selectedTreeNode.original) {
                console.log('[TreeWrapper] Found node in tree data:', {
                    nodeId: selectedTreeNode.original.nodeId, 
                    nodeType: selectedTreeNode.original.nodeType,
                    courseId: this.courseId,
                    timestamp: new Date().toISOString()
                });
                
                // Update the service
                this.nodeSelectionService.selectNode(selectedTreeNode.original as TreeData, 'tree');
            } else {
                console.warn('[TreeWrapper] Node not found in tree data:', {
                    nodeId: args.nodeData.id,
                    courseId: this.courseId,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    private handleExternalSelection(node: TreeData): void {
        if (!this.syncFuncTree || !this.treeData?.length) {
            return;
        }
        
        console.log(`[TreeWrapper] Handling external selection for node: ${node.nodeId}`, { 
            courseId: this.courseId,
            timestamp: new Date().toISOString() 
        });
        
        // Use TreeDataService to find the corresponding node
        const nodeInTree = this.treeDataService.findNodeById(this.treeData, node.nodeId);
        
        if (nodeInTree) {
            // Use the SyncFusion API to select this node without triggering events
            try {
                this.syncFuncTree.selectedNodes = [nodeInTree.id];
                console.log(`[TreeWrapper] Updated tree selection to match external selection`, { 
                    courseId: this.courseId,
                    timestamp: new Date().toISOString() 
                });
            } catch (err) {
                console.error(`[TreeWrapper] Error updating tree selection:`, err, { 
                    courseId: this.courseId,
                    timestamp: new Date().toISOString() 
                });
            }
        } else {
            console.warn(`[TreeWrapper] External node not found in tree`, { 
                nodeId: node.nodeId, 
                courseId: this.courseId,
                timestamp: new Date().toISOString() 
            });
        }
    }

    // Drag and drop handlers - now using TreeDragDropService
    public onNodeDragStart(args: any): void {
        this.treeDragDropService.handleDragStart(args, this.dragState);
    }

    public nodeDragging(args: any): void {
        this.treeDragDropService.handleDragging(args, this.dragState);
    }

    public onNodeDragStop(args: any): void {
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
    public initiateAddChildNode(data: any): void {
        const nodeId = data.id;
        const node = this.treeDataService.findNodeById(this.treeData, nodeId);
        
        if (!node || !node.original) {
            console.warn('[TreeWrapper] Could not find node data for add child action:', { 
                nodeId, 
                courseId: this.courseId,
                timestamp: new Date().toISOString() 
            });
            return;
        }
        
        const treeData = node.original as TreeData;
        console.log(`[TreeWrapper] initiateAddChildNode requested for: ${treeData.nodeId}`, { 
            nodeType: treeData.nodeType, 
            courseId: this.courseId,
            timestamp: new Date().toISOString() 
        });
        
        if (treeData.nodeType === 'Course') {
            // For courses, add a Topic
            this.panelStateService.initiateAddMode('Topic', treeData, treeData.id);
        } else if (treeData.nodeType === 'Topic') {
            const topic = treeData as Topic;
            const hasSubTopics = (topic.subTopics?.length ?? 0) > 0;
            // For topics, add either a SubTopic (if already has subtopics) or Lesson
            const childType = hasSubTopics ? 'SubTopic' : 'Lesson';
            this.panelStateService.initiateAddMode(childType, treeData);
        } else if (treeData.nodeType === 'SubTopic') {
            // For subtopics, add a Lesson
            this.panelStateService.initiateAddMode('Lesson', treeData);
        }
    }

    public deleteNode(data: any): void {
        const nodeId = data.id;
        const node = this.treeDataService.findNodeById(this.treeData, nodeId);
        if (!node) {
            console.warn(`[TreeWrapper] Node not found for deletion: ${nodeId}`, {
                courseId: this.courseId,
                timestamp: new Date().toISOString()
            });
            return;
        }

        console.log(`[TreeWrapper] Deleting ${node.nodeType} node: ${nodeId}`, {
            courseId: this.courseId,
            timestamp: new Date().toISOString()
        });

        // Call service directly instead of emitting event
        switch (node.nodeType) {
            case 'Course':
                this.courseCrudService.deleteCourse((node.original as Course).id).subscribe();
                break;
            case 'Topic':
                this.courseCrudService.deleteTopic((node.original as Topic).id).subscribe();
                break;
            case 'SubTopic':
                this.courseCrudService.deleteSubTopic((node.original as SubTopic).id).subscribe();
                break;
            case 'Lesson':
                this.courseCrudService.deleteLesson((node.original as Lesson).id).subscribe();
                break;
        }
    }

    // Template helper methods - delegate to TreeDataService
    public getNodeTypeIcon(nodeType: string): string {
        return this.treeDataService.getNodeTypeIcon(nodeType);
    }

    // Legacy methods for SyncFusion integration
    private addNodeToTree(newNode: TreeNode): void {
        if (!this.syncFuncTree || !this.treeData) {
            console.warn(`[TreeWrapper] addNodeToTree: Tree not initialized`);
            return;
        }

        const success = this.treeDataService.addNodeToTree(this.treeData, newNode);
        if (success) {
            // Find parent node ID for SyncFusion API
            let parentNodeId: string | undefined;
            
            if (newNode.nodeType === 'Topic') {
                parentNodeId = this.treeData[0]?.id; // Course is always the first node
            } else if (newNode.nodeType === 'SubTopic') {
                const subTopic = newNode.original as SubTopic;
                parentNodeId = this.treeDataService.findTopicNodeId(this.treeData, subTopic.topicId);
            } else if (newNode.nodeType === 'Lesson') {
                const lesson = newNode.original as Lesson;
                if (lesson.subTopicId) {
                    parentNodeId = this.treeDataService.findSubTopicNodeId(this.treeData, lesson.subTopicId);
                } else if (lesson.topicId) {
                    parentNodeId = this.treeDataService.findTopicNodeId(this.treeData, lesson.topicId);
                }
            }

            if (parentNodeId) {
                this.syncFuncTree.addNodes([newNode], parentNodeId, undefined);
                this.sortTreeData();
            }
        }
    }

    private sortTreeData(): void {
        this.treeDataService.sortTreeData(this.treeData);
        
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }

    private updateTreeDataWithChildren(parentId: string, childNodes: TreeNode[]): void {
        this.treeData = this.treeDataService.updateTreeDataWithChildren(this.treeData, parentId, childNodes);
        this.sortTreeData();
        
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }
}

export default TreeWrapperComponent;