// RESPONSIBILITY: Orchestrates drag & drop operations, move/copy logic, and API coordination
// DOES NOT: Manage drag mode state, perform sort order calculations, or handle direct API operations
// CALLED BY: TreeWrapper drag handlers, Calendar scheduling operations

import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, Subject, switchMap, tap } from 'rxjs';
import { CourseCrudService } from '../course-operations/course-crud.service';
import { NodeDragModeService, DragMode } from '../tree-interactions/node-drag-mode.service';
import { NodePositioningService } from './node-positioning.service';
import { ToastrService } from 'ngx-toastr';
import { TreeData, NodeMovedEvent } from '../../../models/tree-node';
import { ApiService } from '../../../shared/services/api.service';
import { CourseDataService } from '../course-data/course-data.service';

export interface NodeCopyEvent {
  node: TreeData;
  sourceParentId?: number;
  sourceParentType?: string;
  targetParentId?: number;
  targetParentType?: string;
  sourceCourseId?: number;
  targetCourseId?: number;
}

export interface NodeOperationEvent {
  type: 'move' | 'copy' | 'positional-move';
  node: TreeData;
  success: boolean;
  sourceLocation?: string;
  targetLocation?: string;
  error?: string;
  timestamp: Date;
}

export interface OperationValidationEvent {
  operationType: 'move' | 'copy';
  node: TreeData;
  isValid: boolean;
  reason?: string;
  timestamp: Date;
}

