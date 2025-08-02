// **NEW FILE** - ScheduleBasicOperationsService
// src/app/calendar/services/coordination/schedule-basic-operations.service.ts
// RESPONSIBILITY: Basic schedule operations without complex workflow coordination
// EXTRACTED FROM: ScheduleWorkflowCoordinationService (facade methods only)
// DOES NOT: Handle complex workflow coordination, lesson integration, Observable emission

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { SchedulePersistenceService } from '../ui/schedule-persistence.service';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduleBasicOperationsService {

  constructor(
    private schedulePersistence: SchedulePersistenceService,
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService
  ) {
    console.log('[ScheduleBasicOperationsService] Basic schedule operations service initialized');
  }

  /**
   * Load active schedule with configuration
   * SIMPLIFIED: Direct delegation to persistence service
   */
  loadActiveScheduleWithConfiguration(): Observable<boolean> {
    console.log('[ScheduleBasicOperationsService] Loading active schedule with configuration');

    return this.schedulePersistence.loadActiveSchedule().pipe(
      map((loaded: boolean) => {
        if (loaded) {
          console.log('[ScheduleBasicOperationsService] ✅ Active schedule loaded successfully');
        } else {
          console.log('[ScheduleBasicOperationsService] ❌ No active schedule found');
        }
        return loaded;
      })
    );
  }

  /**
   * Save current schedule
   * SIMPLIFIED: Direct delegation to persistence service
   */
  saveCurrentSchedule(): Observable<void> {
    console.log('[ScheduleBasicOperationsService] Saving current schedule');

    return this.schedulePersistence.saveCurrentSchedule().pipe(
      map(() => {
        console.log('[ScheduleBasicOperationsService] ✅ Schedule saved successfully');
        return void 0;
      })
    );
  }

  /**
   * Check if we have a schedule that can be saved
   */
  canSaveSchedule(): boolean {
    return this.scheduleStateService.canSaveSchedule();
  }

  /**
   * Check if we have an active schedule
   */
  hasActiveSchedule(): boolean {
    return this.scheduleStateService.hasActiveSchedule();
  }

  /**
   * Check if we have schedule configuration
   */
  hasScheduleConfiguration(): boolean {
    const config = this.scheduleConfigurationStateService.activeConfiguration();
    return config !== null && config !== undefined;
  }

  /**
   * Get basic schedule info for display
   */
  getScheduleInfo(): { title: string; eventCount: number; isInMemory: boolean } | null {
    const schedule = this.scheduleStateService.getSchedule();
    if (!schedule) return null;

    return {
      title: schedule.title,
      eventCount: schedule.scheduleEvents?.length || 0,
      isInMemory: this.scheduleStateService.isInMemorySchedule()
    };
  }
}
