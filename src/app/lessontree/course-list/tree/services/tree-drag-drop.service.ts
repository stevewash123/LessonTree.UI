// RESPONSIBILITY: Handles tree drag & drop operations, validation, and coordinates with NodeOperationsService.
// DOES NOT: Manage tree UI state, store drag state, or handle data persistence.
// CALLED BY: TreeWrapper drag event handlers.
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Topic } from '../../../../models/topic';
import { SubTopic } from '../../../../models/subTopic';
import { Lesson } from '../../../../models/lesson';
import { Course } from '../../../../models/course';
import { NodeMovedEvent, TreeNode } from '../../../../models/tree-node';
import { NodeOperationsService } from '../../../../core/services/node-operations.service';
import { TreeDataService } from './tree-data.service';

export interface DragState {
  dragStartX: number;
  dragStartY: number;
  allowDrag: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TreeDragDropService {

  constructor(
    private nodeOperationsService: NodeOperationsService,
    private treeDataService: TreeDataService
  ) {
    console.log('[TreeDragDropService] Service initialized', { 
      timestamp: new Date().toISOString() 
    });
  }

  // Initialize drag state
  initializeDragState(): DragState {
    return {
      dragStartX: 0,
      dragStartY: 0,
      allowDrag: false
    };
  }

  // Handle drag start
  handleDragStart(args: any, dragState: DragState): void {
    dragState.dragStartX = args.event.pageX;
    dragState.dragStartY = args.event.pageY;
    dragState.allowDrag = false;
    
    console.log('[TreeDragDropService] Drag started', {
      startX: dragState.dragStartX,
      startY: dragState.dragStartY,
      timestamp: new Date().toISOString()
    });
  }

  // Handle dragging motion
  handleDragging(args: any, dragState: DragState): void {
    const currentX = args.event.pageX;
    const currentY = args.event.pageY;
    const distance = Math.sqrt(
      Math.pow(currentX - dragState.dragStartX, 2) + 
      Math.pow(currentY - dragState.dragStartY, 2)
    );

    if (distance >= 25 && !dragState.allowDrag) {
      dragState.allowDrag = true;
      console.log('[TreeDragDropService] Drag threshold reached, allowing drag', {
        distance,
        timestamp: new Date().toISOString()
      });
    }
    
    if (!dragState.allowDrag) {
      args.cancel = true;
    }
  }

  // Handle drag stop and perform node operations
  handleDragStop(
    args: any, 
    dragState: DragState, 
    treeData: TreeNode[], 
    courseId: number
  ): Observable<any> | null {
    const draggedNodeId = args.draggedNodeData.id;
    const targetNodeId = args.droppedNodeData.id;

    if (!dragState.allowDrag) {
      args.cancel = true;
      console.log('[TreeDragDropService] Drag cancelled - insufficient distance', {
        timestamp: new Date().toISOString()
      });
      return null;
    }

    const draggedNode = this.treeDataService.findNodeById(treeData, draggedNodeId);
    if (!draggedNode) {
      console.warn('[TreeDragDropService] Dragged node not found', {
        draggedNodeId,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    const targetNode = this.treeDataService.findNodeById(treeData, targetNodeId);
    if (!targetNode) {
      console.warn('[TreeDragDropService] Target node not found', {
        targetNodeId,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    console.log('[TreeDragDropService] Processing drag operation', {
      draggedNodeType: draggedNode.nodeType,
      targetNodeType: targetNode.nodeType,
      courseId,
      timestamp: new Date().toISOString()
    });

    // Reset drag state
    dragState.allowDrag = false;

    // Route to appropriate handler based on dragged node type
    switch (draggedNode.nodeType) {
      case 'Lesson':
        return this.handleLessonDrag(draggedNode, targetNode);
      case 'SubTopic':
        return this.handleSubTopicDrag(draggedNode, targetNode);
      case 'Topic':
        return this.handleTopicDrag(draggedNode, targetNode, courseId);
      default:
        console.warn('[TreeDragDropService] Unsupported node type for drag operation', {
          nodeType: draggedNode.nodeType,
          timestamp: new Date().toISOString()
        });
        return null;
    }
  }

  // Handle lesson drag operations
  private handleLessonDrag(draggedNode: TreeNode, targetNode: TreeNode): Observable<any> | null {
    const lesson = draggedNode.original as Lesson;
    let targetSubTopicId: number | undefined;
    let targetTopicId: number | undefined;
    let targetParentType: 'SubTopic' | 'Topic';

    if (targetNode.nodeType === 'SubTopic') {
      const targetSubTopic = targetNode.original as SubTopic;
      targetSubTopicId = targetSubTopic.id;
      targetParentType = 'SubTopic';
    } else if (targetNode.nodeType === 'Topic') {
      const targetTopic = targetNode.original as Topic;
      targetTopicId = targetTopic.id;
      targetParentType = 'Topic';
    } else {
      console.warn('[TreeDragDropService] Invalid target for lesson drag', {
        targetNodeType: targetNode.nodeType,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    const event: NodeMovedEvent = {
      node: lesson,
      sourceParentId: lesson.subTopicId || lesson.topicId,
      sourceParentType: lesson.subTopicId ? 'SubTopic' : 'Topic',
      targetParentId: targetSubTopicId || targetTopicId,
      targetParentType: targetParentType
    };

    console.log('[TreeDragDropService] Executing lesson move operation', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      sourceParentId: event.sourceParentId,
      sourceParentType: event.sourceParentType,
      targetParentId: event.targetParentId,
      targetParentType: event.targetParentType,
      timestamp: new Date().toISOString()
    });

    return this.nodeOperationsService.performDragOperation(event);
  }

  // Handle subtopic drag operations
  private handleSubTopicDrag(draggedNode: TreeNode, targetNode: TreeNode): Observable<any> | null {
    if (targetNode.nodeType !== 'Topic') {
      console.warn('[TreeDragDropService] SubTopic can only be dropped on Topic', {
        targetNodeType: targetNode.nodeType,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    const subTopic = draggedNode.original as SubTopic;
    const targetTopic = targetNode.original as Topic;

    const event: NodeMovedEvent = {
      node: subTopic,
      sourceParentId: subTopic.topicId,
      sourceParentType: 'Topic',
      targetParentId: targetTopic.id,
      targetParentType: 'Topic'
    };

    console.log('[TreeDragDropService] Executing subtopic move operation', {
      subTopicId: subTopic.id,
      subTopicTitle: subTopic.title,
      sourceTopicId: subTopic.topicId,
      targetTopicId: targetTopic.id,
      timestamp: new Date().toISOString()
    });

    return this.nodeOperationsService.performDragOperation(event);
  }

  // Handle topic drag operations
  private handleTopicDrag(
    draggedNode: TreeNode, 
    targetNode: TreeNode, 
    courseId: number
  ): Observable<any> | null {
    if (targetNode.nodeType !== 'Course') {
      console.warn('[TreeDragDropService] Topic can only be dropped on Course', {
        targetNodeType: targetNode.nodeType,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    const topic = draggedNode.original as Topic;
    const sourceCourseId = courseId;
    const targetCourseId = parseInt(targetNode.id);

    if (sourceCourseId === targetCourseId) {
      // Same course move - just update sort order
      console.log('[TreeDragDropService] Executing topic reorder within same course', {
        topicId: topic.id,
        topicTitle: topic.title,
        courseId: sourceCourseId,
        timestamp: new Date().toISOString()
      });

      const event: NodeMovedEvent = {
        node: topic,
        sourceParentId: sourceCourseId,
        sourceParentType: 'Course',
        targetParentId: targetCourseId,
        targetParentType: 'Course',
        sourceCourseId,
        targetCourseId
      };

      return this.nodeOperationsService.performDragOperation(event);
    } else {
      // Cross-course move
      console.log('[TreeDragDropService] Executing topic move between courses', {
        topicId: topic.id,
        topicTitle: topic.title,
        sourceCourseId,
        targetCourseId,
        timestamp: new Date().toISOString()
      });

      const event: NodeMovedEvent = { 
        node: topic,
        sourceCourseId, 
        targetCourseId, 
        targetParentType: 'Course',
        targetParentId: targetCourseId
      };

      return this.nodeOperationsService.performDragOperation(event);
    }
  }

  // Validate if a drag operation is allowed
  canDragNode(nodeType: string): boolean {
    const allowedTypes = ['Lesson', 'SubTopic', 'Topic'];
    return allowedTypes.includes(nodeType);
  }

  // Validate if a drop operation is allowed
  canDropOnTarget(draggedNodeType: string, targetNodeType: string): boolean {
    const validDropTargets: Record<string, string[]> = {
      'Lesson': ['SubTopic', 'Topic'],
      'SubTopic': ['Topic'],
      'Topic': ['Course']
    };

    const allowedTargets = validDropTargets[draggedNodeType] || [];
    return allowedTargets.includes(targetNodeType);
  }

  // Get drag operation description for logging/UI
  getDragOperationDescription(
    draggedNode: TreeNode, 
    targetNode: TreeNode
  ): string {
    const draggedTitle = this.getNodeTitle(draggedNode);
    const targetTitle = this.getNodeTitle(targetNode);
    
    return `Moving ${draggedNode.nodeType} "${draggedTitle}" to ${targetNode.nodeType} "${targetTitle}"`;
  }

  // Helper method to get node title
  private getNodeTitle(node: TreeNode): string {
    switch (node.nodeType) {
      case 'Course':
        return (node.original as Course).title;
      case 'Topic':
        return (node.original as Topic).title;
      case 'SubTopic':
        return (node.original as SubTopic).title;
      case 'Lesson':
        return (node.original as Lesson).title;
      default:
        return 'Unknown';
    }
  }
}