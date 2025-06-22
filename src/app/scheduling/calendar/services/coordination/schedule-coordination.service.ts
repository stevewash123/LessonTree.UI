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
import { CourseDataService } from '../../../../shared/services/course-data.service'; // Add to imports
import { LessonDetail } from '../../../../models/lesson'; // Add to imports

import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleGenerationService } from '../business/schedule-generation.service';
import { SchedulePersistenceService } from '../ui/schedule-persistence.service';
import { ScheduleValidationService } from '../business/schedule-validation.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { ScheduleConfigurationApiService } from '../../../schedule-config/schedule-config-api.service';
import { Schedule, ScheduleCreateResource } from '../../../../models/schedule';

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
        private courseDataService: CourseDataService, // Add this dependency
        private snackBar: MatSnackBar,
        private toastr: ToastrService
      ) {
        console.log('[ScheduleCoordinationService] Initialized for schedule workflow orchestration');
        
        // Listen for lesson creation events
        effect(() => {
            const nodeAddedEvent = this.courseDataService.nodeAdded();
            
            if (nodeAddedEvent?.node.nodeType === 'Lesson' && nodeAddedEvent.source === 'infopanel') {
              console.log('[ScheduleCoordinationService] Lesson created, checking for schedule integration');
              this.reactToLessonCreation(nodeAddedEvent.node as LessonDetail);
            }
          });
      }

      // === LESSON CREATION INTEGRATION ===

  /**
   * React to lesson creation by updating schedule if configuration exists
   */
  private reactToLessonCreation(lesson: LessonDetail): void {
    console.log('[ScheduleCoordinationService] Processing lesson creation reaction', {
      lessonTitle: lesson.title,
      lessonId: lesson.id,
      courseId: lesson.courseId,
      timestamp: new Date().toISOString()
    });

    // Check if we have an active schedule configuration
    const activeConfig = this.scheduleConfigurationStateService.getActiveConfiguration();
    if (!activeConfig) {
      console.log('[ScheduleCoordinationService] No active configuration - skipping schedule integration');
      return;
    }

    // Check if the lesson's course is assigned to any periods in the configuration
    const isLessonCourseAssigned = activeConfig.periodAssignments?.some(
      assignment => assignment.courseId === lesson.courseId
    );

    if (!isLessonCourseAssigned) {
      console.log('[ScheduleCoordinationService] Lesson course not assigned to any periods - skipping schedule integration');
      return;
    }

    // Check if we have an active schedule to update
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      console.log('[ScheduleCoordinationService] No active schedule - skipping integration');
      return;
    }

    console.log('[ScheduleCoordinationService] Lesson course is assigned and schedule exists - regenerating schedule');
    
    // Regenerate schedule to include new lesson with automatic shifting
    this.regenerateSchedule().subscribe({
      next: () => {
        this.toastr.success(
          `Schedule updated with new lesson "${lesson.title}"`, 
          'Schedule Integration'
        );
        console.log('[ScheduleCoordinationService] Successfully integrated new lesson into schedule');
      },
      error: (error) => {
        console.error('[ScheduleCoordinationService] Failed to integrate lesson into schedule:', error);
        this.toastr.warning(
          `New lesson "${lesson.title}" created but schedule update failed`, 
          'Schedule Integration Warning'
        );
      }
    });
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