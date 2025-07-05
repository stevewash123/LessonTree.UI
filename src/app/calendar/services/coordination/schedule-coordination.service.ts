// **COMPLETE FILE** - ScheduleCoordinationService - Observable Events & Cross-Service Coordination
// RESPONSIBILITY: Observable event management and cross-service coordination for schedule workflows
// SCOPE: Observable patterns and event emission only (business logic in separate service)
// RATIONALE: Event coordination separated from workflow business logic for maintainability

import { Injectable, OnDestroy } from '@angular/core';
import {Observable, of, Subject, Subscription, throwError} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';

import { ScheduleWorkflowBusinessService, WorkflowResult } from '../business/schedule-workflow-business.service';
import { CourseSignalService } from '../../../lesson-tree/services/course-data/course-signal.service';
import { LessonDetail } from '../../../models/lesson';
import { EntitySignalPayload } from '../../../lesson-tree/services/course-data/course-signal.service';
import {catchError, map, tap} from 'rxjs/operators';

// ✅ Observable event interfaces for cross-component coordination
export interface ScheduleWorkflowEvent {
  operation: 'generation' | 'save' | 'load' | 'regeneration';
  success: boolean;
  scheduleId?: number;
  configurationId?: number;
  eventCount?: number;
  error?: Error;
  timestamp: Date;
}

export interface ConfigurationWorkflowEvent {
  configurationId: number;
  workflowSteps: ('load' | 'generate' | 'save')[];
  completedSteps: string[];
  success: boolean;
  error?: Error;
  timestamp: Date;
}

export interface ScheduleRegenerationEvent {
  trigger: 'lesson-added' | 'manual' | 'configuration-change';
  courseId?: number;
  lessonId?: number;
  lessonTitle?: string;
  success: boolean;
  eventCount: number;
  error?: Error;
  timestamp: Date;
}

