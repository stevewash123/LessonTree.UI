// **COMPLETE FILE** - TreeDragDropService with Observable Events - FIXED
// RESPONSIBILITY: Handles tree drag & drop operations with cross-component event coordination
// DOES NOT: Manage tree UI state, store drag state, or handle data persistence - delegates appropriately
// CALLED BY: TreeWrapper drag event handlers for comprehensive drag operation management

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { Course } from '../../../models/course';
import { Lesson } from '../../../models/lesson';
import { SubTopic } from '../../../models/subTopic';
import { Topic } from '../../../models/topic';
import { TreeNode, NodeMovedEvent } from '../../../models/tree-node';
import { NodeOperationsService } from '../node-operations/node-operations.service';
import { TreeDataService } from '../tree-ui/tree-data.service';
import { NodeDragModeService, DragMode } from './node-drag-mode.service';

// ✅ FIXED: Observable event interfaces with proper string types
export interface DragOperationEvent {
  operationType: 'drag-started' | 'drag-validated' | 'drag-completed' | 'drag-failed' | 'drag-cancelled';
  draggedNodeType: string;
  targetNodeType: string;
  draggedNodeId: string;
  targetNodeId: string;
  dropPosition: 'Before' | 'After' | 'Inside';
  dragMode: DragMode;
  success: boolean;
  validationPassed: boolean;
  errors: string[];
  warnings: string[];
  operationDescription: string;
  source: 'tree-drag-drop';
  timestamp: Date;
}

export interface DragValidationEvent {
  validationType: 'drag-allowed' | 'drop-allowed' | 'operation-valid' | 'distance-check';
  draggedNodeType: string;
  targetNodeType?: string;
  isValid: boolean;
  reason: string;
  validationDetails: {
    canDragNode?: boolean;
    canDropOnTarget?: boolean;
    hasValidDistance?: boolean;
    operationSupported?: boolean;
  };
  source: 'tree-drag-drop';
  timestamp: Date;
}

export interface DragStateEvent {
  stateType: 'drag-initialized' | 'drag-motion-started' | 'drag-motion-cancelled' | 'drag-threshold-met';
  dragStartPosition: { x: number; y: number };
  currentPosition?: { x: number; y: number };
  distance?: number;
  allowDrag: boolean;
  source: 'tree-drag-drop';
  timestamp: Date;
}

export interface DragPositionEvent {
  positionType: 'positional-drop' | 'container-drop' | 'cross-course-drop';
  draggedNodeType: string;
  targetNodeType: string;
  dropPosition: 'Before' | 'After' | 'Inside';
  parentContainer: {
    id: number;
    type: 'SubTopic' | 'Topic' | 'Course';
  };
  relativeToNode?: {
    id: number;
    type: string;
    position: 'before' | 'after';
  };
  source: 'tree-drag-drop';
  timestamp: Date;
}

