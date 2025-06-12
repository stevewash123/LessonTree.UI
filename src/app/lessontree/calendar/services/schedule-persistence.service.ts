// RESPONSIBILITY: Pure schedule persistence operations (load, save, create, update)
// DOES NOT: Handle user configuration, validation, or state queries - delegates to specialized services
// CALLED BY: CalendarCoordinationService for master schedule persistence operations

import { Injectable } from '@angular/core';
import { Observable, of, catchError, map, switchMap, tap, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ScheduleStateService } from './schedule-state.service';
import { ScheduleGenerationService } from './schedule-generation.service';
import { ScheduleValidationService } from './schedule-validation.service';
import { ScheduleApiService } from './schedule-api.service';
import { UserService } from '../../../core/services/user.service';
import { Schedule, ScheduleCreateResource, ScheduleConfigUpdateResource } from '../../../models/schedule';

@Injectable({
  providedIn: 'root'
})
export class SchedulePersistenceService {

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleGenerationService: ScheduleGenerationService,
    private scheduleValidationService: ScheduleValidationService,
    private calendarService: ScheduleApiService,
    private userService: UserService,
    private toastr: ToastrService
  ) {
    console.log('[SchedulePersistenceService] Initialized for pure schedule persistence');
  }

  // === MASTER SCHEDULE LOADING ===

  loadMasterSchedule(): Observable<boolean> {
    console.log('[SchedulePersistenceService] Loading master schedule for current user');
    
    return this.calendarService.getMasterScheduleForUser().pipe(
      tap(schedule => {
        if (schedule) {
          console.log(`[SchedulePersistenceService] Loaded master schedule: ${schedule.title}`);
          this.scheduleStateService.setMasterSchedule(schedule, false);
        } else {
          console.log('[SchedulePersistenceService] No existing master schedule found');
        }
      }),
      map(schedule => schedule !== null),
      catchError((error: any) => {
        console.warn('[SchedulePersistenceService] Failed to load master schedule:', error.message);
        return of(false);
      })
    );
  }

  // === MASTER SCHEDULE GENERATION ===

  generateAndSetMasterSchedule(): Observable<void> {
    console.log('[SchedulePersistenceService] Generating master schedule');
    
    try {
      const result = this.scheduleGenerationService.createMasterSchedule();
      
      if (result.success && result.schedule) {
        // Set the generated master schedule in state
        this.scheduleStateService.setMasterSchedule(result.schedule, true);
        
        // Show notifications for any issues
        if (result.warnings.length > 0) {
          result.warnings.forEach((warning: string) => {
            this.toastr.warning(warning, 'Schedule Warning');
          });
        }
        
        console.log(`[SchedulePersistenceService] Generated master schedule with ${result.schedule.scheduleEvents?.length || 0} events`);
        return of(void 0);
      } else {
        // Handle generation errors
        result.errors.forEach((error: string) => {
          this.toastr.error(error, 'Schedule Generation Error');
          console.error('[SchedulePersistenceService] Generation error:', error);
        });
        
        console.error('[SchedulePersistenceService] Failed to generate master schedule');
        return throwError(() => new Error(`Master schedule generation failed: ${result.errors.join(', ')}`));
      }
    } catch (error: any) {
      console.error('[SchedulePersistenceService] Exception during generation:', error);
      this.toastr.error('Schedule generation failed', 'Error');
      return throwError(() => error);
    }
  }

  // === MASTER SCHEDULE SAVING ===

  saveCurrentMasterSchedule(): Observable<void> {
    console.log('[SchedulePersistenceService] Saving current master schedule');
    
    const currentSchedule = this.scheduleStateService.getMasterSchedule();
    if (!currentSchedule) {
      this.toastr.error('No master schedule to save', 'Save Error');
      throw new Error('No master schedule available to save');
    }

    if (!this.scheduleStateService.isInMemorySchedule()) {
      console.log('[SchedulePersistenceService] Master schedule already saved');
      this.toastr.info('Master schedule is already saved', 'Info');
      return of(void 0);
    }

    return this.saveMasterSchedule(currentSchedule).pipe(
      tap(savedSchedule => {
        this.scheduleStateService.setMasterSchedule(savedSchedule, false);
        this.scheduleStateService.markAsSaved();
        this.toastr.success('Master schedule saved successfully', 'Success');
        console.log(`[SchedulePersistenceService] Saved master schedule: ${savedSchedule.title}`);
      }),
      map(() => void 0)
    );
  }

  // Save master schedule to API
  private saveMasterSchedule(schedule: Schedule): Observable<Schedule> {
    if (schedule.id && schedule.id > 0) {
      // Update existing master schedule events
      return this.calendarService.updateMasterScheduleEvents(schedule.id, schedule.scheduleEvents || []);
    } else {
      // Create new master schedule
      const createResource: ScheduleCreateResource = {
        title: schedule.title,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        teachingDays: schedule.teachingDays
      };
      
      return this.calendarService.createMasterSchedule(createResource).pipe(
        switchMap(createdSchedule => {
          // After creating, update with events if any exist
          if (schedule.scheduleEvents && schedule.scheduleEvents.length > 0) {
            return this.calendarService.updateMasterScheduleEvents(
              createdSchedule.id, 
              schedule.scheduleEvents
            );
          }
          return of(createdSchedule);
        })
      );
    }
  }

  // === SCHEDULE SELECTION ===

  selectScheduleById(scheduleId: number): Observable<Schedule> {
    console.log(`[SchedulePersistenceService] Selecting schedule ID ${scheduleId}`);
    
    return this.calendarService.getSchedule(scheduleId).pipe(
      tap(schedule => {
        this.scheduleStateService.setMasterSchedule(schedule, false);
        console.log(`[SchedulePersistenceService] Selected schedule: ${schedule.title}`);
      }),
      catchError((error: any) => {
        console.error(`[SchedulePersistenceService] Failed to select schedule ID ${scheduleId}: ${error.message}`);
        throw error;
      })
    );
  }
  
  saveCurrentSchedule(): Observable<void> {
    // Alias for the existing saveCurrentMasterSchedule method
    return this.saveCurrentMasterSchedule();
  }

  // === SCHEDULE CONFIGURATION ===

  updateMasterScheduleConfig(config: {
    title?: string;
    startDate?: Date;
    endDate?: Date;
    teachingDays?: string[];
    isLocked?: boolean;
  }): Observable<void> {
    console.log('[SchedulePersistenceService] Updating master schedule config');
    
    const currentSchedule = this.scheduleStateService.getMasterSchedule();
    if (!currentSchedule) {
      this.toastr.error('No master schedule to update', 'Update Error');
      throw new Error('No master schedule available to update');
    }

    const configUpdate: ScheduleConfigUpdateResource = {
      id: currentSchedule.id,
      title: config.title || currentSchedule.title,
      startDate: config.startDate || currentSchedule.startDate,
      endDate: config.endDate || currentSchedule.endDate,
      teachingDays: config.teachingDays || currentSchedule.teachingDays,
      isLocked: config.isLocked !== undefined ? config.isLocked : currentSchedule.isLocked || false
    };

    return this.calendarService.updateScheduleConfig(configUpdate).pipe(
      tap(updatedSchedule => {
        this.scheduleStateService.updateMasterSchedule(updatedSchedule);
        this.toastr.success('Master schedule configuration updated', 'Success');
        console.log(`[SchedulePersistenceService] Updated master schedule config: ${updatedSchedule.title}`);
      }),
      map(() => void 0)
    );
  }

  // === MASTER SCHEDULE OPERATIONS ===

  createNewMasterSchedule(title: string, startDate: Date, endDate: Date, teachingDays: string[]): Observable<void> {
    console.log('[SchedulePersistenceService] Creating new master schedule');
    
    const createResource: ScheduleCreateResource = {
      title,
      startDate,
      endDate,
      teachingDays: teachingDays
    };

    return this.calendarService.createMasterSchedule(createResource).pipe(
      switchMap(newSchedule => {
        // Set as current master schedule
        this.scheduleStateService.setMasterSchedule(newSchedule, false);
        
        // Generate events for the new schedule
        return this.generateAndSetMasterSchedule();
      }),
      tap(() => {
        this.toastr.success('New master schedule created', 'Success');
        console.log('[SchedulePersistenceService] Created new master schedule successfully');
      })
    );
  }

  lockMasterSchedule(isLocked: boolean): Observable<void> {
    console.log(`[SchedulePersistenceService] ${isLocked ? 'Locking' : 'Unlocking'} master schedule`);
    
    return this.updateMasterScheduleConfig({ isLocked }).pipe(
      tap(() => {
        const message = isLocked ? 'Master schedule locked' : 'Master schedule unlocked';
        this.toastr.success(message, 'Success');
      })
    );
  }

  // === STATE DELEGATION METHODS ===

  canSaveMasterSchedule(): boolean {
    return this.scheduleStateService.canSaveSchedule();
  }

  hasUnsavedChanges(): boolean {
    return this.scheduleStateService.hasUnsavedChanges();
  }

  // === VALIDATION DELEGATION METHODS ===

  validateMasterScheduleForSaving(): { canSave: boolean; issues: string[] } {
    return this.scheduleValidationService.validateMasterScheduleForSaving();
  }

  getMasterScheduleStatus(): {
    hasSchedule: boolean;
    isInMemory: boolean;
    hasUnsavedChanges: boolean;
    canSave: boolean;
    title: string;
    eventCount: number;
  } {
    return this.scheduleValidationService.getMasterScheduleStatus();
  }

  // === CLEANUP AND UTILITIES ===

  clearMasterSchedule(): void {
    console.log('[SchedulePersistenceService] Clearing master schedule');
    this.scheduleStateService.clearMasterSchedule();
  }

  reloadMasterSchedule(): Observable<void> {
    console.log('[SchedulePersistenceService] Reloading master schedule');
    
    return this.loadMasterSchedule().pipe(
      switchMap(loaded => {
        if (!loaded) {
          // No existing schedule, generate new one
          return this.generateAndSetMasterSchedule();
        }
        return of(void 0);
      }),
      tap(() => {
        console.log('[SchedulePersistenceService] Master schedule reloaded');
      })
    );
  }

  getDebugInfo(): any {
    return this.scheduleValidationService.getDebugInfo();
  }
}