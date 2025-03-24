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
    @Output() nodeDragStop = new EventEmitter<TopicMovedEvent>();
    @Output() nodeSelected = new EventEmitter<NodeSelectedEvent>();
    @Output() lessonMoved = new EventEmitter<LessonMovedEvent>();

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
        console.log(`[${this.courseId}] updateTreeData: Updating with topics`, topics);
        const newTreeData = topics.map(t => {
            const topicNode = createTopicNode(t);
            console.log(`[${this.courseId}] updateTreeData: Processing topic ${t.title}`, {
                hasSubTopics: t.hasSubTopics,
                subTopicsCount: t.subTopics?.length,
                lessonsCount: t.lessons?.length
            });
    
            // Preload child nodes for topics
            if (t.hasSubTopics) {
                topicNode.child = t.subTopics?.map(st => {
                    const subTopicNode = createSubTopicNode(st);
                    // Preload lessons for subtopics
                    subTopicNode.child = st.lessons?.map(l => createLessonNode(l)) || [];
                    subTopicNode.hasChildren = (st.lessons?.length ?? 0) > 0;
                    console.log(`[${this.courseId}] updateTreeData: Processing subtopic ${st.title}`, {
                        lessonsCount: st.lessons?.length,
                        hasChildren: subTopicNode.hasChildren
                    });
                    return subTopicNode;
                }) || [];
            } else {
                topicNode.child = t.lessons?.map(l => createLessonNode(l)) || [];
            }
            const subTopicsLength = t.subTopics?.length ?? 0;
            const lessonsLength = t.lessons?.length ?? 0;
            topicNode.hasChildren = t.hasSubTopics ? (subTopicsLength > 0) : (lessonsLength > 0);
            console.log(`[${this.courseId}] updateTreeData: Computed hasChildren for ${t.title}`, {
                hasChildren: topicNode.hasChildren,
                subTopicsLength,
                lessonsLength
            });
    
            return topicNode;
        });
    
        if (!this.validateTreeData(newTreeData)) {
            console.warn(`[${this.courseId}] updateTreeData: Invalid tree data`, newTreeData);
            return;
        }
    
        const logTree = (nodes: TreeNode[], level: number = 0): any[] => {
            return nodes.map(n => ({
                level,
                id: n.id,
                text: n.text,
                hasChildren: n.hasChildren,
                childCount: n.child?.length || 0,
                children: n.child ? logTree(n.child, level + 1) : []
            }));
        };
        console.log(`[${this.courseId}] updateTreeData: Built treeData`, logTree(newTreeData));
    
        this.treeData = newTreeData;
        this.treeFields = { ...this.treeFields, dataSource: this.treeData };
        if (this.syncFuncTree) {
            console.log(`[${this.courseId}] updateTreeData: Binding data`);
            this.syncFuncTree.dataBind();
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
        console.log(`[${this.courseId}] onNodeDragStop: Drag stopped`, args);
        const draggedNodeId = args.draggedNodeData.id;
        const targetNodeId = args.droppedNodeData.id;

        if (!this.allowDrag) {
            console.log(`[${this.courseId}] onNodeDragStop: Drag cancelled due to threshold`);
            args.cancel = true;
            return;
        }

        const draggedNode = this.findNodeById(this.treeData, draggedNodeId);
        if (!draggedNode) {
            console.warn(`[${this.courseId}] onNodeDragStop: Dragged node not found: ${draggedNodeId}`);
            return;
        }

        if (draggedNode.nodeType === 'Lesson') {
            const targetNode = this.findNodeById(this.treeData, targetNodeId);
            if (!targetNode || targetNode.nodeType !== 'SubTopic') {
                console.warn(`[${this.courseId}] onNodeDragStop: Invalid target for Lesson: ${targetNodeId}`);
                return;
            }

            const lesson = draggedNode.original as Lesson;
            const sourceSubTopicId = lesson.subTopicId;
            const targetSubTopic = targetNode.original as SubTopic;
            const targetSubTopicId = targetSubTopic.id;

            console.log(`[${this.courseId}] onNodeDragStop: Moving lesson ${lesson.id} from subTopic ${sourceSubTopicId} to ${targetSubTopicId}`);
            this.apiService.moveLesson(lesson.id, targetSubTopicId).subscribe({
                next: () => {
                    this.moveLessonInTreeData(draggedNodeId, sourceSubTopicId, targetSubTopicId);
                    const event: LessonMovedEvent = { lesson, sourceSubTopicId, targetSubTopicId };
                    this.lessonMoved.emit(event);
                    console.log(`[${this.courseId}] onNodeDragStop: Lesson moved successfully`, event);
                },
                error: (err: any) => console.error(`[${this.courseId}] onNodeDragStop: Failed to move lesson`, err)
            });
        } else if (draggedNode.nodeType === 'Topic') {
            const topic = draggedNode.original as Topic;
            const sourceCourseId = this.courseId;
            let targetCourseId: number | null = null;
            const targetNode = this.courseManagement.courses.flatMap(c => c.topics || []).find(t => t.nodeId === targetNodeId);

            if (targetNode) {
                targetCourseId = targetNode.courseId;
            } else {
                console.warn(`[${this.courseId}] onNodeDragStop: Target course not found for node: ${targetNodeId}`);
                return;
            }

            if (sourceCourseId === targetCourseId) {
                console.log(`[${this.courseId}] onNodeDragStop: Topic dropped within same course`);
                return;
            }

            const event: TopicMovedEvent = { topic, sourceCourseId, targetCourseId, targetNodeId };
            console.log(`[${this.courseId}] onNodeDragStop: Moving topic to course ${targetCourseId}`);
            this.nodeDragStop.emit(event);
        }

        this.allowDrag = false;
    }

    private moveLessonInTreeData(lessonNodeId: string, sourceSubTopicId: number, targetSubTopicId: number) {
        console.log(`[${this.courseId}] moveLessonInTreeData: Moving lesson ${lessonNodeId}`);
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

        if (!sourceSubTopicNode || !targetSubTopicNode || !lessonNode) {
            console.error(`[${this.courseId}] moveLessonInTreeData: Missing nodes`, { sourceSubTopicNode, targetSubTopicNode, lessonNode });
            return;
        }

        sourceSubTopicNode.child = sourceSubTopicNode.child?.filter(child => child.id !== lessonNodeId) || [];
        if (!targetSubTopicNode.child) targetSubTopicNode.child = [];
        targetSubTopicNode.child.push(lessonNode);
        (lessonNode.original as Lesson).subTopicId = targetSubTopicId;

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
        console.log(`[${this.courseId}] addChildNode: Adding child to node`, data);
        const nodeId = data.id;
        const node = this.findNodeById(this.treeData, nodeId);
        if (!node) {
            console.warn(`[${this.courseId}] addChildNode: Node not found: ${nodeId}`);
            return;
        }

        if (node.nodeType === 'Topic') {
            const topic = node.original as Topic;
            const newSubTopic: SubTopic = {
                id: 0,
                nodeId: `subtopic_${Date.now()}`,
                title: 'New SubTopic',
                description: 'Placeholder description',
                topicId: topic.id,
                courseId: topic.courseId,
                isDefault: false,
                lessons: [],
                hasChildren: false
            };
            this.apiService.createSubTopic(newSubTopic).subscribe({
                next: (createdSubTopic: SubTopic) => {
                    const subTopicNode = createSubTopicNode(createdSubTopic);
                    if (this.syncFuncTree) {
                        this.syncFuncTree.addNodes([subTopicNode], nodeId);
                        this.updateTreeDataWithChildren(nodeId, (node.child || []).concat(subTopicNode));
                        this.emitNodeSelected({ nodeData: { id: subTopicNode.id } });
                        console.log(`[${this.courseId}] addChildNode: SubTopic added`, createdSubTopic);
                    }
                },
                error: (err: any) => console.error(`[${this.courseId}] addChildNode: Failed to create SubTopic`, err)
            });
        } else if (node.nodeType === 'SubTopic') {
            const subTopic = node.original as SubTopic;
            const newLesson: Lesson = {
                id: 0,
                nodeId: `lesson_${Date.now()}`,
                courseId: subTopic.courseId,
                subTopicId: subTopic.id,
                title: 'New Lesson',
                objective: 'Placeholder objective'
            };
            this.apiService.createLesson(newLesson).subscribe({
                next: (createdLesson: Lesson) => {
                    const lessonNode = createLessonNode(createdLesson);
                    if (this.syncFuncTree) {
                        this.syncFuncTree.addNodes([lessonNode], nodeId);
                        this.updateTreeDataWithChildren(nodeId, (node.child || []).concat(lessonNode));
                        this.emitNodeSelected({ nodeData: { id: lessonNode.id } });
                        console.log(`[${this.courseId}] addChildNode: Lesson added`, createdLesson);
                    }
                },
                error: (err: any) => console.error(`[${this.courseId}] addChildNode: Failed to create Lesson`, err)
            });
        }
    }

    public deleteNode(data: any) {
        console.log(`[${this.courseId}] deleteNode: Deleting node`, data);
        const nodeId = data.id;
        const node = this.findNodeById(this.treeData, nodeId);
        if (!node) {
            console.warn(`[${this.courseId}] deleteNode: Node not found: ${nodeId}`);
            return;
        }

        if (node.nodeType === 'Topic') {
            const topic = node.original as Topic;
            this.apiService.deleteTopic(topic.id).subscribe({
                next: () => {
                    if (this.syncFuncTree) {
                        this.syncFuncTree.removeNodes([nodeId]);
                        this.treeData = this.treeData.filter(n => n.id !== nodeId);
                        console.log(`[${this.courseId}] deleteNode: Topic deleted: ${topic.id}`);
                    }
                },
                error: (err: any) => console.error(`[${this.courseId}] deleteNode: Failed to delete Topic`, err)
            });
        } else if (node.nodeType === 'SubTopic') {
            const subTopic = node.original as SubTopic;
            this.apiService.deleteSubTopic(subTopic.id).subscribe({
                next: () => {
                    if (this.syncFuncTree) {
                        this.syncFuncTree.removeNodes([nodeId]);
                        this.updateTreeDataWithChildren(subTopic.topicId.toString(), (this.findNodeById(this.treeData, subTopic.topicId.toString())?.child || []).filter(n => n.id !== nodeId));
                        console.log(`[${this.courseId}] deleteNode: SubTopic deleted: ${subTopic.id}`);
                    }
                },
                error: (err: any) => console.error(`[${this.courseId}] deleteNode: Failed to delete SubTopic`, err)
            });
        } else if (node.nodeType === 'Lesson') {
            const lesson = node.original as Lesson;
            this.apiService.deleteLesson(lesson.id).subscribe({
                next: () => {
                    if (this.syncFuncTree) {
                        this.syncFuncTree.removeNodes([nodeId]);
                        this.updateTreeDataWithChildren(lesson.subTopicId.toString(), (this.findNodeById(this.treeData, lesson.subTopicId.toString())?.child || []).filter(n => n.id !== nodeId));
                        console.log(`[${this.courseId}] deleteNode: Lesson deleted: ${lesson.id}`);
                    }
                },
                error: (err: any) => console.error(`[${this.courseId}] deleteNode: Failed to delete Lesson`, err)
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
        console.log(`[${this.courseId}] updateTreeDataWithChildren: Updated children for parent ${parentId}, child count: ${childNodes.length}`);
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }
}

export default TreeWrapperComponent;