// **COMPLETE FILE** - TreeDragDropService - Renamed methods for SORT vs REGROUP clarity
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

  private handleLessonDragWithPosition(
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: string,
    dropIndex: number
  ): Observable<any> | null {
    const lesson = draggedNode.original as Lesson;
    const targetEntityType = targetNode.entityType || 'Unknown';

    // ✅ REGROUP: Lesson moved to different SubTopic (append to bottom)
    if (dropPosition === 'Inside' && targetEntityType === 'SubTopic') {
      const targetSubTopic = targetNode.original as SubTopic;
      console.log(`[TreeDragDropService] REGROUP: Lesson moving to SubTopic ${targetSubTopic.id}`);
      return this.performLessonMoveToGroup(lesson, targetSubTopic.id, undefined);
    }

    // ✅ NEW: REGROUP: Lesson moved directly to Topic (become direct child)
    if (dropPosition === 'Inside' && targetEntityType === 'Topic') {
      const targetTopic = targetNode.original as Topic;
      console.log(`[TreeDragDropService] REGROUP: Lesson moving directly to Topic ${targetTopic.id} (direct child)`);
      return this.performLessonMoveToGroup(lesson, undefined, targetTopic.id);
    }

    // ✅ SORT or REGROUP: Check positioning
    if (dropPosition === 'Before' || dropPosition === 'After') {
      if (targetEntityType === 'Lesson') {
        const targetLesson = targetNode.original as Lesson;

        // Same parent = SORT operation
        const lessonParentId = lesson.subTopicId || lesson.topicId;
        const targetParentId = targetLesson.subTopicId || targetLesson.topicId;

        if (lessonParentId === targetParentId) {
          console.log(`[TreeDragDropService] SORT: Lesson positioning within same parent ${lessonParentId}`);

          if (targetLesson.subTopicId) {
            return this.performLessonMoveToSort(
              lesson,
              targetLesson.subTopicId,
              'SubTopic',
              targetLesson.id,
              this.simplifyDropPosition(dropPosition, targetNode),
              'Lesson'
            );
          } else if (targetLesson.topicId) {
            return this.performLessonMoveToSort(
              lesson,
              targetLesson.topicId,
              'Topic',
              targetLesson.id,
              this.simplifyDropPosition(dropPosition, targetNode),
              'Lesson'
            );
          }
        } else {
          // Different parent = REGROUP operation (position relative to lesson)
          console.log(`[TreeDragDropService] REGROUP: Lesson moving to different parent, positioning relative to lesson`);

          if (targetLesson.subTopicId) {
            return this.performLessonMoveToSort(
              lesson,
              targetLesson.subTopicId,
              'SubTopic',
              targetLesson.id,
              this.simplifyDropPosition(dropPosition, targetNode),
              'Lesson'
            );
          } else if (targetLesson.topicId) {
            return this.performLessonMoveToSort(
              lesson,
              targetLesson.topicId,
              'Topic',
              targetLesson.id,
              this.simplifyDropPosition(dropPosition, targetNode),
              'Lesson'
            );
          }
        }
      }

      if (targetEntityType === 'SubTopic') {
        const targetSubTopic = targetNode.original as SubTopic;
        console.log(`[TreeDragDropService] SORT: Lesson positioning relative to SubTopic in Topic ${targetSubTopic.topicId}`);
        return this.performLessonMoveToSort(
          lesson,
          targetSubTopic.topicId,
          'Topic',
          targetSubTopic.id,
          this.simplifyDropPosition(dropPosition, targetNode),
          'SubTopic'
        );
      }

      if (targetEntityType === 'Topic') {
        const targetTopic = targetNode.original as Topic;
        if (dropPosition === 'After') {
          console.log(`[TreeDragDropService] REGROUP: Lesson moving to be first child of Topic ${targetTopic.id}`);
          return this.performLessonMoveToGroup(lesson, undefined, targetTopic.id);
        }
      }
    }

    console.warn('[TreeDragDropService] Unsupported lesson drop scenario:', {
      dropPosition,
      targetType: targetEntityType
    });
    return null;
  }

  private handleSubTopicDragWithPosition(
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: string,
    dropIndex: number
  ): Observable<any> | null {
    const subTopic = draggedNode.original as SubTopic;
    const targetEntityType = targetNode.entityType || 'Unknown';

    // ✅ SORT: SubTopic positioned relative to another SubTopic in same Topic
    if (dropPosition === 'Before' || dropPosition === 'After') {
      if (targetEntityType === 'SubTopic') {
        const targetSubTopic = targetNode.original as SubTopic;

        // Verify they're in the same Topic (SORT operation)
        if (subTopic.topicId === targetSubTopic.topicId) {
          console.log(`[TreeDragDropService] SORT: SubTopic positioning within Topic ${subTopic.topicId}`);
          return this.performSubTopicMoveToSort(
            subTopic,
            targetSubTopic.topicId,
            targetSubTopic.id,
            this.simplifyDropPosition(dropPosition, targetNode),
            'SubTopic'
          );
        }
      }

      // ✅ SORT: SubTopic positioned relative to Lesson in same Topic
      if (targetEntityType === 'Lesson') {
        const targetLesson = targetNode.original as Lesson;

        // Verify they're in the same Topic (SORT operation)
        if (subTopic.topicId === targetLesson.topicId) {
          console.log(`[TreeDragDropService] SORT: SubTopic positioning relative to Lesson in Topic ${subTopic.topicId}`);
          return this.performSubTopicMoveToSort(
            subTopic,
            targetLesson.topicId!,
            targetLesson.id,
            this.simplifyDropPosition(dropPosition, targetNode),
            'Lesson'
          );
        }
      }
    }

    // ✅ REGROUP: SubTopic moved to different Topic (append to bottom)
    if (targetEntityType === 'Topic') {
      const targetTopic = targetNode.original as Topic;

      // Different Topic = REGROUP operation
      if (subTopic.topicId !== targetTopic.id) {
        console.log(`[TreeDragDropService] REGROUP: SubTopic moving from Topic ${subTopic.topicId} to Topic ${targetTopic.id}`);
        return this.performSubTopicMoveToGroup(subTopic, targetTopic.id);
      }
    }

    console.warn('[TreeDragDropService] Unsupported SubTopic drop scenario:', {
      dropPosition,
      targetType: targetEntityType,
      sameParent: targetEntityType === 'SubTopic' ? 'check topicId' : 'N/A'
    });
    return null;
  }

  private handleTopicDragWithPosition(
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: string,
    dropIndex: number,
    courseId: number
  ): Observable<any> | null {
    const topic = draggedNode.original as Topic;
    const targetEntityType = targetNode.entityType || 'Unknown';

    // ✅ SORT: Topic positioned relative to another Topic in same Course
    if (dropPosition === 'Before' || dropPosition === 'After') {
      if (targetEntityType === 'Topic') {
        const targetTopic = targetNode.original as Topic;

        // Verify they're in the same Course (SORT operation)
        if (topic.courseId === targetTopic.courseId) {
          console.log(`[TreeDragDropService] SORT: Topic positioning within Course ${topic.courseId}`);
          return this.performTopicMoveToSort(
            topic,
            targetTopic.courseId,
            targetTopic.id,
            this.simplifyDropPosition(dropPosition, targetNode),
            'Topic'
          );
        }
      }
    }

    // ✅ REGROUP: Topic moved to different Course (append to bottom)
    if (targetEntityType === 'Course') {
      const targetCourseId = parseInt(targetNode.id);

      // Different Course = REGROUP operation
      if (topic.courseId !== targetCourseId) {
        console.log(`[TreeDragDropService] REGROUP: Topic moving from Course ${topic.courseId} to Course ${targetCourseId}`);
        return this.performTopicMoveToGroup(topic, courseId, targetCourseId);
      }
    }

    console.warn('[TreeDragDropService] Unsupported Topic drop scenario:', {
      dropPosition,
      targetType: targetEntityType,
      sameParent: targetEntityType === 'Topic' ? 'check courseId' : 'N/A'
    });
    return null;
  }

  // ✅ RENAMED: performSimpleLessonMove → performLessonMoveToGroup
  // REGROUP: Move lesson to different parent (append to bottom)
  private performLessonMoveToGroup(
    lesson: Lesson,
    targetSubTopicId?: number,
    targetTopicId?: number
  ): Observable<any> {
    console.log(`[TreeDragDropService] REGROUP: Lesson moving to different parent (append to bottom)`);

    // ✅ FIXED: Convert Entity to TreeData for NodeMovedEvent
    const lessonTreeData = createTreeData(lesson);

    const event: NodeMovedEvent = {
      node: lessonTreeData,
      sourceParentId: lesson.subTopicId || lesson.topicId,
      sourceParentType: lesson.subTopicId ? 'SubTopic' : 'Topic',
      targetParentId: targetSubTopicId || targetTopicId,
      targetParentType: targetSubTopicId ? 'SubTopic' : 'Topic'
    };

    return this.nodeOperationsService.performMoveToGroup(event);
  }

  // ✅ RENAMED: performPositionalLessonMove → performLessonMoveToSort
  // SORT: Position lesson within same parent or relative to specific sibling
  private performLessonMoveToSort(
    lesson: Lesson,
    targetParentId: number,
    targetParentType: 'SubTopic' | 'Topic',
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Lesson' | 'SubTopic'
  ): Observable<any> {
    console.log(`[TreeDragDropService] SORT: Lesson positioning within parent:`, {
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

    return this.nodeOperationsService.performMoveToSort(
      event,
      relativeToId,
      relativePosition,
      relativeToType
    );
  }

  // ✅ NEW: SubTopic positioning helper - SORT
  private performSubTopicMoveToSort(
    subTopic: SubTopic,
    targetTopicId: number,
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'SubTopic' | 'Lesson'
  ): Observable<any> {
    console.log(`[TreeDragDropService] SORT: SubTopic positioning within Topic:`, {
      subTopicId: subTopic.id,
      targetTopicId,
      relativeToId,
      relativePosition,
      relativeToType
    });

    const subTopicTreeData = createTreeData(subTopic);

    const event: NodeMovedEvent = {
      node: subTopicTreeData,
      sourceParentId: subTopic.topicId,
      sourceParentType: 'Topic',
      targetParentId: targetTopicId,
      targetParentType: 'Topic'
    };

    return this.nodeOperationsService.performMoveToSort(
      event,
      relativeToId,
      relativePosition,
      relativeToType
    );
  }

  // ✅ NEW: Topic positioning helper - SORT
  private performTopicMoveToSort(
    topic: Topic,
    targetCourseId: number,
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Topic'
  ): Observable<any> {
    console.log(`[TreeDragDropService] SORT: Topic positioning within Course:`, {
      topicId: topic.id,
      targetCourseId,
      relativeToId,
      relativePosition,
      relativeToType
    });

    const topicTreeData = createTreeData(topic);

    const event: NodeMovedEvent = {
      node: topicTreeData,
      sourceParentId: topic.courseId,
      sourceParentType: 'Course',
      targetParentId: targetCourseId,
      targetParentType: 'Course'
    };

    return this.nodeOperationsService.performMoveToSort(
      event,
      relativeToId,
      relativePosition,
      relativeToType
    );
  }

  // ✅ NEW: SubTopic move to different parent - REGROUP
  private performSubTopicMoveToGroup(
    subTopic: SubTopic,
    targetTopicId: number
  ): Observable<any> {
    console.log(`[TreeDragDropService] REGROUP: SubTopic moving to different Topic (append to bottom)`);

    const subTopicTreeData = createTreeData(subTopic);

    const event: NodeMovedEvent = {
      node: subTopicTreeData,
      sourceParentId: subTopic.topicId,
      sourceParentType: 'Topic',
      targetParentId: targetTopicId,
      targetParentType: 'Topic'
    };

    return this.nodeOperationsService.performMoveToGroup(event);
  }

  // ✅ NEW: Topic move to different course - REGROUP
  private performTopicMoveToGroup(
    topic: Topic,
    sourceCourseId: number,
    targetCourseId: number
  ): Observable<any> {
    console.log(`[TreeDragDropService] REGROUP: Topic moving to different Course (append to bottom)`);

    const topicTreeData = createTreeData(topic);

    const event: NodeMovedEvent = {
      node: topicTreeData,
      sourceCourseId,
      targetCourseId,
      targetParentType: 'Course',
      targetParentId: targetCourseId
    };

    return this.nodeOperationsService.performMoveToGroup(event);
  }

  private simplifyDropPosition(dropPosition: string, targetNode: TreeNode): 'before' | 'after' {
    // Special case: "Before" is only used when dropping at the very beginning
    // For now, we'll implement the simple version and can enhance with first-item detection later
    if (dropPosition === 'Before') {
      // TODO: Add first-item detection logic here if needed
      // For now, keep some "before" operations for first positions
      console.log('[TreeDragDropService] Before position detected - keeping as "before" for first-item case');
      return 'before';
    }

    // Default: All "After" and "Inside" operations become "after"
    console.log('[TreeDragDropService] Using "after" position (simplified UX)');
    return 'after';
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
