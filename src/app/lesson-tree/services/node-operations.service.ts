// NodeOperationsService
// RESPONSIBILITY: Handles drag & drop operations, move/copy logic, and API coordination.
// DOES NOT: Manage tree UI state or course data storage.
// CALLED BY: TreeWrapper drag handlers, Calendar scheduling operations
import { Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { CourseCrudService } from './course-crud.service';
import { ToastrService } from 'ngx-toastr';
import { TreeData, NodeMovedEvent } from '../../models/tree-node';
import { ApiService } from '../../shared/services/api.service';
import { CourseDataService } from '../../shared/services/course-data.service';

export enum DragMode {
  Move = 'move',
  Copy = 'copy'
}

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
  // Drag mode state
  private readonly _dragMode = signal<DragMode>(DragMode.Move);
  readonly dragMode = this._dragMode.asReadonly();

  constructor(
    private apiService: ApiService,
    private courseDataService: CourseDataService,    
    private courseCrudService: CourseCrudService,
    private toastr: ToastrService
  ) {
    console.log('[NodeOperationsService] Service initialized', { timestamp: new Date().toISOString() });
  }

  // Drag mode methods
  toggleDragMode(): void {
    const currentMode = this._dragMode();
    this._dragMode.set(currentMode === DragMode.Move ? DragMode.Copy : DragMode.Move);
    console.log('[NodeOperationsService] Toggled drag mode to:', this._dragMode(), { timestamp: new Date().toISOString() });
  }

  setDragMode(mode: DragMode): void {
    this._dragMode.set(mode);
    console.log('[NodeOperationsService] Set drag mode to:', mode, { timestamp: new Date().toISOString() });
  }

  // Convenience getters for checking current mode
  get isDragModeMove(): boolean {
    return this._dragMode() === DragMode.Move;
  }

  get isDragModeCopy(): boolean {
    return this._dragMode() === DragMode.Copy;
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

  // Move node operation (existing logic from CourseDataService)
  moveNode(event: NodeMovedEvent): Observable<boolean> {
    const { node, sourceParentId, sourceParentType, targetParentId, targetParentType, sourceCourseId, targetCourseId } = event;
    
    console.log(`[NodeOperationsService] Moving ${node.nodeType} ${this.getNodeTitle(node)} (ID: ${node.id})`, { 
      sourceParentType,
      sourceParentId,
      targetParentType,
      targetParentId,
      sourceCourseId,
      targetCourseId,
      timestamp: new Date().toISOString() 
    });
    
    // Handle special case: Topic moving between courses
    if (node.nodeType === 'Topic' && targetCourseId) {
      return this.apiService.moveTopic(node.id, targetCourseId).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully moved topic ${this.getNodeTitle(node)} between courses`, { 
            timestamp: new Date().toISOString() 
          });
          
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
        map(() => true), // Convert to boolean
        catchError(err => {
          console.error('[NodeOperationsService] Failed to move topic between courses:', err, { 
            timestamp: new Date().toISOString() 
          });
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
            targetTopicId,
            timestamp: new Date().toISOString()
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
        map(() => true), // Convert to boolean
        catchError(err => {
          console.error('[NodeOperationsService] Failed to move lesson:', err, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to move lesson: ' + err.message, 'Error');
          return of(false);
        })
      );
    }
    
    // Handle SubTopic moves (always to a Topic)
    if (node.nodeType === 'SubTopic' && targetParentType === 'Topic' && targetParentId) {
      return this.apiService.moveSubTopic(node.id, targetParentId).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully moved subtopic ${this.getNodeTitle(node)}`, { 
            timestamp: new Date().toISOString() 
          });
          
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
        map(() => true), // Convert to boolean
        catchError(err => {
          console.error('[NodeOperationsService] Failed to move subtopic:', err, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to move subtopic: ' + err.message, 'Error');
          return of(false);
        })
      );
    }
    
    // If we reach here, it's an unsupported move type
    console.error('[NodeOperationsService] Unsupported move operation', event, { timestamp: new Date().toISOString() });
    this.toastr.error('Unsupported move operation', 'Error');
    return of(false);
  }

  // Copy node operation - using correct API endpoints from Swagger
  copyNode(event: NodeCopyEvent): Observable<boolean> {
    const { node, sourceParentId, sourceParentType, targetParentId, targetParentType, sourceCourseId, targetCourseId } = event;
    
    console.log(`[NodeOperationsService] Copying ${node.nodeType} ${this.getNodeTitle(node)} (ID: ${node.id})`, { 
      sourceParentType,
      sourceParentId,
      targetParentType,
      targetParentId,
      sourceCourseId,
      targetCourseId,
      timestamp: new Date().toISOString() 
    });

    // Handle Topic copying - using the /api/Topic/copy endpoint
    if (node.nodeType === 'Topic' && targetCourseId) {
      // Based on Swagger, the copy endpoint likely takes a TopicMoveResource
      const copyPayload = {
        topicId: node.id,
        newCourseId: targetCourseId
      };
      
      return this.apiService.post('Topic/copy', copyPayload).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully copied topic ${this.getNodeTitle(node)} between courses`, { 
            timestamp: new Date().toISOString() 
          });
          
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
        map(() => true), // Convert to boolean
        catchError(err => {
          console.error('[NodeOperationsService] Failed to copy topic between courses:', err, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to copy topic: ' + err.message, 'Error');
          return of(false);
        })
      );
    }

    // Handle Lesson copying - using the /api/Lesson/copy endpoint
    if (node.nodeType === 'Lesson') {
      let targetSubTopicId: number | undefined = undefined;
      let targetTopicId: number | undefined = undefined;
      
      if (targetParentType === 'SubTopic') {
        targetSubTopicId = targetParentId;
      } else if (targetParentType === 'Topic') {
        targetTopicId = targetParentId;
      }
      
      // Based on Swagger, likely takes a LessonMoveResource
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
            targetTopicId,
            timestamp: new Date().toISOString()
          });
          
          // Show success message
          this.toastr.success(`Copied Lesson "${this.getNodeTitle(node)}" successfully`);
          
          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true), // Convert to boolean
        catchError(err => {
          console.error('[NodeOperationsService] Failed to copy lesson:', err, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to copy lesson: ' + err.message, 'Error');
          return of(false);
        })
      );
    }

    // Handle SubTopic copying - using the /api/SubTopic/copy endpoint
    if (node.nodeType === 'SubTopic' && targetParentType === 'Topic' && targetParentId) {
      // Based on Swagger, likely takes a SubTopicMoveResource
      const copyPayload = {
        subTopicId: node.id,
        newTopicId: targetParentId
      };
      
      return this.apiService.post('SubTopic/copy', copyPayload).pipe(
        tap(() => {
          console.log(`[NodeOperationsService] Successfully copied subtopic ${this.getNodeTitle(node)}`, { 
            timestamp: new Date().toISOString() 
          });
          
          // Show success message
          this.toastr.success(`Copied SubTopic "${this.getNodeTitle(node)}" successfully`);
          
          // Reload courses to get fresh data
          this.courseCrudService.loadCourses().subscribe();
        }),
        map(() => true), // Convert to boolean
        catchError(err => {
          console.error('[NodeOperationsService] Failed to copy subtopic:', err, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to copy subtopic: ' + err.message, 'Error');
          return of(false);
        })
      );
    }
    
    // If we reach here, it's an unsupported copy type
    console.error('[NodeOperationsService] Unsupported copy operation', event, { timestamp: new Date().toISOString() });
    this.toastr.error('Unsupported copy operation', 'Error');
    return of(false);
  }
}