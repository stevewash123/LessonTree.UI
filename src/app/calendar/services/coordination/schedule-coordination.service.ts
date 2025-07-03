// **COMPLETE FILE** - ScheduleCoordinationService with dual Signal/Observable pattern
// RESPONSIBILITY: Business logic orchestration for schedule workflows with Observable events
// DOES NOT: Handle HTTP operations, form management, or calendar display - pure workflow coordination
// CALLED BY: ScheduleConfigService, CalendarCoordinationService, lesson-calendar.component

import { Injectable } from '@angular/core';
import { Observable, Subject, of, throwError } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { SchedulePersistenceService } from '../ui/schedule-persistence.service';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleGenerationService } from '../business/schedule-generation.service';
import { ScheduleValidationService } from '../business/schedule-validation.service';
import { ScheduleConfigurationApiService } from '../../../schedule-config/schedule-config-api.service';
import { CourseDataService } from '../../../lesson-tree/services/course-data/course-data.service';
import { LessonDetail } from '../../../models/lesson';
import { CourseSignalService } from '../../../lesson-tree/services/course-data/course-signal.service';

// ✅ Observable event interfaces following CourseCrudService pattern
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
export class ScheduleCoordinationService {

  // ✅ Observable event emissions following established pattern
  private readonly _workflowCompleted$ = new Subject<ScheduleWorkflowEvent>();
  private readonly _configurationWorkflowCompleted$ = new Subject<ConfigurationWorkflowEvent>();
  private readonly _regenerationCompleted$ = new Subject<ScheduleRegenerationEvent>();
  private readonly _lessonIntegrationCompleted$ = new Subject<LessonIntegrationEvent>();