export interface DragState {
  dragStartX: number;
  dragStartY: number;
  allowDrag: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TreeDragDropService implements OnDestroy {

  // ✅ Observable events for cross-component coordination
  private readonly _dragOperation$ = new Subject<DragOperationEvent>();
  private readonly _dragValidation$ = new Subject<DragValidationEvent>();
  private readonly _dragState$ = new Subject<DragStateEvent>();
  private readonly _dragPosition$ = new Subject<DragPositionEvent>();

  // Public observables for business logic subscriptions
  readonly dragOperation$ = this._dragOperation$.asObservable();
  readonly dragValidation$ = this._dragValidation$.asObservable();
  readonly dragState$ = this._dragState$.asObservable();
  readonly dragPosition$ = this._dragPosition$.asObservable();

  private subscriptions: Subscription[] = [];

  constructor(
    private nodeOperationsService: NodeOperationsService,
    private treeDataService: TreeDataService,
    private nodeDragModeService: NodeDragModeService
  ) {
    console.log('[TreeDragDropService] Initialized with Observable events for drag operation coordination');
    this.setupDragModeSubscription();
  }

  private setupDragModeSubscription(): void {
    console.log('[TreeDragDropService] Ready to consume drag mode changes when available');
  }

  initializeDragState(): DragState {
    const dragState = {
      dragStartX: 0,
      dragStartY: 0,
      allowDrag: false
    };

    this._dragState$.next({
      stateType: 'drag-initialized',
      dragStartPosition: { x: dragState.dragStartX, y: dragState.dragStartY },
      allowDrag: dragState.allowDrag,
      source: 'tree-drag-drop',
      timestamp: new Date()
    });

    console.log('🚨 [TreeDragDropService] EMITTED dragState event:', 'drag-initialized');
    return dragState;
  }

  handleDragStart(args: any, dragState: DragState): void {
    dragState.dragStartX = args.event.pageX;
    dragState.dragStartY = args.event.pageY;
    dragState.allowDrag = false;

    this._dragOperation$.next({
      operationType: 'drag-started',
      draggedNodeType: args.draggedNodeData?.nodeType || 'Unknown',
      targetNodeType: 'None',
      draggedNodeId: args.draggedNodeData?.id || 'Unknown',
      targetNodeId: 'None',
      dropPosition: 'Inside',
      dragMode: this.nodeDragModeService.currentMode,
      success: true,
      validationPassed: false,
      errors: [],
      warnings: [],
      operationDescription: `Started dragging ${args.draggedNodeData?.nodeType || 'node'}`,
      source: 'tree-drag-drop',
      timestamp: new Date()
    });

    console.log('🚨 [TreeDragDropService] EMITTED dragOperation event:', 'drag-started');
  }

  handleDragging(args: any, dragState: DragState): void {
    const currentX = args.event.pageX;
    const currentY = args.event.pageY;
    const distance = Math.sqrt(
      Math.pow(currentX - dragState.dragStartX, 2) +
      Math.pow(currentY - dragState.dragStartY, 2)
    );

    const hadAllowDrag = dragState.allowDrag;

    if (distance >= 25 && !dragState.allowDrag) {
      dragState.allowDrag = true;

      this._dragState$.next({
        stateType: 'drag-threshold-met',
        dragStartPosition: { x: dragState.dragStartX, y: dragState.dragStartY },
        currentPosition: { x: currentX, y: currentY },
        distance,
        allowDrag: dragState.allowDrag,
        source: 'tree-drag-drop',
        timestamp: new Date()
      });

      console.log('🚨 [TreeDragDropService] EMITTED dragState event:', 'drag-threshold-met');
    }

    if (!dragState.allowDrag) {
      args.cancel = true;

      if (!hadAllowDrag) {
        this._dragState$.next({
          stateType: 'drag-motion-cancelled',
          dragStartPosition: { x: dragState.dragStartX, y: dragState.dragStartY },
          currentPosition: { x: currentX, y: currentY },
          distance,
          allowDrag: dragState.allowDrag,
          source: 'tree-drag-drop',
          timestamp: new Date()
        });
      }
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
      dropIndex,
      dropIndicator: args.dropIndicator
    });

    if (!dragState.allowDrag) {
      args.cancel = true;

      this._dragOperation$.next({
        operationType: 'drag-cancelled',
        draggedNodeType: args.draggedNodeData?.nodeType || 'Unknown',
        targetNodeType: args.droppedNodeData?.nodeType || 'Unknown',
        draggedNodeId,
        targetNodeId,
        dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
        dragMode: this.nodeDragModeService.currentMode,
        success: false,
        validationPassed: false,
        errors: ['Drag distance threshold not met'],
        warnings: [],
        operationDescription: 'Drag operation cancelled - insufficient drag distance',
        source: 'tree-drag-drop',
        timestamp: new Date()
      });

      console.log('🚨 [TreeDragDropService] EMITTED dragOperation event:', 'drag-cancelled');
      return null;
    }

    const draggedNode = this.treeDataService.findNodeById(treeData, draggedNodeId);
    if (!draggedNode) {
      console.warn('[TreeDragDropService] Dragged node not found:', draggedNodeId);

      this._dragOperation$.next({
        operationType: 'drag-failed',
        draggedNodeType: 'Unknown',
        targetNodeType: args.droppedNodeData?.nodeType || 'Unknown',
        draggedNodeId,
        targetNodeId,
        dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
        dragMode: this.nodeDragModeService.currentMode,
        success: false,
        validationPassed: false,
        errors: ['Dragged node not found in tree data'],
        warnings: [],
        operationDescription: 'Drag operation failed - dragged node not found',
        source: 'tree-drag-drop',
        timestamp: new Date()
      });

      console.log('🚨 [TreeDragDropService] EMITTED dragOperation event:', 'drag-failed');
      return null;
    }

    const targetNode = this.treeDataService.findNodeById(treeData, targetNodeId);
    if (!targetNode) {
      console.warn('[TreeDragDropService] Target node not found:', targetNodeId);

      this._dragOperation$.next({
        operationType: 'drag-failed',
        draggedNodeType: draggedNode.nodeType || 'Unknown',
        targetNodeType: 'Unknown',
        draggedNodeId,
        targetNodeId,
        dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
        dragMode: this.nodeDragModeService.currentMode,
        success: false,
        validationPassed: false,
        errors: ['Target node not found in tree data'],
        warnings: [],
        operationDescription: 'Drag operation failed - target node not found',
        source: 'tree-drag-drop',
        timestamp: new Date()
      });

      console.log('🚨 [TreeDragDropService] EMITTED dragOperation event:', 'drag-failed');
      return null;
    }

    // ✅ FIXED: Proper null checking for nodeType
    const draggedNodeType = draggedNode.nodeType || 'Unknown';
    const targetNodeType = targetNode.nodeType || 'Unknown';

    const dragValidation = this.validateDragOperation(draggedNode, targetNode);
    this._dragValidation$.next({
      validationType: 'operation-valid',
      draggedNodeType: draggedNodeType,
      targetNodeType: targetNodeType,
      isValid: dragValidation.isValid,
      reason: dragValidation.reason,
      validationDetails: {
        canDragNode: this.canDragNode(draggedNodeType),
        canDropOnTarget: this.canDropOnTarget(draggedNodeType, targetNodeType),
        operationSupported: dragValidation.isValid
      },
      source: 'tree-drag-drop',
      timestamp: new Date()
    });

    console.log('🚨 [TreeDragDropService] EMITTED dragValidation event:', 'operation-valid');

    if (!dragValidation.isValid) {
      this._dragOperation$.next({
        operationType: 'drag-failed',
        draggedNodeType: draggedNodeType,
        targetNodeType: targetNodeType,
        draggedNodeId,
        targetNodeId,
        dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
        dragMode: this.nodeDragModeService.currentMode,
        success: false,
        validationPassed: false,
        errors: [dragValidation.reason],
        warnings: [],
        operationDescription: dragValidation.reason,
        source: 'tree-drag-drop',
        timestamp: new Date()
      });

      console.log('🚨 [TreeDragDropService] EMITTED dragOperation event:', 'drag-failed (validation)');
      return null;
    }

    dragState.allowDrag = false;

    this._dragOperation$.next({
      operationType: 'drag-validated',
      draggedNodeType: draggedNodeType,
      targetNodeType: targetNodeType,
      draggedNodeId,
      targetNodeId,
      dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
      dragMode: this.nodeDragModeService.currentMode,
      success: true,
      validationPassed: true,
      errors: [],
      warnings: [],
      operationDescription: this.getDragOperationDescription(draggedNode, targetNode),
      source: 'tree-drag-drop',
      timestamp: new Date()
    });

    console.log('🚨 [TreeDragDropService] EMITTED dragOperation event:', 'drag-validated');

    let operationResult: Observable<any> | null = null;

    switch (draggedNodeType) {
      case 'Lesson':
        operationResult = this.handleLessonDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex);
        break;
      case 'SubTopic':
        operationResult = this.handleSubTopicDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex);
        break;
      case 'Topic':
        operationResult = this.handleTopicDragWithPosition(draggedNode, targetNode, dropPosition, dropIndex, courseId);
        break;
      default:
        console.warn('[TreeDragDropService] Unsupported node type for drag operation:', draggedNodeType);

