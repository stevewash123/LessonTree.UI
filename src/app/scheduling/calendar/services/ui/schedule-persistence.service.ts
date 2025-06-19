// **COMPLETE FILE** - Cleaned schedule-persistence.service.ts
// RESPONSIBILITY: Pure schedule persistence operations (HTTP only)
// DOES NOT: Handle orchestration, validation, UI notifications, or state management - pure HTTP operations
// CALLED BY: ScheduleCoordinationService for HTTP persistence operations

import { Injectable } from '@angular/core';
import { Observable, of, map, tap, catchError } from 'rxjs';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleApiService } from '../api/schedule-api.service';
import { Schedule, ScheduleCreateResource } from '../../../../models/schedule';

@Injectable({
  providedIn: 'root'
})
export class SchedulePersistenceService {

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleApiService: ScheduleApiService
  ) {
    console.log('[SchedulePersistenceService] Initialized for pure schedule persistence');
  }

  // === SCHEDULE LOADING ===

  /**
   * Load active schedule from API and set in state
   * Pure HTTP operation with state update
   */
  loadActiveSchedule(): Observable<boolean> {
    console.log('[SchedulePersistenceService] Loading active schedule for current user');
    
    return this.scheduleApiService.getActiveSchedule().pipe(
      tap(schedule => {
        if (schedule) {
          console.log(`[SchedulePersistenceService] Loaded active schedule: ${schedule.title}`);
          this.scheduleStateService.setSchedule(schedule, false);
        } else {
          console.log('[SchedulePersistenceService] No existing active schedule found');
        }
      }),
      map(schedule => schedule !== null),
      catchError((error: any) => {
        console.warn('[SchedulePersistenceService] Failed to load active schedule:', error.message);
        return of(false);
      })
    );
  }

  // === SCHEDULE SAVING ===

  /**
   * Save current schedule from state to API
   * Pure HTTP operation with state update
   */
  saveCurrentSchedule(): Observable<void> {
    console.log('[SchedulePersistenceService] Saving current schedule');
    
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      throw new Error('No schedule available to save');
    }

    if (!this.scheduleStateService.isInMemorySchedule()) {
      console.log('[SchedulePersistenceService] Schedule already saved');
      return of(void 0);
    }

    return this.saveSchedule(currentSchedule).pipe(
      tap(savedSchedule => {
        this.scheduleStateService.setSchedule(savedSchedule, false);
        this.scheduleStateService.markAsSaved();
        console.log(`[SchedulePersistenceService] Saved schedule: ${savedSchedule.title}`);
      }),
      map(() => void 0)
    );
  }

  /**
   * Save schedule to API - handles create vs update
   * Pure HTTP operation
   */
  private saveSchedule(schedule: Schedule): Observable<Schedule> {
    if (schedule.id && schedule.id > 0) {
      // Update existing schedule events
      return this.scheduleApiService.updateScheduleEvents(schedule.id, schedule.scheduleEvents || []);
    } else {
      // Create new schedule with events in single API call
      const createResource: ScheduleCreateResource = {
        title: schedule.title,
        scheduleConfigurationId: schedule.scheduleConfigurationId,
        scheduleEvents: schedule.scheduleEvents
      };
      
      return this.scheduleApiService.createSchedule(createResource);
    }
  }

  // === SCHEDULE CREATION ===

  /**
   * Create new schedule via API and set in state
   * Pure HTTP operation with state update
   */
  createNewSchedule(createResource: ScheduleCreateResource): Observable<Schedule> {
    console.log('[SchedulePersistenceService] Creating new schedule');
    
    return this.scheduleApiService.createSchedule(createResource).pipe(
      tap(newSchedule => {
        this.scheduleStateService.setSchedule(newSchedule, false);
        console.log(`[SchedulePersistenceService] Created new schedule: ${newSchedule.title}`);
      })
    );
  }

  // === SCHEDULE SELECTION ===

  /**
   * Select schedule by ID and set in state
   * Pure HTTP operation with state update
   */
  selectScheduleById(scheduleId: number): Observable<Schedule> {
    console.log(`[SchedulePersistenceService] Selecting schedule ID ${scheduleId}`);
    
    return this.scheduleApiService.getSchedule(scheduleId).pipe(
      tap(schedule => {
        this.scheduleStateService.setSchedule(schedule, false);
        console.log(`[SchedulePersistenceService] Selected schedule: ${schedule.title}`);
      }),
      catchError((error: any) => {
        console.error(`[SchedulePersistenceService] Failed to select schedule ID ${scheduleId}: ${error.message}`);
        throw error;
      })
    );
  }

  // === SCHEDULE DELETION ===

  /**
   * Delete schedule via API and clear state
   * Pure HTTP operation with state update
   */
  deleteSchedule(scheduleId: number): Observable<void> {
    console.log(`[SchedulePersistenceService] Deleting schedule ID ${scheduleId}`);
    
    return this.scheduleApiService.deleteSchedule(scheduleId).pipe(
      tap(() => {
        this.scheduleStateService.clearSchedule();
        console.log(`[SchedulePersistenceService] Deleted schedule ID ${scheduleId}`);
      })
    );
  }

  // === UTILITY METHODS ===

  /**
   * Clear schedule state
   */
  clearSchedule(): void {
    console.log('[SchedulePersistenceService] Clearing schedule');
    this.scheduleStateService.clearSchedule();
  }

  /**
   * Get current schedule from state (convenience method)
   */
  getCurrentSchedule(): Schedule | null {
    return this.scheduleStateService.getSchedule();
  }

  /**
   * Check if current schedule is in memory
   */
  isCurrentScheduleInMemory(): boolean {
    return this.scheduleStateService.isInMemorySchedule();
  }

  /**
   * Check if current schedule has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.scheduleStateService.hasUnsavedChanges();
  }

  // === DEBUG INFO ===

  getDebugInfo(): any {
    return {
      currentSchedule: {
        hasSchedule: !!this.getCurrentSchedule(),
        scheduleId: this.getCurrentSchedule()?.id || null,
        isInMemory: this.isCurrentScheduleInMemory(),
        hasUnsavedChanges: this.hasUnsavedChanges()
      },
      persistenceService: {
        initialized: true,
        dependencies: ['ScheduleStateService', 'ScheduleApiService'],
        responsibilities: ['HTTP operations', 'State updates'],
        doesNot: ['Orchestration', 'Validation', 'UI notifications']
      }
    };
  }
}