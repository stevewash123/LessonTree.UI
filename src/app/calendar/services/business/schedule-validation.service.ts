// **COMPLETE FILE** - ScheduleValidationService with dual Signal/Observable pattern
// RESPONSIBILITY: Schedule validation with Observable events for cross-component workflow coordination
// DOES NOT: Handle persistence, state management, or user configuration
// CALLED BY: SchedulePersistenceService and calendar components for validation with event emission

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { Schedule } from '../../../models/schedule';

// ✅ Observable event interfaces for validation workflows
export interface ScheduleValidationEvent {
  validationType: 'schedule-save' | 'schedule-config' | 'schedule-validity' | 'schedule-status';
  success: boolean;
  issues: string[];
  scheduleId?: number;
  configurationId?: number;
  scheduleTitle?: string;
  eventCount?: number;
  canSave?: boolean;
  timestamp: Date;
}

export interface ValidationStatusEvent {
  statusType: 'comprehensive' | 'quick-check' | 'debug-info';
  hasSchedule: boolean;
  isInMemory: boolean;
  hasUnsavedChanges: boolean;
  canSave: boolean;
  issueCount: number;
  criticalIssues: string[];
  eventCount: number;
  configurationValid: boolean;
  timestamp: Date;
}

export interface ConfigValidationEvent {
  configurationType: 'title' | 'dates' | 'teaching-days' | 'complete';
  fieldName?: string;
  fieldValue?: any;
  isValid: boolean;
  errors: string[];
  timestamp: Date;
}

// Legacy interfaces (keep for compatibility)
export interface ScheduleValidationResult {
  canSave: boolean;
  issues: string[];
}

export interface ScheduleStatus {
  hasSchedule: boolean;
  isInMemory: boolean;
  hasUnsavedChanges: boolean;
  canSave: boolean;
  title: string;
  eventCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleValidationService {

  // ✅ Observable event emissions following established pattern
  private readonly _validationCompleted$ = new Subject<ScheduleValidationEvent>();
  private readonly _statusComputed$ = new Subject<ValidationStatusEvent>();
  private readonly _configValidationCompleted$ = new Subject<ConfigValidationEvent>();

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService
  ) {
    console.log('[ScheduleValidationService] Enhanced with comprehensive Observable events for validation workflows');
  }

  // === ENHANCED SCHEDULE VALIDATION WITH OBSERVABLE EVENTS ===

  /**
   * ✅ Enhanced: Validate schedule for saving with Observable event emission
   */
  validateScheduleForSaving(): ScheduleValidationResult {
    console.log('[ScheduleValidationService] Validating schedule for saving with event emission');

    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    const issues: string[] = [];

    // Validate schedule exists
    if (!currentSchedule) {
      issues.push('No schedule available');

      // ✅ Emit validation event for missing schedule
      this._validationCompleted$.next({
        validationType: 'schedule-save',
        success: false,
        issues: [...issues],
        canSave: false,
        timestamp: new Date()
      });

      return { canSave: false, issues };
    }

    // Validate schedule title
    if (!currentSchedule.title?.trim()) {
      issues.push('Schedule title is required');
    }

    // Validate configuration exists
    if (!activeConfig) {
      issues.push('No active configuration available');

      // ✅ Emit validation event for missing configuration
      this._validationCompleted$.next({
        validationType: 'schedule-save',
        success: false,
        issues: [...issues],
        scheduleId: currentSchedule.id,
        scheduleTitle: currentSchedule.title,
        eventCount: currentSchedule.scheduleEvents?.length || 0,
        canSave: false,
        timestamp: new Date()
      });

      return { canSave: false, issues };
    }

    // Validate configuration dates
    if (!activeConfig.startDate || !activeConfig.endDate) {
      issues.push('Start and end dates are required in configuration');
    }

    if (activeConfig.startDate && activeConfig.endDate &&
      new Date(activeConfig.startDate) >= new Date(activeConfig.endDate)) {
      issues.push('End date must be after start date in configuration');
    }

    // Validate schedule events
    const eventCount = currentSchedule.scheduleEvents?.length || 0;
    if (eventCount === 0) {
      issues.push('Schedule has no events');
    }

    const canSave = issues.length === 0;
    const success = canSave;

    console.log(`[ScheduleValidationService] Schedule validation completed: ${success ? 'VALID' : 'INVALID'} (${issues.length} issues)`);

    // ✅ Emit comprehensive validation event
    this._validationCompleted$.next({
      validationType: 'schedule-save',
      success,
      issues: [...issues],
      scheduleId: currentSchedule.id,
      configurationId: activeConfig.id,
      scheduleTitle: currentSchedule.title,
      eventCount,
      canSave,
      timestamp: new Date()
    });

    return { canSave, issues };
  }