        this._dragOperation$.next({
          operationType: 'drag-failed',
          draggedNodeType: draggedNodeType,
          targetNodeType: targetNodeType,
          draggedNodeId,
          targetNodeId,
          dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
          dragMode: this.nodeDragModeService.currentMode,
          success: false,
          validationPassed: true,
          errors: [`Unsupported node type for drag operation: ${draggedNodeType}`],
          warnings: [],
          operationDescription: 'Drag operation failed - unsupported node type',
          source: 'tree-drag-drop',
          timestamp: new Date()
        });

        return null;
    }

    if (operationResult) {
      this._dragOperation$.next({
        operationType: 'drag-completed',
        draggedNodeType: draggedNodeType,
        targetNodeType: targetNodeType,
        draggedNodeId,
        targetNodeId,
        dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
        dragMode: this.nodeDragModeService.currentMode,
        success: true,
        validationPassed: true,
        errors: [],
        warnings: [],
        operationDescription: this.getDragOperationDescription(draggedNode, targetNode),
        source: 'tree-drag-drop',
        timestamp: new Date()
      });

      console.log('🚨 [TreeDragDropService] EMITTED dragOperation event:', 'drag-completed');
    }

    return operationResult;
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
    const draggedNodeType = draggedNode.nodeType || 'Unknown';
    const targetNodeType = targetNode.nodeType || 'Unknown';

    if (dropPosition === 'Inside' && targetNodeType === 'SubTopic') {
      const targetSubTopic = targetNode.original as SubTopic;

      this._dragPosition$.next({
        positionType: 'container-drop',
        draggedNodeType: draggedNodeType,
        targetNodeType: targetNodeType,
        dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
        parentContainer: {
          id: targetSubTopic.id,
          type: 'SubTopic'
        },
        source: 'tree-drag-drop',
        timestamp: new Date()
      });

      console.log('🚨 [TreeDragDropService] EMITTED dragPosition event:', 'container-drop');
      return this.performSimpleLessonMove(lesson, targetSubTopic.id, undefined);
    }

    if (dropPosition === 'Before' || dropPosition === 'After') {
      if (targetNodeType === 'Lesson') {
        const targetLesson = targetNode.original as Lesson;

        if (targetLesson.subTopicId) {
          this._dragPosition$.next({
            positionType: 'positional-drop',
            draggedNodeType: draggedNodeType,
            targetNodeType: targetNodeType,
            dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
            parentContainer: {
              id: targetLesson.subTopicId,
              type: 'SubTopic'
            },
            relativeToNode: {
              id: targetLesson.id,
              type: 'Lesson',
              position: dropPosition === 'Before' ? 'before' : 'after'
            },
            source: 'tree-drag-drop',
            timestamp: new Date()
          });

          console.log('🚨 [TreeDragDropService] EMITTED dragPosition event:', 'positional-drop');

          return this.performPositionalLessonMove(
            lesson,
            targetLesson.subTopicId,
            'SubTopic',
            targetLesson.id,
            dropPosition === 'Before' ? 'before' : 'after',
            'Lesson'
          );
        } else if (targetLesson.topicId) {
          this._dragPosition$.next({
            positionType: 'positional-drop',
            draggedNodeType: draggedNodeType,
            targetNodeType: targetNodeType,
            dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
            parentContainer: {
              id: targetLesson.topicId,
              type: 'Topic'
            },
            relativeToNode: {
              id: targetLesson.id,
              type: 'Lesson',
              position: dropPosition === 'Before' ? 'before' : 'after'
            },
            source: 'tree-drag-drop',
            timestamp: new Date()
          });

          console.log('🚨 [TreeDragDropService] EMITTED dragPosition event:', 'positional-drop');

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

        this._dragPosition$.next({
          positionType: 'positional-drop',
          draggedNodeType: draggedNodeType,
          targetNodeType: targetNodeType,
          dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
          parentContainer: {
            id: targetSubTopic.topicId,
            type: 'Topic'
          },
          relativeToNode: {
            id: targetSubTopic.id,
            type: 'SubTopic',
            position: dropPosition === 'Before' ? 'before' : 'after'
          },
          source: 'tree-drag-drop',
          timestamp: new Date()
        });

        console.log('🚨 [TreeDragDropService] EMITTED dragPosition event:', 'positional-drop');

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

          this._dragPosition$.next({
            positionType: 'container-drop',
            draggedNodeType: draggedNodeType,
            targetNodeType: targetNodeType,
            dropPosition: dropPosition as 'Before' | 'After' | 'Inside',
            parentContainer: {
              id: targetTopic.id,
              type: 'Topic'
            },
            source: 'tree-drag-drop',
            timestamp: new Date()
          });

          console.log('🚨 [TreeDragDropService] EMITTED dragPosition event:', 'container-drop');
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
    console.log(`[TreeDragDropService] Positional drop detected:`, {
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

  private handleLessonDrag(draggedNode: TreeNode, targetNode: TreeNode): Observable<any> | null {
    const lesson = draggedNode.original as Lesson;
    let targetSubTopicId: number | undefined;
    let targetTopicId: number | undefined;
    let targetParentType: 'SubTopic' | 'Topic';
    const targetNodeType = targetNode.nodeType || 'Unknown';

    if (targetNodeType === 'SubTopic') {
      const targetSubTopic = targetNode.original as SubTopic;
      targetSubTopicId = targetSubTopic.id;
      targetParentType = 'SubTopic';
    } else if (targetNodeType === 'Topic') {
      const targetTopic = targetNode.original as Topic;
      targetTopicId = targetTopic.id;
      targetParentType = 'Topic';
    } else if (targetNodeType === 'Lesson') {
      const targetLesson = targetNode.original as Lesson;
      if (targetLesson.subTopicId) {
        targetSubTopicId = targetLesson.subTopicId;
        targetParentType = 'SubTopic';
      } else if (targetLesson.topicId) {
        targetTopicId = targetLesson.topicId;
        targetParentType = 'Topic';
      } else {
        console.warn('[TreeDragDropService] Target lesson has no valid parent:', targetLesson.id);
        return null;
      }
    } else {
      console.warn('[TreeDragDropService] Invalid target for lesson drag:', targetNodeType);
      return null;
    }

    const event: NodeMovedEvent = {
      node: lesson,
      sourceParentId: lesson.subTopicId || lesson.topicId,
      sourceParentType: lesson.subTopicId ? 'SubTopic' : 'Topic',
      targetParentId: targetSubTopicId || targetTopicId,
      targetParentType: targetParentType
    };

    return this.nodeOperationsService.performDragOperation(event);
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
    const draggedNodeType = draggedNode.nodeType || 'Unknown';

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
      this._dragPosition$.next({
        positionType: 'cross-course-drop',
        draggedNodeType: draggedNodeType,
        targetNodeType: targetNodeType,
        dropPosition: 'Inside',
        parentContainer: {
          id: targetCourseId,
          type: 'Course'
        },
        source: 'tree-drag-drop',
        timestamp: new Date()
      });

      console.log('🚨 [TreeDragDropService] EMITTED dragPosition event:', 'cross-course-drop');

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
    const canDrag = allowedTypes.includes(nodeType);

    this._dragValidation$.next({
      validationType: 'drag-allowed',
      draggedNodeType: nodeType,
      isValid: canDrag,
      reason: canDrag ? `${nodeType} can be dragged` : `${nodeType} cannot be dragged`,
      validationDetails: {
        canDragNode: canDrag
      },
      source: 'tree-drag-drop',
      timestamp: new Date()
    });

    return canDrag;
  }

  canDropOnTarget(draggedNodeType: string, targetNodeType: string): boolean {
    const validDropTargets: Record<string, string[]> = {
      'Lesson': ['SubTopic', 'Topic', 'Lesson'],
      'SubTopic': ['Topic'],
      'Topic': ['Course']
    };

    const allowedTargets = validDropTargets[draggedNodeType] || [];
    const canDrop = allowedTargets.includes(targetNodeType);

    this._dragValidation$.next({
      validationType: 'drop-allowed',
      draggedNodeType: draggedNodeType,
      targetNodeType: targetNodeType,
      isValid: canDrop,
      reason: canDrop
        ? `${draggedNodeType} can be dropped on ${targetNodeType}`
        : `${draggedNodeType} cannot be dropped on ${targetNodeType}`,
      validationDetails: {
        canDropOnTarget: canDrop
      },
      source: 'tree-drag-drop',
      timestamp: new Date()
    });

    return canDrop;
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
        supportedOperations: ['drag-drop', 'validation', 'position-aware'],
        observableEvents: ['dragOperation', 'dragValidation', 'dragState', 'dragPosition']
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
      },
      serviceArchitecture: {
        hasObservableEvents: true,
        emitsPositionEvents: true,
        validatesOperations: true,
        coordinatesCrossService: true
      }
    };
  }

  ngOnDestroy(): void {
    this._dragOperation$.complete();
    this._dragValidation$.complete();
    this._dragState$.complete();
    this._dragPosition$.complete();

    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    console.log('[TreeDragDropService] All Observable subjects completed and subscriptions cleaned up');
  }
}
