// **COMPLETE FILE** - CourseCrudCoordinationService - Observable Events & Cross-Service Coordination
// RESPONSIBILITY: Observable event management, cross-service coordination, user feedback
// DOES NOT: Handle direct HTTP operations (delegates to CourseCrudBusinessService)
// CALLED BY: InfoPanel components and coordination-aware operations

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { CourseCrudBusinessService } from '../business/course-crud-business.service';
import { CourseStateCoordinationService } from '../course-operations/course-state-coordination.service';
import { Course } from '../../../models/course';
import { Topic } from '../../../models/topic';
import { SubTopic } from '../../../models/subTopic';
import { LessonDetail } from '../../../models/lesson';

// ✅ Event interfaces for all entity operations
export interface EntitySaveCompletedEvent<T> {
  operation: 'create' | 'update';
  entity: T;
  entityType: string;
  timestamp: Date;
}

export interface EntitySaveErrorEvent {
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  error: Error;
  timestamp: Date;
}

// Specific event types for type safety
export type CourseSaveCompletedEvent = EntitySaveCompletedEvent<Course>;
export type TopicSaveCompletedEvent = EntitySaveCompletedEvent<Topic>;
export type SubTopicSaveCompletedEvent = EntitySaveCompletedEvent<SubTopic>;

export interface LessonSaveCompletedEvent {
  operation: 'create' | 'update';
  lesson: LessonDetail;  // Components expect 'lesson' not 'entity'
  timestamp: Date;
}

export interface LessonSaveErrorEvent {
  operation: 'create' | 'update' | 'delete';  // ✅ Fixed: Added 'delete'
  error: Error;
  timestamp: Date;
}

