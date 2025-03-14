// src/app/course/tree/tree.component.ts
import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter, AfterViewInit, ViewChild } from '@angular/core';
import { TreeViewModule, TreeViewComponent as SyncfusionTreeViewComponent } from '@syncfusion/ej2-angular-navigations';
import { Topic, createTopicNode } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { Lesson } from '../../../models/lesson';
import { Course } from '../../../models/course';
import { DragAndDropEventArgs } from '@syncfusion/ej2-navigations';
import { ApiService } from '../../../core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { CourseListPanelComponent } from '../course-list-panel.component';
import { NodeSelectedEvent, TopicMovedEvent, TreeNode } from './tree-node.interface';
@Component({
    selector: 'app-tree',
    imports: [TreeViewModule],
    templateUrl: './tree.component.html',
    styleUrls: ['./tree.component.scss']
})
export class TreeComponent implements OnChanges, AfterViewInit {
  @ViewChild('treeview') treeViewComponent!: SyncfusionTreeViewComponent;

  @Input() topics: Topic[] = [];
  @Input() courseManagement!: CourseListPanelComponent;
  @Input() refreshTrigger: boolean = false;
  
  @Output() nodeDragStop = new EventEmitter<TopicMovedEvent>();
  @Output() nodeSelected = new EventEmitter<NodeSelectedEvent>();

  public treeData: TreeNode[] = [];
  private expandedNodes: string[] = [];

  public treeFields: object = {
    dataSource: this.treeData,
    id: 'id',
    text: 'text',
    child: 'child',
    iconCss: 'iconCss'
  };

  constructor(private apiService: ApiService, private toastr: ToastrService) {}

  ngAfterViewInit() {
    if (this.treeViewComponent) {
      console.log('TreeView initialized:', this.treeViewComponent);
      //this.treeViewComponent.nodeSelected = this.onNodeSelected.bind(this); // Bind Syncfusion's nodeSelected event
      this.restoreExpandedState();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['topics'] || changes['refreshTrigger']) {
      console.log('ngOnChanges triggered:', changes);
      this.updateTreeData();
    }
  }

  // Handle node selection
  public onNodeSelected(args: any) {
    const selectedArgs = args.nodeData as { id?: unknown; text?: unknown };
    
    const selectedNode: TreeNode = {
        id: selectedArgs.id as string,
        text: selectedArgs.text as string,
        type: this.determineNodeType(selectedArgs.id as string),
        original: this.findOriginalById(selectedArgs.id as string)
      };
    if (selectedNode) {
      const event: NodeSelectedEvent = { node: selectedNode };
      console.log('Emitting nodeSelected event:', event);
      this.nodeSelected.emit(event);
    } else {
      console.warn('Selected node not found:', selectedArgs.id);
    }
  }
  
  private updateTreeData(topics: Topic[] = this.topics) {
    if (!this.validateTreeData(topics.map(t => createTopicNode(t)))) {
      console.warn('Invalid tree data detected, skipping update');
      return;
    }
    this.treeData.length = 0;
    this.treeData.push(...topics.map(topic => createTopicNode(topic)));
    this.treeFields = { ...this.treeFields, dataSource: this.treeData };
    console.log('Updated Tree Data:', JSON.stringify(this.treeData));
    if (this.treeViewComponent) {
      this.treeViewComponent.dataBind();
      this.restoreExpandedState();
    }
  }

  private validateTreeData(nodes: TreeNode[]): boolean {
    return nodes.every(node => {
      return typeof node.id === 'string' && 
             typeof node.text === 'string' && 
             (node.child === undefined || Array.isArray(node.child));
    });
  }

  private saveExpandedState() {
    if (this.treeViewComponent) {
      this.expandedNodes = this.treeViewComponent.expandedNodes.map((node: any) => node.toString()) || [];
      console.log('Saved expanded nodes:', this.expandedNodes);
    }
  }