export interface LessonIntegrationEvent {
  lesson: LessonDetail;
  integrationSuccess: boolean;
  scheduleUpdated: boolean;
  reason?: string;
  error?: Error;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleCoordinationService implements OnDestroy {

  // ✅ Observable events for cross-component coordination
  private readonly _workflowCompleted$ = new Subject<ScheduleWorkflowEvent>();
  private readonly _configurationWorkflowCompleted$ = new Subject<ConfigurationWorkflowEvent>();
  private readonly _regenerationCompleted$ = new Subject<ScheduleRegenerationEvent>();
  private readonly _lessonIntegrationCompleted$ = new Subject<LessonIntegrationEvent>();


  // ✅ Subscription management
  private subscriptions: Subscription[] = [];

  constructor(
    private businessService: ScheduleWorkflowBusinessService,
    private courseSignalService: CourseSignalService,
    private snackBar: MatSnackBar,
    private toastr: ToastrService
  ) {
    console.log('[ScheduleCoordinationService] Observable coordination patterns for schedule workflows');
    this.setupCrossServiceSubscriptions();
  }

  // === CROSS-SERVICE SUBSCRIPTIONS ===

  private setupCrossServiceSubscriptions(): void {
    console.log('[ScheduleCoordinationService] Setting up cross-service subscriptions');

    // ✅ Subscribe to lesson added events for integration workflow
    const lessonAddedSub = this.courseSignalService.entityAdded$.subscribe((entityAddedEvent: EntitySignalPayload) => {
      console.log('🔄 [ScheduleCoordinationService] === OBSERVABLE EVENT RECEIVED ===', {
        eventType: 'entityAdded',
        entityType: entityAddedEvent.entity.entityType,
        entityId: entityAddedEvent.entity.id,
        nodeTitle: entityAddedEvent.entity.title,
        source: entityAddedEvent.source,
        operationType: entityAddedEvent.operationType,
        timestamp: entityAddedEvent.timestamp.toISOString()
      });

      if (entityAddedEvent.entity.entityType === 'Lesson' && entityAddedEvent.source === 'infopanel') {
        console.log('🎯 [ScheduleCoordinationService] PROCESSING lesson event - checking for schedule integration');
        this.handleLessonCreationWithCoordination(entityAddedEvent.entity as LessonDetail);
      } else {
        console.log('🔄 [ScheduleCoordinationService] IGNORING event - not lesson from infopanel');
      }
    });

    this.subscriptions.push(lessonAddedSub);
    console.log('[ScheduleCoordinationService] Cross-service subscriptions setup complete');
  }

  // === COORDINATED OPERATIONS ===

  private handleLessonCreationWithCoordination(lesson: LessonDetail): void {
    console.log('📋 [ScheduleCoordinationService] === LESSON INTEGRATION START ===', {
      lessonTitle: lesson.title,
      lessonId: lesson.id,
      courseId: lesson.courseId,
      timestamp: new Date().toISOString()
    });

    // Evaluate integration using business service
    const decision = this.businessService.evaluateLessonIntegration(lesson);

    if (!decision.shouldIntegrate) {
      console.log(`❌ [ScheduleCoordinationService] ${decision.reason} - skipping schedule integration`);

      // ✅ Emit integration event with reason
      this._lessonIntegrationCompleted$.next({
        lesson,
        integrationSuccess: false,
        scheduleUpdated: false,
        reason: decision.reason,
        timestamp: new Date()
      });
      return;
    }

    console.log('✅ [ScheduleCoordinationService] All conditions met - TRIGGERING SCHEDULE REGENERATION');

    this.regenerateScheduleWithCoordination('lesson-added', lesson.courseId, lesson.id);

    console.log('📋 [ScheduleCoordinationService] === LESSON INTEGRATION END ===');
  }

  regenerateScheduleWithCoordination(
    trigger: 'lesson-added' | 'manual' | 'configuration-change' = 'manual',
    courseId?: number,
    lessonId?: number
  ): void {
    console.log('[ScheduleCoordinationService] Regenerating schedule with coordination', {
      trigger,
      courseId,
      lessonId
    });

    this.businessService.regenerateSchedule().subscribe({
      next: (result: WorkflowResult) => {
        if (result.success) {
          this.snackBar.open('Schedule regenerated successfully', 'Close', { duration: 3000 });
          console.log('[ScheduleCoordinationService] Schedule regenerated and saved');

          // ✅ Emit successful regeneration event
          this._regenerationCompleted$.next({
            trigger,
            courseId,
            lessonId,
            success: true,
            eventCount: result.eventCount || 0,
            timestamp: new Date()
          });

          // ✅ Also emit successful lesson integration if triggered by lesson
          if (trigger === 'lesson-added' && lessonId) {
            const lesson = { id: lessonId, courseId: courseId!, title: 'Unknown' } as LessonDetail;
            this._lessonIntegrationCompleted$.next({
              lesson,
              integrationSuccess: true,
              scheduleUpdated: true,
              timestamp: new Date()
            });

            this.toastr.success(
              `Schedule updated with new lesson`,
              'Schedule Integration'
            );
          }
        } else {
          this.toastr.error('Failed to regenerate schedule', 'Error');
          console.error('[ScheduleCoordinationService] Failed to regenerate schedule:', result.error?.message);

          // ✅ Emit failed regeneration event
          this._regenerationCompleted$.next({
            trigger,
            courseId,
            lessonId,
            success: false,
            eventCount: 0,
            error: result.error,
            timestamp: new Date()
          });

          // ✅ Also emit failed lesson integration if triggered by lesson
          if (trigger === 'lesson-added' && lessonId) {
            const lesson = { id: lessonId, courseId: courseId!, title: 'Unknown' } as LessonDetail;
            this._lessonIntegrationCompleted$.next({
              lesson,
              integrationSuccess: false,
              scheduleUpdated: false,
              error: result.error,
              timestamp: new Date()
            });

            this.toastr.warning(
              `New lesson created but schedule update failed`,
              'Schedule Integration Warning'
            );
          }
        }
      },
      error: (error: any) => {
        this.toastr.error('Failed to regenerate schedule', 'Error');
        console.error('[ScheduleCoordinationService] Regeneration failed:', error);

        // ✅ Emit failed regeneration event
        this._regenerationCompleted$.next({
          trigger,
          courseId,
          lessonId,
          success: false,
          eventCount: 0,
          error,
          timestamp: new Date()
        });
      }
    });
  }


  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[ScheduleCoordinationService] Cleaning up Observable subjects and subscriptions');

    // ✅ Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // ✅ Complete Observable subjects
    this._workflowCompleted$.complete();
    this._configurationWorkflowCompleted$.complete();
    this._regenerationCompleted$.complete();
    this._lessonIntegrationCompleted$.complete();

    console.log('[ScheduleCoordinationService] All Observable subjects and subscriptions completed');
  }

// === FACADE METHODS - Maintain backward compatibility ===

  /**
   * FACADE: Generate schedule with Observable return (delegates to business service)
   */
  generateAndSetSchedule(): Observable<void> {
    console.log('[ScheduleCoordinationService] FACADE: generateAndSetSchedule - delegating to business service');

    const result = this.businessService.generateSchedule();

    if (result.success) {
      this.snackBar.open('Schedule generated successfully', 'Close', { duration: 3000 });

      // ✅ Emit workflow event
      this._workflowCompleted$.next({
        operation: 'generation',
        success: true,
        scheduleId: result.scheduleId,
        configurationId: result.configurationId,
        eventCount: result.eventCount,
        timestamp: new Date()
      });

      return of(void 0);
    } else {
      this.toastr.error(result.error?.message || 'Schedule generation failed', 'Generation Error');

      // ✅ Emit workflow event
      this._workflowCompleted$.next({
        operation: 'generation',
        success: false,
        error: result.error,
        timestamp: new Date()
      });

      return throwError(() => result.error || new Error('Schedule generation failed'));
    }
  }

