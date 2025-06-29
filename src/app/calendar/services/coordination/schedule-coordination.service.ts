// **COMPLETE FILE** - New schedule-coordination.service.ts
// RESPONSIBILITY: Business logic orchestration for schedule workflows (Configuration → Generation → Persistence)
// DOES NOT: Handle HTTP operations, form management, or calendar display - pure workflow coordination
// CALLED BY: ScheduleConfigService, CalendarCoordinationService, lesson-calendar.component

import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';
import { effect } from '@angular/core'; // Add to imports
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { SchedulePersistenceService } from '../ui/schedule-persistence.service';
import {ScheduleStateService} from '../state/schedule-state.service';
import {ScheduleGenerationService} from '../business/schedule-generation.service';
import {ScheduleValidationService} from '../business/schedule-validation.service';
import {ScheduleConfigurationApiService} from '../../../schedule-config/schedule-config-api.service';
import {CourseDataService} from '../../../lesson-tree/services/course-data/course-data.service';
import {LessonDetail} from '../../../models/lesson';
import {CourseSignalService} from '../../../lesson-tree/services/course-data/course-signal.service';


@Injectable({
  providedIn: 'root'
})
export class ScheduleCoordinationService {
  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleGenerationService: ScheduleGenerationService,
    private schedulePersistenceService: SchedulePersistenceService,
    private scheduleValidationService: ScheduleValidationService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private scheduleConfigApi: ScheduleConfigurationApiService,
    private courseDataService: CourseDataService,
    private courseSignalService: CourseSignalService, // ✅ ADD: Direct access to signal service
    private snackBar: MatSnackBar,
    private toastr: ToastrService
  ) {
    console.log('[ScheduleCoordinationService] Initialized for schedule workflow orchestration');

    // ✅ NEW: PROPER OBSERVABLE EVENT SUBSCRIPTION (emit once, consume once)
    this.courseSignalService.nodeAdded$.subscribe(nodeAddedEvent => {
      console.log('🔄 [ScheduleCoordinationService] === OBSERVABLE EVENT RECEIVED ===', {
        eventType: 'nodeAdded',
        nodeType: nodeAddedEvent.node.nodeType,
        nodeId: nodeAddedEvent.node.nodeId,
        nodeTitle: nodeAddedEvent.node.title,
        source: nodeAddedEvent.source,
        operationType: nodeAddedEvent.operationType,
        timestamp: nodeAddedEvent.timestamp.toISOString(),
        pattern: 'Observable - one emission, one processing'
      });

      if (nodeAddedEvent.node.nodeType === 'Lesson' && nodeAddedEvent.source === 'infopanel') {
        console.log('🎯 [ScheduleCoordinationService] PROCESSING lesson event - checking for schedule integration');
        this.reactToLessonCreation(nodeAddedEvent.node as LessonDetail);
      } else {
        console.log('🔄 [ScheduleCoordinationService] IGNORING event - not lesson from infopanel');
      }

      console.log('🔄 [ScheduleCoordinationService] === OBSERVABLE EVENT PROCESSING COMPLETE ===');
    });

    // 🔄 TEMPORARY: Keep legacy signal effect for comparison during testing
    // This will be removed once Observable pattern is proven
    let effectRunCounter = 0;
    let lastProcessedSignalId: string | null = null;

    effect(() => {
      effectRunCounter++;

      const nodeAddedEvent = this.courseDataService.nodeAdded();

      console.log('🔄 [LEGACY SIGNAL EFFECT] Effect triggered:', {
        effectRunCount: effectRunCounter,
        hasSignal: !!nodeAddedEvent,
        signalTimestamp: nodeAddedEvent?.timestamp?.toISOString(),
        signalId: nodeAddedEvent ? `${nodeAddedEvent.node.nodeType}_${nodeAddedEvent.node.nodeId}_${nodeAddedEvent.source}_${nodeAddedEvent.timestamp.getTime()}` : 'none',
        pattern: 'Signal - persistent state, re-processed on change detection'
      });

      if (nodeAddedEvent) {
        // Create unique signal ID for deduplication
        const signalId = `${nodeAddedEvent.node.nodeType}_${nodeAddedEvent.node.nodeId}_${nodeAddedEvent.source}_${nodeAddedEvent.timestamp.getTime()}`;

        // Skip if we already processed this exact signal
        if (signalId === lastProcessedSignalId) {
          console.log('🔄 [LEGACY SIGNAL EFFECT] SKIPPING duplicate signal', {
            signalId,
            effectRunCount: effectRunCounter,
            nodeType: nodeAddedEvent.node.nodeType,
            nodeTitle: nodeAddedEvent.node.title,
            reason: 'Already processed - this proves signals are wrong for events'
          });
          return;
        }

        // Update last processed signal
        lastProcessedSignalId = signalId;

        console.log('🔄 [LEGACY SIGNAL EFFECT] === SIGNAL PROCESSING START ===', {
          signalId,
          effectRunCount: effectRunCounter,
          nodeType: nodeAddedEvent.node.nodeType,
          nodeId: nodeAddedEvent.node.nodeId,
          nodeTitle: nodeAddedEvent.node.title,
          source: nodeAddedEvent.source,
          operationType: nodeAddedEvent.operationType,
          signalTimestamp: nodeAddedEvent.timestamp.toISOString(),
          warning: 'LEGACY - will be removed after Observable pattern proven'
        });

        // NOTE: Not processing in legacy effect during testing - Observable handles it
        console.log('🔄 [LEGACY SIGNAL EFFECT] SKIPPING processing - Observable handles it now');
        console.log('🔄 [LEGACY SIGNAL EFFECT] === SIGNAL PROCESSING END ===');
      } else {
        console.log('🔄 [LEGACY SIGNAL EFFECT] Effect ran but no signal present - why did effect trigger?');
      }
    });
  }

