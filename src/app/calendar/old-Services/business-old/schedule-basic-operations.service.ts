// **NEW FILE** - ScheduleBasicOperationsService
// src/app/calendar/services/coordination/schedule-basic-operations.service.ts
// RESPONSIBILITY: Basic schedule operations without complex workflow coordination
// EXTRACTED FROM: ScheduleWorkflowCoordinationService (facade methods only)
// DOES NOT: Handle complex workflow coordination, lesson integration, Observable emission

import { Injectable } from '@angular/core';
import {Observable, tap} from 'rxjs';
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
    console.log('[ScheduleBasicOperationsService] 🔍 Starting loadActiveScheduleWithConfiguration');

    return this.schedulePersistence.loadActiveSchedule().pipe(
        tap((loaded: boolean) => {
          console.log('[ScheduleBasicOperationsService] 📋 Persistence result:', loaded);

          // ✅ Additional verification
          const hasSchedule = this.scheduleStateService.hasActiveSchedule();
          const hasConfig = this.scheduleConfigurationStateService.hasActiveConfiguration();

          console.log('[ScheduleBasicOperationsService] 🔍 State check after load:', {
            persistenceReturned: loaded,
            hasScheduleState: hasSchedule,
            hasConfigState: hasConfig,
            mismatch: loaded !== (hasSchedule && hasConfig)
          });

          if (loaded && (!hasSchedule || !hasConfig)) {
            console.error('[ScheduleBasicOperationsService] ❌ MISMATCH: Persistence says success but states not set');
          }
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

  hasCompleteScheduleData(): boolean {
    const hasSchedule = this.scheduleStateService.hasActiveSchedule();
    const hasConfig = this.scheduleConfigurationStateService.hasActiveConfiguration();

    console.log('[ScheduleBasicOperationsService] 🔍 Complete data check:', {
      hasSchedule,
      hasConfig,
      isComplete: hasSchedule && hasConfig,
      scheduleId: this.scheduleStateService.getSchedule()?.id,
      configId: this.scheduleConfigurationStateService.activeConfiguration()?.id
    });

    return hasSchedule && hasConfig;
  }

}
