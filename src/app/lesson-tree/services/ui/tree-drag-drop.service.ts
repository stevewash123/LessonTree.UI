// **COMPLETE FILE** - TreeDragDropService - Entity Boundary Fixed
// RESPONSIBILITY: Handles tree drag & drop operations with clean Entity/TreeData boundary management
// DOES NOT: Manage tree UI state, store drag state, or handle data persistence - delegates appropriately
// CALLED BY: TreeWrapper drag event handlers for drag operation management

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Course } from '../../../models/course';
import { Lesson } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { TreeNode, NodeMovedEvent, createTreeData } from '../../../models/tree-node';
import {TreeNodeBuilderService} from './tree-node-builder.service';
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
    private treeNodeBuilderService: TreeNodeBuilderService,
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
      entityType: args.draggedNodeData?.entityType,
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

    const draggedNode = this.treeNodeBuilderService.findNodeById(treeData, draggedNodeId);
    if (!draggedNode) {
      console.warn('[TreeDragDropService] Dragged node not found:', draggedNodeId);
      return null;
    }

    const targetNode = this.treeNodeBuilderService.findNodeById(treeData, targetNodeId);
    if (!targetNode) {
      console.warn('[TreeDragDropService] Target node not found:', targetNodeId);
      return null;
    }

    const draggedEntityType = draggedNode.entityType || 'Unknown';
    const targetEntityType = targetNode.entityType || 'Unknown';

    const dragValidation = this.validateDragOperation(draggedNode, targetNode);
    if (!dragValidation.isValid) {
      console.warn('[TreeDragDropService] Invalid drag operation:', dragValidation.reason);
      return null;
    }

    dragState.allowDrag = false;

    console.log('[TreeDragDropService] Processing drag operation:', {
      draggedType: draggedEntityType,
      targetType: targetEntityType,
      operation: this.getDragOperationDescription(draggedNode, targetNode)
    });

    switch (draggedEntityType) {
      case 'Lesson':
        return this.handleLessonDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex);
      case 'SubTopic':
        return this.handleSubTopicDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex);
      case 'Topic':
        return this.handleTopicDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex, courseId);
      default:
        console.warn('[TreeDragDropService] Unsupported node type for drag operation:', draggedEntityType);
        return null;
    }
  }

  private validateDragOperation(draggedNode: TreeNode, targetNode: TreeNode): { isValid: boolean; reason: string } {
    const draggedEntityType = draggedNode.entityType || 'Unknown';
    const targetEntityType = targetNode.entityType || 'Unknown';

    if (!this.canDragNode(draggedEntityType)) {
      return { isValid: false, reason: `Cannot drag ${draggedEntityType} nodes` };
    }

    if (!this.canDropOnTarget(draggedEntityType, targetEntityType)) {
      return { isValid: false, reason: `Cannot drop ${draggedEntityType} on ${targetEntityType}` };
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
    const targetEntityType = targetNode.entityType || 'Unknown';

    if (dropPosition === 'Inside' && targetEntityType === 'SubTopic') {
      const targetSubTopic = targetNode.original as SubTopic;
      return this.performSimpleLessonMove(lesson, targetSubTopic.id, undefined);
    }

    if (dropPosition === 'Before' || dropPosition === 'After') {
      if (targetEntityType === 'Lesson') {
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

      if (targetEntityType === 'SubTopic') {
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

      if (targetEntityType === 'Topic') {
        const targetTopic = targetNode.original as Topic;
        if (dropPosition === 'After') {
          console.log(`[TreeDragDropService] Moving lesson to be first child of topic ${targetTopic.id}`);
          return this.performSimpleLessonMove(lesson, undefined, targetTopic.id);
        }
      }
    }

    console.warn('[TreeDragDropService] Unsupported lesson drop scenario:', {
      dropPosition,
      targetType: targetEntityType
    });
    return null;
  }

  private performSimpleLessonMove(
    lesson: Lesson,
    targetSubTopicId?: number,
    targetTopicId?: number
  ): Observable<any> {
    // ✅ FIXED: Convert Entity to TreeData for NodeMovedEvent
    const lessonTreeData = createTreeData(lesson);

    const event: NodeMovedEvent = {
      node: lessonTreeData,
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

    // ✅ FIXED: Convert Entity to TreeData for NodeMovedEvent
    const lessonTreeData = createTreeData(lesson);

    const event: NodeMovedEvent = {
      node: lessonTreeData,
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
    const targetEntityType = targetNode.entityType || 'Unknown';

    if (targetEntityType !== 'Topic') {
      console.warn('[TreeDragDropService] SubTopic can only be dropped on Topic:', targetEntityType);
      return null;
    }

    const subTopic = draggedNode.original as SubTopic;
    const targetTopic = targetNode.original as Topic;

    // ✅ FIXED: Convert Entity to TreeData for NodeMovedEvent
    const subTopicTreeData = createTreeData(subTopic);

    const event: NodeMovedEvent = {
      node: subTopicTreeData,
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
    const targetEntityType = targetNode.entityType || 'Unknown';

    if (targetEntityType !== 'Course') {
      console.warn('[TreeDragDropService] Topic can only be dropped on Course:', targetEntityType);
      return null;
    }

    const topic = draggedNode.original as Topic;
    const sourceCourseId = courseId;
    const targetCourseId = parseInt(targetNode.id);

    // ✅ FIXED: Convert Entity to TreeData for NodeMovedEvent
    const topicTreeData = createTreeData(topic);

    if (sourceCourseId === targetCourseId) {
      const event: NodeMovedEvent = {
        node: topicTreeData,
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
        node: topicTreeData,
        sourceCourseId,
        targetCourseId,
        targetParentType: 'Course',
        targetParentId: targetCourseId
      };

      return this.nodeOperationsService.performDragOperation(event);
    }
  }

  canDragNode(entityType: string): boolean {
    const allowedTypes = ['Lesson', 'SubTopic', 'Topic'];
    return allowedTypes.includes(entityType);
  }

  canDropOnTarget(draggedEntityType: string, targetEntityType: string): boolean {
    const validDropTargets: Record<string, string[]> = {
      'Lesson': ['SubTopic', 'Topic', 'Lesson'],
      'SubTopic': ['Topic'],
      'Topic': ['Course']
    };

    const allowedTargets = validDropTargets[draggedEntityType] || [];
    return allowedTargets.includes(targetEntityType);
  }

  getDragOperationDescription(
    draggedNode: TreeNode,
    targetNode: TreeNode
  ): string {
    const draggedTitle = this.getNodeTitle(draggedNode);
    const targetTitle = this.getNodeTitle(targetNode);

    return `Moving ${draggedNode.entityType || 'Unknown'} "${draggedTitle}" to ${targetNode.entityType || 'Unknown'} "${targetTitle}"`;
  }

  private getNodeTitle(node: TreeNode): string {
    switch (node.entityType) {
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
        treeNodeBuilderService: 'Node lookup and tree navigation',
        nodeDragModeService: 'Drag mode state management'
      }
    };
  }
}