// === LESSON CREATION INTEGRATION ===
  private reactToLessonCreation(lesson: LessonDetail): void {
    console.log('📋 [ScheduleCoordinationService] === LESSON INTEGRATION START ===', {
      lessonTitle: lesson.title,
      lessonId: lesson.id,
      courseId: lesson.courseId,
      timestamp: new Date().toISOString()
    });

    // Check if we have an active schedule configuration
    const activeConfig = this.scheduleConfigurationStateService.getActiveConfiguration();
    if (!activeConfig) {
      console.log('❌ [ScheduleCoordinationService] No active configuration - skipping schedule integration');
      return;
    }

    // Check if the lesson's course is assigned to any periods in the configuration
    const isLessonCourseAssigned = activeConfig.periodAssignments?.some(
      assignment => assignment.courseId === lesson.courseId
    );

    if (!isLessonCourseAssigned) {
      console.log('❌ [ScheduleCoordinationService] Lesson course not assigned to any periods - skipping');
      return;
    }

    // Check if we have an active schedule to update
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      console.log('❌ [ScheduleCoordinationService] No active schedule - skipping integration');
      return;
    }

    console.log('✅ [ScheduleCoordinationService] All conditions met - TRIGGERING SCHEDULE REGENERATION');

    // 🚨 CRITICAL: This is where the loop might start!
    console.log('🚨 [ScheduleCoordinationService] CALLING regenerateSchedule() - WATCH FOR LOOPS!');

    this.regenerateSchedule().subscribe({
      next: () => {
        console.log('✅ [ScheduleCoordinationService] Schedule regeneration completed successfully');
        this.toastr.success(
          `Schedule updated with new lesson "${lesson.title}"`,
          'Schedule Integration'
        );
      },
      error: (error) => {
        console.error('❌ [ScheduleCoordinationService] Schedule regeneration failed:', error);
        this.toastr.warning(
          `New lesson "${lesson.title}" created but schedule update failed`,
          'Schedule Integration Warning'
        );
      }
    });

    console.log('📋 [ScheduleCoordinationService] === LESSON INTEGRATION END ===');
  }

  // === COMPLETE SCHEDULE WORKFLOWS ===

  /**
   * Generate schedule from active configuration and set in state
   * Moved from SchedulePersistenceService
   */
  generateAndSetSchedule(): Observable<void> {
    console.log('[ScheduleCoordinationService] Generating schedule from active configuration');

    try {
      const result = this.scheduleGenerationService.createSchedule();

      if (result.success && result.schedule) {
        // Set the generated schedule in state
        this.scheduleStateService.setSchedule(result.schedule, true);

        // Show notifications for any issues
        if (result.warnings.length > 0) {
          result.warnings.forEach((warning: string) => {
            this.toastr.warning(warning, 'Schedule Warning');
          });
        }

        console.log(`[ScheduleCoordinationService] Generated schedule with ${result.schedule.scheduleEvents?.length || 0} events`);
        return of(void 0);
      } else {
        // Handle generation errors
        result.errors.forEach((error: string) => {
          this.toastr.error(error, 'Schedule Generation Error');
          console.error('[ScheduleCoordinationService] Generation error:', error);
        });

        console.error('[ScheduleCoordinationService] Failed to generate schedule');
        return throwError(() => new Error(`Schedule generation failed: ${result.errors.join(', ')}`));
      }
    } catch (error: any) {
      console.error('[ScheduleCoordinationService] Exception during generation:', error);
      this.toastr.error('Schedule generation failed', 'Error');
      return throwError(() => error);
    }
  }

  /**
   * Save current schedule with user feedback
   * Moved from SchedulePersistenceService
   */
  saveCurrentSchedule(): Observable<void> {
    console.log('[ScheduleCoordinationService] Saving current schedule');

    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      this.toastr.error('No schedule to save', 'Save Error');
      return throwError(() => new Error('No schedule available to save'));
    }

    if (!this.scheduleStateService.isInMemorySchedule()) {
      console.log('[ScheduleCoordinationService] Schedule already saved');
      this.snackBar.open('Schedule is already saved', 'Close', { duration: 3000 });
      return of(void 0);
    }

    return this.schedulePersistenceService.saveCurrentSchedule().pipe(
      tap(() => {
        this.snackBar.open('Schedule saved successfully', 'Close', { duration: 3000 });
        console.log('[ScheduleCoordinationService] Schedule saved successfully');
      }),
      catchError((error: any) => {
        this.toastr.error('Failed to save schedule', 'Save Error');
        console.error('[ScheduleCoordinationService] Failed to save schedule:', error);
        return throwError(() => error);
      })
    );
  }

  loadActiveScheduleWithConfiguration(): Observable<boolean> {
    console.log('[ScheduleCoordinationService] Loading active schedule with configuration');

    return this.schedulePersistenceService.loadActiveSchedule().pipe(
      switchMap((scheduleLoaded: boolean) => {
        if (scheduleLoaded) {
          // Schedule loaded, now load associated configuration
          const currentSchedule = this.scheduleStateService.getSchedule();

          if (currentSchedule?.scheduleConfigurationId) {
            console.log(`[ScheduleCoordinationService] Loading associated configuration ID: ${currentSchedule.scheduleConfigurationId}`);

            return this.scheduleConfigApi.getConfigurationById(currentSchedule.scheduleConfigurationId).pipe(
              tap(configuration => {
                if (configuration) {
                  this.scheduleConfigurationStateService.setActiveConfiguration(configuration);
                  console.log(`[ScheduleCoordinationService] Associated configuration loaded: ${configuration.title}`);
                } else {
                  console.warn(`[ScheduleCoordinationService] Configuration ID ${currentSchedule.scheduleConfigurationId} not found`);
                }
              }),
              map(() => true),
              catchError((configError: any) => {
                console.warn('[ScheduleCoordinationService] Failed to load schedule configuration:', configError.message);
                // Continue anyway - schedule loaded successfully even if config failed
                return of(true);
              })
            );
          } else {
            console.warn('[ScheduleCoordinationService] Schedule has no associated configuration ID');
            return of(true);
          }
        } else {
          console.log('[ScheduleCoordinationService] No existing active schedule found');
          return of(false);
        }
      }),
      catchError((error: any) => {
        console.warn('[ScheduleCoordinationService] Failed to load active schedule:', error.message);
        this.toastr.error('Failed to load schedule', 'Loading Error');
        return of(false);
      })
    );
  }

  /**
   * Complete configuration save workflow
   * Configuration → Generation → Schedule Save
   */
  executeConfigurationSaveWorkflow(configurationId: number): Observable<void> {
    console.log('[ScheduleCoordinationService] Executing complete configuration save workflow');

    return this.scheduleConfigApi.getConfigurationById(configurationId).pipe(
      tap(configuration => {
        this.scheduleConfigurationStateService.setActiveConfiguration(configuration);
        console.log('[ScheduleCoordinationService] Configuration loaded and set as active');
      }),
      switchMap(() => {
        console.log('[ScheduleCoordinationService] Step 2: Generating schedule from configuration');
        return this.generateAndSetSchedule();
      }),
      switchMap(() => {
        console.log('[ScheduleCoordinationService] Step 3: Auto-saving generated schedule');
        return this.saveCurrentSchedule();
      }),
      tap(() => {
        console.log('[ScheduleCoordinationService] Complete workflow finished successfully');
      }),
      catchError((error: any) => {
        this.toastr.error('Configuration workflow failed', 'Error');
        console.error('[ScheduleCoordinationService] Configuration workflow failed:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Regenerate schedule from current configuration
   */
  regenerateSchedule(): Observable<void> {
    console.log('[ScheduleCoordinationService] Regenerating schedule from current configuration');

    return this.generateAndSetSchedule().pipe(
      switchMap(() => {
        // Auto-save the regenerated schedule
        return this.saveCurrentSchedule();
      }),
      tap(() => {
        this.snackBar.open('Schedule regenerated successfully', 'Close', { duration: 3000 });
        console.log('[ScheduleCoordinationService] Schedule regenerated and saved');
      }),
      catchError((error: any) => {
        this.toastr.error('Failed to regenerate schedule', 'Error');
        console.error('[ScheduleCoordinationService] Failed to regenerate schedule:', error);
        return throwError(() => error);
      })
    );
  }

  // === STATE QUERIES (DELEGATION) ===

//   canSaveSchedule(): boolean {
//     return this.scheduleStateService.canSaveSchedule();
//   }

//   hasUnsavedChanges(): boolean {
//     return this.scheduleStateService.hasUnsavedChanges();
//   }

//   getScheduleStatus() {
//     return this.scheduleValidationService.getScheduleStatus();
//   }

//   validateScheduleForSaving() {
//     return this.scheduleValidationService.validateScheduleForSaving();
//   }

  // === UTILITY METHODS ===


}