  /**
   * FACADE: Save schedule with Observable return (delegates to business service)
   */
  saveCurrentSchedule(): Observable<void> {
    console.log('[ScheduleCoordinationService] FACADE: saveCurrentSchedule - delegating to business service');

    return this.businessService.saveSchedule().pipe(
      tap((result: WorkflowResult) => {
        if (result.success) {
          this.snackBar.open('Schedule saved successfully', 'Close', { duration: 3000 });

          // ✅ Emit workflow event
          this._workflowCompleted$.next({
            operation: 'save',
            success: true,
            scheduleId: result.scheduleId,
            eventCount: result.eventCount,
            timestamp: new Date()
          });
        } else {
          this.toastr.error('Failed to save schedule', 'Save Error');

          // ✅ Emit workflow event
          this._workflowCompleted$.next({
            operation: 'save',
            success: false,
            scheduleId: result.scheduleId,
            error: result.error,
            timestamp: new Date()
          });

          throw result.error || new Error('Failed to save schedule');
        }
      }),
      map(() => void 0)
    );
  }

  /**
   * FACADE: Load schedule with Observable return (delegates to business service)
   */
  loadActiveScheduleWithConfiguration(): Observable<boolean> {
    console.log('[ScheduleCoordinationService] FACADE: loadActiveScheduleWithConfiguration - delegating to business service');

    return this.businessService.loadActiveScheduleWithConfiguration().pipe(
      tap((result: WorkflowResult) => {
        if (result.success) {
          if (result.message) {
            this.snackBar.open(result.message, 'Close', { duration: 3000 });
          }

          // ✅ Emit workflow event
          this._workflowCompleted$.next({
            operation: 'load',
            success: true,
            scheduleId: result.scheduleId,
            configurationId: result.configurationId,
            eventCount: result.eventCount,
            timestamp: new Date()
          });
        } else {
          // ✅ Emit workflow event for failed load
          this._workflowCompleted$.next({
            operation: 'load',
            success: false,
            error: result.error,
            timestamp: new Date()
          });
        }
      }),
      map((result: WorkflowResult) => result.success),
      catchError((error: any) => {
        this.toastr.error('Failed to load schedule', 'Loading Error');

        // ✅ Emit workflow event
        this._workflowCompleted$.next({
          operation: 'load',
          success: false,
          error,
          timestamp: new Date()
        });

        return of(false);
      })
    );
  }

  /**
   * FACADE: Execute configuration workflow with Observable return (delegates to business service)
   */
  executeConfigurationSaveWorkflow(configurationId: number): Observable<void> {
    console.log('[ScheduleCoordinationService] FACADE: executeConfigurationSaveWorkflow - delegating to business service');

    const workflowSteps: ('load' | 'generate' | 'save')[] = ['load', 'generate', 'save'];

    return this.businessService.executeConfigurationWorkflow(configurationId).pipe(
      tap((result) => {
        if (result.success) {
          this.toastr.success('Configuration workflow completed successfully', 'Success');

          // ✅ Emit configuration workflow event
          this._configurationWorkflowCompleted$.next({
            configurationId,
            workflowSteps,
            completedSteps: result.completedSteps,
            success: true,
            timestamp: new Date()
          });
        } else {
          this.toastr.error('Configuration workflow failed', 'Error');

          // ✅ Emit configuration workflow event
          this._configurationWorkflowCompleted$.next({
            configurationId,
            workflowSteps,
            completedSteps: result.completedSteps,
            success: false,
            error: result.error,
            timestamp: new Date()
          });

          throw result.error || new Error('Configuration workflow failed');
        }
      }),
      map(() => void 0)
    );
  }

  /**
   * FACADE: Regenerate schedule with Observable return (delegates to business service)
   */
  regenerateSchedule(
    trigger: 'lesson-added' | 'manual' | 'configuration-change' = 'manual',
    courseId?: number,
    lessonId?: number
  ): Observable<void> {
    console.log('[ScheduleCoordinationService] FACADE: regenerateSchedule - delegating to business service');

    return this.businessService.regenerateSchedule().pipe(
      tap((result: WorkflowResult) => {
        if (result.success) {
          this.snackBar.open('Schedule regenerated successfully', 'Close', { duration: 3000 });

          // ✅ Emit regeneration event
          this._regenerationCompleted$.next({
            trigger,
            courseId,
            lessonId,
            success: true,
            eventCount: result.eventCount || 0,
            timestamp: new Date()
          });
        } else {
          this.toastr.error('Failed to regenerate schedule', 'Error');

          // ✅ Emit regeneration event
          this._regenerationCompleted$.next({
            trigger,
            courseId,
            lessonId,
            success: false,
            eventCount: 0,
            error: result.error,
            timestamp: new Date()
          });

          throw result.error || new Error('Failed to regenerate schedule');
        }
      }),
      map(() => void 0)
    );
  }


}