  private restoreExpandedState() {
    if (!this.treeViewComponent) {
      console.warn('TreeView not yet initialized, deferring restore');
      return;
    }
    //if (this.expandedNodes.length > 0) {
      const validExpandedNodes = this.expandedNodes.filter(nodeId => 
        this.findNodeById(this.treeData, nodeId) !== undefined
      );
      console.log('Restoring expanded nodes:', validExpandedNodes);
      this.treeViewComponent.expandedNodes = validExpandedNodes;
      this.treeViewComponent.dataBind();
      validExpandedNodes.forEach(nodeId => {
        this.treeViewComponent.ensureVisible(nodeId);
      });
    //}
  }

  public onNodeDragging(args: DragAndDropEventArgs) {
    const dropTarget = args.event.target as Element;
    console.log('Dragging over:', dropTarget);
    const targetContainer = dropTarget.closest('.course-item');
    if (targetContainer) {
      console.log('Hovering over course item:', targetContainer);
      targetContainer.classList.add('drag-over');
      args.dropIndicator = 'e-drop-in';
      const dragEvent = args.event as unknown as DragEvent;
      if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.dropEffect = 'move';
      } else {
        console.warn('dataTransfer is undefined during dragging');
      }
    } else {
      document.querySelectorAll('.course-item.drag-over').forEach(el => el.classList.remove('drag-over'));
      args.dropIndicator = 'e-drop-out';
      const dragEvent = args.event as unknown as DragEvent;
      if (dragEvent.dataTransfer) {
        dragEvent.dataTransfer.dropEffect = 'none';
      } else {
        console.warn('dataTransfer is undefined during dragging');
      }
    }
  }

  public onNodeDragStop(args: DragAndDropEventArgs) {
    console.log('onNodeDragStop triggered:', args);
    const draggedNodeData = args.draggedNodeData as { id?: unknown; text?: unknown };
    if (!this.isTreeNode(draggedNodeData)) {
      console.log('Drag rejected: Invalid dragged node data', draggedNodeData);
      args.cancel = true;
      return;
    }

    const draggedNode: TreeNode = {
      id: draggedNodeData.id as string,
      text: draggedNodeData.text as string,
      type: this.determineNodeType(draggedNodeData.id as string),
      original: this.findOriginalById(draggedNodeData.id as string)
    };
    console.log('Dragged node:', draggedNode);

    const dropTarget = args.event.target as Element;
    const targetContainer = dropTarget.closest('.course-item');

    // Handle Topic-to-Course drop
    if (draggedNode.type === 'Topic' && targetContainer) {
      console.log('Topic dropped on course item:', targetContainer);
      const topic = draggedNode.original as Topic;
      const sourceCourseId = this.findParentCourseId(this.treeData, topic.nodeId);
      const targetCourse = this.findTargetCourseFromContainer(targetContainer);

      if (sourceCourseId && targetCourse && sourceCourseId !== targetCourse.id) {
        this.saveExpandedState();
        this.apiService.moveTopic(topic.id, targetCourse.id).subscribe({
          next: () => {
            this.nodeDragStop.emit({ topic, sourceCourseId, targetCourseId: targetCourse.id });
            this.updateTreeData(this.topics.filter(t => t.id !== topic.id));
            this.toastr.success(`Moved Topic ${topic.title} to Course ${targetCourse.title}`);
          },
          error: (error) => {
            console.error('Error moving topic:', error);
            this.toastr.error('Failed to move topic', 'Error');
            args.cancel = true;
            this.restoreExpandedState();
          }
        });
      } else {
        console.log('Topic drop rejected: Invalid source or target', { sourceCourseId, targetCourse });
        args.cancel = true;
      }
      targetContainer.classList.remove('drag-over');
      return;
    }

    // Handle intra-tree and cross-course drops
    const dropTargetId = args.droppedNode?.getAttribute('data-uid') || '';
    console.log('Drop target ID from Syncfusion:', dropTargetId);
    let targetNode = this.findNodeById(this.treeData, dropTargetId);

    // If targetNode not found in current tree, check across all courses
    if (!targetNode && dropTargetId) {
      targetNode = this.findNodeAcrossCourses(dropTargetId);
    }

    if (!targetNode || !draggedNode.type || !targetNode.type) {
      console.log('Drag rejected: Invalid target or type', { targetNode, draggedNode });
      args.cancel = true;
      return;
    }

    if (
      (draggedNode.type === 'SubTopic' && targetNode.type !== 'Topic') ||
      (draggedNode.type === 'Lesson' && targetNode.type !== 'SubTopic')
    ) {
      console.log(`Drag rejected: ${draggedNode.type} cannot drop onto ${targetNode.type}`);
      args.cancel = true;
      return;
    }

    this.saveExpandedState();

    if (draggedNode.type === 'SubTopic') {
      const subTopic = draggedNode.original as SubTopic;
      const sourceTopicId = this.findParentTopic(this.treeData, subTopic.nodeId)?.id;
      const targetTopic = targetNode.original as Topic;

      if (!sourceTopicId || sourceTopicId === targetTopic.id) {
        args.cancel = true;
        return;
      }

      this.apiService.moveSubTopic(subTopic.id, targetTopic.id).subscribe({
        next: () => {
          this.updateTreeData();
          this.toastr.success(`Moved SubTopic ${subTopic.title} to Topic ${targetTopic.title}`);
        },
        error: (error) => this.handleMoveError(error, args, subTopic, sourceTopicId, targetTopic.id)
      });
    } else if (draggedNode.type === 'Lesson') {
      const lesson = draggedNode.original as Lesson;
      const sourceSubTopicId = this.findParentSubTopic(this.treeData, lesson.nodeId)?.id;
      const targetSubTopic = targetNode.original as SubTopic;

      if (!sourceSubTopicId || sourceSubTopicId === targetSubTopic.id) {
        args.cancel = true;
        return;
      }

      this.apiService.moveLesson(lesson.id, targetSubTopic.id).subscribe({
        next: () => {
          // Determine if it's a cross-course move
          const sourceCourse = this.courseManagement.courses.find(c => 
            c.topics.some(t => t.subTopics.some(st => st.id === sourceSubTopicId))
          );
          const targetCourse = this.courseManagement.courses.find(c => 
            c.topics.some(t => t.subTopics.some(st => st.id === targetSubTopic.id))
          );

          if (sourceCourse && targetCourse && sourceCourse.id !== targetCourse.id) {
            // Remove lesson from source
            const sourceSubTopic = sourceCourse.topics
              .flatMap(t => t.subTopics)
              .find(st => st.id === sourceSubTopicId);
            if (sourceSubTopic) {
              sourceSubTopic.lessons = sourceSubTopic.lessons.filter(l => l.id !== lesson.id);
            }
            // Add lesson to target
            const targetSubTopicData = targetCourse.topics
              .flatMap(t => t.subTopics)
              .find(st => st.id === targetSubTopic.id);
            if (targetSubTopicData) {
              targetSubTopicData.lessons.push(lesson);
            }
            // Trigger refresh via public method
            this.courseManagement.triggerChangeDetection();
            this.toastr.success(`Moved Lesson ${lesson.title} to SubTopic ${targetSubTopic.title} in Course ${targetCourse.title}`);
          } else {
            // Intra-course move
            this.updateTreeData();
            this.toastr.success(`Moved Lesson ${lesson.title} to SubTopic ${targetSubTopic.title}`);
          }
        },
        error: (error) => this.handleMoveError(error, args, lesson, sourceSubTopicId, targetSubTopic.id)
      });
    }
  }

  private findNodeAcrossCourses(nodeId: string): TreeNode | undefined {
    for (const course of this.courseManagement.courses) {
      const treeData = course.topics.map(topic => createTopicNode(topic));
      const node = this.findNodeById(treeData, nodeId);
      if (node) return node;
    }
    return undefined;
  }

  private determineNodeType(nodeId: string): 'Topic' | 'SubTopic' | 'Lesson' | undefined {
    console.log('Determining node type for ID:', nodeId);
    if (nodeId.startsWith('topic_')) return 'Topic';
    if (nodeId.startsWith('subtopic_')) return 'SubTopic';
    if (nodeId.startsWith('lesson_')) return 'Lesson';
    return undefined;
  }

  private findParentCourseId(treeData: TreeNode[], nodeId: string): number | undefined {
    console.log('Finding parent course for nodeId:', nodeId);
    const course = this.courseManagement.courses.find((c: Course) => 
      c.topics.some((t: Topic) => t.nodeId === nodeId)
    );
    return course?.id;
  }

  private findTargetCourseFromContainer(container: Element): Course | undefined {
    const courseTitleElement = container.querySelector('.course-title');
    if (courseTitleElement) {
      const courseTitle = courseTitleElement.textContent?.trim();
      return this.courseManagement.courses.find(c => c.title === courseTitle || c.nodeId === courseTitle);
    }
    console.warn('Could not determine target Course from container');
    return undefined;
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

  private isTreeNode(data: any): data is TreeNode {
    return typeof data.id === 'string' && typeof data.text === 'string';
  }

  private findOriginalById(nodeId: string): Topic | SubTopic | Lesson | undefined {
    for (const node of this.treeData) {
      if (node.id === nodeId) return node.original;
      if (node.child) {
        const found = this.findChildOriginal(node.child, nodeId);
        if (found) return found;
      }
    }
    return undefined;
  }

  private findChildOriginal(nodes: TreeNode[], nodeId: string): Topic | SubTopic | Lesson | undefined {
    for (const node of nodes) {
      if (node.id === nodeId) return node.original;
      if (node.child) {
        const found = this.findChildOriginal(node.child, nodeId);
        if (found) return found;
      }
    }
    return undefined;
  }

  private handleMoveError(error: any, args: DragAndDropEventArgs, entity: any, sourceId: number, targetId: number) {
    console.log('Move failed:', error);
    this.toastr.error('Failed to move item. Rolling back...', 'Error');
    args.cancel = true;
    this.restoreExpandedState();
    this.updateTreeData(this.topics);
  }

  private findParentTopic(nodes: TreeNode[], subTopicNodeId: string): Topic | undefined {
    return nodes
      .filter(node => node.type === 'Topic')
      .find(node => node.child?.some((st: TreeNode) => st.id === subTopicNodeId))
      ?.original as Topic;
  }

  private findParentSubTopic(nodes: TreeNode[], lessonNodeId: string): SubTopic | undefined {
    for (const topic of nodes) {
      if (topic.child) {
        const subTopic = topic.child
          .filter((st: TreeNode) => st.type === 'SubTopic')
          .find((st: TreeNode) => st.child?.some((l: TreeNode) => l.id === lessonNodeId));
        if (subTopic) return subTopic.original as SubTopic;
      }
    }
    return undefined;
  }

  private isTopic(entity: any): entity is Topic {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' && 
           typeof entity.title === 'string' && typeof entity.description === 'string' && 
           Array.isArray(entity.subTopics);
  }

  private isSubTopic(entity: any): entity is SubTopic {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' && 
           typeof entity.title === 'string' && (entity.description === undefined || typeof entity.description === 'string') && 
           Array.isArray(entity.lessons);
  }

  private isLesson(entity: any): entity is Lesson {
    return entity && typeof entity.id === 'number' && typeof entity.nodeId === 'string' && 
           typeof entity.title === 'string' && typeof entity.content === 'string' && 
           typeof entity.subTopicId === 'number' && Array.isArray(entity.documents);
  }
}