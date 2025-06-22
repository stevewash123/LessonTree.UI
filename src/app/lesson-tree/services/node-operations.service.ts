// RESPONSIBILITY: Orchestrates drag & drop operations, move/copy logic, and API coordination
// DOES NOT: Manage drag mode state, perform sort order calculations, or handle direct API operations
// CALLED BY: TreeWrapper drag handlers, Calendar scheduling operations

import { Injectable } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { CourseCrudService } from './course-crud.service';
import { NodeDragModeService, DragMode } from './node-drag-mode.service';
import { NodePositioningService } from './node-positioning.service';
import { ToastrService } from 'ngx-toastr';
import { TreeData, NodeMovedEvent } from '../../models/tree-node';
import { ApiService } from '../../shared/services/api.service';
import { CourseDataService } from '../../shared/services/course-data.service';

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
    private toastr: ToastrService
  ) {
    console.log('[NodeOperationsService] Service initialized');
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

  // Main operation dispatcher - decides between move and copy
  performDragOperation(event: NodeMovedEvent): Observable<boolean> {
    if (this.isDragModeCopy) {
      return this.copyNode(event);
    } else {
      return this.moveNode(event);
    }
  }

  // Move node operation
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
    
    // Handle special case: Topic moving between courses
    if (node.nodeType === 'Topic' && targetCourseId) {
      return this.apiService.moveTopic(node.id, targetCourseId).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully moved topic ${this.getNodeTitle(node)} between courses`);
          
          // Signal the move through data service
          this.courseDataService.emitNodeMoved({
            node,
            sourceLocation: sourceParentType ? `${sourceParentType}:${sourceParentId}` : `Course:${sourceCourseId}`,
            targetLocation: `Course:${targetCourseId}`
          }, 'tree');
          
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
            sourceLocation: sourceParentType ? `${sourceParentType}:${sourceParentId}` : 'Unknown',
            targetLocation: targetSubTopicId ? `SubTopic:${targetSubTopicId}` : 
                    targetTopicId ? `Topic:${targetTopicId}` : 'Unknown'
          }, 'tree');
          
          // Show success message
          this.toastr.success(`Moved Lesson "${this.getNodeTitle(node)}" successfully`);
          
          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to move lesson:', err);
          this.toastr.error('Failed to move lesson: ' + err.message, 'Error');
          return of(false);
        })
      );
    }
    
    // Handle SubTopic moves (always to a Topic)
    if (node.nodeType === 'SubTopic' && targetParentType === 'Topic' && targetParentId) {
      return this.apiService.moveSubTopic(node.id, targetParentId).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully moved subtopic ${this.getNodeTitle(node)}`);
          
          // Signal the move through data service
          this.courseDataService.emitNodeMoved({
            node,
            sourceLocation: sourceParentType ? `${sourceParentType}:${sourceParentId}` : 'Unknown',
            targetLocation: `Topic:${targetParentId}`
          }, 'tree');
          
          // Show success message
          this.toastr.success(`Moved SubTopic "${this.getNodeTitle(node)}" successfully`);
          
          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true),
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

  // Copy node operation - using correct API endpoints
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

    // Handle Topic copying
    if (node.nodeType === 'Topic' && targetCourseId) {
      const copyPayload = {
        topicId: node.id,
        newCourseId: targetCourseId
      };
      
      return this.apiService.post('Topic/copy', copyPayload).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully copied topic ${this.getNodeTitle(node)} between courses`);
          
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
      
      return this.apiService.post('Lesson/copy', copyPayload).pipe(
        tap(() => {
          console.log('[NodeOperationsService] Successfully copied lesson', {
            lessonId: node.id,
            targetSubTopicId,
            targetTopicId
          });
          
          // Show success message
          this.toastr.success(`Copied Lesson "${this.getNodeTitle(node)}" successfully`);
          
          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to copy lesson:', err);
          this.toastr.error('Failed to copy lesson: ' + err.message, 'Error');
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
      
      return this.apiService.post('SubTopic/copy', copyPayload).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully copied subtopic ${this.getNodeTitle(node)}`);
          
          // Show success message
          this.toastr.success(`Copied SubTopic "${this.getNodeTitle(node)}" successfully`);
          
          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true),
        catchError(err => {
          console.error('[NodeOperationsService] Failed to copy subtopic:', err);
          this.toastr.error('Failed to copy subtopic: ' + err.message, 'Error');
          return of(false);
        })
      );
    }
    
    // If we reach here, it's an unsupported copy type
    console.error('[NodeOperationsService] Unsupported copy operation', event);
    this.toastr.error('Unsupported copy operation', 'Error');
    return of(false);
  }
  
  /**
   * Perform positional move operation - delegates to positioning service
   */
  performPositionalMove(
    event: NodeMovedEvent,
    relativeToId: number,
    relativePosition: 'before' | 'after',
    relativeToType: 'Lesson' | 'SubTopic'
  ): Observable<boolean> {
    console.log(`[NodeOperationsService] Delegating positional move to NodePositioningService`);
    
    // Check if positioning is supported for this node type
    if (!this.nodePositioningService.supportsPositionalMove(event.node.nodeType)) {
      console.log(`[NodeOperationsService] Positional move not supported for ${event.node.nodeType}, using regular move`);
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
            sourceLocation: event.sourceParentType ? `${event.sourceParentType}:${event.sourceParentId}` : 'Unknown',
            targetLocation: `${event.targetParentType}:${event.targetParentId}@${result.sortOrder}`
          }, 'tree');
          
          // Show success message
          this.toastr.success(`Moved ${event.node.nodeType} "${this.getNodeTitle(event.node)}" to specific position`);
          
          // Reload courses to get fresh data
          return this.courseCrudService.loadCourses().pipe(map(() => true));
        } else {
          this.toastr.error('Failed to move to position: positioning service error', 'Error');
          return of(false);
        }
      }),
      catchError(err => {
        console.error('[NodeOperationsService] Failed positional move coordination:', err);
        this.toastr.error('Failed to coordinate positional move: ' + err.message, 'Error');
        return of(false);
      })
    );
  }
}