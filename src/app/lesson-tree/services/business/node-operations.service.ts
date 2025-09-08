// **UPDATED** - NodeOperationsService - Simplified sibling-based positioning
// CHANGES: Added new method signatures, updated API calls to use afterSiblingId approach

import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../shared/services/api.service';
import { CourseDataService } from '../course-data/course-data.service';
import { NodeDragModeService, DragMode } from '../state/node-drag-mode.service';
import { NodeMovedEvent, TreeData } from '../../../models/tree-node';
import { Lesson, validateLessonMoveResource } from '../../../models/lesson';
import { CalendarRefreshService } from '../../../calendar/services/integration/calendar-refresh.service';

@Injectable({
  providedIn: 'root'
})
export class NodeOperationsService {

  constructor(
    private apiService: ApiService,
    private courseDataService: CourseDataService,
    private nodeDragModeService: NodeDragModeService,
    private toastr: ToastrService,
    private calendarRefresh: CalendarRefreshService
  ) {
    console.log('[NodeOperationsService] Simplified sibling-based service initialized');
  }

  // Drag mode convenience methods
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

  private getNodeTitle(node: TreeData): string {
    return (node as any).title || 'Unknown';
  }

  // ✅ NEW: Simplified lesson move method that TreeDragDropService calls
  performLessonMove(
    event: NodeMovedEvent,
    targetSubTopicId?: number,
    targetTopicId?: number,
    afterSiblingId?: number | null
  ): Observable<boolean> {
    const { node } = event;

    console.log(`[NodeOperationsService] LESSON MOVE: Moving lesson ${node.id}`, {
      targetSubTopicId,
      targetTopicId,
      afterSiblingId
    });

    // ✅ Validate the move request
    const moveResource = {
      lessonId: node.id,
      newSubTopicId: targetSubTopicId || null,
      newTopicId: targetTopicId || null,
      afterSiblingId: afterSiblingId || null
    };

    const validationError = validateLessonMoveResource(moveResource);
    if (validationError) {
      console.error('[NodeOperationsService] Invalid lesson move:', validationError);
      this.toastr.error(validationError, 'Invalid Move');
      return of(false);
    }

    const courseId = this.extractCourseId(node);

    return this.apiService.moveLesson(
      node.id,
      targetSubTopicId,
      targetTopicId,
      afterSiblingId || undefined  // Convert null to undefined for API
    ).pipe(
      tap((result: any) => this.handleApiSuccess(result, node, 'LESSON MOVE', courseId, event)),
      map((result: any) => result && result.isSuccess),
      catchError(err => this.handleApiError(err, 'move lesson'))
    );
  }

  // ✅ NEW: Simplified subtopic move method
  performSubTopicMove(
    event: NodeMovedEvent,
    targetTopicId: number,
    afterSiblingId: number | null,
    dropPosition?: string  // Add dropPosition parameter to determine before/after
  ): Observable<boolean> {
    const { node } = event;

    console.log(`[NodeOperationsService] 🔍 SUBTOPIC MOVE INPUT PARAMETERS:`, {
      'node.id': node.id,
      'targetTopicId': targetTopicId,
      'afterSiblingId': afterSiblingId,
      'dropPosition': dropPosition,
      'afterSiblingId type': typeof afterSiblingId,
      'dropPosition type': typeof dropPosition,
      'afterSiblingId === null': afterSiblingId === null,
      'dropPosition === undefined': dropPosition === undefined
    });

    const courseId = this.extractCourseId(node);

    // ✅ Calculate position and relativeToType based on drop position and sibling
    console.log(`[NodeOperationsService] 🔍 POSITION CALCULATION LOGIC:`, {
      'afterSiblingId': afterSiblingId,
      'afterSiblingId truthy': !!afterSiblingId,
      'dropPosition': dropPosition,
      'dropPosition === "Before"': dropPosition === 'Before'
    });

    const position: 'before' | 'after' | undefined = afterSiblingId 
      ? (dropPosition === 'Before' ? 'before' : 'after') 
      : undefined;
    
    const relativeToType: 'SubTopic' | 'Lesson' | undefined = afterSiblingId ? this.determineRelativeToType(afterSiblingId) : undefined;

    console.log(`[NodeOperationsService] 🔍 CALCULATED POSITIONING VALUES:`, {
      'position': position,
      'position type': typeof position,
      'relativeToType': relativeToType,
      'relativeToType type': typeof relativeToType,
      'afterSiblingId || undefined': afterSiblingId || undefined,
      'position || null': position || null,
      'relativeToType || null': relativeToType || null
    });

    console.log(`[NodeOperationsService] 🚀 CALLING API SERVICE moveSubTopic WITH:`, {
      'nodeId': node.id,
      'targetTopicId': targetTopicId,  
      'relativeToId': afterSiblingId || undefined,
      'position': position,
      'relativeToType': relativeToType,
      'API EXPECTS': 'subTopicId, newTopicId, relativeToId, position, relativeToType'
    });

    return this.apiService.moveSubTopic(
      node.id,
      targetTopicId,
      afterSiblingId || undefined,  // Convert null to undefined for API
      position,
      relativeToType
    ).pipe(
      tap((result: any) => this.handleApiSuccess(result, node, 'SUBTOPIC MOVE', courseId, event)),
      map((result: any) => result && result.isSuccess),
      catchError(err => this.handleApiError(err, 'move subtopic'))
    );
  }

