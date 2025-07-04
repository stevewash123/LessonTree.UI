// **COMPLETE FILE** - ScheduleWorkflowBusinessService - Core Workflow Logic
// RESPONSIBILITY: Schedule workflow business logic, integration decisions, and orchestration
// SCOPE: Pure business logic only (Observable coordination in separate service)
// RATIONALE: Complex workflow algorithms separated from event emission patterns

import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { SchedulePersistenceService } from '../ui/schedule-persistence.service';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleGenerationService } from '../business/schedule-generation.service';
import { ScheduleConfigurationApiService } from '../../../schedule-config/schedule-config-api.service';
import { LessonDetail } from '../../../models/lesson';

export interface WorkflowResult {
  success: boolean;
  scheduleId?: number;
  configurationId?: number;
  eventCount?: number;
  error?: Error;
  message?: string;
}

export interface LessonIntegrationDecision {
  shouldIntegrate: boolean;
  reason: string;
  lessonId: number;
  courseId: number;
  lessonTitle: string;
}

export interface ConfigurationWorkflowResult {
  success: boolean;
  configurationId: number;
  completedSteps: string[];
  error?: Error;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleWorkflowBusinessService {

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleGenerationService: ScheduleGenerationService,
    private schedulePersistenceService: SchedulePersistenceService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private scheduleConfigApi: ScheduleConfigurationApiService
  ) {
    console.log('[ScheduleWorkflowBusinessService] Core workflow logic initialized');
  }

  // === LESSON INTEGRATION BUSINESS LOGIC ===

  evaluateLessonIntegration(lesson: LessonDetail): LessonIntegrationDecision {
    console.log(`[ScheduleWorkflowBusinessService] Evaluating lesson integration for: ${lesson.title}`);

    const decision: LessonIntegrationDecision = {
      shouldIntegrate: false,
      reason: '',
      lessonId: lesson.id,
      courseId: lesson.courseId,
      lessonTitle: lesson.title
    };

    // Check if we have an active configuration
    const activeConfig = this.scheduleConfigurationStateService.getActiveConfiguration();
    if (!activeConfig) {
      decision.reason = 'No active configuration';
      return decision;
    }

    // Check if lesson's course is assigned to any periods
    const isLessonCourseAssigned = activeConfig.periodAssignments?.some(
      assignment => assignment.courseId === lesson.courseId
    );

    if (!isLessonCourseAssigned) {
      decision.reason = 'Course not assigned to any periods';
      return decision;
    }

    // Check if we have an active schedule
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      decision.reason = 'No active schedule';
      return decision;
    }

    // All conditions met - should integrate
    decision.shouldIntegrate = true;
    decision.reason = 'All integration conditions satisfied';

