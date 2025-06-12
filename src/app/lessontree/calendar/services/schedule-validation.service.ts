// RESPONSIBILITY: Schedule validation and status queries
// DOES NOT: Handle persistence, state management, or user configuration
// CALLED BY: SchedulePersistenceService and calendar components for validation

import { Injectable } from '@angular/core';
import { ScheduleStateService } from './schedule-state.service';
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

  constructor(private scheduleStateService: ScheduleStateService) {
    console.log('[ScheduleValidationService] Initialized for schedule validation');
  }

  // Validate that master schedule can be saved
  validateMasterScheduleForSaving(): ScheduleValidationResult {
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

  // Get comprehensive status of master schedule
  getMasterScheduleStatus(): ScheduleStatus {
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

  // Check if specific schedule is valid
  isScheduleValid(schedule: Schedule): boolean {
    if (!schedule) return false;
    if (!schedule.title?.trim()) return false;
    if (!schedule.startDate || !schedule.endDate) return false;
    if (new Date(schedule.startDate) >= new Date(schedule.endDate)) return false;
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
    const scheduleStatus = this.getMasterScheduleStatus();
    const validation = this.validateMasterScheduleForSaving();
    
    return {
      ...scheduleStatus,
      validation,
      stateDebugInfo: this.scheduleStateService.getDebugInfo(),
      validationService: {
        initialized: true,
        canValidate: true
      }
    };
  }
}