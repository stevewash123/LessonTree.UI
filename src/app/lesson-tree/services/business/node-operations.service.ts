// **COMPLETE FILE** - NodeOperationsService - Renamed methods for SORT vs REGROUP clarity
// RESPONSIBILITY: Orchestrates drag & drop operations, move/copy logic, and API coordination
// DOES NOT: Manage drag mode state, perform sort order calculations, or handle direct API operations
// CALLED BY: TreeWrapper drag handlers, Calendar scheduling operations

import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { CourseCrudService } from '../course-operations/course-crud.service';
import { NodePositioningService } from './node-positioning.service';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../shared/services/api.service';
import { CourseDataService } from '../course-data/course-data.service';
import {DragMode, NodeDragModeService} from '../state/node-drag-mode.service';
import {NodeMovedEvent, TreeData} from '../../../models/tree-node';
import {
  LessonMoveContext, LessonOrderUpdate,
  LessonPositioningService
} from "../../../calendar/services/business/lesson-positioning.service";
import {EntityPositionResult, EntityStateInfo} from '../../../models/positioning-result.model';

export interface NodeCopyEvent {
  node: TreeData;
  sourceParentId?: number;
  sourceParentType?: string;
  targetParentId?: number;
  targetParentType?: string;
  sourceCourseId?: number;
  targetCourseId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NodeOperationsService {

  constructor(
    private apiService: ApiService,
    private courseDataService: CourseDataService,
    private courseCrudService: CourseCrudService,
    private nodeDragModeService: NodeDragModeService,
    private nodePositioningService: NodePositioningService,
    private lessonPositioningService: LessonPositioningService,
    private toastr: ToastrService
  ) {
    console.log('[NodeOperationsService] Service initialized with LessonPositioningService integration');
  }

  // Expose drag mode service methods for convenience
  get dragMode() {
    return this.nodeDragModeService.dragMode;
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
    switch (node.entityType) {
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

  performLessonPositionalMove(
    draggedLessonId: number,
    targetLessonId: number,
    dropPosition: 'before' | 'after',
    event: NodeMovedEvent
  ): Observable<boolean> {
    console.log(`[NodeOperationsService] Performing lesson positional move using EntityPositioningService`);

    // ✅ EXTRACT OLD SORT ORDER before API call
    const draggedLesson = event.node.entity as any;
    const oldSortOrder = draggedLesson.sortOrder || 0;

    console.log(`[NodeOperationsService] Lesson move context:`, {
      lessonId: draggedLessonId,
      oldSortOrder: oldSortOrder,
      targetLessonId: targetLessonId,
      dropPosition: dropPosition
    });

    // ✅ Use ApiService with enhanced response handling
    return this.apiService.moveLesson(
      draggedLessonId,
      event.targetParentType === 'SubTopic' ? event.targetParentId : undefined,
      event.targetParentType === 'Topic' ? event.targetParentId : undefined,
      targetLessonId,           // relativeToId
      dropPosition,             // position ('before' | 'after')
      'Lesson'                  // relativeToType
    ).pipe(
      tap((result: any) => {
        if (result.isSuccess) {
          console.log('[NodeOperationsService] ✅ API SUCCESS - Enhanced positioning result:', {
            totalModified: result.modifiedEntities.length,
            movedEntity: result.modifiedEntities.find((e: any) => e.isMovedEntity),
            allModified: result.modifiedEntities.map((e: any) => ({
              id: e.id,
              type: e.type,
              sortOrder: e.sortOrder
            }))
          });

          // Find the moved lesson in the result
          const movedLesson = result.modifiedEntities.find((e: any) => e.isMovedEntity && e.type === 'Lesson');
          if (movedLesson) {
            console.log(`[NodeOperationsService] ✅ Lesson positioned: ${oldSortOrder} → ${movedLesson.sortOrder}`);
          }

          const sourceLocation = `${event.sourceParentType}:${event.sourceParentId}`;
          const targetLocation = `${event.targetParentType}:${event.targetParentId}`;

          // ✅ FIXED: Include both old and new sort orders
          this.courseDataService.emitEntityMoved(
            event.node.entity,
            sourceLocation,
            targetLocation,
            'tree',
            'DRAG_MOVE',
            {
              oldSortOrder: oldSortOrder,           // ✅ FROM ENTITY BEFORE API CALL
              newSortOrder: movedLesson?.sortOrder, // ✅ FROM API RESPONSE
              moveType: 'drag-drop',
              apiResponse: result                   // ✅ ADD: Include complete API response
            }
          );

          this.toastr.success(`Positioned Lesson "${this.getNodeTitle(event.node)}" from sort order ${oldSortOrder} to ${movedLesson?.sortOrder || 'unknown'}`);
          console.log('[NodeOperationsService] ✅ Signal emitted with complete sort order metadata');
        } else {
          console.error('[NodeOperationsService] ❌ API positioning failed:', result.errorMessage);
          this.toastr.error('Failed to position lesson: ' + result.errorMessage, 'Error');
        }
      }),
      map((result: any) => result.isSuccess),
      catchError(err => {
        console.error('[NodeOperationsService] Failed to move lesson with EntityPositioningService:', err);
        this.toastr.error('Failed to position lesson: ' + err.message, 'Error');
        return of(false);
      })
    );
  }

  performMoveToGroup(event: NodeMovedEvent): Observable<boolean> {
    const { node, sourceParentId, sourceParentType, targetParentId, targetParentType, sourceCourseId, targetCourseId } = event;

    console.log(`[NodeOperationsService] REGROUP: Moving ${node.entityType} ${this.getNodeTitle(node)} (ID: ${node.id}) to different parent`, {
      sourceParentType,
      sourceParentId,
      targetParentType,
      targetParentId,
      sourceCourseId,
      targetCourseId
    });

    const sourceLocation = sourceParentType ? `${sourceParentType}:${sourceParentId}` : `Course:${sourceCourseId}`;
    const targetLocation = targetCourseId ? `Course:${targetCourseId}` : `${targetParentType}:${targetParentId}`;

    // ✅ EXTRACT OLD SORT ORDER before API call
    const entityData = node.entity as any;
    const oldSortOrder = entityData.sortOrder || 0;

    console.log(`[NodeOperationsService] Entity move context:`, {
      entityType: node.entityType,
      entityId: node.id,
      oldSortOrder: oldSortOrder,
      sourceLocation: sourceLocation,
      targetLocation: targetLocation
    });

    // Handle special case: Topic moving between courses
    if (node.entityType === 'Topic' && targetCourseId) {
      return this.apiService.moveTopic(node.id, targetCourseId).pipe(
        tap((result: any) => {
          if (result.isSuccess) {
            console.log(`[NodeOperationsService] ✅ API SUCCESS - Topic REGROUP result:`, {
              totalModified: result.modifiedEntities.length,
              movedEntity: result.modifiedEntities.find((e: any) => e.isMovedEntity)
            });

            // Find the moved topic in the result
            const movedTopic = result.modifiedEntities.find((e: any) => e.isMovedEntity && e.type === 'Topic');

            // ✅ FIXED: Include both old and new sort orders
            this.courseDataService.emitEntityMoved(
              node.entity,
              sourceLocation,
              targetLocation,
              'tree',
              'DRAG_MOVE',
              {
                oldSortOrder: oldSortOrder,            // ✅ FROM ENTITY BEFORE API CALL
                newSortOrder: movedTopic?.sortOrder,   // ✅ FROM API RESPONSE
                moveType: 'api-move'
              }
            );

            this.toastr.success(`Moved Topic "${this.getNodeTitle(node)}" from sort order ${oldSortOrder} to ${movedTopic?.sortOrder || 'unknown'}`);
            console.log('[NodeOperationsService] ✅ Signal emitted for Topic REGROUP operation');
          } else {
            console.error('[NodeOperationsService] ❌ Topic REGROUP failed:', result.errorMessage);
            this.toastr.error('Failed to move topic: ' + result.errorMessage, 'Error');
          }
        }),
        map((result: any) => result.isSuccess),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to move topic between courses:', err);
          this.toastr.error('Failed to move topic: ' + err.message, 'Error');
          return of(false);
        })
      );
    }

    // ✅ UPDATED: Handle lesson moves with oldSortOrder
    if (node.entityType === 'Lesson') {
      return this.apiService.moveLesson(
        node.id,
        targetParentType === 'SubTopic' ? targetParentId : undefined,
        targetParentType === 'Topic' ? targetParentId : undefined
        // No positioning parameters for REGROUP operations - append to end
      ).pipe(
        tap((result: any) => {
          if (result.isSuccess) {
            console.log('[NodeOperationsService] ✅ API SUCCESS - Lesson REGROUP result:', {
              totalModified: result.modifiedEntities.length,
              movedEntity: result.modifiedEntities.find((e: any) => e.isMovedEntity)
            });

            // Find the moved lesson in the result
            const movedLesson = result.modifiedEntities.find((e: any) => e.isMovedEntity && e.type === 'Lesson');

            // ✅ FIXED: Include both old and new sort orders
            this.courseDataService.emitEntityMoved(
              node.entity,
              sourceLocation,
              targetLocation,
              'tree',
              'DRAG_MOVE',
              {
                oldSortOrder: oldSortOrder,            // ✅ FROM ENTITY BEFORE API CALL
                newSortOrder: movedLesson?.sortOrder,  // ✅ FROM API RESPONSE
                moveType: 'api-move'
              }
            );

            this.toastr.success(`Moved Lesson "${this.getNodeTitle(node)}" from sort order ${oldSortOrder} to ${movedLesson?.sortOrder || 'unknown'}`);
            console.log('[NodeOperationsService] ✅ Signal emitted for Lesson REGROUP operation');
          } else {
            console.error('[NodeOperationsService] ❌ Lesson REGROUP failed:', result.errorMessage);
            this.toastr.error('Failed to move lesson: ' + result.errorMessage, 'Error');
          }
        }),
        map((result: any) => result.isSuccess),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to move lesson:', err);
          this.toastr.error('Failed to move lesson: ' + err.message, 'Error');
          return of(false);
        })
      );
    }