    console.log(`[ScheduleWorkflowBusinessService] Integration decision: ${decision.shouldIntegrate ? 'INTEGRATE' : 'SKIP'} - ${decision.reason}`);
    return decision;
  }

  // === SCHEDULE GENERATION WORKFLOW ===

  generateSchedule(): WorkflowResult {
    console.log('[ScheduleWorkflowBusinessService] Executing schedule generation workflow');

    try {
      const result = this.scheduleGenerationService.createSchedule();

      if (result.success && result.schedule) {
        this.scheduleStateService.setSchedule(result.schedule, true);

        console.log(`[ScheduleWorkflowBusinessService] Generated schedule with ${result.schedule.scheduleEvents?.length || 0} events`);

        return {
          success: true,
          scheduleId: result.schedule.id,
          configurationId: result.schedule.scheduleConfigurationId,
          eventCount: result.schedule.scheduleEvents?.length || 0,
          message: `Generated schedule with ${result.schedule.scheduleEvents?.length || 0} events`
        };
      } else {
        const errorMessage = `Schedule generation failed: ${result.errors.join(', ')}`;
        console.error('[ScheduleWorkflowBusinessService] Generation failed:', errorMessage);

        return {
          success: false,
          error: new Error(errorMessage)
        };
      }
    } catch (error: any) {
      console.error('[ScheduleWorkflowBusinessService] Exception during generation:', error);
      return {
        success: false,
        error
      };
    }
  }

  // === SCHEDULE SAVE WORKFLOW ===

  saveSchedule(): Observable<WorkflowResult> {
    console.log('[ScheduleWorkflowBusinessService] Executing schedule save workflow');

    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      const error = new Error('No schedule available to save');
      return of({
        success: false,
        error
      });
    }

    if (!this.scheduleStateService.isInMemorySchedule()) {
      console.log('[ScheduleWorkflowBusinessService] Schedule already saved');
      return of({
        success: true,
        scheduleId: currentSchedule.id,
        eventCount: currentSchedule.scheduleEvents?.length || 0,
        message: 'Schedule already saved'
      });
    }

    return this.schedulePersistenceService.saveCurrentSchedule().pipe(
      map(() => {
        console.log('[ScheduleWorkflowBusinessService] Schedule saved successfully');
        return {
          success: true,
          scheduleId: currentSchedule.id,
          eventCount: currentSchedule.scheduleEvents?.length || 0,
          message: 'Schedule saved successfully'
        };
      }),
      catchError((error: any) => {
        console.error('[ScheduleWorkflowBusinessService] Failed to save schedule:', error);
        return of({
          success: false,
          scheduleId: currentSchedule.id,
          error
        });
      })
    );
  }

  // === SCHEDULE LOAD WORKFLOW ===

  loadActiveScheduleWithConfiguration(): Observable<WorkflowResult> {
    console.log('[ScheduleWorkflowBusinessService] Executing schedule load workflow');

    return this.schedulePersistenceService.loadActiveSchedule().pipe(
      switchMap((scheduleLoaded: boolean) => {
        if (scheduleLoaded) {
          const currentSchedule = this.scheduleStateService.getSchedule();

          if (!currentSchedule) {
            console.warn('[ScheduleWorkflowBusinessService] Schedule loaded but currentSchedule is null');
            return of({
              success: false,
              error: new Error('Schedule loaded but not accessible')
            });
          }

          if (currentSchedule.scheduleConfigurationId) {
            console.log(`[ScheduleWorkflowBusinessService] Loading associated configuration ID: ${currentSchedule.scheduleConfigurationId}`);

            const scheduleId = currentSchedule.id;
            const eventCount = currentSchedule.scheduleEvents?.length || 0;

            return this.scheduleConfigApi.getConfigurationById(currentSchedule.scheduleConfigurationId).pipe(
              map(configuration => {
                if (configuration) {
                  this.scheduleConfigurationStateService.setActiveConfiguration(configuration);
                  console.log(`[ScheduleWorkflowBusinessService] Associated configuration loaded: ${configuration.title}`);

                  return {
                    success: true,
                    scheduleId,
                    configurationId: configuration.id,
                    eventCount,
                    message: `Loaded schedule with configuration: ${configuration.title}`
                  };
                } else {
                  console.warn(`[ScheduleWorkflowBusinessService] Configuration ID ${currentSchedule.scheduleConfigurationId} not found`);
                  return {
                    success: true,
                    scheduleId,
                    eventCount,
                    message: 'Schedule loaded but configuration not found'
                  };
                }
              }),
              catchError((configError: any) => {
                console.warn('[ScheduleWorkflowBusinessService] Failed to load schedule configuration:', configError.message);
                return of({
                  success: true, // Schedule loaded even if config failed
                  scheduleId,
                  eventCount,
                  error: configError,
                  message: 'Schedule loaded but configuration failed to load'
                });
              })
            );
          } else {
            console.warn('[ScheduleWorkflowBusinessService] Schedule has no associated configuration ID');
            return of({
              success: true,
              scheduleId: currentSchedule.id,
              eventCount: currentSchedule.scheduleEvents?.length || 0,
              message: 'Schedule loaded without configuration'
            });
          }
        } else {
          console.log('[ScheduleWorkflowBusinessService] No existing active schedule found');
          return of({
            success: false,
            message: 'No existing active schedule found'
          });
        }
      }),
      catchError((error: any) => {
        console.warn('[ScheduleWorkflowBusinessService] Failed to load active schedule:', error.message);
        return of({
          success: false,
          error,
          message: 'Failed to load active schedule'
        });
      })
    );
  }

  // === CONFIGURATION WORKFLOW ===

  executeConfigurationWorkflow(configurationId: number): Observable<ConfigurationWorkflowResult> {
    console.log('[ScheduleWorkflowBusinessService] Executing complete configuration workflow');

    const completedSteps: string[] = [];

    return this.scheduleConfigApi.getConfigurationById(configurationId).pipe(
      switchMap(configuration => {
        this.scheduleConfigurationStateService.setActiveConfiguration(configuration);
        console.log('[ScheduleWorkflowBusinessService] Configuration loaded and set as active');
        completedSteps.push('load');

        // Step 2: Generate schedule
        console.log('[ScheduleWorkflowBusinessService] Step 2: Generating schedule from configuration');
        const generateResult = this.generateSchedule();

        if (!generateResult.success) {
          throw generateResult.error || new Error('Schedule generation failed');
        }

        completedSteps.push('generate');

        // Step 3: Save schedule
        console.log('[ScheduleWorkflowBusinessService] Step 3: Auto-saving generated schedule');
        return this.saveSchedule();
      }),
      map((saveResult: WorkflowResult) => {
        if (!saveResult.success) {
          throw saveResult.error || new Error('Schedule save failed');
        }

        completedSteps.push('save');
        console.log('[ScheduleWorkflowBusinessService] Complete workflow finished successfully');

        return {
          success: true,
          configurationId,
          completedSteps
        };
      }),
      catchError((error: any) => {
        console.error('[ScheduleWorkflowBusinessService] Configuration workflow failed:', error);
        return of({
          success: false,
          configurationId,
          completedSteps,
          error
        });
      })
    );
  }

  // === SCHEDULE REGENERATION WORKFLOW ===

  regenerateSchedule(): Observable<WorkflowResult> {
    console.log('[ScheduleWorkflowBusinessService] Executing schedule regeneration workflow');

    // Step 1: Generate new schedule
    const generateResult = this.generateSchedule();

    if (!generateResult.success) {
      return of(generateResult);
    }

    // Step 2: Save the regenerated schedule
    return this.saveSchedule().pipe(
      map((saveResult: WorkflowResult) => {
        if (saveResult.success) {
          console.log('[ScheduleWorkflowBusinessService] Schedule regenerated and saved successfully');

          const currentSchedule = this.scheduleStateService.getSchedule();
          return {
            success: true,
            scheduleId: currentSchedule?.id,
            eventCount: currentSchedule?.scheduleEvents?.length || 0,
            message: 'Schedule regenerated and saved successfully'
          };
        } else {
          return saveResult;
        }
      }),
      catchError((error: any) => {
        console.error('[ScheduleWorkflowBusinessService] Failed to regenerate schedule:', error);
        return of({
          success: false,
          error,
          message: 'Failed to regenerate schedule'
        });
      })
    );
  }

  // === UTILITY METHODS ===

  getCurrentScheduleInfo(): { hasSchedule: boolean; scheduleId?: number; eventCount: number; isInMemory: boolean } {
    const currentSchedule = this.scheduleStateService.getSchedule();
    return {
      hasSchedule: !!currentSchedule,
      scheduleId: currentSchedule?.id,
      eventCount: currentSchedule?.scheduleEvents?.length || 0,
      isInMemory: this.scheduleStateService.isInMemorySchedule()
    };
  }

  getActiveConfigurationInfo(): { hasConfig: boolean; configId?: number; title?: string } {
    const activeConfig = this.scheduleConfigurationStateService.getActiveConfiguration();
    return {
      hasConfig: !!activeConfig,
      configId: activeConfig?.id,
      title: activeConfig?.title
    };
  }
}