export interface OperationStartEvent {
  type: 'move' | 'copy' | 'positional-move';
  node: TreeData;
  sourceLocation: string;
  targetLocation: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NodeOperationsService {

  // ✅ Observable Events for Operation Coordination
  private readonly _operationCompleted = new Subject<NodeOperationEvent>();
  private readonly _operationStarted = new Subject<OperationStartEvent>();
  private readonly _validationResult = new Subject<OperationValidationEvent>();

  readonly operationCompleted$ = this._operationCompleted.asObservable();
  readonly operationStarted$ = this._operationStarted.asObservable();
  readonly validationResult$ = this._validationResult.asObservable();

  constructor(
    private apiService: ApiService,
    private courseDataService: CourseDataService,
    private courseCrudService: CourseCrudService,
    private nodeDragModeService: NodeDragModeService,
    private nodePositioningService: NodePositioningService,
    private toastr: ToastrService
  ) {
    console.log('[NodeOperationsService] Service initialized with Observable events');
  }

  // Expose drag mode service methods for convenience
  get dragMode() {
    return this.nodeDragModeService.dragMode;
  }

  get isDragModeMove(): boolean {
    return this.nodeDragModeService.isDragModeMove;
  }

  get isDragModeCopy(): boolean {
    return this.nodeDragModeService.isDragModeCopy;
  }

  toggleDragMode(): void {
    this.nodeDragModeService.toggleDragMode();
  }

  setDragMode(mode: DragMode): void {
    this.nodeDragModeService.setDragMode(mode);
  }

  // Private helper to get node title for logging/messages
  private getNodeTitle(node: TreeData): string {
    switch (node.nodeType) {
      case 'Course':
        return (node as any).title;
      case 'Topic':
        return (node as any).title;
      case 'SubTopic':
        return (node as any).title;
      case 'Lesson':
        return (node as any).title;
      default:
        return 'Unknown';
    }
  }

  // ✅ Enhanced with Observable events
  private emitOperationStarted(type: 'move' | 'copy' | 'positional-move', event: NodeMovedEvent): void {
    const sourceLocation = event.sourceParentType ? `${event.sourceParentType}:${event.sourceParentId}` : `Course:${event.sourceCourseId}`;
    const targetLocation = event.targetParentType ? `${event.targetParentType}:${event.targetParentId}` : `Course:${event.targetCourseId}`;

    this._operationStarted.next({
      type,
      node: event.node,
      sourceLocation,
      targetLocation,
      timestamp: new Date()
    });
  }

  // ✅ Enhanced with Observable events
  private emitOperationCompleted(type: 'move' | 'copy' | 'positional-move', node: TreeData, success: boolean, sourceLocation?: string, targetLocation?: string, error?: string): void {
    this._operationCompleted.next({
      type,
      node,
      success,
      sourceLocation,
      targetLocation,
      error,
      timestamp: new Date()
    });
  }

  // ✅ Enhanced with Observable events
  private emitValidationResult(operationType: 'move' | 'copy', node: TreeData, isValid: boolean, reason?: string): void {
    this._validationResult.next({
      operationType,
      node,
      isValid,
      reason,
      timestamp: new Date()
    });
  }

  // Main operation dispatcher - decides between move and copy
  performDragOperation(event: NodeMovedEvent): Observable<boolean> {
    const operationType = this.isDragModeCopy ? 'copy' : 'move';

    // ✅ Emit operation started
    this.emitOperationStarted(operationType, event);

    if (this.isDragModeCopy) {
      return this.copyNode(event);
    } else {
      return this.moveNode(event);
    }
  }

  // ✅ Enhanced move node operation with Observable events
  moveNode(event: NodeMovedEvent): Observable<boolean> {
    const { node, sourceParentId, sourceParentType, targetParentId, targetParentType, sourceCourseId, targetCourseId } = event;

    console.log(`[NodeOperationsService] Moving ${node.nodeType} ${this.getNodeTitle(node)} (ID: ${node.id})`, {
      sourceParentType,
      sourceParentId,
      targetParentType,
      targetParentId,
      sourceCourseId,
      targetCourseId
    });

    const sourceLocation = sourceParentType ? `${sourceParentType}:${sourceParentId}` : `Course:${sourceCourseId}`;
    const targetLocation = targetCourseId ? `Course:${targetCourseId}` : `${targetParentType}:${targetParentId}`;

    // Handle special case: Topic moving between courses
    if (node.nodeType === 'Topic' && targetCourseId) {
      return this.apiService.moveTopic(node.id, targetCourseId).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully moved topic ${this.getNodeTitle(node)} between courses`);

          // Signal the move through data service
          this.courseDataService.emitNodeMoved({
            node,
            sourceLocation,
            targetLocation
          }, 'tree');

          // ✅ Emit operation completed
          this.emitOperationCompleted('move', node, true, sourceLocation, targetLocation);

          // Show success message
          if (sourceCourseId && targetCourseId) {
            const sourceCourse = this.courseDataService.getCourseById(sourceCourseId);
            const targetCourse = this.courseDataService.getCourseById(targetCourseId);
            if (sourceCourse && targetCourse) {
              this.toastr.success(`Moved Topic "${this.getNodeTitle(node)}" from Course "${sourceCourse.title}" to Course "${targetCourse.title}"`);
            } else {
              this.toastr.success(`Moved Topic "${this.getNodeTitle(node)}" successfully`);
            }
          }

          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to move topic between courses:', err);
          this.toastr.error('Failed to move topic: ' + err.message, 'Error');

          // ✅ Emit operation completed with error
          this.emitOperationCompleted('move', node, false, sourceLocation, targetLocation, err.message);

          return of(false);
        })
      );
    }

    // Handle lesson moves (could be to subtopic or topic)
    if (node.nodeType === 'Lesson') {
      let targetSubTopicId: number | undefined = undefined;
      let targetTopicId: number | undefined = undefined;

      if (targetParentType === 'SubTopic') {
        targetSubTopicId = targetParentId;
      } else if (targetParentType === 'Topic') {
        targetTopicId = targetParentId;
      }

      const finalTargetLocation = targetSubTopicId ? `SubTopic:${targetSubTopicId}` :
        targetTopicId ? `Topic:${targetTopicId}` : 'Unknown';

      return this.apiService.moveLesson(node.id, targetSubTopicId, targetTopicId).pipe(
        tap(() => {
          console.log('[NodeOperationsService] Successfully moved lesson', {
            lessonId: node.id,
            targetSubTopicId,
            targetTopicId
          });

          // Signal the move through data service
          this.courseDataService.emitNodeMoved({
            node,
            sourceLocation,
            targetLocation: finalTargetLocation
          }, 'tree');

          // ✅ Emit operation completed
          this.emitOperationCompleted('move', node, true, sourceLocation, finalTargetLocation);

          // Show success message
          this.toastr.success(`Moved Lesson "${this.getNodeTitle(node)}" successfully`);

          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to move lesson:', err);
          this.toastr.error('Failed to move lesson: ' + err.message, 'Error');

          // ✅ Emit operation completed with error
          this.emitOperationCompleted('move', node, false, sourceLocation, targetLocation, err.message);

          return of(false);
        })
      );
    }

    // Handle SubTopic moves (always to a Topic)
    if (node.nodeType === 'SubTopic' && targetParentType === 'Topic' && targetParentId) {
      const finalTargetLocation = `Topic:${targetParentId}`;

      return this.apiService.moveSubTopic(node.id, targetParentId).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully moved subtopic ${this.getNodeTitle(node)}`);

          // Signal the move through data service
          this.courseDataService.emitNodeMoved({
            node,
            sourceLocation,
            targetLocation: finalTargetLocation
          }, 'tree');

          // ✅ Emit operation completed
          this.emitOperationCompleted('move', node, true, sourceLocation, finalTargetLocation);

          // Show success message
          this.toastr.success(`Moved SubTopic "${this.getNodeTitle(node)}" successfully`);

          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to move subtopic:', err);
          this.toastr.error('Failed to move subtopic: ' + err.message, 'Error');

          // ✅ Emit operation completed with error
          this.emitOperationCompleted('move', node, false, sourceLocation, targetLocation, err.message);

          return of(false);
        })
      );
    }

    // If we reach here, it's an unsupported move type
    console.error('[NodeOperationsService] Unsupported move operation', event);
    this.toastr.error('Unsupported move operation', 'Error');

    // ✅ Emit validation result for unsupported operation
    this.emitValidationResult('move', node, false, 'Unsupported move operation');
    this.emitOperationCompleted('move', node, false, sourceLocation, targetLocation, 'Unsupported move operation');

    return of(false);
  }

  // ✅ Enhanced copy node operation with Observable events
  copyNode(event: NodeCopyEvent): Observable<boolean> {
    const { node, sourceParentId, sourceParentType, targetParentId, targetParentType, sourceCourseId, targetCourseId } = event;

    console.log(`[NodeOperationsService] Copying ${node.nodeType} ${this.getNodeTitle(node)} (ID: ${node.id})`, {
      sourceParentType,
      sourceParentId,
      targetParentType,
      targetParentId,
      sourceCourseId,
      targetCourseId
    });

    const sourceLocation = sourceParentType ? `${sourceParentType}:${sourceParentId}` : `Course:${sourceCourseId}`;
    const targetLocation = targetCourseId ? `Course:${targetCourseId}` : `${targetParentType}:${targetParentId}`;

    // Handle Topic copying
    if (node.nodeType === 'Topic' && targetCourseId) {
      const copyPayload = {
        topicId: node.id,
        newCourseId: targetCourseId
      };

      return this.apiService.post('Topic/copy', copyPayload).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully copied topic ${this.getNodeTitle(node)} between courses`);

          // ✅ Emit operation completed
          this.emitOperationCompleted('copy', node, true, sourceLocation, targetLocation);

          // Show success message
          if (sourceCourseId && targetCourseId) {
            const sourceCourse = this.courseDataService.getCourseById(sourceCourseId);
            const targetCourse = this.courseDataService.getCourseById(targetCourseId);
            if (sourceCourse && targetCourse) {
              this.toastr.success(`Copied Topic "${this.getNodeTitle(node)}" from Course "${sourceCourse.title}" to Course "${targetCourse.title}"`);
            } else {
              this.toastr.success(`Copied Topic "${this.getNodeTitle(node)}" successfully`);
            }
          }

          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to copy topic between courses:', err);
          this.toastr.error('Failed to copy topic: ' + err.message, 'Error');

          // ✅ Emit operation completed with error
          this.emitOperationCompleted('copy', node, false, sourceLocation, targetLocation, err.message);

          return of(false);
        })
      );
    }

    // Handle Lesson copying
    if (node.nodeType === 'Lesson') {
      let targetSubTopicId: number | undefined = undefined;
      let targetTopicId: number | undefined = undefined;

      if (targetParentType === 'SubTopic') {
        targetSubTopicId = targetParentId;
      } else if (targetParentType === 'Topic') {
        targetTopicId = targetParentId;
      }

      const copyPayload = {
        lessonId: node.id,
        newSubTopicId: targetSubTopicId,
        newTopicId: targetTopicId
      };

      const finalTargetLocation = targetSubTopicId ? `SubTopic:${targetSubTopicId}` :
        targetTopicId ? `Topic:${targetTopicId}` : 'Unknown';

      return this.apiService.post('Lesson/copy', copyPayload).pipe(
        tap(() => {
          console.log('[NodeOperationsService] Successfully copied lesson', {
            lessonId: node.id,
            targetSubTopicId,
            targetTopicId
          });

          // ✅ Emit operation completed
          this.emitOperationCompleted('copy', node, true, sourceLocation, finalTargetLocation);

          // Show success message
          this.toastr.success(`Copied Lesson "${this.getNodeTitle(node)}" successfully`);

          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to copy lesson:', err);
          this.toastr.error('Failed to copy lesson: ' + err.message, 'Error');

          // ✅ Emit operation completed with error
          this.emitOperationCompleted('copy', node, false, sourceLocation, targetLocation, err.message);

          return of(false);
        })
      );
    }

    // Handle SubTopic copying
    if (node.nodeType === 'SubTopic' && targetParentType === 'Topic' && targetParentId) {
      const copyPayload = {
        subTopicId: node.id,
        newTopicId: targetParentId
      };

      const finalTargetLocation = `Topic:${targetParentId}`;

      return this.apiService.post('SubTopic/copy', copyPayload).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully copied subtopic ${this.getNodeTitle(node)}`);

          // ✅ Emit operation completed
          this.emitOperationCompleted('copy', node, true, sourceLocation, finalTargetLocation);

          // Show success message
          this.toastr.success(`Copied SubTopic "${this.getNodeTitle(node)}" successfully`);

          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to copy subtopic:', err);
          this.toastr.error('Failed to copy subtopic: ' + err.message, 'Error');

          // ✅ Emit operation completed with error
          this.emitOperationCompleted('copy', node, false, sourceLocation, targetLocation, err.message);

          return of(false);
        })
      );
    }

    // If we reach here, it's an unsupported copy type
    console.error('[NodeOperationsService] Unsupported copy operation', event);
    this.toastr.error('Unsupported copy operation', 'Error');

    // ✅ Emit validation result for unsupported operation
    this.emitValidationResult('copy', node, false, 'Unsupported copy operation');
    this.emitOperationCompleted('copy', node, false, sourceLocation, targetLocation, 'Unsupported copy operation');

    return of(false);
  }

  /**
   * ✅ Enhanced perform positional move operation with Observable events
   */
  performPositionalMove(
    event: NodeMovedEvent,
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Lesson' | 'SubTopic'
  ): Observable<boolean> {
    console.log(`[NodeOperationsService] Delegating positional move to NodePositioningService`);

    const sourceLocation = event.sourceParentType ? `${event.sourceParentType}:${event.sourceParentId}` : 'Unknown';
    const targetLocation = `${event.targetParentType}:${event.targetParentId}`;

    // ✅ Emit operation started
    this.emitOperationStarted('positional-move', event);

    // Check if positioning is supported for this node type
    if (!this.nodePositioningService.supportsPositionalMove(event.node.nodeType)) {
      console.log(`[NodeOperationsService] Positional move not supported for ${event.node.nodeType}, using regular move`);

      // ✅ Emit validation result
      this.emitValidationResult('move', event.node, false, `Positional move not supported for ${event.node.nodeType}`);

      return this.moveNode(event);
    }

    return this.nodePositioningService.performPositionalMove(
      event,
      relativeToId,
      relativePosition,
      relativeToType
    ).pipe(
      switchMap(result => {
        if (result.success) {
          // Signal the move through data service
          this.courseDataService.emitNodeMoved({
            node: event.node,
            sourceLocation,
            targetLocation: `${targetLocation}@${result.sortOrder}`
          }, 'tree');

          // ✅ Emit operation completed
          this.emitOperationCompleted('positional-move', event.node, true, sourceLocation, `${targetLocation}@${result.sortOrder}`);

          // Show success message
          this.toastr.success(`Moved ${event.node.nodeType} "${this.getNodeTitle(event.node)}" to specific position`);

          // Reload courses to get fresh data
          return this.courseCrudService.loadCourses().pipe(map(() => true));
        } else {
          this.toastr.error('Failed to move to position: positioning service error', 'Error');

          // ✅ Emit operation completed with error
          this.emitOperationCompleted('positional-move', event.node, false, sourceLocation, targetLocation, 'Positioning service error');

          return of(false);
        }
      }),
      catchError(err => {
        console.error('[NodeOperationsService] Failed positional move coordination:', err);
        this.toastr.error('Failed to coordinate positional move: ' + err.message, 'Error');

        // ✅ Emit operation completed with error
        this.emitOperationCompleted('positional-move', event.node, false, sourceLocation, targetLocation, err.message);

        return of(false);
      })
    );
  }
}
