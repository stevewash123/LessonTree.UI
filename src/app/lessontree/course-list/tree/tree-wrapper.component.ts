import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { TreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { CourseListComponent } from '../course-list.component';
import { Topic } from '../../../models/topic';
import { NodeSelectedEvent, NodeType, TopicMovedEvent, TreeData, TreeNode } from '../../../models/tree-node';
import { ApiService } from '../../../core/services/api.service';
import { createSubTopicNode, SubTopic } from '../../../models/subTopic';
import { createLessonNode, Lesson } from '../../../models/lesson';
import { TreeViewModule } from '@syncfusion/ej2-angular-navigations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { Course } from '../../../models/course';
import { createTopicNode } from '../../../models/topic';

interface LessonMovedEvent {
    lesson: Lesson;
    sourceSubTopicId?: number;
    targetSubTopicId?: number;
    targetTopicId?: number;
}

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
export class TreeWrapperComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() course!: Course;
    @Input() courseManagement!: CourseListComponent;
    @Input() refreshTrigger!: boolean;
    @Input() newNode: TreeData | null = null;
    @Output() nodeDragStop = new EventEmitter<TopicMovedEvent>();
    @Output() lessonMoved = new EventEmitter<LessonMovedEvent>();
    @Output() nodeSelected = new EventEmitter<TreeData>();
    @Output() addNodeRequested = new EventEmitter<{ parentNode: TreeData; nodeType: NodeType }>();



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
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private allowDrag: boolean = false;

    constructor(private apiService: ApiService) {}

    ngOnInit() {
        // Initialize the tree with course data
        this.updateTreeData();
    }

    ngAfterViewInit() {
        console.log('TreeWrapper AfterViewInit - syncFuncTree exists:', !!this.syncFuncTree);
        
        if (this.syncFuncTree && this.treeData.length > 0) {
            console.log('Binding tree data in AfterViewInit');
            this.syncFuncTree.dataBind();
        }
    }

    public ngOnChanges(changes: SimpleChanges) {
        if (changes['course']) {
          this.updateTreeData();
        }
      
        if (changes['newNode'] && changes['newNode'].currentValue) {
          const newNodeData = changes['newNode'].currentValue as TreeData;
          console.log(`[Tree] New node detected`, { 
            nodeId: newNodeData.nodeId, 
            type: newNodeData.nodeType, 
            timestamp: new Date().toISOString() 
          });
          
          // Convert the TreeData to a TreeNode
          const treeNode = this.createTreeNodeFromTreeData(newNodeData);
          
          // Add the TreeNode to the tree
          this.addNodeToTree(treeNode);
          
          if (this.syncFuncTree) {
            this.syncFuncTree.refresh();
          }
        }
      
        if (changes['refreshTrigger'] && this.syncFuncTree) {
          this.updateTreeData();
        }
      }

      private createTreeNodeFromTreeData(treeData: TreeData): TreeNode {
        // Create a TreeNode from a TreeData object
        const treeNode: TreeNode = {
          id: treeData.nodeId,
          text: this.getNodeText(treeData),
          nodeType: treeData.nodeType,
          hasChildren: this.getHasChildren(treeData),
          original: treeData
        };
        
        return treeNode;
      }

      public onDataBound() {
        console.log('Tree data bound completed for course:', this.course?.id);
        
        if (this.treeData && this.treeData.length > 0) {
          console.log('Root node in tree:', this.treeData[0]);
                    
          // Log node counts for debugging
          let topicCount = 0;
          let subTopicCount = 0;
          let lessonCount = 0;
          
          if (this.treeData[0].child) {
            topicCount = this.treeData[0].child.length;
            
            for (const topic of this.treeData[0].child) {
              if (topic.child) {
                for (const child of topic.child) {
                  if (child.nodeType === 'SubTopic') {
                    subTopicCount++;
                    if (child.child) {
                      lessonCount += child.child.length;
                    }
                  } else if (child.nodeType === 'Lesson') {
                    lessonCount++;
                  }
                }
              }
            }
          }
          
          console.log(`Tree statistics: ${topicCount} topics, ${subTopicCount} subtopics, ${lessonCount} lessons`);
        }
      }
      
      // Helper method to get the text property from different node types
      private getNodeText(treeData: TreeData): string {
        switch (treeData.nodeType) {
          case 'Course':
            return (treeData as Course).title;
          case 'Topic':
            return (treeData as Topic).title;
          case 'SubTopic':
            return (treeData as SubTopic).title;
          case 'Lesson':
            return (treeData as Lesson).title;
          default:
            return 'Unknown';
        }
      }
      
      // Helper method to get hasChildren property
      private getHasChildren(treeData: TreeData): boolean {
        switch (treeData.nodeType) {
          case 'Course':
            return (treeData as Course).hasChildren;
          case 'Topic':
            return (treeData as Topic).hasChildren;
          case 'SubTopic':
            return (treeData as SubTopic).hasChildren;
          case 'Lesson':
            return false; // Lessons don't have children
          default:
            return false;
        }
      }

    // Method to return a symbol/icon for each node type
    public getNodeTypeIcon(nodeType: string): string {
        switch (nodeType) {
            case 'Course':
                return '🏫'; // School building icon for Courses
            case 'Topic':
                return '📁'; // Folder icon for Topics
            case 'SubTopic':
                return '📂'; // Open folder icon for SubTopics
            case 'Lesson':
                return '📄'; // Page icon for Lessons
            default:
                return '❓'; // Question mark for unknown types
        }
    }

    private updateTreeData() {
        if (!this.course) {
            console.warn(`updateTreeData: No course available`);
            return;
        }
    
        console.log('Updating tree data with course:', {
            courseId: this.course.id,
            courseTitle: this.course.title,
            topicsCount: this.course.topics?.length ?? 0
        });
    
        // Create the course node
        const courseNode: TreeNode = {
            id: this.course.nodeId || this.course.id.toString(),
            text: this.course.title,
            nodeType: 'Course',
            hasChildren: (this.course.topics?.length ?? 0) > 0,
            original: this.course,
            expanded: false
        };
    
        console.log('Created course node:', courseNode);
    
        // Create child nodes for topics
        if (this.course.topics && this.course.topics.length > 0) {
            courseNode.child = this.course.topics
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(topic => {
                    const topicNode = createTopicNode(topic);
                    const children: TreeNode[] = [];
                    
                    // Add subtopics as children of topic
                    if (topic.subTopics?.length) {
                        children.push(...topic.subTopics
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map(st => {
                                const subTopicNode = createSubTopicNode(st);
                                // Add lessons as children of subtopic
                                subTopicNode.child = st.lessons
                                    ?.sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map(l => createLessonNode(l)) ?? [];
                                subTopicNode.hasChildren = (st.lessons?.length ?? 0) > 0;
                                return subTopicNode;
                            }));
                    }
                    
                    // Add direct lessons as children of topic
                    if (topic.lessons?.length) {
                        children.push(...topic.lessons
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map(l => createLessonNode(l)));
                    }
                    
                    topicNode.child = children;
                    topicNode.hasChildren = children.length > 0;
                    return topicNode;
                });
        } else {
            courseNode.child = [];
        }
    
        console.log('Tree data being set:', [courseNode]);
    
        this.treeData = [courseNode];
        this.treeFields = { ...this.treeFields, dataSource: this.treeData };
        
        // Queue the binding operation to execute after Angular has completed initialization
        setTimeout(() => {
            if (this.syncFuncTree) {
                console.log('SyncFusion tree component binding data');
                this.syncFuncTree.dataBind();
                
            } else {
                console.error('SyncFusion tree component still NOT initialized!');
            }
        }, 0);
    }

    private addNodeToTree(newNode: TreeNode) {
        if (!this.syncFuncTree || !this.treeData) {
            console.warn(`addNodeToTree: Tree not initialized`);
            return;
        }

        let parentNodeId: string | undefined;

        if (newNode.nodeType === 'Topic') {
            // For topics, the parent is the course
            parentNodeId = this.treeData[0]?.id; // Course is always the first node
        } else if (newNode.nodeType === 'SubTopic') {
            const subTopic = newNode.original as SubTopic;
            const courseNode = this.treeData[0]; // Course node
            if (courseNode && courseNode.child) {
                const parentTopic = courseNode.child.find(t => 
                    t.nodeType === 'Topic' && (t.original as Topic).id === subTopic.topicId
                );
                parentNodeId = parentTopic?.id;
            }
        } else if (newNode.nodeType === 'Lesson') {
            const lesson = newNode.original as Lesson;
            if (lesson.subTopicId) {
                // Find the subtopic node
                parentNodeId = this.findSubTopicNodeId(lesson.subTopicId);
            } else if (lesson.topicId) {
                // Find the topic node
                parentNodeId = this.findTopicNodeId(lesson.topicId);
            }
        }

        if (!parentNodeId) {
            console.warn(`addNodeToTree: No valid parent nodeId for ${newNode.nodeType}`);
            return;
        }

        const parentNode = this.findNodeById(this.treeData, parentNodeId);
        if (parentNode) {
            if (!parentNode.child) parentNode.child = [];
            parentNode.child.push(newNode);
            parentNode.hasChildren = true;
            this.syncFuncTree.addNodes([newNode], parentNodeId, undefined);
        } else {
            console.warn(`addNodeToTree: Parent node not found in treeData`);
            return;
        }

        this.sortTreeData();
    }

    private sortTreeData() {
        // If we have a course node (which should be the case), sort its children
        if (this.treeData.length > 0 && this.treeData[0].nodeType === 'Course' && this.treeData[0].child) {
            // Sort topics
            this.treeData[0].child.sort((a, b) => (a.original as Topic).sortOrder - (b.original as Topic).sortOrder);
            
            // Sort subtopics and lessons within each topic
            this.treeData[0].child.forEach(topicNode => {
                if (topicNode.child) {
                    topicNode.child.sort((a, b) => {
                        const aOriginal = a.original as SubTopic | Lesson;
                        const bOriginal = b.original as SubTopic | Lesson;
                        return aOriginal.sortOrder - bOriginal.sortOrder;
                    });
                    
                    // Sort lessons within each subtopic
                    topicNode.child.forEach(child => {
                        if (child.nodeType === 'SubTopic' && child.child) {
                            child.child.sort((a, b) => (a.original as Lesson).sortOrder - (b.original as Lesson).sortOrder);
                        }
                    });
                }
            });
        }

        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }

    public emitNodeSelected(args: any) {
        const nodeId = args.nodeData.id;
        const node = this.findNodeById(this.treeData, nodeId);
        if (node && node.original) {
          this.nodeSelected.emit(node.original as TreeData);
        }
    }

    public onNodeDragStart(args: any) {
        this.dragStartX = args.event.pageX;
        this.dragStartY = args.event.pageY;
        this.allowDrag = false;
    }

    public nodeDragging(args: any) {
        const currentX = args.event.pageX;
        const currentY = args.event.pageY;
        const distance = Math.sqrt(Math.pow(currentX - this.dragStartX, 2) + Math.pow(currentY - this.dragStartY, 2));

        if (distance >= 15 && !this.allowDrag) {
            this.allowDrag = true;
        }
        if (!this.allowDrag) {
            args.cancel = true;
        }
    }

    public onNodeDragStop(args: any) {
        const draggedNodeId = args.draggedNodeData.id;
        const targetNodeId = args.droppedNodeData.id;

        if (!this.allowDrag) {
            args.cancel = true;
            return;
        }

        const draggedNode = this.findNodeById(this.treeData, draggedNodeId);
        if (!draggedNode) {
            return;
        }

        const targetNode = this.findNodeById(this.treeData, targetNodeId);
        if (!targetNode) {
            return;
        }

        if (draggedNode.nodeType === 'Lesson') {
            let targetSubTopicId: number | undefined;
            let targetTopicId: number | undefined;

            if (targetNode.nodeType === 'SubTopic') {
                const targetSubTopic = targetNode.original as SubTopic;
                targetSubTopicId = targetSubTopic.id;
            } else if (targetNode.nodeType === 'Topic') {
                const targetTopic = targetNode.original as Topic;
                targetTopicId = targetTopic.id;
            } else {
                return;
            }

            const lesson = draggedNode.original as Lesson;
            const sourceSubTopicId = lesson.subTopicId;

            this.apiService.moveLesson(lesson.id, targetSubTopicId, targetTopicId).subscribe({
                next: () => {
                    this.moveLessonInTreeData(draggedNodeId, sourceSubTopicId, targetSubTopicId, targetTopicId);
                    const event: LessonMovedEvent = { 
                        lesson, 
                        sourceSubTopicId, 
                        targetSubTopicId, 
                        targetTopicId 
                    };
                    this.lessonMoved.emit(event);
                    this.updateSortOrderForLesson(lesson.id, targetSubTopicId, targetTopicId);
                },
                error: (err: any) => console.error(`Failed to move lesson`, err)
            });
        } else if (draggedNode.nodeType === 'SubTopic') {
            if (targetNode.nodeType !== 'Topic') {
                return;
            }

            const subTopic = draggedNode.original as SubTopic;
            const sourceTopicId = subTopic.topicId;
            const targetTopic = targetNode.original as Topic;
            const targetTopicId = targetTopic.id;

            this.apiService.moveSubTopic(subTopic.id, targetTopicId).subscribe({
                next: () => {
                    this.moveSubTopicInTreeData(draggedNodeId, sourceTopicId, targetTopicId);
                    this.updateSortOrderForSubTopic(subTopic.id, targetTopicId);
                },
                error: (err: any) => console.error(`Failed to move subTopic`, err)
            });
        } else if (draggedNode.nodeType === 'Topic') {
            const topic = draggedNode.original as Topic;
            const sourceCourseId = this.course.id;
            let targetCourseId: number | null = null;
            
            // If target is a course node
            if (targetNode.nodeType === 'Course') {
                targetCourseId = parseInt(targetNode.id);
            } else {
                return;
            }

            if (sourceCourseId === targetCourseId) {
                this.updateSortOrderForTopic(topic.id, targetCourseId);
                return;
            }

            const event: TopicMovedEvent = { topic, sourceCourseId, targetCourseId, targetNodeId };
            this.nodeDragStop.emit(event);
            this.updateSortOrderForTopic(topic.id, targetCourseId);
        }

        this.allowDrag = false;
    }

    private moveLessonInTreeData(lessonNodeId: string, sourceSubTopicId: number | undefined, targetSubTopicId: number | undefined, targetTopicId: number | undefined) {
        let sourceSubTopicNode: TreeNode | undefined;
        let targetNode: TreeNode | undefined;
        let lessonNode: TreeNode | undefined;

        // Look for nodes in the course hierarchy
        const traverse = (nodes: TreeNode[]): boolean => {
            for (const node of nodes) {
                if (node.nodeType === 'SubTopic' && (node.original as SubTopic).id === sourceSubTopicId) {
                    sourceSubTopicNode = node;
                    lessonNode = node.child?.find(child => child.id === lessonNodeId);
                }
                if (node.nodeType === 'SubTopic' && (node.original as SubTopic).id === targetSubTopicId) {
                    targetNode = node;
                } else if (node.nodeType === 'Topic' && (node.original as Topic).id === targetTopicId) {
                    targetNode = node;
                }
                if (node.child && traverse(node.child)) return true;
            }
            return false;
        };

        traverse(this.treeData);

        if (!lessonNode) {
            return;
        }

        if (sourceSubTopicNode) {
            sourceSubTopicNode.child = sourceSubTopicNode.child?.filter(child => child.id !== lessonNodeId) || [];
            sourceSubTopicNode.hasChildren = sourceSubTopicNode.child.length > 0;
        }

        if (!targetNode) {
            return;
        }

        if (!targetNode.child) targetNode.child = [];
        targetNode.child.push(lessonNode);
        targetNode.hasChildren = true;
        const lesson = lessonNode.original as Lesson;
        lesson.subTopicId = targetSubTopicId;
        lesson.topicId = targetTopicId;

        this.sortTreeData();
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }

    private moveSubTopicInTreeData(subTopicNodeId: string, sourceTopicId: number, targetTopicId: number) {
        let sourceTopicNode: TreeNode | undefined;
        let targetTopicNode: TreeNode | undefined;
        let subTopicNode: TreeNode | undefined;

        // Find nodes in the course hierarchy
        if (this.treeData.length > 0 && this.treeData[0].child) {
            for (const topicNode of this.treeData[0].child) {
                if (topicNode.nodeType === 'Topic' && (topicNode.original as Topic).id === sourceTopicId) {
                    sourceTopicNode = topicNode;
                    subTopicNode = topicNode.child?.find(child => child.id === subTopicNodeId);
                }
                if (topicNode.nodeType === 'Topic' && (topicNode.original as Topic).id === targetTopicId) {
                    targetTopicNode = topicNode;
                }
            }
        }

        if (!sourceTopicNode || !targetTopicNode || !subTopicNode) {
            return;
        }

        sourceTopicNode.child = sourceTopicNode.child?.filter(child => child.id !== subTopicNodeId) || [];
        sourceTopicNode.hasChildren = (sourceTopicNode.child.length > 0);
        if (!targetTopicNode.child) targetTopicNode.child = [];
        targetTopicNode.child.push(subTopicNode);
        targetTopicNode.hasChildren = true;
        (subTopicNode.original as SubTopic).topicId = targetTopicId;

        this.sortTreeData();
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }

    private updateSortOrderForTopic(topicId: number, courseId: number) {
        const courseNode = this.treeData[0];
        if (!courseNode || !courseNode.child) return;

        const topicNode = courseNode.child.find(n => n.nodeType === 'Topic' && (n.original as Topic).id === topicId);
        if (!topicNode) return;

        const newSortOrder = courseNode.child.indexOf(topicNode);
        this.apiService.updateTopicSortOrder(topicId, newSortOrder).subscribe({
            next: () => {
                (topicNode.original as Topic).sortOrder = newSortOrder;
                this.sortTreeData();
            },
            error: (err) => console.error(`Failed to update sort order for topic`, err)
        });
    }

    private updateSortOrderForSubTopic(subTopicId: number, topicId: number) {
        const courseNode = this.treeData[0];
        if (!courseNode || !courseNode.child) return;

        const topicNode = courseNode.child.find(n => n.nodeType === 'Topic' && (n.original as Topic).id === topicId);
        if (!topicNode || !topicNode.child) return;

        const subTopicNode = topicNode.child.find(n => n.nodeType === 'SubTopic' && (n.original as SubTopic).id === subTopicId);
        if (!subTopicNode) return;

        const newSortOrder = topicNode.child.indexOf(subTopicNode);
        this.apiService.updateSubTopicSortOrder(subTopicId, newSortOrder).subscribe({
            next: () => {
                (subTopicNode.original as SubTopic).sortOrder = newSortOrder;
                this.sortTreeData();
            },
            error: (err) => console.error(`Failed to update sort order for subTopic`, err)
        });
    }

    private updateSortOrderForLesson(lessonId: number, subTopicId?: number, topicId?: number) {
        let parentNode: TreeNode | undefined;
        if (subTopicId) {
            parentNode = this.findNodeById(this.treeData, this.findSubTopicNodeId(subTopicId)!);
        } else if (topicId) {
            parentNode = this.findNodeById(this.treeData, this.findTopicNodeId(topicId)!);
        }
        if (!parentNode || !parentNode.child) return;

        const lessonNode = parentNode.child.find(n => n.nodeType === 'Lesson' && (n.original as Lesson).id === lessonId);
        if (!lessonNode) return;

        const newSortOrder = parentNode.child.indexOf(lessonNode);
        this.apiService.updateLessonSortOrder(lessonId, newSortOrder).subscribe({
            next: () => {
                (lessonNode.original as Lesson).sortOrder = newSortOrder;
                this.sortTreeData();
            },
            error: (err) => console.error(`Failed to update sort order for lesson`, err)
        });
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

    private findTopicNodeId(topicId?: number): string | undefined {
        if (!topicId) return undefined;
        
        // Look for topic in the course's child nodes
        if (this.treeData.length > 0 && this.treeData[0].child) {
            const topicNode = this.treeData[0].child.find(
                node => node.nodeType === 'Topic' && (node.original as Topic).id === topicId
            );
            return topicNode?.id;
        }
        return undefined;
    }

    private findSubTopicNodeId(subTopicId?: number): string | undefined {
        if (!subTopicId) return undefined;
        
        // Search through the entire tree for the subtopic
        const findSubTopicInNodes = (nodes: TreeNode[]): string | undefined => {
            for (const node of nodes) {
                if (node.nodeType === 'SubTopic' && (node.original as SubTopic).id === subTopicId) {
                    return node.id;
                }
                if (node.child) {
                    const found = findSubTopicInNodes(node.child);
                    if (found) return found;
                }
            }
            return undefined;
        };
        
        return findSubTopicInNodes(this.treeData);
    }

    public addChildNode(data: any) {
        const nodeId = data.id;
        const node = this.findNodeById(this.treeData, nodeId);
        if (!node || !node.original) {
          return;
        }
      
        const treeData = node.original as TreeData;
        
        if (treeData.nodeType === 'Course') {
          this.addNodeRequested.emit({ parentNode: treeData, nodeType: 'Topic' });
        } else if (treeData.nodeType === 'Topic') {
          const topic = treeData as Topic;
          const hasSubTopics = (topic.subTopics?.length ?? 0) > 0;
          const childType = hasSubTopics ? 'SubTopic' : 'Lesson';
          this.addNodeRequested.emit({ parentNode: treeData, nodeType: childType });
        } else if (treeData.nodeType === 'SubTopic') {
          this.addNodeRequested.emit({ parentNode: treeData, nodeType: 'Lesson' });
        }
    }

    public deleteNode(data: any) {
        const nodeId = data.id;
        const node = this.findNodeById(this.treeData, nodeId);
        if (!node) {
            return;
        }

        if (node.nodeType === 'Course') {
            const course = node.original as Course;
            this.apiService.deleteCourse(course.id).subscribe({
                next: () => {
                    // Let the parent component handle removal from the UI
                    this.courseManagement.deleteCourse(course.id);
                },
                error: (err: any) => console.error(`Failed to delete Course`, err)
            });
        } else if (node.nodeType === 'Topic') {
            const topic = node.original as Topic;
            this.apiService.deleteTopic(topic.id).subscribe({
                next: () => {
                    if (this.syncFuncTree) {
                        this.syncFuncTree.removeNodes([nodeId]);
                        // Remove the topic from the course's child nodes
                        if (this.treeData.length > 0 && this.treeData[0].child) {
                            this.treeData[0].child = this.treeData[0].child.filter(n => n.id !== nodeId);
                            this.treeData[0].hasChildren = this.treeData[0].child.length > 0;
                        }
                    }
                },
                error: (err: any) => console.error(`Failed to delete Topic`, err)
            });
        } else if (node.nodeType === 'SubTopic') {
            const subTopic = node.original as SubTopic;
            this.apiService.deleteSubTopic(subTopic.id).subscribe({
                next: () => {
                    if (this.syncFuncTree) {
                        this.syncFuncTree.removeNodes([nodeId]);
                        this.updateTreeDataWithChildren(subTopic.topicId.toString(), (this.findNodeById(this.treeData, subTopic.topicId.toString())?.child || []).filter(n => n.id !== nodeId));
                    }
                },
                error: (err: any) => console.error(`Failed to delete SubTopic`, err)
            });
        } else if (node.nodeType === 'Lesson') {
            const lesson = node.original as Lesson;
            this.apiService.deleteLesson(lesson.id).subscribe({
                next: () => {
                    if (this.syncFuncTree) {
                        this.syncFuncTree.removeNodes([nodeId]);
                        const parentId = lesson.subTopicId !== undefined ? lesson.subTopicId.toString() : lesson.topicId?.toString() ?? '';
                        if (!parentId) {
                            return;
                        }
                        this.updateTreeDataWithChildren(parentId, (this.findNodeById(this.treeData, parentId)?.child || []).filter(n => n.id !== nodeId));
                    }
                },
                error: (err: any) => console.error(`Failed to delete Lesson`, err)
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
        this.sortTreeData();
        
        if (this.syncFuncTree) {
            this.syncFuncTree.dataBind();
        }
    }
}

export default TreeWrapperComponent;
