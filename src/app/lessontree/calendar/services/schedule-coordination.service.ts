// **COMPLETE FILE** - New schedule-coordination.service.ts
// RESPONSIBILITY: Business logic orchestration for schedule workflows (Configuration → Generation → Persistence)
// DOES NOT: Handle HTTP operations, form management, or calendar display - pure workflow coordination
// CALLED BY: ScheduleConfigService, CalendarCoordinationService, lesson-calendar.component

import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastrService } from 'ngx-toastr';

import { ScheduleStateService } from './schedule-state.service';
import { ScheduleGenerationService } from './schedule-generation.service';
import { SchedulePersistenceService } from './schedule-persistence.service';
import { ScheduleValidationService } from './schedule-validation.service';
import { ScheduleConfigurationStateService } from './schedule-configuration-state.service';
import { ScheduleConfigurationApiService } from '../../../home/schedule-config/schedule-config-api.service';
import { Schedule, ScheduleCreateResource } from '../../../models/schedule';

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
    private snackBar: MatSnackBar,
    private toastr: ToastrService
  ) {
    console.log('[ScheduleCoordinationService] Initialized for schedule workflow orchestration');
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

  /**
   * Create new schedule and generate events workflow
   * Moved from SchedulePersistenceService
   */
//   createNewSchedule(title: string, scheduleConfigurationId: number): Observable<void> {
//     console.log('[ScheduleCoordinationService] Creating new schedule workflow');
    
//     const createResource: ScheduleCreateResource = {
//       title,
//       scheduleConfigurationId,
//       scheduleEvents: []
//     };

//     return this.schedulePersistenceService.createNewSchedule(createResource).pipe(
//       switchMap(() => {
//         // Generate events for the new schedule
//         return this.generateAndSetSchedule();
//       }),
//       tap(() => {
//         this.snackBar.open('New schedule created', 'Close', { duration: 3000 });
//         console.log('[ScheduleCoordinationService] Created new schedule successfully');
//       }),
//       catchError((error: any) => {
//         this.toastr.error('Failed to create new schedule', 'Error');
//         console.error('[ScheduleCoordinationService] Failed to create new schedule:', error);
//         return throwError(() => error);
//       })
//     );
//   }

  /**
   * Load active schedule with configuration
   * Enhanced from SchedulePersistenceService
   */
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