  // Public observables
  readonly workflowCompleted$ = this._workflowCompleted$.asObservable();
  readonly configurationWorkflowCompleted$ = this._configurationWorkflowCompleted$.asObservable();
  readonly regenerationCompleted$ = this._regenerationCompleted$.asObservable();
  readonly lessonIntegrationCompleted$ = this._lessonIntegrationCompleted$.asObservable();

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleGenerationService: ScheduleGenerationService,
    private schedulePersistenceService: SchedulePersistenceService,
    private scheduleValidationService: ScheduleValidationService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private scheduleConfigApi: ScheduleConfigurationApiService,
    private courseDataService: CourseDataService,
    private courseSignalService: CourseSignalService,
    private snackBar: MatSnackBar,
    private toastr: ToastrService
  ) {
    console.log('[ScheduleCoordinationService] Enhanced with comprehensive Observable events');

    // ✅ Observable subscription for lesson integration workflow
    this.courseSignalService.nodeAdded$.subscribe(nodeAddedEvent => {
      console.log('🔄 [ScheduleCoordinationService] === OBSERVABLE EVENT RECEIVED ===', {
        eventType: 'nodeAdded',
        nodeType: nodeAddedEvent.node.nodeType,
        nodeId: nodeAddedEvent.node.nodeId,
        nodeTitle: nodeAddedEvent.node.title,
        source: nodeAddedEvent.source,
        operationType: nodeAddedEvent.operationType,
        timestamp: nodeAddedEvent.timestamp.toISOString()
      });

      if (nodeAddedEvent.node.nodeType === 'Lesson' && nodeAddedEvent.source === 'infopanel') {
        console.log('🎯 [ScheduleCoordinationService] PROCESSING lesson event - checking for schedule integration');
        this.reactToLessonCreation(nodeAddedEvent.node as LessonDetail);
      } else {
        console.log('🔄 [ScheduleCoordinationService] IGNORING event - not lesson from infopanel');
      }
    });
  }

  // === LESSON CREATION INTEGRATION ===

  /**
   * ✅ Enhanced lesson integration with Observable event emission
   */
  private reactToLessonCreation(lesson: LessonDetail): void {
    console.log('📋 [ScheduleCoordinationService] === LESSON INTEGRATION START ===', {
      lessonTitle: lesson.title,
      lessonId: lesson.id,
      courseId: lesson.courseId,
      timestamp: new Date().toISOString()
    });

    const activeConfig = this.scheduleConfigurationStateService.getActiveConfiguration();
    if (!activeConfig) {
      console.log('❌ [ScheduleCoordinationService] No active configuration - skipping schedule integration');

      // ✅ Emit integration event with reason
      this._lessonIntegrationCompleted$.next({
        lesson,
        integrationSuccess: false,
        scheduleUpdated: false,
        reason: 'No active configuration',
        timestamp: new Date()
      });
      return;
    }

    const isLessonCourseAssigned = activeConfig.periodAssignments?.some(
      assignment => assignment.courseId === lesson.courseId
    );

    if (!isLessonCourseAssigned) {
      console.log('❌ [ScheduleCoordinationService] Lesson course not assigned to any periods - skipping');

      // ✅ Emit integration event with reason
      this._lessonIntegrationCompleted$.next({
        lesson,
        integrationSuccess: false,
        scheduleUpdated: false,
        reason: 'Course not assigned to any periods',
        timestamp: new Date()
      });
      return;
    }

    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      console.log('❌ [ScheduleCoordinationService] No active schedule - skipping integration');

      // ✅ Emit integration event with reason
      this._lessonIntegrationCompleted$.next({
        lesson,
        integrationSuccess: false,
        scheduleUpdated: false,
        reason: 'No active schedule',
        timestamp: new Date()
      });
      return;
    }

    console.log('✅ [ScheduleCoordinationService] All conditions met - TRIGGERING SCHEDULE REGENERATION');

    this.regenerateSchedule('lesson-added', lesson.courseId, lesson.id).subscribe({
      next: () => {
        console.log('✅ [ScheduleCoordinationService] Schedule regeneration completed successfully');
        this.toastr.success(
          `Schedule updated with new lesson "${lesson.title}"`,
          'Schedule Integration'
        );

        // ✅ Emit successful integration event
        this._lessonIntegrationCompleted$.next({
          lesson,
          integrationSuccess: true,
          scheduleUpdated: true,
          timestamp: new Date()
        });
      },
      error: (error) => {
        console.error('❌ [ScheduleCoordinationService] Schedule regeneration failed:', error);
        this.toastr.warning(
          `New lesson "${lesson.title}" created but schedule update failed`,
          'Schedule Integration Warning'
        );

        // ✅ Emit failed integration event
        this._lessonIntegrationCompleted$.next({
          lesson,
          integrationSuccess: false,
          scheduleUpdated: false,
          error,
          timestamp: new Date()
        });
      }
    });

    console.log('📋 [ScheduleCoordinationService] === LESSON INTEGRATION END ===');
  }

  // === ENHANCED WORKFLOW METHODS WITH OBSERVABLE EVENTS ===

  /**
   * ✅ Enhanced: Generate schedule with Observable event emission
   */
  generateAndSetSchedule(): Observable<void> {
    console.log('[ScheduleCoordinationService] Generating schedule from active configuration');

    try {
      const result = this.scheduleGenerationService.createSchedule();

      if (result.success && result.schedule) {
        this.scheduleStateService.setSchedule(result.schedule, true);

        if (result.warnings.length > 0) {
          result.warnings.forEach((warning: string) => {
            this.toastr.warning(warning, 'Schedule Warning');
          });
        }

        console.log(`[ScheduleCoordinationService] Generated schedule with ${result.schedule.scheduleEvents?.length || 0} events`);

        // ✅ Emit successful workflow event
        this._workflowCompleted$.next({
          operation: 'generation',
          success: true,
          scheduleId: result.schedule.id,
          configurationId: result.schedule.scheduleConfigurationId,
          eventCount: result.schedule.scheduleEvents?.length || 0,
          timestamp: new Date()
        });

        return of(void 0);
      } else {
        result.errors.forEach((error: string) => {
          this.toastr.error(error, 'Schedule Generation Error');
          console.error('[ScheduleCoordinationService] Generation error:', error);
        });

        const errorObj = new Error(`Schedule generation failed: ${result.errors.join(', ')}`);

        // ✅ Emit failed workflow event
        this._workflowCompleted$.next({
          operation: 'generation',
          success: false,
          error: errorObj,
          timestamp: new Date()
        });

        return throwError(() => errorObj);
      }
    } catch (error: any) {
      console.error('[ScheduleCoordinationService] Exception during generation:', error);
      this.toastr.error('Schedule generation failed', 'Error');

      // ✅ Emit failed workflow event
      this._workflowCompleted$.next({
        operation: 'generation',
        success: false,
        error,
        timestamp: new Date()
      });

      return throwError(() => error);
    }
  }

  /**
   * ✅ Enhanced: Save schedule with Observable event emission
   */
  saveCurrentSchedule(): Observable<void> {
    console.log('[ScheduleCoordinationService] Saving current schedule');

    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      const errorObj = new Error('No schedule available to save');
      this.toastr.error('No schedule to save', 'Save Error');

      // ✅ Emit failed workflow event
      this._workflowCompleted$.next({
        operation: 'save',
        success: false,
        error: errorObj,
        timestamp: new Date()
      });

      return throwError(() => errorObj);
    }

    if (!this.scheduleStateService.isInMemorySchedule()) {
      console.log('[ScheduleCoordinationService] Schedule already saved');
      this.snackBar.open('Schedule is already saved', 'Close', { duration: 3000 });

      // ✅ Emit workflow event for "already saved"
      this._workflowCompleted$.next({
        operation: 'save',
        success: true,
        scheduleId: currentSchedule.id,
        eventCount: currentSchedule.scheduleEvents?.length || 0,
        timestamp: new Date()
      });

      return of(void 0);
    }

    return this.schedulePersistenceService.saveCurrentSchedule().pipe(
      tap(() => {
        this.snackBar.open('Schedule saved successfully', 'Close', { duration: 3000 });
        console.log('[ScheduleCoordinationService] Schedule saved successfully');

        // ✅ Emit successful workflow event
        this._workflowCompleted$.next({
          operation: 'save',
          success: true,
          scheduleId: currentSchedule.id,
          eventCount: currentSchedule.scheduleEvents?.length || 0,
          timestamp: new Date()
        });
      }),
      catchError((error: any) => {
        this.toastr.error('Failed to save schedule', 'Save Error');
        console.error('[ScheduleCoordinationService] Failed to save schedule:', error);

        // ✅ Emit failed workflow event
        this._workflowCompleted$.next({
          operation: 'save',
          success: false,
          scheduleId: currentSchedule.id,
          error,
          timestamp: new Date()
        });

        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Enhanced: Load schedule with Observable event emission
   */
  loadActiveScheduleWithConfiguration(): Observable<boolean> {
    console.log('[ScheduleCoordinationService] Loading active schedule with configuration');

    return this.schedulePersistenceService.loadActiveSchedule().pipe(
      switchMap((scheduleLoaded: boolean) => {
        if (scheduleLoaded) {
          const currentSchedule = this.scheduleStateService.getSchedule();

          // ✅ FIXED: Explicit null check and early return pattern
          if (!currentSchedule) {
            console.warn('[ScheduleCoordinationService] Schedule loaded but currentSchedule is null');
            return of(false);
          }

          if (currentSchedule.scheduleConfigurationId) {
            console.log(`[ScheduleCoordinationService] Loading associated configuration ID: ${currentSchedule.scheduleConfigurationId}`);

            // ✅ FIXED: Capture schedule properties in local variables for null safety
            const scheduleId = currentSchedule.id;
            const eventCount = currentSchedule.scheduleEvents?.length || 0;

            return this.scheduleConfigApi.getConfigurationById(currentSchedule.scheduleConfigurationId).pipe(
              tap(configuration => {
                if (configuration) {
                  this.scheduleConfigurationStateService.setActiveConfiguration(configuration);
                  console.log(`[ScheduleCoordinationService] Associated configuration loaded: ${configuration.title}`);

                  // ✅ FIXED: Use captured variables
                  this._workflowCompleted$.next({
                    operation: 'load',
                    success: true,
                    scheduleId,
                    configurationId: configuration.id,
                    eventCount,
                    timestamp: new Date()
                  });
                } else {
                  console.warn(`[ScheduleCoordinationService] Configuration ID ${currentSchedule.scheduleConfigurationId} not found`);
                }
              }),
              map(() => true),
              catchError((configError: any) => {
                console.warn('[ScheduleCoordinationService] Failed to load schedule configuration:', configError.message);

                // ✅ FIXED: Use captured variables
                this._workflowCompleted$.next({
                  operation: 'load',
                  success: true, // Schedule loaded even if config failed
                  scheduleId,
                  error: configError,
                  timestamp: new Date()
                });

                return of(true);
              })
            );
          } else {
            console.warn('[ScheduleCoordinationService] Schedule has no associated configuration ID');

            // ✅ FIXED: Use safe property access
            this._workflowCompleted$.next({
              operation: 'load',
              success: true,
              scheduleId: currentSchedule.id,
              eventCount: currentSchedule.scheduleEvents?.length || 0,
              timestamp: new Date()
            });

            return of(true);
          }
        } else {
          console.log('[ScheduleCoordinationService] No existing active schedule found');

          // ✅ Emit load workflow event for "no schedule"
          this._workflowCompleted$.next({
            operation: 'load',
            success: false,
            timestamp: new Date()
          });

          return of(false);
        }
      }),
      catchError((error: any) => {
        console.warn('[ScheduleCoordinationService] Failed to load active schedule:', error.message);
        this.toastr.error('Failed to load schedule', 'Loading Error');

        // ✅ Emit failed load workflow event
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
   * ✅ Enhanced: Configuration workflow with Observable event emission
   */
  executeConfigurationSaveWorkflow(configurationId: number): Observable<void> {
    console.log('[ScheduleCoordinationService] Executing complete configuration save workflow');

    const workflowSteps: ('load' | 'generate' | 'save')[] = ['load', 'generate', 'save'];
    const completedSteps: string[] = [];

    return this.scheduleConfigApi.getConfigurationById(configurationId).pipe(
      tap(configuration => {
        this.scheduleConfigurationStateService.setActiveConfiguration(configuration);
        console.log('[ScheduleCoordinationService] Configuration loaded and set as active');
        completedSteps.push('load');
      }),
      switchMap(() => {
        console.log('[ScheduleCoordinationService] Step 2: Generating schedule from configuration');
        return this.generateAndSetSchedule();
      }),
      tap(() => {
        completedSteps.push('generate');
      }),
      switchMap(() => {
        console.log('[ScheduleCoordinationService] Step 3: Auto-saving generated schedule');
        return this.saveCurrentSchedule();
      }),
      tap(() => {
        completedSteps.push('save');
        console.log('[ScheduleCoordinationService] Complete workflow finished successfully');

        // ✅ Emit successful configuration workflow event
        this._configurationWorkflowCompleted$.next({
          configurationId,
          workflowSteps,
          completedSteps,
          success: true,
          timestamp: new Date()
        });
      }),
      catchError((error: any) => {
        this.toastr.error('Configuration workflow failed', 'Error');
        console.error('[ScheduleCoordinationService] Configuration workflow failed:', error);

        // ✅ Emit failed configuration workflow event
        this._configurationWorkflowCompleted$.next({
          configurationId,
          workflowSteps,
          completedSteps,
          success: false,
          error,
          timestamp: new Date()
        });

        return throwError(() => error);
      })
    );
  }

  /**
   * ✅ Enhanced: Regenerate schedule with Observable event emission
   */
  regenerateSchedule(
    trigger: 'lesson-added' | 'manual' | 'configuration-change' = 'manual',
    courseId?: number,
    lessonId?: number
  ): Observable<void> {
    console.log('[ScheduleCoordinationService] Regenerating schedule from current configuration', {
      trigger,
      courseId,
      lessonId
    });

    return this.generateAndSetSchedule().pipe(
      switchMap(() => {
        return this.saveCurrentSchedule();
      }),
      tap(() => {
        this.snackBar.open('Schedule regenerated successfully', 'Close', { duration: 3000 });
        console.log('[ScheduleCoordinationService] Schedule regenerated and saved');

        const currentSchedule = this.scheduleStateService.getSchedule();

        // ✅ Emit successful regeneration event
        this._regenerationCompleted$.next({
          trigger,
          courseId,
          lessonId,
          success: true,
          eventCount: currentSchedule?.scheduleEvents?.length || 0,
          timestamp: new Date()
        });
      }),
      catchError((error: any) => {
        this.toastr.error('Failed to regenerate schedule', 'Error');
        console.error('[ScheduleCoordinationService] Failed to regenerate schedule:', error);

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

        return throwError(() => error);
      })
    );
  }

  // === CLEANUP ===

  /**
   * ✅ Complete Observable cleanup following established pattern
   */
  ngOnDestroy(): void {
    this._workflowCompleted$.complete();
    this._configurationWorkflowCompleted$.complete();
    this._regenerationCompleted$.complete();
    this._lessonIntegrationCompleted$.complete();
    console.log('[ScheduleCoordinationService] All Observable subjects completed');
  }
}
