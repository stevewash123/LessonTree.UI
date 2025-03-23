import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { CourseListPanelComponent } from '../course-list.component';
import { createTopicNode, Topic } from '../../../models/topic';
import { NodeSelectedEvent, TopicMovedEvent, TreeNode } from '../../../models/tree-node';
import { ApiService } from '../../../core/services/api.service';
import { createSubTopicNode, SubTopic } from '../../../models/subTopic';
import { createLessonNode, Lesson } from '../../../models/lesson'; // Added for lesson nodes
import { TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-tree',
    standalone: true,
    imports: [
        TreeViewModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule
    ],
    templateUrl: './tree.component.html',
    styles: []
})
export class TreeComponent implements OnChanges {
    @Input() topics: Topic[] = [];
    @Input() courseId!: number;
    @Input() courseManagement!: CourseListPanelComponent;
    @Input() refreshTrigger!: boolean;
    @Output() nodeDragStop = new EventEmitter<TopicMovedEvent>();
    @Output() nodeSelected = new EventEmitter<NodeSelectedEvent>();

    @ViewChild('treeView') treeViewComponent!: TreeViewComponent;

    public treeData: TreeNode[] = [];
    public treeFields: object = { dataSource: this.treeData, id: 'id', text: 'text', child: 'child', hasChildren: 'hasChildren', iconCss: 'iconCss' };
    private activeNodeId: string | null = null;

    constructor(private apiService: ApiService) {}

    ngOnChanges(changes: SimpleChanges) {
        console.log('onChanges triggered with changes:', changes);
        if (changes['topics'] || changes['refreshTrigger']) {
            this.updateTreeData();
        }
    }

    private updateTreeData(topics: Topic[] = this.topics) {
        console.log('updateTreeData called with topics:', topics);
        const newTreeData = topics.map(t => createTopicNode(t));
        if (!this.validateTreeData(newTreeData)) {
            console.warn('Invalid tree data detected, skipping update:', newTreeData);
            return;
        }

        const existingNodeMap = new Map<string, TreeNode>();
        const traverse = (nodes: TreeNode[]) => {
            nodes.forEach(node => {
                existingNodeMap.set(node.id, node);
                if (node.child) traverse(node.child);
            });
        };
        console.log('Tree data before update:', JSON.stringify(this.treeData));
        traverse(this.treeData);

        this.treeData = newTreeData.map(newNode => {
            const existingNode = existingNodeMap.get(newNode.id);
            if (existingNode && existingNode.child) {
                return { ...newNode, child: existingNode.child };
            }
            return newNode;
        });

        this.treeFields = { ...this.treeFields, dataSource: this.treeData };
        console.log('Tree data after update:', JSON.stringify(this.treeData));
        if (this.treeViewComponent) {
            this.treeViewComponent.dataBind();
        }
    }

    private validateTreeData(data: TreeNode[]): boolean {
        return Array.isArray(data) && data.every(node => node.id && node.text);
    }

    public onNodeExpanding(args: any) {
        const nodeId = args.nodeData.id;
        console.log('Node expanding:', nodeId);
        const node = this.findNodeById(this.treeData, nodeId);
        if (!node) {
            console.warn('Expanding node not found:', nodeId);
            return;
        }
        console.log('Current treeData before fetch:', JSON.stringify(this.treeData));

        if (node.nodeType === 'Topic') {
            const topic = node.original as Topic;
            console.log('Fetching subtopics for topic:', topic.id);
            this.apiService.getSubtopicsByTopic(topic.id).subscribe({
                next: (subTopics) => {
                    const childNodes = subTopics.map(st => createSubTopicNode(st));
                    this.treeViewComponent.addNodes(childNodes, nodeId);
                    console.log('Added subtopics to node', nodeId, ':', childNodes);
                    this.updateTreeDataWithChildren(nodeId, childNodes);
                },
                error: (err) => {
                    console.error('Failed to fetch subtopics for topic', topic.id, ':', err);
                }
            });
        } else if (node.nodeType === 'SubTopic') {
            const subTopic = node.original as SubTopic;
            console.log('Fetching lessons for subtopic:', subTopic.id);
            this.apiService.getLessonsBySubtopic(subTopic.id).subscribe({
                next: (lessons: Lesson[]) => {
                    const childNodes = lessons.map((l: Lesson) => createLessonNode(l));
                    this.treeViewComponent.addNodes(childNodes, nodeId);
                    console.log('Added lessons to node', nodeId, ':', childNodes);
                    this.updateTreeDataWithChildren(nodeId, childNodes);
                },
                error: (err) => {
                    console.error('Failed to fetch lessons for subtopic', subTopic.id, ':', err);
                }
            });
        }
    }

    private updateTreeDataWithChildren(parentId: string, childNodes: TreeNode[]) {
        const updateChildren = (nodes: TreeNode[]): TreeNode[] => {
            return nodes.map(node => {
                if (node.id === parentId) {
                    return { ...node, child: childNodes };
                } else if (node.child) {
                    return { ...node, child: updateChildren(node.child) };
                }
                return node;
            });
        };
        this.treeData = updateChildren(this.treeData);
        console.log('Updated treeData with children for', parentId, ':', JSON.stringify(this.treeData));
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

    public emitNodeSelected(args: any) {
        const nodeId = args.nodeData.id;
        const node = this.findNodeById(this.treeData, nodeId);
        if (node) {
            this.activeNodeId = nodeId;
            console.log('Emitting nodeSelected event:', { node });
            this.nodeSelected.emit({ node });
        }
    }

    public onDataBound() {
        console.log('TreeView initialized:', this.treeViewComponent);
        if (this.activeNodeId && this.treeViewComponent) {
            this.treeViewComponent.selectedNodes = [this.activeNodeId];
        }
    }

    public onNodeDragStop(args: any) {
        console.log('Node drag stop event:', args);
    }

    public determineNodeType(nodeId: string): 'Topic' | 'SubTopic' | 'Lesson' | undefined {
        const node = this.findNodeById(this.treeData, nodeId);
        return node?.nodeType;
    }

    public addChildNode(event: any) {
        // not implemented
    }

    public deleteNode(event: any) {
        // not implemented
    }
}