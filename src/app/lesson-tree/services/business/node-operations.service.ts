// **SIMPLIFIED** - NodeOperationsService - API-First, No Frontend Positioning
// REMOVED: NodePositioningService, LessonPositioningService (deleted services)
// PATTERN: Direct API calls → Calendar refresh → Done

import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from '../../../shared/services/api.service';
import { CourseDataService } from '../course-data/course-data.service';
import { NodeDragModeService, DragMode } from '../state/node-drag-mode.service';
import { NodeMovedEvent, TreeData } from '../../../models/tree-node';
import { Lesson } from '../../../models/lesson';
import {CalendarRefreshService} from '../../../calendar/services/business/calendar-refresh.service';

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
    console.log('[NodeOperationsService] Simplified API-first service initialized');
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

  /**
   * SIMPLIFIED: Perform REGROUP operation (move to different parent)
   * PATTERN: API call → Calendar refresh → Signal emission
   */
  performMoveToGroup(event: NodeMovedEvent): Observable<boolean> {
    const { node, targetParentId, targetParentType, targetCourseId } = event;

    console.log(`[NodeOperationsService] REGROUP: ${node.entityType} to ${targetParentType}:${targetParentId}`);

    const courseId = this.extractCourseId(node, targetCourseId);

    if (node.entityType === 'Topic' && targetCourseId) {
      return this.apiService.moveTopic(node.id, targetCourseId).pipe(
        tap((result: any) => this.handleApiSuccess(result, node, 'REGROUP', courseId, event)),
        map((result: any) => result.isSuccess),
        catchError(err => this.handleApiError(err, 'move topic'))
      );
    }

    if (node.entityType === 'Lesson') {
      return this.apiService.moveLesson(
        node.id,
        targetParentType === 'SubTopic' ? targetParentId : undefined,
        targetParentType === 'Topic' ? targetParentId : undefined
      ).pipe(
        tap((result: any) => this.handleApiSuccess(result, node, 'REGROUP', courseId, event)),
        map((result: any) => result.isSuccess),
        catchError(err => this.handleApiError(err, 'move lesson'))
      );
    }

    // FIX: Add null safety for targetParentId
    if (node.entityType === 'SubTopic' && targetParentType === 'Topic' && targetParentId !== undefined) {
      return this.apiService.moveSubTopic(node.id, targetParentId).pipe(
        tap((result: any) => this.handleApiSuccess(result, node, 'REGROUP', courseId, event)),
        map((result: any) => result.isSuccess),
        catchError(err => this.handleApiError(err, 'move subtopic'))
      );
    }

    console.error('[NodeOperationsService] Unsupported REGROUP operation', event);
    this.toastr.error('Unsupported move operation', 'Error');
    return of(false);
  }


  /**
   * SIMPLIFIED: Perform SORT operation (positional move within same parent)
   * PATTERN: API call with positioning → Calendar refresh → Signal emission
   */
  performMoveToSort(
    event: NodeMovedEvent,
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Topic' | 'SubTopic' | 'Lesson'
  ): Observable<boolean> {
    const { node, targetParentId, targetParentType } = event;

    console.log(`[NodeOperationsService] SORT: ${node.entityType} ${relativePosition} ${relativeToType}:${relativeToId}`);

    const courseId = this.extractCourseId(node);

    if (node.entityType === 'Lesson') {
      return this.apiService.moveLesson(
        node.id,
        targetParentType === 'SubTopic' ? targetParentId : undefined,
        targetParentType === 'Topic' ? targetParentId : undefined,
        relativeToId,
        relativePosition
      ).pipe(
        tap((result: any) => this.handleApiSuccess(result, node, 'SORT', courseId, event)),
        map((result: any) => result.isSuccess),
        catchError(err => this.handleApiError(err, 'sort lesson'))
      );
    }

    // FIX: Add null safety for targetParentId
    if (node.entityType === 'SubTopic' && targetParentId !== undefined) {
      return this.apiService.moveSubTopic(
        node.id,
        targetParentId,
        relativeToId,
        relativePosition
      ).pipe(
        tap((result: any) => this.handleApiSuccess(result, node, 'SORT', courseId, event)),
        map((result: any) => result.isSuccess),
        catchError(err => this.handleApiError(err, 'sort subtopic'))
      );
    }

    // FIX: Add null safety for course ID
    if (node.entityType === 'Topic') {
      const courseId = event.targetCourseId || event.sourceCourseId;
      if (courseId !== undefined) {
        return this.apiService.moveTopic(
          node.id,
          courseId,
          relativeToId,
          relativePosition
        ).pipe(
          tap((result: any) => this.handleApiSuccess(result, node, 'SORT', courseId, event)),
          map((result: any) => result.isSuccess),
          catchError(err => this.handleApiError(err, 'sort topic'))
        );
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
    // Try to get from lesson entity directly
    if (node.entityType === 'Lesson') {
      const lesson = node.entity as Lesson;
      return lesson.courseId;
    }

    // Use fallback for topics/subtopics
    return fallbackCourseId;
  }

  /**
   * Handle successful API response
   */
  private handleApiSuccess(
    result: any,
    node: TreeData,
    operationType: 'SORT' | 'REGROUP',
    courseId: number | undefined,
    event: NodeMovedEvent
  ): void {
    if (result.isSuccess) {
      console.log(`[NodeOperationsService] ✅ ${operationType} API success:`, {
        entityType: node.entityType,
        totalModified: result.modifiedEntities?.length || 0,
        courseId
      });

      if (courseId) {
        this.calendarRefresh.refreshAfterLessonChange('moved', courseId);
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
          // FIX: Cast to proper type
          moveType: operationType.toLowerCase() as "drag-drop" | "api-move" | "bulk-operation"
        }
      );

      this.toastr.success(`${operationType}: ${node.entityType} "${this.getNodeTitle(node)}" moved successfully`);
    } else {
      console.error(`[NodeOperationsService] ❌ ${operationType} failed:`, result.errorMessage);
      this.toastr.error(`Failed to ${operationType.toLowerCase()}: ` + result.errorMessage, 'Error');
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
}
