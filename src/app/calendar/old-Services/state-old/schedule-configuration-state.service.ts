// **COMPLETE FILE** - New schedule-configuration-state.service.ts
// RESPONSIBILITY: Schedule configuration state management with signals for fresh in-memory access
// DOES NOT: Handle API calls, form management, or schedule generation
// CALLED BY: ScheduleConfigurationService, ScheduleGenerationService, CalendarCoordinationService

import { Injectable, signal, computed } from '@angular/core';
import {ScheduleConfiguration, SchedulePeriodAssignment} from '../../../models/schedule-configuration.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleConfigurationStateService {

  // Private state signals
  private readonly _activeConfiguration = signal<ScheduleConfiguration | null>(null);
  private readonly _allConfigurations = signal<ScheduleConfiguration[]>([]);
  private readonly _isLoadingConfiguration = signal<boolean>(false);

  // Public readonly signals
  readonly activeConfiguration = this._activeConfiguration.asReadonly();
  readonly allConfigurations = this._allConfigurations.asReadonly();
  readonly isLoadingConfiguration = this._isLoadingConfiguration.asReadonly();

  // Computed signals
  readonly hasActiveConfiguration = computed(() =>
    this._activeConfiguration() !== null
  );

  readonly activeConfigurationTitle = computed(() =>
    this._activeConfiguration()?.title || 'No Configuration'
  );

  readonly activeConfigurationId = computed(() =>
    this._activeConfiguration()?.id || null
  );

  readonly canGenerateSchedule = computed(() => {
    const config = this._activeConfiguration();
    return config !== null &&
           config.periodsPerDay > 0 &&
           config.periodAssignments.length > 0;
  });

  // Computed signal for generation service compatibility
  readonly activeConfigurationPeriodAssignments = computed(() => {
    const config = this._activeConfiguration();
    return config?.periodAssignments || [];
  });

  readonly activeConfigurationPeriodsPerDay = computed(() => {
    const config = this._activeConfiguration();
    return config?.periodsPerDay || 0;
  });

  readonly activeConfigurationTeachingDays = computed(() => {
    const config = this._activeConfiguration();
    return config?.teachingDays || [];
  });

  readonly activeConfigurationDateRange = computed(() => {
    const config = this._activeConfiguration();
    return config ? {
      startDate: config.startDate,
      endDate: config.endDate
    } : null;
  });

  constructor() {
    console.log('[ScheduleConfigurationStateService] Initialized for configuration state management');
  }

  // === ACTIVE CONFIGURATION MANAGEMENT ===

  setActiveConfiguration(configuration: ScheduleConfiguration | null): void {
    this._activeConfiguration.set(configuration);

    if (configuration) {
      console.log('[ScheduleConfigurationStateService] Active configuration set:', {
        id: configuration.id,
        title: configuration.title,
        schoolYear: configuration.schoolYear,
        periodsPerDay: configuration.periodsPerDay,
        periodAssignments: configuration.periodAssignments.length,
        teachingDays: configuration.teachingDays.length
      });
    } else {
      console.log('[ScheduleConfigurationStateService] Active configuration cleared');
    }
  }

  getActiveConfiguration(): ScheduleConfiguration | null {
    return this._activeConfiguration();
  }

  addConfiguration(configuration: ScheduleConfiguration): void {
    const currentConfigs = this._allConfigurations();
    const updatedConfigs = [...currentConfigs, configuration];
    this._allConfigurations.set(updatedConfigs);

    console.log(`[ScheduleConfigurationStateService] Added configuration: ${configuration.title}`);
  }


  // === STATE RESET ===

  reset(): void {
    this._activeConfiguration.set(null);
    this._allConfigurations.set([]);
    this._isLoadingConfiguration.set(false);
    console.log('[ScheduleConfigurationStateService] State reset');
  }
}