  /**
   * ✅ Enhanced: Get schedule status with Observable event emission
   */
  getScheduleStatus(): ScheduleStatus {
    console.log('[ScheduleValidationService] Computing schedule status with event emission');

    const currentSchedule = this.scheduleStateService.getSchedule();
    const hasSchedule = currentSchedule !== null;
    const isInMemory = this.scheduleStateService.isInMemorySchedule();
    const hasUnsavedChanges = this.scheduleStateService.hasUnsavedChanges();
    const canSave = this.scheduleStateService.canSaveSchedule();
    const title = currentSchedule?.title || 'No Schedule';
    const eventCount = currentSchedule?.scheduleEvents?.length || 0;

    // Quick validation check
    const validation = hasSchedule ? this.validateScheduleForSaving() : { canSave: false, issues: ['No schedule'] };
    const criticalIssues = validation.issues.filter(issue =>
      issue.includes('required') || issue.includes('No schedule') || issue.includes('No active configuration')
    );

    // Check configuration validity
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    const configurationValid = !!activeConfig && !!activeConfig.startDate && !!activeConfig.endDate;

    console.log(`[ScheduleValidationService] Status computed: hasSchedule=${hasSchedule}, canSave=${canSave}, issues=${validation.issues.length}`);

    // ✅ Emit status computation event
    this._statusComputed$.next({
      statusType: 'comprehensive',
      hasSchedule,
      isInMemory,
      hasUnsavedChanges,
      canSave,
      issueCount: validation.issues.length,
      criticalIssues,
      eventCount,
      configurationValid,
      timestamp: new Date()
    });

    return {
      hasSchedule,
      isInMemory,
      hasUnsavedChanges,
      canSave,
      title,
      eventCount
    };
  }


  /**
   * ✅ Enhanced: Get debug information with Observable event emission
   */
  getDebugInfo(): any {
    console.log('[ScheduleValidationService] Generating debug information with event emission');

    const scheduleStatus = this.getScheduleStatus();
    const validation = this.validateScheduleForSaving();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    const debugInfo = {
      ...scheduleStatus,
      validation,
      activeConfiguration: {
        id: activeConfig?.id || null,
        title: activeConfig?.title || null,
        schoolYear: activeConfig?.schoolYear || null,
        startDate: activeConfig?.startDate || null,
        endDate: activeConfig?.endDate || null,
        teachingDays: activeConfig?.teachingDays || [],
        periodsPerDay: activeConfig?.periodsPerDay || 0
      },
      stateDebugInfo: this.scheduleStateService.getDebugInfo(),
      validationService: {
        initialized: true,
        canValidate: true,
        eventEmissionEnabled: true
      }
    };

    // ✅ Emit debug info status event
    this._statusComputed$.next({
      statusType: 'debug-info',
      hasSchedule: scheduleStatus.hasSchedule,
      isInMemory: scheduleStatus.isInMemory,
      hasUnsavedChanges: scheduleStatus.hasUnsavedChanges,
      canSave: scheduleStatus.canSave,
      issueCount: validation.issues.length,
      criticalIssues: validation.issues.filter(issue => issue.includes('required')),
      eventCount: scheduleStatus.eventCount,
      configurationValid: !!activeConfig,
      timestamp: new Date()
    });

    console.log('[ScheduleValidationService] Debug information generated with comprehensive status');
    return debugInfo;
  }


  // === CLEANUP ===

  /**
   * ✅ Complete Observable cleanup following established pattern
   */
  ngOnDestroy(): void {
    this._validationCompleted$.complete();
    this._statusComputed$.complete();
    this._configValidationCompleted$.complete();
    console.log('[ScheduleValidationService] All Observable subjects completed');
  }
}
