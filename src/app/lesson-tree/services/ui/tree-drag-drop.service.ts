// **COMPLETE FILE** - TreeDragDropService - Observable Infrastructure REMOVED
// RESPONSIBILITY: Handles tree drag & drop operations with clean delegation
// DOES NOT: Manage tree UI state, store drag state, or handle data persistence - delegates appropriately
// CALLED BY: TreeWrapper drag event handlers for drag operation management

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Course } from '../../../models/course';
import { Lesson } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { TreeNode, NodeMovedEvent } from '../../../models/tree-node';
import {TreeDataService} from './tree-data.service';
import {NodeOperationsService} from '../business/node-operations.service';
import {DragMode, NodeDragModeService} from '../state/node-drag-mode.service';

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
    private treeDataService: TreeDataService,
    private nodeDragModeService: NodeDragModeService
  ) {
    console.log('[TreeDragDropService] Initialized for drag operation management');
  }

  initializeDragState(): DragState {
    return {
      dragStartX: 0,
      dragStartY: 0,
      allowDrag: false
    };
  }

  handleDragStart(args: any, dragState: DragState): void {
    dragState.dragStartX = args.event.pageX;
    dragState.dragStartY = args.event.pageY;
    dragState.allowDrag = false;

    console.log('[TreeDragDropService] Drag started:', {
      nodeType: args.draggedNodeData?.nodeType,
      nodeId: args.draggedNodeData?.id
    });
  }

  handleDragging(args: any, dragState: DragState): void {
    const currentX = args.event.pageX;
    const currentY = args.event.pageY;
    const distance = Math.sqrt(
      Math.pow(currentX - dragState.dragStartX, 2) +
      Math.pow(currentY - dragState.dragStartY, 2)
    );

    if (distance >= 25 && !dragState.allowDrag) {
      dragState.allowDrag = true;
    }

    if (!dragState.allowDrag) {
      args.cancel = true;
    }
  }

  handleDragStop(
    args: any,
    dragState: DragState,
    treeData: TreeNode[],
    courseId: number
  ): Observable<any> | null {
    const draggedNodeId = args.draggedNodeData.id;
    const targetNodeId = args.droppedNodeData.id;
    const dropPosition = args.position;
    const dropIndex = args.dropIndex;

    console.log(`[TreeDragDropService] Drop details:`, {
      draggedNodeId,
      targetNodeId,
      dropPosition,
      dropIndex
    });

    if (!dragState.allowDrag) {
      args.cancel = true;
      console.log('[TreeDragDropService] Drag cancelled - insufficient distance');
      return null;
    }

    const draggedNode = this.treeDataService.findNodeById(treeData, draggedNodeId);
    if (!draggedNode) {
      console.warn('[TreeDragDropService] Dragged node not found:', draggedNodeId);
      return null;
    }

    const targetNode = this.treeDataService.findNodeById(treeData, targetNodeId);
    if (!targetNode) {
      console.warn('[TreeDragDropService] Target node not found:', targetNodeId);
      return null;
    }

    const draggedNodeType = draggedNode.nodeType || 'Unknown';
    const targetNodeType = targetNode.nodeType || 'Unknown';

    const dragValidation = this.validateDragOperation(draggedNode, targetNode);
    if (!dragValidation.isValid) {
      console.warn('[TreeDragDropService] Invalid drag operation:', dragValidation.reason);
      return null;
    }

    dragState.allowDrag = false;

    console.log('[TreeDragDropService] Processing drag operation:', {
      draggedType: draggedNodeType,
      targetType: targetNodeType,
      operation: this.getDragOperationDescription(draggedNode, targetNode)
    });

    switch (draggedNodeType) {
      case 'Lesson':
        return this.handleLessonDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex);
      case 'SubTopic':
        return this.handleSubTopicDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex);
      case 'Topic':
        return this.handleTopicDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex, courseId);
      default:
        console.warn('[TreeDragDropService] Unsupported node type for drag operation:', draggedNodeType);
        return null;
    }
  }

  private validateDragOperation(draggedNode: TreeNode, targetNode: TreeNode): { isValid: boolean; reason: string } {
    const draggedNodeType = draggedNode.nodeType || 'Unknown';
    const targetNodeType = targetNode.nodeType || 'Unknown';

    if (!this.canDragNode(draggedNodeType)) {
      return { isValid: false, reason: `Cannot drag ${draggedNodeType} nodes` };
    }

    if (!this.canDropOnTarget(draggedNodeType, targetNodeType)) {
      return { isValid: false, reason: `Cannot drop ${draggedNodeType} on ${targetNodeType}` };
    }

    return { isValid: true, reason: 'Valid drag operation' };
  }

  private handleLessonDragWithPosition(
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: string,
    dropIndex: number
  ): Observable<any> | null {
    const lesson = draggedNode.original as Lesson;
    const targetNodeType = targetNode.nodeType || 'Unknown';

    if (dropPosition === 'Inside' && targetNodeType === 'SubTopic') {
      const targetSubTopic = targetNode.original as SubTopic;
      return this.performSimpleLessonMove(lesson, targetSubTopic.id, undefined);
    }

    if (dropPosition === 'Before' || dropPosition === 'After') {
      if (targetNodeType === 'Lesson') {
        const targetLesson = targetNode.original as Lesson;

        if (targetLesson.subTopicId) {
          return this.performPositionalLessonMove(
            lesson,
            targetLesson.subTopicId,
            'SubTopic',
            targetLesson.id,
            dropPosition === 'Before' ? 'before' : 'after',
            'Lesson'
          );
        } else if (targetLesson.topicId) {
          return this.performPositionalLessonMove(
            lesson,
            targetLesson.topicId,
            'Topic',
            targetLesson.id,
            dropPosition === 'Before' ? 'before' : 'after',
            'Lesson'
          );
        }
      }

      if (targetNodeType === 'SubTopic') {
        const targetSubTopic = targetNode.original as SubTopic;
        return this.performPositionalLessonMove(
          lesson,
          targetSubTopic.topicId,
          'Topic',
          targetSubTopic.id,
          dropPosition === 'Before' ? 'before' : 'after',
          'SubTopic'
        );
      }

      if (targetNodeType === 'Topic') {
        const targetTopic = targetNode.original as Topic;
        if (dropPosition === 'After') {
          console.log(`[TreeDragDropService] Moving lesson to be first child of topic ${targetTopic.id}`);
          return this.performSimpleLessonMove(lesson, undefined, targetTopic.id);
        }
      }
    }

    console.warn('[TreeDragDropService] Unsupported lesson drop scenario:', {
      dropPosition,
      targetType: targetNodeType
    });
    return null;
  }

  private performSimpleLessonMove(
    lesson: Lesson,
    targetSubTopicId?: number,
    targetTopicId?: number
  ): Observable<any> {
    const event: NodeMovedEvent = {
      node: lesson,
      sourceParentId: lesson.subTopicId || lesson.topicId,
      sourceParentType: lesson.subTopicId ? 'SubTopic' : 'Topic',
      targetParentId: targetSubTopicId || targetTopicId,
      targetParentType: targetSubTopicId ? 'SubTopic' : 'Topic'
    };

    return this.nodeOperationsService.performDragOperation(event);
  }

  private performPositionalLessonMove(
    lesson: Lesson,
    targetParentId: number,
    targetParentType: 'SubTopic' | 'Topic',
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Lesson' | 'SubTopic'
  ): Observable<any> {
    console.log(`[TreeDragDropService] Positional drop:`, {
      lessonId: lesson.id,
      targetParentId,
      targetParentType,
      relativeToId,
      relativePosition,
      relativeToType
    });

    const event: NodeMovedEvent = {
      node: lesson,
      sourceParentId: lesson.subTopicId || lesson.topicId,
      sourceParentType: lesson.subTopicId ? 'SubTopic' : 'Topic',
      targetParentId: targetParentId,
      targetParentType: targetParentType
    };

    return this.nodeOperationsService.performPositionalMove(
      event,
      relativeToId,
      relativePosition,
      relativeToType
    );
  }

  private handleSubTopicDragWithPosition(
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: string,
    dropIndex: number
  ): Observable<any> | null {
    return this.handleSubTopicDrag(draggedNode, targetNode);
  }

  private handleTopicDragWithPosition(
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: string,
    dropIndex: number,
    courseId: number
  ): Observable<any> | null {
    return this.handleTopicDrag(draggedNode, targetNode, courseId);
  }

  private handleSubTopicDrag(draggedNode: TreeNode, targetNode: TreeNode): Observable<any> | null {
    const targetNodeType = targetNode.nodeType || 'Unknown';

    if (targetNodeType !== 'Topic') {
      console.warn('[TreeDragDropService] SubTopic can only be dropped on Topic:', targetNodeType);
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

    return this.nodeOperationsService.performDragOperation(event);
  }

  private handleTopicDrag(
    draggedNode: TreeNode,
    targetNode: TreeNode,
    courseId: number
  ): Observable<any> | null {
    const targetNodeType = targetNode.nodeType || 'Unknown';

    if (targetNodeType !== 'Course') {
      console.warn('[TreeDragDropService] Topic can only be dropped on Course:', targetNodeType);
      return null;
    }

    const topic = draggedNode.original as Topic;
    const sourceCourseId = courseId;
    const targetCourseId = parseInt(targetNode.id);

    if (sourceCourseId === targetCourseId) {
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
      console.log('[TreeDragDropService] Cross-course topic move');

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

  canDragNode(nodeType: string): boolean {
    const allowedTypes = ['Lesson', 'SubTopic', 'Topic'];
    return allowedTypes.includes(nodeType);
  }

  canDropOnTarget(draggedNodeType: string, targetNodeType: string): boolean {
    const validDropTargets: Record<string, string[]> = {
      'Lesson': ['SubTopic', 'Topic', 'Lesson'],
      'SubTopic': ['Topic'],
      'Topic': ['Course']
    };

    const allowedTargets = validDropTargets[draggedNodeType] || [];
    return allowedTargets.includes(targetNodeType);
  }

  getDragOperationDescription(
    draggedNode: TreeNode,
    targetNode: TreeNode
  ): string {
    const draggedTitle = this.getNodeTitle(draggedNode);
    const targetTitle = this.getNodeTitle(targetNode);

    return `Moving ${draggedNode.nodeType || 'Unknown'} "${draggedTitle}" to ${targetNode.nodeType || 'Unknown'} "${targetTitle}"`;
  }

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

  getCurrentDragMode(): DragMode {
    return this.nodeDragModeService.currentMode;
  }

  isDragModeCopy(): boolean {
    return this.nodeDragModeService.isDragModeCopy;
  }

  isDragModeMove(): boolean {
    return this.nodeDragModeService.isDragModeMove;
  }

  getDragOperationStats(): {
    supportedDragTypes: string[];
    supportedDropTargets: Record<string, string[]>;
    currentDragMode: DragMode;
    validationEnabled: boolean;
    positionAwareOperations: boolean;
  } {
    return {
      supportedDragTypes: ['Lesson', 'SubTopic', 'Topic'],
      supportedDropTargets: {
        'Lesson': ['SubTopic', 'Topic', 'Lesson'],
        'SubTopic': ['Topic'],
        'Topic': ['Course']
      },
      currentDragMode: this.getCurrentDragMode(),
      validationEnabled: true,
      positionAwareOperations: true
    };
  }

  getDebugInfo(): any {
    return {
      dragService: {
        initialized: true,
        supportedOperations: ['drag-drop', 'validation', 'position-aware']
      },
      dragMode: {
        current: this.getCurrentDragMode(),
        isMove: this.isDragModeMove(),
        isCopy: this.isDragModeCopy()
      },
      validationRules: this.getDragOperationStats(),
      dependencies: {
        nodeOperationsService: 'Drag operation execution',
        treeDataService: 'Node lookup and tree navigation',
        nodeDragModeService: 'Drag mode state management'
      }
    };
  }
}