  // ✅ NEW: Simplified topic move method
  performTopicMove(
    event: NodeMovedEvent,
    targetCourseId: number,
    afterSiblingId: number | null
  ): Observable<boolean> {
    const { node } = event;

    console.log(`[NodeOperationsService] TOPIC MOVE: Moving topic ${node.id}`, {
      targetCourseId,
      afterSiblingId
    });

    return this.apiService.moveTopic(
      node.id,
      targetCourseId,
      afterSiblingId || undefined  // Convert null to undefined for API
    ).pipe(
      tap((result: any) => this.handleApiSuccess(result, node, 'TOPIC MOVE', targetCourseId, event)),
      map((result: any) => result && result.isSuccess),
      catchError(err => this.handleApiError(err, 'move topic'))
    );
  }

  // ===== COPY OPERATIONS =====

  performLessonCopy(
    event: NodeMovedEvent,
    targetSubTopicId?: number,
    targetTopicId?: number
  ): Observable<boolean> {
    const { node } = event;

    console.log(`[NodeOperationsService] LESSON COPY: Copying lesson ${node.id}`, {
      targetSubTopicId,
      targetTopicId
    });

    const courseId = this.extractCourseId(node);

    return this.apiService.copyLesson(
      node.id,
      targetSubTopicId,
      targetTopicId
    ).pipe(
      tap((result: any) => this.handleApiSuccess(result, node, 'LESSON COPY', courseId, event)),
      map((result: any) => result && result.isSuccess),
      catchError(err => this.handleApiError(err, 'copy lesson'))
    );
  }

  performSubTopicCopy(
    event: NodeMovedEvent,
    targetTopicId: number
  ): Observable<boolean> {
    const { node } = event;

    console.log(`[NodeOperationsService] SUBTOPIC COPY: Copying subtopic ${node.id}`, {
      targetTopicId
    });

    const courseId = this.extractCourseId(node);

    return this.apiService.copySubTopic(
      node.id,
      targetTopicId
    ).pipe(
      tap((result: any) => this.handleApiSuccess(result, node, 'SUBTOPIC COPY', courseId, event)),
      map((result: any) => result && result.isSuccess),
      catchError(err => this.handleApiError(err, 'copy subtopic'))
    );
  }

  performTopicCopy(
    event: NodeMovedEvent,
    targetCourseId: number
  ): Observable<boolean> {
    const { node } = event;

    console.log(`[NodeOperationsService] TOPIC COPY: Copying topic ${node.id}`, {
      targetCourseId
    });

    return this.apiService.copyTopic(
      node.id,
      targetCourseId
    ).pipe(
      tap((result: any) => this.handleApiSuccess(result, node, 'TOPIC COPY', targetCourseId, event)),
      map((result: any) => result && result.isSuccess),
      catchError(err => this.handleApiError(err, 'copy topic'))
    );
  }

  // ✅ LEGACY: Keep existing methods for backward compatibility during transition
  /**
   * LEGACY: Perform REGROUP operation (move to different parent)
   * @deprecated Use performLessonMove, performSubTopicMove, performTopicMove instead
   */
  performMoveToGroup(event: NodeMovedEvent): Observable<boolean> {
    const { node, targetParentId, targetParentType, targetCourseId } = event;

    console.log(`[NodeOperationsService] LEGACY REGROUP: ${node.entityType} to ${targetParentType}:${targetParentId}`);

    if (node.entityType === 'Topic' && targetCourseId) {
      return this.performTopicMove(event, targetCourseId, null);
    }

    if (node.entityType === 'Lesson') {
      return this.performLessonMove(
        event,
        targetParentType === 'SubTopic' ? targetParentId : undefined,
        targetParentType === 'Topic' ? targetParentId : undefined,
        null  // Append to end for legacy REGROUP operations
      );
    }

    if (node.entityType === 'SubTopic' && targetParentType === 'Topic' && targetParentId !== undefined) {
      return this.performSubTopicMove(event, targetParentId, null);
    }

    console.error('[NodeOperationsService] Unsupported REGROUP operation', event);
    this.toastr.error('Unsupported move operation', 'Error');
    return of(false);
  }

