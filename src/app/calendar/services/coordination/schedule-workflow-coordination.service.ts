// **COMPLETE FILE** - ScheduleWorkflowCoordinationService - Facade Methods & Workflow Coordination
// RESPONSIBILITY: Business workflow coordination and facade patterns only
// DOES NOT: Handle direct Observable event emission or UI feedback implementation
// CALLED BY: Components for schedule workflow operations

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, of, throwError, Subscription } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { ScheduleWorkflowBusinessService, WorkflowResult } from '../business/schedule-workflow-business.service';
import { ScheduleEventCoordinationService, LessonIntegrationEvent } from './schedule-event-coordination.service';
import { LessonDetail } from '../../../models/lesson';
import {ScheduleUIFeedbackService} from '../ui/schedule-ui-feedback.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduleWorkflowCoordinationService implements OnDestroy {

  private subscriptions: Subscription[] = [];

  constructor(
    private businessService: ScheduleWorkflowBusinessService,
    private eventCoordination: ScheduleEventCoordinationService,
    private uiFeedback: ScheduleUIFeedbackService
  ) {
    console.log('[ScheduleWorkflowCoordinationService] Workflow coordination with clean service delegation');
    this.setupLessonIntegrationSubscription();
  }

  // === LESSON INTEGRATION COORDINATION ===

  private setupLessonIntegrationSubscription(): void {
    const lessonIntegrationSub = this.eventCoordination.lessonIntegrationCompleted$.subscribe(
      (event: LessonIntegrationEvent) => {
        if (event.reason === 'Lesson created - evaluation needed') {
          this.handleLessonCreationWithCoordination(event.lesson);
        }
      }
    );
    this.subscriptions.push(lessonIntegrationSub);
  }

  private handleLessonCreationWithCoordination(lesson: LessonDetail): void {
    console.log('📋 [ScheduleWorkflowCoordinationService] === LESSON INTEGRATION START ===', {
      lessonTitle: lesson.title,
      lessonId: lesson.id,
      courseId: lesson.courseId,
      timestamp: new Date().toISOString()
    });

    // Evaluate integration using business service
    const decision = this.businessService.evaluateLessonIntegration(lesson);

    if (!decision.shouldIntegrate) {
      console.log(`❌ [ScheduleWorkflowCoordinationService] ${decision.reason} - skipping schedule integration`);

      // ✅ Emit integration event with reason
      this.eventCoordination.emitLessonIntegrationCompleted({
        lesson,
        integrationSuccess: false,
        scheduleUpdated: false,
        reason: decision.reason,
        timestamp: new Date()
      });
      return;
    }

    console.log('✅ [ScheduleWorkflowCoordinationService] All conditions met - TRIGGERING SCHEDULE REGENERATION');

    this.regenerateScheduleWithCoordination('lesson-added', lesson.courseId, lesson.id);

    console.log('📋 [ScheduleWorkflowCoordinationService] === LESSON INTEGRATION END ===');
  }

  private regenerateScheduleWithCoordination(
    trigger: 'lesson-added' | 'manual' | 'configuration-change' = 'manual',
    courseId?: number,
    lessonId?: number
  ): void {
    console.log('[ScheduleWorkflowCoordinationService] Regenerating schedule with coordination', {
      trigger,
      courseId,
      lessonId
    });

    this.businessService.regenerateSchedule().subscribe({
      next: (result: WorkflowResult) => {
        if (result.success) {
          this.uiFeedback.showRegenerationSuccess();
          console.log('[ScheduleWorkflowCoordinationService] Schedule regenerated and saved');

          // ✅ Emit successful regeneration event
          this.eventCoordination.emitRegenerationCompleted({
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
            this.eventCoordination.emitLessonIntegrationCompleted({
              lesson,
              integrationSuccess: true,
              scheduleUpdated: true,
              timestamp: new Date()
            });

            this.uiFeedback.showLessonIntegrationSuccess();
          }
        } else {
          this.uiFeedback.showRegenerationError();
          console.error('[ScheduleWorkflowCoordinationService] Failed to regenerate schedule:', result.error?.message);

          // ✅ Emit failed regeneration event
          this.eventCoordination.emitRegenerationCompleted({
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
            this.eventCoordination.emitLessonIntegrationCompleted({
              lesson,
              integrationSuccess: false,
              scheduleUpdated: false,
              error: result.error,
              timestamp: new Date()
            });

            this.uiFeedback.showLessonIntegrationWarning();
          }
        }
      },
      error: (error: any) => {
        this.uiFeedback.showRegenerationError();
        console.error('[ScheduleWorkflowCoordinationService] Regeneration failed:', error);

        // ✅ Emit failed regeneration event
        this.eventCoordination.emitRegenerationCompleted({
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

  // === FACADE METHODS - Maintain backward compatibility ===

  /**
   * FACADE: Generate schedule with Observable return (delegates to business service)
   */
  generateAndSetSchedule(): Observable<void> {
    console.log('[ScheduleWorkflowCoordinationService] FACADE: generateAndSetSchedule - delegating to business service');

    const result = this.businessService.generateSchedule();

    if (result.success) {
      this.uiFeedback.showGenerationSuccess();

      // ✅ Emit workflow event
      this.eventCoordination.emitWorkflowCompleted({
        operation: 'generation',
        success: true,
        scheduleId: result.scheduleId,
        configurationId: result.configurationId,
        eventCount: result.eventCount,
        timestamp: new Date()
      });

      return of(void 0);
    } else {
      this.uiFeedback.showGenerationError(result.error?.message);

      // ✅ Emit workflow event
      this.eventCoordination.emitWorkflowCompleted({
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
    console.log('[ScheduleWorkflowCoordinationService] FACADE: saveCurrentSchedule - delegating to business service');

    return this.businessService.saveSchedule().pipe(
      tap((result: WorkflowResult) => {
        if (result.success) {
          this.uiFeedback.showSaveSuccess();

          // ✅ Emit workflow event
          this.eventCoordination.emitWorkflowCompleted({
            operation: 'save',
            success: true,
            scheduleId: result.scheduleId,
            eventCount: result.eventCount,
            timestamp: new Date()
          });
        } else {
          this.uiFeedback.showSaveError();

          // ✅ Emit workflow event
          this.eventCoordination.emitWorkflowCompleted({
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
    console.log('[ScheduleWorkflowCoordinationService] FACADE: loadActiveScheduleWithConfiguration - delegating to business service');

    return this.businessService.loadActiveScheduleWithConfiguration().pipe(
      tap((result: WorkflowResult) => {
        if (result.success) {
          this.uiFeedback.showLoadSuccess(result.message);

          // ✅ Emit workflow event
          this.eventCoordination.emitWorkflowCompleted({
            operation: 'load',
            success: true,
            scheduleId: result.scheduleId,
            configurationId: result.configurationId,
            eventCount: result.eventCount,
            timestamp: new Date()
          });
        } else {
          // ✅ Emit workflow event for failed load
          this.eventCoordination.emitWorkflowCompleted({
            operation: 'load',
            success: false,
            error: result.error,
            timestamp: new Date()
          });
        }
      }),
      map((result: WorkflowResult) => result.success),
      catchError((error: any) => {
        this.uiFeedback.showLoadError();

        // ✅ Emit workflow event
        this.eventCoordination.emitWorkflowCompleted({
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
    console.log('[ScheduleWorkflowCoordinationService] FACADE: executeConfigurationSaveWorkflow - delegating to business service');

    const workflowSteps: ('load' | 'generate' | 'save')[] = ['load', 'generate', 'save'];

    return this.businessService.executeConfigurationWorkflow(configurationId).pipe(
      tap((result) => {
        if (result.success) {
          this.uiFeedback.showWorkflowSuccess();

          // ✅ Emit configuration workflow event
          this.eventCoordination.emitConfigurationWorkflowCompleted({
            configurationId,
            workflowSteps,
            completedSteps: result.completedSteps,
            success: true,
            timestamp: new Date()
          });
        } else {
          this.uiFeedback.showWorkflowError();

          // ✅ Emit configuration workflow event
          this.eventCoordination.emitConfigurationWorkflowCompleted({
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
    console.log('[ScheduleWorkflowCoordinationService] FACADE: regenerateSchedule - delegating to business service');

    return this.businessService.regenerateSchedule().pipe(
      tap((result: WorkflowResult) => {
        if (result.success) {
          this.uiFeedback.showRegenerationSuccess();

          // ✅ Emit regeneration event
          this.eventCoordination.emitRegenerationCompleted({
            trigger,
            courseId,
            lessonId,
            success: true,
            eventCount: result.eventCount || 0,
            timestamp: new Date()
          });
        } else {
          this.uiFeedback.showRegenerationError();

          // ✅ Emit regeneration event
          this.eventCoordination.emitRegenerationCompleted({
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

  // === CLEANUP ===

  ngOnDestroy(): void {
    console.log('[ScheduleWorkflowCoordinationService] Cleaning up subscriptions');
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
}
