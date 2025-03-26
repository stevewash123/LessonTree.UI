import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { CourseListComponent } from '../course-list.component';
import { createTopicNode, Topic } from '../../../models/topic';
import { NodeSelectedEvent, TopicMovedEvent, TreeNode } from '../../../models/tree-node';
import { ApiService } from '../../../core/services/api.service';
import { createSubTopicNode, SubTopic } from '../../../models/subTopic';
import { createLessonNode, Lesson } from '../../../models/lesson';
import { TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';

interface LessonMovedEvent {
    lesson: Lesson;
    sourceSubTopicId: number;
    targetSubTopicId: number;
}

@Component({
    selector: 'app-tree',
    standalone: true,
    imports: [
        TreeViewModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule
    ],
    templateUrl: './tree-wrapper.component.html',
    styleUrls: ['./tree-wrapper.component.css']
})
export class TreeWrapperComponent implements OnChanges, AfterViewInit, OnDestroy {
    @Input() topics: Topic[] = [];
    @Input() courseId!: number;
    @Input() courseManagement!: CourseListComponent;
    @Input() refreshTrigger!: boolean;
    @Input() activeNode: TreeNode | null = null;
    @Input() newNode: TreeNode | null = null;
    @Output() nodeDragStop = new EventEmitter<TopicMovedEvent>();
    @Output() nodeSelected = new EventEmitter<NodeSelectedEvent>();
    @Output() lessonMoved = new EventEmitter<LessonMovedEvent>();
    @Output() addNodeRequested = new EventEmitter<{ parentNode: TreeNode; nodeType: 'Topic' | 'SubTopic' | 'Lesson' }>();

    @ViewChild('treeview') syncFuncTree!: TreeViewComponent;

    public treeData: TreeNode[] = [];
    public treeFields: object = { dataSource: this.treeData, id: 'id', text: 'text', child: 'child', hasChildren: 'hasChildren', iconCss: 'iconCss' };
    private activeNodeId: string | null = null;
    private isViewInitialized: boolean = false;
    private pendingTopics: Topic[] | null = null;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private allowDrag: boolean = false;
    private topicsSubject = new BehaviorSubject<Topic[] | null>(null);
    private viewInitializedSubject = new BehaviorSubject<boolean>(false);
    private initializationSubscription: Subscription | null = null;
    private isProgrammaticSelection: boolean = false;



    constructor(
        private apiService: ApiService,
        private cdr: ChangeDetectorRef
    ) {
        this.initializationSubscription = combineLatest([this.topicsSubject, this.viewInitializedSubject]).subscribe(([topics, viewInitialized]) => {
            if (topics && topics.length > 0 && viewInitialized && this.syncFuncTree) {
                console.log(`[${this.courseId}] Initialization: Topics and view ready`);
                this.isViewInitialized = true;
                this.processPendingOperations();
            }
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        console.log(`[${this.courseId}] ngOnChanges: Changes detected`, changes);
        if (changes['topics']) {
            this.topics = changes['topics'].currentValue;
            this.topicsSubject.next(this.topics);
        }
        if (changes['courseId']) {
            this.courseId = changes['courseId'].currentValue;
        }
        if (changes['refreshTrigger']) {
            this.refreshTrigger = changes['refreshTrigger'].currentValue;
        }
        if (changes['activeNode']) {
            const newActiveNode = changes['activeNode'].currentValue as TreeNode | null;
            if (newActiveNode && newActiveNode.id !== this.activeNodeId) {
                this.activeNodeId = newActiveNode.id;
                console.log(`[${this.courseId}] ngOnChanges: Active node changed to ${this.activeNodeId}`);
                if (this.syncFuncTree) {
                    this.isProgrammaticSelection = true; // Flag to prevent loop
                    this.syncFuncTree.selectedNodes = this.activeNodeId ? [this.activeNodeId] : [];
                    console.log(`[${this.courseId}] ngOnChanges: Set selectedNodes to ${this.activeNodeId}`);
                }
            }
        }
        if (changes['newNode'] && changes['newNode'].currentValue) {
            const newNode = changes['newNode'].currentValue as TreeNode;
            this.selectNode(newNode.id);
            console.log(`[${this.courseId}] ngOnChanges: Selecting new node ${newNode.id}`);
          }
    
        this.cdr.detectChanges();
    
        if (this.isViewInitialized && this.syncFuncTree) {
            console.log(`[${this.courseId}] ngOnChanges: Updating tree data`);
            this.updateTreeData(this.topics);
        } else {
            console.log(`[${this.courseId}] ngOnChanges: View not initialized, queuing topics`);
            this.pendingTopics = this.topics;
        }
    }

    ngAfterViewInit() {
        console.log(`[${this.courseId}] ngAfterViewInit: Tree initialized`);
        this.viewInitializedSubject.next(true);
    }

    ngOnDestroy() {
        if (this.initializationSubscription) {
            this.initializationSubscription.unsubscribe();
        }
    }

    private processPendingOperations() {
        if (this.pendingTopics !== null) {
            console.log(`[${this.courseId}] processPendingOperations: Applying pending topics`);
            this.updateTreeData(this.pendingTopics);
            this.pendingTopics = null;
        }
    }

    // Modify updateTreeData to set expanded state
    private updateTreeData(topics: Topic[] = this.topics) {
        console.log(`[${this.courseId}] updateTreeData: Updating with topics`, { topicsCount: topics.length, timestamp: new Date().toISOString() });
        const newTreeData = topics.map(t => {
            const topicNode = createTopicNode(t);
            console.log(`[${this.courseId}] updateTreeData: Processing topic ${t.title}`, {
                subTopicsCount: t.subTopics?.length ?? 0,
                lessonsCount: t.lessons?.length ?? 0,
                timestamp: new Date().toISOString()
            });
    
            // Use hasChildren instead of hasSubTopics
            if (t.subTopics?.length) {
                topicNode.child = t.subTopics.map(st => {
                    const subTopicNode = createSubTopicNode(st);
                    subTopicNode.child = st.lessons?.map(l => createLessonNode(l)) || [];
                    subTopicNode.hasChildren = (st.lessons?.length ?? 0) > 0;
                    console.log(`[${this.courseId}] updateTreeData: Processing subtopic ${st.title}`, {
                        lessonsCount: st.lessons?.length ?? 0,
                        hasChildren: subTopicNode.hasChildren,
                        timestamp: new Date().toISOString()
                    });
                    return subTopicNode;
                }) || [];
            } else {
                topicNode.child = t.lessons?.map(l => createLessonNode(l)) || [];
            }
            topicNode.hasChildren = (t.subTopics?.length ?? 0) > 0 || (t.lessons?.length ?? 0) > 0;
    
            return topicNode;
        });
    
        if (!this.validateTreeData(newTreeData)) {
            console.warn(`[${this.courseId}] updateTreeData: Invalid tree data`, { data: newTreeData, timestamp: new Date().toISOString() });
            return;
        }
    
        this.treeData = newTreeData;
        this.treeFields = { ...this.treeFields, dataSource: this.treeData };
        if (this.syncFuncTree) {
            console.log(`[${this.courseId}] updateTreeData: Binding data`, { timestamp: new Date().toISOString() });
            this.syncFuncTree.dataBind();
        }
        if (this.newNode) {
            this.selectNode(this.newNode.id);
            this.newNode = null;
        }
    }

    // Update onDataBound to ensure correct node selection
    public onDataBound() {
        console.log(`[${this.courseId}] onDataBound: Tree data bound, activeNodeId: ${this.activeNodeId}`);
        
        if (this.syncFuncTree && this.activeNodeId) {
            this.isProgrammaticSelection = true; // Flag to prevent loop
            this.syncFuncTree.selectedNodes = [this.activeNodeId];
            console.log(`[${this.courseId}] onDataBound: Set selectedNodes to ${this.activeNodeId}, actual selectedNodes:`, this.syncFuncTree.selectedNodes);
        } else if (!this.activeNodeId) {
            console.warn(`[${this.courseId}] onDataBound: No activeNodeId set`);
            if (this.syncFuncTree) {
                this.isProgrammaticSelection = true; // Flag to prevent loop
                this.syncFuncTree.selectedNodes = [];
                console.log(`[${this.courseId}] onDataBound: Cleared selectedNodes`);
            }
        }
    }

    private validateTreeData(data: TreeNode[]): boolean {
        const isValid = Array.isArray(data) && data.every(node => 
            node.id && 
            node.text && 
            (node.hasChildren === true || node.hasChildren === false) && 
            Array.isArray(node.child)
        );
        if (!isValid) {
            console.warn(`[${this.courseId}] validateTreeData: Validation failed`, data);
        }
        return isValid;
    }

    public onNodeDragStart(args: any) {
        console.log(`[${this.courseId}] onNodeDragStart: Drag started for node: ${args.draggedNodeData.id}`);
        this.dragStartX = args.event.pageX;
        this.dragStartY = args.event.pageY;
        this.allowDrag = false;
    }

    public emitNodeSelected(args: any) {
        const nodeId = args.nodeData.id;
        console.log(`[${this.courseId}] emitNodeSelected: Node selected: ${nodeId}, isProgrammatic: ${this.isProgrammaticSelection}`);
        
        // Skip emitting if this is a programmatic selection
        if (this.isProgrammaticSelection) {
            this.isProgrammaticSelection = false;
            return;
        }
    
        const node = this.findNodeById(this.treeData, nodeId);
        if (node) {
            this.activeNodeId = nodeId;
            if (this.syncFuncTree) {
                this.isProgrammaticSelection = true; // Flag to prevent loop
                this.syncFuncTree.selectedNodes = this.activeNodeId ? [this.activeNodeId] : [];
            }
            this.nodeSelected.emit({ node });
        } else {
            console.warn(`[${this.courseId}] emitNodeSelected: Node not found: ${nodeId}`);
        }
    }
    
    public nodeDragging(args: any) {
        const currentX = args.event.pageX;
        const currentY = args.event.pageY;
        const distance = Math.sqrt(Math.pow(currentX - this.dragStartX, 2) + Math.pow(currentY - this.dragStartY, 2));
        console.log(`[${this.courseId}] nodeDragging: Dragging node ${args.draggedNodeData.id}, Distance: ${distance}px`);

        if (distance >= 15 && !this.allowDrag) {
            this.allowDrag = true;
        }
        if (!this.allowDrag) {
            args.cancel = true;
        }
    }

    public onNodeDragStop(args: any) {
        console.log(`[${this.courseId}] onNodeDragStop: Drag stopped`, {
            draggedNodeId: args.draggedNodeData.id,
            targetNodeId: args.droppedNodeData.id,
            timestamp: new Date().toISOString()
        });
    
        const draggedNodeId = args.draggedNodeData.id;
        const targetNodeId = args.droppedNodeData.id;
    
        if (!this.allowDrag) {
            console.log(`[${this.courseId}] onNodeDragStop: Drag cancelled due to threshold`, { timestamp: new Date().toISOString() });
            args.cancel = true;
            return;
        }
    
        const draggedNode = this.findNodeById(this.treeData, draggedNodeId);
        if (!draggedNode) {
            console.warn(`[${this.courseId}] onNodeDragStop: Dragged node not found: ${draggedNodeId}`, { timestamp: new Date().toISOString() });
            return;
        }
    
        const targetNode = this.findNodeById(this.treeData, targetNodeId);
        if (!targetNode) {
            console.warn(`[${this.courseId}] onNodeDragStop: Target node not found: ${targetNodeId}`, { timestamp: new Date().toISOString() });
            return;
        }
    
        if (draggedNode.nodeType === 'Lesson') {
            if (targetNode.nodeType !== 'SubTopic') {
                console.warn(`[${this.courseId}] onNodeDragStop: Invalid target for Lesson: ${targetNodeId}`, { timestamp: new Date().toISOString() });
                return;
            }
    
            const lesson = draggedNode.original as Lesson;
            const sourceSubTopicId = lesson.subTopicId;
            const targetSubTopic = targetNode.original as SubTopic;
            const targetSubTopicId = targetSubTopic.id;
    
            console.log(`[${this.courseId}] onNodeDragStop: Moving lesson ${lesson.id} from subTopic ${sourceSubTopicId} to ${targetSubTopicId}`, { timestamp: new Date().toISOString() });
            this.apiService.moveLesson(lesson.id, targetSubTopicId).subscribe({
                next: () => {
                    this.moveLessonInTreeData(draggedNodeId, sourceSubTopicId!, targetSubTopicId);
                    const event: LessonMovedEvent = { lesson, sourceSubTopicId: sourceSubTopicId!, targetSubTopicId };
                    this.lessonMoved.emit(event);
                    console.log(`[${this.courseId}] onNodeDragStop: Lesson moved successfully`, { event, timestamp: new Date().toISOString() });
                },
                error: (err: any) => console.error(`[${this.courseId}] onNodeDragStop: Failed to move lesson`, { error: err, timestamp: new Date().toISOString() })
            });
        } else if (draggedNode.nodeType === 'SubTopic') {
            if (targetNode.nodeType !== 'Topic') {
                console.warn(`[${this.courseId}] onNodeDragStop: Invalid target for SubTopic: ${targetNodeId}`, { timestamp: new Date().toISOString() });
                return;
            }
    
            const subTopic = draggedNode.original as SubTopic;
            const sourceTopicId = subTopic.topicId;
            const targetTopic = targetNode.original as Topic;
            const targetTopicId = targetTopic.id;
    
            console.log(`[${this.courseId}] onNodeDragStop: Moving subTopic ${subTopic.id} from topic ${sourceTopicId} to ${targetTopicId}`, { timestamp: new Date().toISOString() });
            this.apiService.moveSubTopic(subTopic.id, targetTopicId).subscribe({
                next: () => {
                    this.moveSubTopicInTreeData(draggedNodeId, sourceTopicId, targetTopicId);
                    console.log(`[${this.courseId}] onNodeDragStop: SubTopic moved successfully`, { subTopicId: subTopic.id, targetTopicId, timestamp: new Date().toISOString() });
                },
                error: (err: any) => console.error(`[${this.courseId}] onNodeDragStop: Failed to move subTopic`, { error: err, timestamp: new Date().toISOString() })
            });
        } else if (draggedNode.nodeType === 'Topic') {
            const topic = draggedNode.original as Topic;
            const sourceCourseId = this.courseId;
            let targetCourseId: number | null = null;
            const targetNodeFromCourses = this.courseManagement.courses.flatMap(c => c.topics || []).find(t => t.nodeId === targetNodeId);
    
            if (targetNodeFromCourses) {
                targetCourseId = targetNodeFromCourses.courseId;
            } else {
                console.warn(`[${this.courseId}] onNodeDragStop: Target course not found for node: ${targetNodeId}`, { timestamp: new Date().toISOString() });
                return;
            }
    
            if (sourceCourseId === targetCourseId) {
                console.log(`[${this.courseId}] onNodeDragStop: Topic dropped within same course`, { timestamp: new Date().toISOString() });
                return;
            }
    
            const event: TopicMovedEvent = { topic, sourceCourseId, targetCourseId, targetNodeId };
            console.log(`[${this.courseId}] onNodeDragStop: Emitting topic move event`, { event, timestamp: new Date().toISOString() });
            this.nodeDragStop.emit(event);
        }
    
        this.allowDrag = false;
    }

    private moveLessonInTreeData(lessonNodeId: string, sourceSubTopicId: number | undefined, targetSubTopicId: number) {
        console.log(`[${this.courseId}] moveLessonInTreeData: Moving lesson`, {
            lessonNodeId,
            sourceSubTopicId,
            targetSubTopicId,
            timestamp: new Date().toISOString()
        });
        let sourceSubTopicNode: TreeNode | undefined;
        let targetSubTopicNode: TreeNode | undefined;
        let lessonNode: TreeNode | undefined;
    
        const traverse = (nodes: TreeNode[]): boolean => {
            for (const node of nodes) {
                if (node.nodeType === 'SubTopic') {
                    const subTopic = node.original as SubTopic;
                    if (subTopic.id === sourceSubTopicId) {
                        sourceSubTopicNode = node;
                        lessonNode = node.child?.find(child => child.id === lessonNodeId);
                    }
                    if (subTopic.id === targetSubTopicId) {
                        targetSubTopicNode = node;
                    }
                }
                if (node.child && traverse(node.child)) return true;
            }
            return false;
        };
    
        traverse(this.treeData);
    
        if (!lessonNode || (!sourceSubTopicNode && sourceSubTopicId !== undefined) || !targetSubTopicNode) {
            console.error(`[${this.courseId}] moveLessonInTreeData: Missing nodes`, {
                sourceSubTopicNode: !!sourceSubTopicNode,
                targetSubTopicNode: !!targetSubTopicNode,
                lessonNode: !!lessonNode,
                timestamp: new Date().toISOString()
            });
            return;
        }
    
        if (sourceSubTopicNode) {
            sourceSubTopicNode.child = sourceSubTopicNode.child?.filter(child => child.id !== lessonNodeId) || [];
        }
        if (!targetSubTopicNode.child) targetSubTopicNode.child = [];
        targetSubTopicNode.child.push(lessonNode);
        (lessonNode.original as Lesson).subTopicId = targetSubTopicId;
    
        this.treeData = [...this.treeData];
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }

    private moveSubTopicInTreeData(subTopicNodeId: string, sourceTopicId: number, targetTopicId: number) {
        console.log(`[${this.courseId}] moveSubTopicInTreeData: Moving subTopic ${subTopicNodeId} from topic ${sourceTopicId} to ${targetTopicId}`, { timestamp: new Date().toISOString() });
        let sourceTopicNode: TreeNode | undefined;
        let targetTopicNode: TreeNode | undefined;
        let subTopicNode: TreeNode | undefined;
    
        for (const topicNode of this.treeData) {
            if ((topicNode.original as Topic).id === sourceTopicId) {
                sourceTopicNode = topicNode;
                subTopicNode = topicNode.child?.find(child => child.id === subTopicNodeId);
            }
            if ((topicNode.original as Topic).id === targetTopicId) {
                targetTopicNode = topicNode;
            }
        }
    
        if (!sourceTopicNode || !targetTopicNode || !subTopicNode) {
            console.error(`[${this.courseId}] moveSubTopicInTreeData: Missing nodes`, {
                sourceTopicNode: !!sourceTopicNode,
                targetTopicNode: !!targetTopicNode,
                subTopicNode: !!subTopicNode,
                timestamp: new Date().toISOString()
            });
            return;
        }
    
        sourceTopicNode.child = sourceTopicNode.child?.filter(child => child.id !== subTopicNodeId) || [];
        sourceTopicNode.hasChildren = (sourceTopicNode.child.length > 0);
        if (!targetTopicNode.child) targetTopicNode.child = [];
        targetTopicNode.child.push(subTopicNode);
        targetTopicNode.hasChildren = true;
        (subTopicNode.original as SubTopic).topicId = targetTopicId;
    
        this.treeData = [...this.treeData];
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }

    private findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.child) {
                const found = this.findNodeById(node.child, id);
                if (found) return found;
            }
        }
        return undefined;
    }

    public addChildNode(data: any) {
        console.log(`[${this.courseId}] addChildNode: Adding child to node`, { nodeId: data.id, timestamp: new Date().toISOString() });
        const nodeId = data.id;
        const node = this.findNodeById(this.treeData, nodeId);
        if (!node) {
            console.warn(`[${this.courseId}] addChildNode: Node not found: ${nodeId}`, { timestamp: new Date().toISOString() });
            return;
        }
    
        const previousActiveNodeId = this.activeNodeId;
    
        if (node.nodeType === 'Topic') {
            // Use hasChildren to determine if SubTopics exist, then decide child type
            const topic = node.original as Topic;
            const hasSubTopics = (topic.subTopics?.length ?? 0) > 0;
            const childType = hasSubTopics ? 'SubTopic' : 'Lesson';
            console.log(`[${this.courseId}] addChildNode: Emitting ${childType} request for Topic ${nodeId}`, {
                hasSubTopics,
                timestamp: new Date().toISOString()
            });
            this.addNodeRequested.emit({ parentNode: node, nodeType: childType });
        } else if (node.nodeType === 'SubTopic') {
            console.log(`[${this.courseId}] addChildNode: Emitting Lesson request for SubTopic ${nodeId}`, { timestamp: new Date().toISOString() });
            this.addNodeRequested.emit({ parentNode: node, nodeType: 'Lesson' });
        }
    
        if (previousActiveNodeId && this.syncFuncTree) {
            this.activeNodeId = previousActiveNodeId;
            this.isProgrammaticSelection = true;
            this.syncFuncTree.selectedNodes = [previousActiveNodeId];
            console.log(`[${this.courseId}] addChildNode: Restored selection to ${previousActiveNodeId}`, { timestamp: new Date().toISOString() });
        }
    }

    public selectNode(nodeId: string) {
        if (this.syncFuncTree) {
          this.activeNodeId = nodeId;
          this.isProgrammaticSelection = true;
          this.syncFuncTree.selectedNodes = [nodeId];
          console.log(`[${this.courseId}] selectNode: Selected node ${nodeId}`);
        }
      }

      public deleteNode(data: any) {
        console.log(`[${this.courseId}] deleteNode: Deleting node`, { nodeId: data.id, timestamp: new Date().toISOString() });
        const nodeId = data.id;
        const node = this.findNodeById(this.treeData, nodeId);
        if (!node) {
            console.warn(`[${this.courseId}] deleteNode: Node not found`, { nodeId, timestamp: new Date().toISOString() });
            return;
        }
    
        if (node.nodeType === 'Topic') {
            const topic = node.original as Topic;
            this.apiService.deleteTopic(topic.id).subscribe({
                next: () => {
                    if (this.syncFuncTree) {
                        this.syncFuncTree.removeNodes([nodeId]);
                        this.treeData = this.treeData.filter(n => n.id !== nodeId);
                        console.log(`[${this.courseId}] deleteNode: Topic deleted`, { topicId: topic.id, timestamp: new Date().toISOString() });
                    }
                },
                error: (err: any) => console.error(`[${this.courseId}] deleteNode: Failed to delete Topic`, { error: err, timestamp: new Date().toISOString() })
            });
        } else if (node.nodeType === 'SubTopic') {
            const subTopic = node.original as SubTopic;
            this.apiService.deleteSubTopic(subTopic.id).subscribe({
                next: () => {
                    if (this.syncFuncTree) {
                        this.syncFuncTree.removeNodes([nodeId]);
                        this.updateTreeDataWithChildren(subTopic.topicId.toString(), (this.findNodeById(this.treeData, subTopic.topicId.toString())?.child || []).filter(n => n.id !== nodeId));
                        console.log(`[${this.courseId}] deleteNode: SubTopic deleted`, { subTopicId: subTopic.id, timestamp: new Date().toISOString() });
                    }
                },
                error: (err: any) => console.error(`[${this.courseId}] deleteNode: Failed to delete SubTopic`, { error: err, timestamp: new Date().toISOString() })
            });
        } else if (node.nodeType === 'Lesson') {
            const lesson = node.original as Lesson;
            this.apiService.deleteLesson(lesson.id).subscribe({
                next: () => {
                    if (this.syncFuncTree) {
                        this.syncFuncTree.removeNodes([nodeId]);
                        // Use subTopicId if defined, otherwise fall back to topicId
                        const parentId = lesson.subTopicId !== undefined ? lesson.subTopicId.toString() : lesson.topicId?.toString() ?? '';
                        if (!parentId) {
                            console.warn(`[${this.courseId}] deleteNode: No valid parentId for Lesson`, { lessonId: lesson.id, timestamp: new Date().toISOString() });
                            return;
                        }
                        this.updateTreeDataWithChildren(parentId, (this.findNodeById(this.treeData, parentId)?.child || []).filter(n => n.id !== nodeId));
                        console.log(`[${this.courseId}] deleteNode: Lesson deleted`, { lessonId: lesson.id, parentId, timestamp: new Date().toISOString() });
                    }
                },
                error: (err: any) => console.error(`[${this.courseId}] deleteNode: Failed to delete Lesson`, { error: err, timestamp: new Date().toISOString() })
            });
        }
    }
    
    private updateTreeDataWithChildren(parentId: string, childNodes: TreeNode[]) {
        const updateChildren = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map(node => {
                if (node.id === parentId) {
                    return { ...node, child: childNodes || [], hasChildren: childNodes.length > 0 };
                } else if (node.child) {
                    return { ...node, child: updateChildren(node.child) };
                }
                return node;
            });
        };
        this.treeData = updateChildren(this.treeData);
        console.log(`[${this.courseId}] updateTreeDataWithChildren: Updated children`, {
            parentId,
            childCount: childNodes.length,
            timestamp: new Date().toISOString()
        });
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }
}

export default TreeWrapperComponent;