    // ✅ UPDATED: Handle SubTopic moves with oldSortOrder
    if (node.entityType === 'SubTopic' && targetParentType === 'Topic' && targetParentId) {
      return this.apiService.moveSubTopic(
        node.id,
        targetParentId
        // No positioning parameters for REGROUP operations - append to end
      ).pipe(
        tap((result: any) => {
          if (result.isSuccess) {
            console.log('[NodeOperationsService] ✅ API SUCCESS - SubTopic REGROUP result:', {
              totalModified: result.modifiedEntities.length,
              movedEntity: result.modifiedEntities.find((e: any) => e.isMovedEntity)
            });

            // Find the moved subtopic in the result
            const movedSubTopic = result.modifiedEntities.find((e: any) => e.isMovedEntity && e.type === 'SubTopic');

            // ✅ FIXED: Include both old and new sort orders
            this.courseDataService.emitEntityMoved(
              node.entity,
              sourceLocation,
              targetLocation,
              'tree',
              'DRAG_MOVE',
              {
                oldSortOrder: oldSortOrder,              // ✅ FROM ENTITY BEFORE API CALL
                newSortOrder: movedSubTopic?.sortOrder,  // ✅ FROM API RESPONSE
                moveType: 'api-move'
              }
            );

            this.toastr.success(`Moved SubTopic "${this.getNodeTitle(node)}" from sort order ${oldSortOrder} to ${movedSubTopic?.sortOrder || 'unknown'}`);
            console.log('[NodeOperationsService] ✅ Signal emitted for SubTopic REGROUP operation');
          } else {
            console.error('[NodeOperationsService] ❌ SubTopic REGROUP failed:', result.errorMessage);
            this.toastr.error('Failed to move subtopic: ' + result.errorMessage, 'Error');
          }
        }),
        map((result: any) => result.isSuccess),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to move subtopic:', err);
          this.toastr.error('Failed to move subtopic: ' + err.message, 'Error');
          return of(false);
        })
      );
    }

    // If we reach here, it's an unsupported move type
    console.error('[NodeOperationsService] Unsupported move operation', event);
    this.toastr.error('Unsupported move operation', 'Error');
    return of(false);
  }

  /**
   * ✅ RENAMED: performPositionalMove → performMoveToSort
   * SORT: Perform positional move operation within same parent
   */
  performMoveToSort(
    event: NodeMovedEvent,
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Topic' | 'SubTopic' | 'Lesson'
  ): Observable<boolean> {
    console.log(`[NodeOperationsService] SORT: Delegating positional move within same parent to NodePositioningService`);

    // ✅ SPECIAL CASE: Use lesson positioning service for lesson-to-lesson positioning
    if (event.node.entityType === 'Lesson' && relativeToType === 'Lesson') {
      console.log('[NodeOperationsService] Using LessonPositioningService for lesson-to-lesson positioning');
      return this.performLessonPositionalMove(
        event.node.id,
        relativeToId,
        relativePosition,
        event
      );
    }

    // ✅ UNIVERSAL: All other entity types use NodePositioningService
    const sourceLocation = event.sourceParentType ? `${event.sourceParentType}:${event.sourceParentId}` : 'Unknown';
    const targetLocation = `${event.targetParentType}:${event.targetParentId}`;

    return this.nodePositioningService.performPositionalMove(
      event,
      relativeToId,
      relativePosition,
      relativeToType
    ).pipe(
      switchMap(result => {
        if (result.success) {
          // Signal the move through data service
          this.courseDataService.emitEntityMoved(
            event.node.entity,
            sourceLocation,
            targetLocation,
            'tree',
            'DRAG_MOVE',
            {
              moveType: 'drag-drop'  // ✅ USE ALIGNED VALUE
            }
          );

          // Show success message
          this.toastr.success(`Sorted ${event.node.entityType} "${this.getNodeTitle(event.node)}" to specific position`);

          console.log('[NodeOperationsService] SORT operation completed, signal emitted, tree state preserved');
          return of(true);
        } else {
          this.toastr.error('Failed to sort to position: positioning service error', 'Error');
          return of(false);
        }
      }),
      catchError(err => {
        console.error('[NodeOperationsService] Failed SORT operation coordination:', err);
        this.toastr.error('Failed to coordinate sort operation: ' + err.message, 'Error');
        return of(false);
      })
    );
  }
}
