// RESPONSIBILITY: Handles master schedule persistence operations (load, save, generate) and coordinates with state management.
// DOES NOT: Generate schedule events, manage UI state, or handle period logic - delegates to specialized services.
// CALLED BY: CalendarCoordinationService for master schedule persistence operations.
import { Injectable } from '@angular/core';
import { Observable, of, catchError, map, switchMap, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ScheduleStateService } from './schedule-state.service';
import { ScheduleGenerationService } from './schedule-generation.service';
import { LessonCalendarService } from './lesson-calendar.service';
import { UserService } from '../../../core/services/user.service';
import { Schedule, ScheduleCreateResource, ScheduleConfigUpdateResource } from '../../../models/schedule';
import { parseId } from '../../../core/utils/type-conversion.utils';
import { formatTeachingDaysToString } from '../../../models/schedule-model-utils';

@Injectable({
  providedIn: 'root'
})
export class SchedulePersistenceService {

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleGenerationService: ScheduleGenerationService,
    private calendarService: LessonCalendarService,
    private userService: UserService,
    private toastr: ToastrService
  ) {
    console.log('[SchedulePersistenceService] Initialized for master schedule persistence');
  }

  // === MASTER SCHEDULE LOADING ===

  // Load master schedule for current user
  loadMasterSchedule(): Observable<boolean> {
    console.log('[SchedulePersistenceService] Loading master schedule');
    
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      console.warn('[SchedulePersistenceService] No current user available');
      return of(false);
    }

    const userId = parseId(currentUser.id);
    if (!userId) {
      console.warn('[SchedulePersistenceService] Invalid user ID');
      return of(false);
    }

    return this.calendarService.getMasterScheduleForUser(userId).pipe(
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

  // Generate and set master schedule in state
  generateAndSetMasterSchedule(): Observable<void> {
    console.log('[SchedulePersistenceService] Generating master schedule');
    
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
      });
      
      console.error('[SchedulePersistenceService] Failed to generate master schedule');
      throw new Error('Master schedule generation failed');
    }
  }

  // === MASTER SCHEDULE SAVING ===

  // Save current master schedule
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
      // Update existing schedule
      return this.calendarService.updateMasterSchedule(schedule);
    } else {
      // Create new schedule
      const createResource: ScheduleCreateResource = {
        title: schedule.title,
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        teachingDays: formatTeachingDaysToString(schedule.teachingDays)
      };
      
      return this.calendarService.createMasterSchedule(createResource);
    }
  }

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
  
  loadSchedulesForCourse(courseId: number): Observable<Schedule[]> {
    console.log(`[SchedulePersistenceService] Loading schedules for course ID ${courseId}`);
    
    return this.calendarService.getSchedulesByCourse(courseId).pipe(
      tap(schedules => {
        console.log(`[SchedulePersistenceService] Loaded ${schedules.length} schedules for course ID ${courseId}`);
      }),
      catchError((error: any) => {
        console.error(`[SchedulePersistenceService] Failed to load schedules for course ID ${courseId}: ${error.message}`);
        throw error;
      })
    );
  }

  // === SCHEDULE CONFIGURATION ===

  // Update master schedule configuration
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
      teachingDays: config.teachingDays ? 
        config.teachingDays.join(',') : 
        formatTeachingDaysToString(currentSchedule.teachingDays),
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

  // Create new master schedule (replaces current)
  createNewMasterSchedule(title: string, startDate: Date, endDate: Date, teachingDays: string[]): Observable<void> {
    console.log('[SchedulePersistenceService] Creating new master schedule');
    
    const createResource: ScheduleCreateResource = {
      title,
      startDate,
      endDate,
      teachingDays: teachingDays.join(',')
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

  // Lock/unlock master schedule
  lockMasterSchedule(isLocked: boolean): Observable<void> {
    console.log(`[SchedulePersistenceService] ${isLocked ? 'Locking' : 'Unlocking'} master schedule`);
    
    return this.updateMasterScheduleConfig({ isLocked }).pipe(
      tap(() => {
        const message = isLocked ? 'Master schedule locked' : 'Master schedule unlocked';
        this.toastr.success(message, 'Success');
      })
    );
  }

  // === SCHEDULE VALIDATION ===

  // Validate current master schedule can be saved
  validateMasterScheduleForSaving(): { canSave: boolean; issues: string[] } {
    const currentSchedule = this.scheduleStateService.getMasterSchedule();
    const issues: string[] = [];

    if (!currentSchedule) {
      issues.push('No master schedule available');
      return { canSave: false, issues };
    }

    if (!currentSchedule.title?.trim()) {
      issues.push('Schedule title is required');
    }

    if (!currentSchedule.startDate || !currentSchedule.endDate) {
      issues.push('Start and end dates are required');
    }

    if (currentSchedule.startDate && currentSchedule.endDate && 
        new Date(currentSchedule.startDate) >= new Date(currentSchedule.endDate)) {
      issues.push('End date must be after start date');
    }

    const eventCount = currentSchedule.scheduleEvents?.length || 0;
    if (eventCount === 0) {
      issues.push('Schedule has no events');
    }

    return {
      canSave: issues.length === 0,
      issues
    };
  }

  // === STATE QUERIES ===

  // Check if master schedule can be saved
  canSaveMasterSchedule(): boolean {
    return this.scheduleStateService.canSaveSchedule();
  }

  // Check if master schedule has unsaved changes
  hasUnsavedChanges(): boolean {
    return this.scheduleStateService.hasUnsavedChanges();
  }

  // Get master schedule save status
  getMasterScheduleStatus(): {
    hasSchedule: boolean;
    isInMemory: boolean;
    hasUnsavedChanges: boolean;
    canSave: boolean;
    title: string;
    eventCount: number;
  } {
    const currentSchedule = this.scheduleStateService.getMasterSchedule();
    
    return {
      hasSchedule: currentSchedule !== null,
      isInMemory: this.scheduleStateService.isInMemorySchedule(),
      hasUnsavedChanges: this.scheduleStateService.hasUnsavedChanges(),
      canSave: this.scheduleStateService.canSaveSchedule(),
      title: currentSchedule?.title || 'No Schedule',
      eventCount: currentSchedule?.scheduleEvents?.length || 0
    };
  }

  // === CLEANUP AND UTILITIES ===

  // Clear current master schedule
  clearMasterSchedule(): void {
    console.log('[SchedulePersistenceService] Clearing master schedule');
    this.scheduleStateService.clearMasterSchedule();
  }

  // Reload master schedule from scratch
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

  // Get debug information
  getDebugInfo(): any {
    const scheduleStatus = this.getMasterScheduleStatus();
    const validation = this.validateMasterScheduleForSaving();
    
    return {
      ...scheduleStatus,
      validation,
      stateDebugInfo: this.scheduleStateService.getDebugInfo()
    };
  }
}