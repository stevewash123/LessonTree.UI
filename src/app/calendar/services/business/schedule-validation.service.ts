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

  // Public observables
  readonly validationCompleted$ = this._validationCompleted$.asObservable();
  readonly statusComputed$ = this._statusComputed$.asObservable();
  readonly configValidationCompleted$ = this._configValidationCompleted$.asObservable();

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
   * ✅ Enhanced: Check if schedule is valid with Observable event emission
   */
  isScheduleValid(schedule: Schedule): boolean {
    console.log(`[ScheduleValidationService] Checking schedule validity: ${schedule?.title || 'Unknown'}`);

    const issues: string[] = [];
    let isValid = true;

    // Basic schedule validation
    if (!schedule) {
      issues.push('Schedule object is null');
      isValid = false;
    } else {
      if (!schedule.title?.trim()) {
        issues.push('Schedule title is empty');
        isValid = false;
      }
    }

    // Configuration validation
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    if (!activeConfig) {
      issues.push('No active configuration for validation');
      isValid = false;
    } else {
      if (!activeConfig.startDate || !activeConfig.endDate) {
        issues.push('Configuration missing date range');
        isValid = false;
      }
      if (activeConfig.startDate && activeConfig.endDate &&
        new Date(activeConfig.startDate) >= new Date(activeConfig.endDate)) {
        issues.push('Configuration has invalid date range');
        isValid = false;
      }
    }

    console.log(`[ScheduleValidationService] Schedule validity check: ${isValid ? 'VALID' : 'INVALID'} (${issues.length} issues)`);

    // ✅ Emit schedule validity event
    this._validationCompleted$.next({
      validationType: 'schedule-validity',
      success: isValid,
      issues,
      scheduleId: schedule?.id,
      configurationId: activeConfig?.id,
      scheduleTitle: schedule?.title,
      eventCount: schedule?.scheduleEvents?.length || 0,
      timestamp: new Date()
    });

    return isValid;
  }

  /**
   * ✅ Enhanced: Validate schedule configuration with Observable event emission
   */
  validateScheduleConfig(config: {
    title?: string;
    startDate?: Date;
    endDate?: Date;
    teachingDays?: string[];
  }): { isValid: boolean; errors: string[] } {
    console.log('[ScheduleValidationService] Validating schedule configuration with event emission');

    const errors: string[] = [];

    // Title validation
    if (config.title !== undefined) {
      if (!config.title.trim()) {
        errors.push('Schedule title cannot be empty');
      }

      // ✅ Emit title validation event
      this._configValidationCompleted$.next({
        configurationType: 'title',
        fieldName: 'title',
        fieldValue: config.title,
        isValid: config.title.trim().length > 0,
        errors: config.title.trim().length > 0 ? [] : ['Title cannot be empty'],
        timestamp: new Date()
      });
    }

    // Date validation
    if (config.startDate && config.endDate) {
      const dateValid = config.startDate < config.endDate;
      if (!dateValid) {
        errors.push('End date must be after start date');
      }

      // ✅ Emit date validation event
      this._configValidationCompleted$.next({
        configurationType: 'dates',
        fieldName: 'dateRange',
        fieldValue: { startDate: config.startDate, endDate: config.endDate },
        isValid: dateValid,
        errors: dateValid ? [] : ['End date must be after start date'],
        timestamp: new Date()
      });
    }

    // Teaching days validation
    if (config.teachingDays !== undefined) {
      const teachingDaysValid = Array.isArray(config.teachingDays) && config.teachingDays.length > 0;
      if (!teachingDaysValid) {
        errors.push('At least one teaching day must be selected');
      }

      // ✅ Emit teaching days validation event
      this._configValidationCompleted$.next({
        configurationType: 'teaching-days',
        fieldName: 'teachingDays',
        fieldValue: config.teachingDays,
        isValid: teachingDaysValid,
        errors: teachingDaysValid ? [] : ['At least one teaching day required'],
        timestamp: new Date()
      });
    }

    const isValid = errors.length === 0;

    console.log(`[ScheduleValidationService] Configuration validation completed: ${isValid ? 'VALID' : 'INVALID'} (${errors.length} errors)`);

    // ✅ Emit complete configuration validation event
    this._configValidationCompleted$.next({
      configurationType: 'complete',
      isValid,
      errors: [...errors],
      timestamp: new Date()
    });

    return { isValid, errors };
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

  // === CONVENIENCE METHODS (Enhanced with Quick Validation) ===

  /**
   * ✅ NEW: Quick validation check with minimal event emission
   */
  quickValidationCheck(): boolean {
    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    const isValid = !!(currentSchedule && activeConfig && currentSchedule.title?.trim());

    // ✅ Emit quick check status
    this._statusComputed$.next({
      statusType: 'quick-check',
      hasSchedule: !!currentSchedule,
      isInMemory: this.scheduleStateService.isInMemorySchedule(),
      hasUnsavedChanges: this.scheduleStateService.hasUnsavedChanges(),
      canSave: isValid,
      issueCount: isValid ? 0 : 1,
      criticalIssues: isValid ? [] : ['Basic validation failed'],
      eventCount: currentSchedule?.scheduleEvents?.length || 0,
      configurationValid: !!activeConfig,
      timestamp: new Date()
    });

    return isValid;
  }

  /**
   * ✅ NEW: Get current validation issues without full validation
   */
  getCurrentValidationIssues(): string[] {
    const validation = this.validateScheduleForSaving();
    return validation.issues;
  }

  /**
   * ✅ NEW: Check if schedule can be saved (optimized)
   */
  canSaveSchedule(): boolean {
    const validation = this.validateScheduleForSaving();
    return validation.canSave;
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