// ✅ Cross-service coordination event
export interface CrudCoordinationEvent {
  coordinationType: 'post-creation' | 'post-update' | 'post-deletion';
  triggerEvent: string;
  sourceService: string;
  coordinationAction: string;
  entityDetails: {
    entityType: string;
    entityId: number;
    entityTitle: string;
  };
  success: boolean;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CourseCrudCoordinationService implements OnDestroy {

  // ✅ Observable event emissions for all entity types
  private readonly _courseSaveCompleted = new Subject<CourseSaveCompletedEvent>();
  private readonly _courseSaveError = new Subject<EntitySaveErrorEvent>();

  private readonly _topicSaveCompleted = new Subject<TopicSaveCompletedEvent>();
  private readonly _topicSaveError = new Subject<EntitySaveErrorEvent>();

  private readonly _subTopicSaveCompleted = new Subject<SubTopicSaveCompletedEvent>();
  private readonly _subTopicSaveError = new Subject<EntitySaveErrorEvent>();

  private readonly _lessonSaveCompleted = new Subject<LessonSaveCompletedEvent>();
  private readonly _lessonSaveError = new Subject<LessonSaveErrorEvent>();

  // ✅ Cross-service coordination events
  private readonly _crudCoordinated = new Subject<CrudCoordinationEvent>();

  // Public observables
  readonly courseSaveCompleted$ = this._courseSaveCompleted.asObservable();
  readonly courseSaveError$ = this._courseSaveError.asObservable();
  readonly topicSaveCompleted$ = this._topicSaveCompleted.asObservable();
  readonly topicSaveError$ = this._topicSaveError.asObservable();
  readonly subTopicSaveCompleted$ = this._subTopicSaveCompleted.asObservable();
  readonly subTopicSaveError$ = this._subTopicSaveError.asObservable();
  readonly lessonSaveCompleted$ = this._lessonSaveCompleted.asObservable();
  readonly lessonSaveError$ = this._lessonSaveError.asObservable();
  readonly crudCoordinated$ = this._crudCoordinated.asObservable();

  // ✅ Subscription management for Observable consumption
  private subscriptions = new Subscription();

  constructor(
    private businessService: CourseCrudBusinessService,
    private courseStateCoordination: CourseStateCoordinationService,
    private toastr: ToastrService
  ) {
    console.log('[CourseCrudCoordinationService] Enhanced with Observable coordination patterns');
    this.setupObservableConsumption();
  }

  // ✅ Observable consumption setup for cross-service coordination
  private setupObservableConsumption(): void {
    console.log('[CourseCrudCoordinationService] Setting up Observable consumption for cross-service coordination');

    // ✅ Consume CourseStateCoordinationService events
    this.subscriptions.add(
      this.courseStateCoordination.coordinationCompleted$.subscribe((event: any) => {
        console.log('[CourseCrudCoordinationService] Received coordination completed event', {
          operation: event.operation,
          entityType: event.entityType,
          entityId: event.entityId,
          success: event.success
        });

        this.handleCoordinationCompleted(event);
      })
    );

    this.subscriptions.add(
      this.courseStateCoordination.validationCompleted$.subscribe((event: any) => {
        console.log('[CourseCrudCoordinationService] Received validation completed event', {
          validationType: event.validationType,
          entityType: event.entityType,
          success: event.success
        });

        this.handleValidationCompleted(event);
      })
    );

    this.subscriptions.add(
      this.courseStateCoordination.workflowCoordinated$.subscribe((event: any) => {
        console.log('[CourseCrudCoordinationService] Received workflow coordinated event', {
          workflowType: event.workflowType,
          coordinationAction: event.coordinationAction,
          success: event.success
        });

        this.handleWorkflowCoordinated(event);
      })
    );

    console.log('[CourseCrudCoordinationService] Observable consumption setup complete - monitoring 3 coordination streams');
  }

  // ✅ Coordination event handlers
  private handleCoordinationCompleted(event: any): void {
    try {
      const coordinationActions: string[] = [];

      if (event.success && event.operation === 'create') {
        coordinationActions.push('refresh-entity-cache');
        coordinationActions.push('update-ui-state');

        // Example: Trigger data refresh after successful creation
        if (event.entityType === 'Course') {
          coordinationActions.push('refresh-course-list');
        }
      }

      if (event.success && event.operation === 'update') {
        coordinationActions.push('validate-entity-relationships');
        coordinationActions.push('update-dependent-views');
      }

      // ✅ Emit coordination event
      this._crudCoordinated.next({
        coordinationType: `post-${event.operation}` as any,
        triggerEvent: 'coordination-completed',
        sourceService: 'CourseStateCoordinationService',
        coordinationAction: coordinationActions.join(', '),
        entityDetails: {
          entityType: event.entityType,
          entityId: event.entityId,
          entityTitle: event.entityTitle
        },
        success: true,
        timestamp: new Date()
      });

      console.log('[CourseCrudCoordinationService] Coordination completed handling finished', {
        entityType: event.entityType,
        actions: coordinationActions
      });

    } catch (error) {
      console.error('[CourseCrudCoordinationService] Error handling coordination completed:', error);
    }
  }

  private handleValidationCompleted(event: any): void {
    try {
      if (!event.success && event.validationType === 'parent-container') {
        console.warn('[CourseCrudCoordinationService] Parent container validation failed', {
          entityType: event.entityType,
          entityId: event.entityId,
          error: event.error
        });

        // User feedback for validation errors
        this.toastr.warning(`Validation issue: ${event.error}`, 'Validation Warning');
      }

      // ✅ Emit coordination event
      this._crudCoordinated.next({
        coordinationType: 'post-creation',
        triggerEvent: 'validation-completed',
        sourceService: 'CourseStateCoordinationService',
        coordinationAction: event.success ? 'validation-passed' : 'validation-failed',
        entityDetails: {
          entityType: event.entityType,
          entityId: event.entityId || 0,
          entityTitle: 'Validation Target'
        },
        success: event.success,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('[CourseCrudCoordinationService] Error handling validation completed:', error);
    }
  }

  private handleWorkflowCoordinated(event: any): void {
    try {
      console.log('[CourseCrudCoordinationService] Processing workflow coordination', {
        workflowType: event.workflowType,
        entityType: event.entityDetails.entityType,
        coordinationAction: event.coordinationAction
      });

      // Example: Could trigger additional CRUD operations based on workflow coordination
      if (event.workflowType === 'entity-added' && event.success) {
        // Could refresh related data, update caches, etc.
      }

      // ✅ Emit coordination event
      this._crudCoordinated.next({
        coordinationType: 'post-creation',
        triggerEvent: 'workflow-coordinated',
        sourceService: 'CourseStateCoordinationService',
        coordinationAction: `processed-${event.coordinationAction}`,
        entityDetails: event.entityDetails,
        success: event.success,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('[CourseCrudCoordinationService] Error handling workflow coordinated:', error);
    }
  }

  // === COURSE OPERATIONS WITH EVENTS ===


  // === LESSON OPERATIONS WITH EVENTS ===

  /**
   * ✅ Enhanced: Create lesson with Observable event emission and error handling
   */
  createLessonWithEvents(lessonDetail: LessonDetail): void {
    console.log('[CourseCrudCoordinationService] Creating lesson with events');

    this.businessService.createLesson(lessonDetail).subscribe({
      next: (createdLesson: LessonDetail) => {
        this._lessonSaveCompleted.next({
          operation: 'create',
          lesson: createdLesson,  // ✅ Use 'lesson' property for component compatibility
          timestamp: new Date()
        });
      },
      error: (err: Error) => {
        this.toastr.error(`Failed to create lesson: ${err.message}`, 'Error');
        this._lessonSaveError.next({
          operation: 'create',
          error: err,
          timestamp: new Date()
        });
      }
    });
  }

  updateLessonWithEvents(lessonDetail: LessonDetail): void {
    console.log('[CourseCrudCoordinationService] Updating lesson with events');

    this.businessService.updateLesson(lessonDetail).subscribe({
      next: (updatedLesson: LessonDetail) => {
        this._lessonSaveCompleted.next({
          operation: 'update',
          lesson: updatedLesson,  // ✅ Use 'lesson' property for component compatibility
          timestamp: new Date()
        });
      },
      error: (err: Error) => {
        this.toastr.error(`Failed to update lesson: ${err.message}`, 'Error');
        this._lessonSaveError.next({
          operation: 'update',
          error: err,
          timestamp: new Date()
        });
      }
    });
  }

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[CourseCrudCoordinationService] Cleaning up Observable subscriptions and subjects');

    // ✅ Clean up subscriptions
    this.subscriptions.unsubscribe();

    // ✅ Complete subjects
    this._courseSaveCompleted.complete();
    this._courseSaveError.complete();
    this._topicSaveCompleted.complete();
    this._topicSaveError.complete();
    this._subTopicSaveCompleted.complete();
    this._subTopicSaveError.complete();
    this._lessonSaveCompleted.complete();
    this._lessonSaveError.complete();
    this._crudCoordinated.complete();

    console.log('[CourseCrudCoordinationService] All Observable subjects and subscriptions completed');
  }
}
