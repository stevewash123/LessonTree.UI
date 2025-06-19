// RESPONSIBILITY: Schedule validation and status queries
// DOES NOT: Handle persistence, state management, or user configuration
// CALLED BY: SchedulePersistenceService and calendar components for validation

import { Injectable } from '@angular/core';
import { ScheduleStateService } from './schedule-state.service';
import { ScheduleConfigurationStateService } from './schedule-configuration-state.service';
import { Schedule } from '../../../models/schedule';

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

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService
  ) {
    console.log('[ScheduleValidationService] Initialized for schedule validation');
  }

  // Validate that  schedule can be saved
  validateScheduleForSaving(): ScheduleValidationResult {
    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    const issues: string[] = [];

    if (!currentSchedule) {
      issues.push('No  schedule available');
      return { canSave: false, issues };
    }

    if (!currentSchedule.title?.trim()) {
      issues.push('Schedule title is required');
    }

    if (!activeConfig) {
      issues.push('No active configuration available');
      return { canSave: false, issues };
    }

    if (!activeConfig.startDate || !activeConfig.endDate) {
      issues.push('Start and end dates are required in configuration');
    }

    if (activeConfig.startDate && activeConfig.endDate && 
        new Date(activeConfig.startDate) >= new Date(activeConfig.endDate)) {
      issues.push('End date must be after start date in configuration');
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

  // Get comprehensive status of  schedule
  getScheduleStatus(): ScheduleStatus {
    const currentSchedule = this.scheduleStateService.getSchedule();
    
    return {
      hasSchedule: currentSchedule !== null,
      isInMemory: this.scheduleStateService.isInMemorySchedule(),
      hasUnsavedChanges: this.scheduleStateService.hasUnsavedChanges(),
      canSave: this.scheduleStateService.canSaveSchedule(),
      title: currentSchedule?.title || 'No Schedule',
      eventCount: currentSchedule?.scheduleEvents?.length || 0
    };
  }

  // Check if specific schedule is valid
  isScheduleValid(schedule: Schedule): boolean {
    if (!schedule) return false;
    if (!schedule.title?.trim()) return false;
    
    // Get date validation from active configuration
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    if (!activeConfig) return false;
    
    if (!activeConfig.startDate || !activeConfig.endDate) return false;
    if (new Date(activeConfig.startDate) >= new Date(activeConfig.endDate)) return false;
    return true;
  }

  // Validate schedule configuration
  validateScheduleConfig(config: {
    title?: string;
    startDate?: Date;
    endDate?: Date;
    teachingDays?: string[];
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.title !== undefined && !config.title.trim()) {
      errors.push('Schedule title cannot be empty');
    }

    if (config.startDate && config.endDate) {
      if (config.startDate >= config.endDate) {
        errors.push('End date must be after start date');
      }
    }

    if (config.teachingDays !== undefined) {
      if (!Array.isArray(config.teachingDays) || config.teachingDays.length === 0) {
        errors.push('At least one teaching day must be selected');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get debug information about validation state
  getDebugInfo(): any {
    const scheduleStatus = this.getScheduleStatus();
    const validation = this.validateScheduleForSaving();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    
    return {
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
        canValidate: true
      }
    };
  }
}