  /**
   * LEGACY: Perform SORT operation (positional move within same parent)
   * @deprecated Use performLessonMove, performSubTopicMove, performTopicMove instead
   */
  performMoveToSort(
    event: NodeMovedEvent,
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Topic' | 'SubTopic' | 'Lesson'
  ): Observable<boolean> {
    const { node, targetParentId, targetParentType } = event;

    console.log(`[NodeOperationsService] LEGACY SORT: ${node.entityType} ${relativePosition} ${relativeToType}:${relativeToId}`);

    // ✅ Convert legacy positioning to sibling approach
    const afterSiblingId = relativePosition === 'after' ? relativeToId : null;

    if (node.entityType === 'Lesson') {
      return this.performLessonMove(
        event,
        targetParentType === 'SubTopic' ? targetParentId : undefined,
        targetParentType === 'Topic' ? targetParentId : undefined,
        afterSiblingId
      );
    }

    if (node.entityType === 'SubTopic' && targetParentId !== undefined) {
      return this.performSubTopicMove(event, targetParentId, afterSiblingId);
    }

    if (node.entityType === 'Topic') {
      const courseId = event.targetCourseId || event.sourceCourseId;
      if (courseId !== undefined) {
        return this.performTopicMove(event, courseId, afterSiblingId);
      }
    }

    console.error('[NodeOperationsService] Unsupported SORT operation', event);
    this.toastr.error('Unsupported sort operation', 'Error');
    return of(false);
  }

  /**
   * Extract courseId from various sources
   */
  private extractCourseId(node: TreeData, fallbackCourseId?: number): number | undefined {
    // Try to get from entity directly - all entities should have courseId
    if (node.entityType === 'Lesson') {
      const lesson = node.entity as Lesson;
      return lesson.courseId;
    }
    
    if (node.entityType === 'SubTopic') {
      const subTopic = node.entity as any; // SubTopic with courseId
      return subTopic.courseId;
    }
    
    if (node.entityType === 'Topic') {
      const topic = node.entity as any; // Topic with courseId  
      return topic.courseId;
    }

    // Use fallback as last resort
    return fallbackCourseId;
  }

  /**
   * Handle successful API response
   */
  private handleApiSuccess(
    result: any,
    node: TreeData,
    operationType: string,
    courseId: number | undefined,
    event: NodeMovedEvent
  ): void {
    if (result && result.isSuccess) {
      console.log(`[NodeOperationsService] ✅ ${operationType} API success:`, {
        entityType: node.entityType,
        totalModified: result.modifiedEntities?.length || 0,
        courseId
      });

      if (courseId) {
        this.calendarRefresh.refreshCalendarForCourse(courseId);
        console.log(`[NodeOperationsService] ✅ Calendar refresh requested for course ${courseId}`);
      }

      const sourceLocation = event.sourceParentType ? `${event.sourceParentType}:${event.sourceParentId}` : 'Unknown';
      const targetLocation = `${event.targetParentType}:${event.targetParentId}`;

      const movedEntity = result.modifiedEntities?.find((e: any) => e.isMovedEntity);
      const oldSortOrder = (node.entity as any).sortOrder || 0;
      const newSortOrder = movedEntity?.sortOrder;

      this.courseDataService.emitEntityMoved(
        node.entity,
        sourceLocation,
        targetLocation,
        'tree',
        'DRAG_MOVE',
        {
          oldSortOrder,
          newSortOrder,
          moveType: "drag-drop" as const
        }
      );

      this.toastr.success(`${operationType}: ${node.entityType} "${this.getNodeTitle(node)}" moved successfully`);
    } else {
      console.error(`[NodeOperationsService] ❌ ${operationType} failed:`, result);
      this.toastr.error(`Failed to ${operationType.toLowerCase()}: Unexpected response format`, 'Error');
    }
  }

  /**
   * Handle API errors
   */
  private handleApiError(err: any, operation: string): Observable<boolean> {
    console.error(`[NodeOperationsService] ${operation} error:`, err);
    this.toastr.error(`Failed to ${operation}: ` + err.message, 'Error');
    return of(false);
  }

  /**
   * Determine the entity type of a sibling for relative positioning
   * For now, simplified approach - would need tree context to determine exact type
   */
  private determineRelativeToType(siblingId: number): 'SubTopic' | 'Lesson' {
    // ✅ TEMPORARY: Return 'Lesson' as default since most positioning is relative to lessons
    // TODO: Enhance this to query the tree data structure to determine actual entity type
    return 'Lesson';
  }
}
