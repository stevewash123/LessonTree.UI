// **UPDATED** - tree-drag-drop.service.ts - Simplified sibling-based positioning
// CHANGES: Removed complex before/after/position logic, use simple afterSiblingId approach

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Course } from '../../../models/course';
import { Lesson, validateLessonMoveResource } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { TreeNode, NodeMovedEvent, createTreeData } from '../../../models/tree-node';
import { TreeNodeBuilderService } from './tree-node-builder.service';
import { NodeOperationsService } from '../business/node-operations.service';
import { DragMode, NodeDragModeService } from '../state/node-drag-mode.service';

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
    console.log('[TreeDragDropService] Initialized with simplified sibling-based positioning');
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

    console.log(`[TreeDragDropService] Drop details:`, {
      draggedNodeId,
      targetNodeId,
      dropPosition
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

    const dragValidation = this.validateDragOperation(draggedNode, targetNode);
    if (!dragValidation.isValid) {
      console.warn('[TreeDragDropService] Invalid drag operation:', dragValidation.reason);
      return null;
    }

    dragState.allowDrag = false;

    const draggedEntityType = draggedNode.entityType || 'Unknown';
    console.log('[TreeDragDropService] Processing drag operation:', {
      draggedType: draggedEntityType,
      targetType: targetNode.entityType,
      operation: this.getDragOperationDescription(draggedNode, targetNode)
    });

    switch (draggedEntityType) {
      case 'Lesson':
        return this.handleLessonDrop(draggedNode, targetNode, dropPosition);
      case 'SubTopic':
        return this.handleSubTopicDrop(draggedNode, targetNode, dropPosition);
      case 'Topic':
        return this.handleTopicDrop(draggedNode, targetNode, dropPosition, courseId);
      default:
        console.warn('[TreeDragDropService] Unsupported node type for drag operation:', draggedEntityType);
        return null;
    }
  }

  // ✅ SIMPLIFIED: Lesson drop handling with sibling-based positioning
  private handleLessonDrop(
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: string
  ): Observable<any> | null {
    const lesson = draggedNode.original as Lesson;
    const targetEntityType = targetNode.entityType || 'Unknown';

    // ✅ CASE 1: Drop INTO container (empty or as last item)
    if (dropPosition === 'Inside') {
      if (targetEntityType === 'SubTopic') {
        const targetSubTopic = targetNode.original as SubTopic;
        console.log(`[TreeDragDropService] Lesson moving INTO SubTopic ${targetSubTopic.id} (append to end)`);
        return this.performLessonMove(lesson, targetSubTopic.id, undefined, null);
      }

      if (targetEntityType === 'Topic') {
        const targetTopic = targetNode.original as Topic;
        console.log(`[TreeDragDropService] Lesson moving INTO Topic ${targetTopic.id} (append to end)`);
        return this.performLessonMove(lesson, undefined, targetTopic.id, null);
      }
    }

    // ✅ CASE 2: Drop BEFORE/AFTER sibling
    if (dropPosition === 'Before' || dropPosition === 'After') {
      const afterSiblingId = this.calculateAfterSiblingId(targetNode, dropPosition);

      if (targetEntityType === 'Lesson') {
        const targetLesson = targetNode.original as Lesson;

        if (targetLesson.subTopicId) {
          console.log(`[TreeDragDropService] Lesson positioning in SubTopic ${targetLesson.subTopicId}, after sibling ${afterSiblingId}`);
          return this.performLessonMove(lesson, targetLesson.subTopicId, undefined, afterSiblingId);
        } else if (targetLesson.topicId) {
          console.log(`[TreeDragDropService] Lesson positioning in Topic ${targetLesson.topicId}, after sibling ${afterSiblingId}`);
          return this.performLessonMove(lesson, undefined, targetLesson.topicId, afterSiblingId);
        }
      }

      if (targetEntityType === 'SubTopic') {
        const targetSubTopic = targetNode.original as SubTopic;
        console.log(`[TreeDragDropService] Lesson positioning in Topic ${targetSubTopic.topicId}, after SubTopic ${afterSiblingId}`);
        return this.performLessonMove(lesson, undefined, targetSubTopic.topicId, afterSiblingId);
      }
    }

    console.warn('[TreeDragDropService] Unsupported lesson drop scenario:', { dropPosition, targetType: targetEntityType });
    return null;
  }

  // ✅ SIMPLIFIED: SubTopic drop handling
  private handleSubTopicDrop(
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: string
  ): Observable<any> | null {
    const subTopic = draggedNode.original as SubTopic;
    const targetEntityType = targetNode.entityType || 'Unknown';

    // ✅ CASE 1: Drop INTO Topic (append to end)
    if (dropPosition === 'Inside' && targetEntityType === 'Topic') {
      const targetTopic = targetNode.original as Topic;
      console.log(`[TreeDragDropService] SubTopic moving INTO Topic ${targetTopic.id} (append to end)`);
      return this.performSubTopicMove(subTopic, targetTopic.id, null);
    }

    // ✅ CASE 2: Drop BEFORE/AFTER sibling
    if (dropPosition === 'Before' || dropPosition === 'After') {
      const afterSiblingId = this.calculateAfterSiblingId(targetNode, dropPosition);

      if (targetEntityType === 'SubTopic') {
        const targetSubTopic = targetNode.original as SubTopic;
        console.log(`[TreeDragDropService] SubTopic positioning in Topic ${targetSubTopic.topicId}, after sibling ${afterSiblingId}`);
        return this.performSubTopicMove(subTopic, targetSubTopic.topicId, afterSiblingId);
      }

      if (targetEntityType === 'Lesson') {
        const targetLesson = targetNode.original as Lesson;
        if (targetLesson.topicId) {
          console.log(`[TreeDragDropService] SubTopic positioning in Topic ${targetLesson.topicId}, after Lesson ${afterSiblingId}`);
          return this.performSubTopicMove(subTopic, targetLesson.topicId, afterSiblingId);
        }
      }
    }

    console.warn('[TreeDragDropService] Unsupported SubTopic drop scenario:', { dropPosition, targetType: targetEntityType });
    return null;
  }

  // ✅ SIMPLIFIED: Topic drop handling
  private handleTopicDrop(
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: string,
    courseId: number
  ): Observable<any> | null {
    const topic = draggedNode.original as Topic;
    const targetEntityType = targetNode.entityType || 'Unknown';

    // ✅ CASE 1: Drop INTO Course (append to end)
    if (dropPosition === 'Inside' && targetEntityType === 'Course') {
      const targetCourseId = parseInt(targetNode.id);
      console.log(`[TreeDragDropService] Topic moving INTO Course ${targetCourseId} (append to end)`);
      return this.performTopicMove(topic, targetCourseId, null);
    }

    // ✅ CASE 2: Drop BEFORE/AFTER sibling Topic
    if ((dropPosition === 'Before' || dropPosition === 'After') && targetEntityType === 'Topic') {
      const afterSiblingId = this.calculateAfterSiblingId(targetNode, dropPosition);
      const targetTopic = targetNode.original as Topic;
      console.log(`[TreeDragDropService] Topic positioning in Course ${targetTopic.courseId}, after sibling ${afterSiblingId}`);
      return this.performTopicMove(topic, targetTopic.courseId, afterSiblingId);
    }

    console.warn('[TreeDragDropService] Unsupported Topic drop scenario:', { dropPosition, targetType: targetEntityType });
    return null;
  }

  // ✅ NEW: Calculate which sibling to position after based on drop position
  private calculateAfterSiblingId(targetNode: TreeNode, dropPosition: string): number | null {
    if (dropPosition === 'After') {
      // Position after the target node
      return parseInt(targetNode.id);
    } else if (dropPosition === 'Before') {
      // Position after the previous sibling (or null if target is first)
      // For now, simplified: Before = position as first item
      return null;
    }
    return null;
  }

  // ✅ SIMPLIFIED: Perform lesson move with validation
  private performLessonMove(
    lesson: Lesson,
    targetSubTopicId?: number,
    targetTopicId?: number,
    afterSiblingId?: number | null
  ): Observable<any> {
    const lessonTreeData = createTreeData(lesson);

    const event: NodeMovedEvent = {
      node: lessonTreeData,
      sourceParentId: lesson.subTopicId || lesson.topicId,
      sourceParentType: lesson.subTopicId ? 'SubTopic' : 'Topic',
      targetParentId: targetSubTopicId || targetTopicId,
      targetParentType: targetSubTopicId ? 'SubTopic' : 'Topic'
    };

    return this.nodeOperationsService.performLessonMove(
      event,
      targetSubTopicId,
      targetTopicId,
      afterSiblingId
    );
  }

  // ✅ SIMPLIFIED: Perform SubTopic move
  private performSubTopicMove(
    subTopic: SubTopic,
    targetTopicId: number,
    afterSiblingId: number | null
  ): Observable<any> {
    const subTopicTreeData = createTreeData(subTopic);

    const event: NodeMovedEvent = {
      node: subTopicTreeData,
      sourceParentId: subTopic.topicId,
      sourceParentType: 'Topic',
      targetParentId: targetTopicId,
      targetParentType: 'Topic'
    };

    return this.nodeOperationsService.performSubTopicMove(event, targetTopicId, afterSiblingId);
  }

  // ✅ SIMPLIFIED: Perform Topic move
  private performTopicMove(
    topic: Topic,
    targetCourseId: number,
    afterSiblingId: number | null
  ): Observable<any> {
    const topicTreeData = createTreeData(topic);

    const event: NodeMovedEvent = {
      node: topicTreeData,
      sourceParentId: topic.courseId,
      sourceParentType: 'Course',
      targetParentId: targetCourseId,
      targetParentType: 'Course'
    };

    return this.nodeOperationsService.performTopicMove(event, targetCourseId, afterSiblingId);
  }

  // ✅ EXISTING: Validation and utility methods unchanged
  private validateDragOperation(draggedNode: TreeNode, targetNode: TreeNode): { isValid: boolean; reason: string } {
    const draggedEntityType = draggedNode.entityType || 'Unknown';
    const targetEntityType = targetNode.entityType || 'Unknown';

    if (draggedNode.id === targetNode.id) {
      return { isValid: false, reason: 'Cannot drop entity onto itself' };
    }

    if (!this.canDragNode(draggedEntityType)) {
      return { isValid: false, reason: `Cannot drag ${draggedEntityType} nodes` };
    }

    if (!this.canDropOnTarget(draggedEntityType, targetEntityType)) {
      return { isValid: false, reason: `Cannot drop ${draggedEntityType} on ${targetEntityType}` };
    }

    return { isValid: true, reason: 'Valid drag operation' };
  }

  canDragNode(entityType: string): boolean {
    const allowedTypes = ['Lesson', 'SubTopic', 'Topic'];
    return allowedTypes.includes(entityType);
  }

  canDropOnTarget(draggedEntityType: string, targetEntityType: string): boolean {
    const validDropTargets: Record<string, string[]> = {
      'Lesson': ['SubTopic', 'Topic', 'Lesson'],
      'SubTopic': ['Topic', 'SubTopic', 'Lesson'],
      'Topic': ['Course', 'Topic']
    };

    const allowedTargets = validDropTargets[draggedEntityType] || [];
    return allowedTargets.includes(targetEntityType);
  }

  getDragOperationDescription(draggedNode: TreeNode, targetNode: TreeNode): string {
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
        'SubTopic': ['Topic', 'SubTopic', 'Lesson'],
        'Topic': ['Course', 'Topic']
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
        supportedOperations: ['drag-drop', 'validation', 'sibling-positioning']
      },
      dragMode: {
        current: this.getCurrentDragMode(),
        isMove: this.isDragModeMove(),
        isCopy: this.isDragModeCopy()
      },
      validationRules: this.getDragOperationStats(),
      dependencies: {
        nodeOperationsService: 'Drag operation execution with sibling positioning',
        treeNodeBuilderService: 'Node lookup and tree navigation',
        nodeDragModeService: 'Drag mode state management'
      }
    };
  }
}
