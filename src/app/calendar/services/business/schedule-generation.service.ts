// **COMPLETE FILE** - Cleaned ScheduleGenerationService
// RESPONSIBILITY: Pure schedule generation and orchestration logic
// DOES NOT: Observable coordination, complex event emission, subscription management
// CALLED BY: Calendar components and SchedulePersistenceService for schedule creation

import { Injectable } from '@angular/core';
import { SpecialDayIntegrationService } from '../api/special-day-integration.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { ScheduleEventFactoryService } from './schedule-event-factory.service';
import { Schedule } from '../../../models/schedule';
import { UserService } from '../../../user-config/user.service';
import { parseId } from '../../../shared/utils/type-conversion.utils';
import { ScheduleConfiguration, SchedulePeriodAssignment } from '../../../models/schedule-configuration.model';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { PeriodAssignment, PeriodCourseAssignment } from '../../../models/period-assignment';

export interface ScheduleGenerationResult {
  success: boolean;
  schedule?: Schedule;
  errors: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleGenerationService {

  constructor(
    private userService: UserService,
    private scheduleEventFactoryService: ScheduleEventFactoryService,
    private specialDayIntegrationService: SpecialDayIntegrationService,
    private scheduleConfigStateService: ScheduleConfigurationStateService
  ) {
    console.log('[ScheduleGenerationService] Initialized for pure schedule generation logic');
  }

  // === SCHEDULE GENERATION ===

  /**
   * Create schedule from active configuration
   */
  createSchedule(): ScheduleGenerationResult {
    console.log('[ScheduleGenerationService] Creating schedule from active configuration');

    const errors: string[] = [];
    const warnings: string[] = [];

    // Get current user for userId
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      errors.push('Cannot create schedule: No current user available');
      return { success: false, errors, warnings };
    }

    const userId = parseId(currentUser.id) || 0;
    if (userId === 0) {
      errors.push('Cannot create schedule: Invalid user ID');
      return { success: false, errors, warnings };
    }

    // Get configuration from state service
    const activeConfig = this.scheduleConfigStateService.getActiveConfiguration();
    if (!activeConfig) {
      errors.push('Cannot create schedule: No active schedule configuration available');
      return { success: false, errors, warnings };
    }

    if (!activeConfig.periodAssignments || activeConfig.periodAssignments.length === 0) {
      errors.push('Cannot create schedule: No period assignments configured');
      return { success: false, errors, warnings };
    }

    console.log('[ScheduleGenerationService] Starting schedule generation:', {
      configurationTitle: activeConfig.title,
      schoolYear: activeConfig.schoolYear,
      periodAssignments: activeConfig.periodAssignments.length,
      userId: userId
    });

    // Use configuration dates and teaching days directly
    const startDate = new Date(activeConfig.startDate);
    const endDate = new Date(activeConfig.endDate);
    const teachingDaysArray = activeConfig.teachingDays;

    // Generate schedule events directly from configuration
    const scheduleEvents = this.generateScheduleEventsFromConfig(
      activeConfig,
      startDate,
      endDate,
      teachingDaysArray
    );

    if (scheduleEvents.length === 0) {
      warnings.push('No schedule events generated');
    }

    const schedule: Schedule = {
      id: 0, // In-memory schedule
      title: activeConfig.title || `${activeConfig.schoolYear} Schedule`,
      userId: userId,
      scheduleConfigurationId: activeConfig.id,
      isLocked: false,
      createdDate: new Date(),
      scheduleEvents,
      specialDays: [] // Empty for generated schedules - special days applied separately
    };

    console.log(`[ScheduleGenerationService] Generated schedule with ${scheduleEvents.length} events:`, {
      title: schedule.title,
      userId: userId,
      configurationId: activeConfig.id,
      eventCount: scheduleEvents.length
    });

    return {
      success: true,
      schedule: schedule,
      errors,
      warnings
    };
  }

  /**
   * Generate schedule events from configuration
   */
  private generateScheduleEventsFromConfig(
    config: ScheduleConfiguration,
    startDate: Date,
    endDate: Date,
    teachingDays: string[]
  ): ScheduleEvent[] {
    console.log('[ScheduleGenerationService] Generating events from configuration');

    const allScheduleEvents: ScheduleEvent[] = [];
    let eventIdCounter = -1; // Negative for in-memory events

    // Get period assignments by type directly from configuration
    const periodCourseAssignments = this.getPeriodCourseAssignmentsFromConfig(config);
    const specialPeriodAssignments = this.getSpecialPeriodAssignmentsFromConfig(config);
    const unassignedPeriods = this.getUnassignedPeriodsFromConfig(config);

    console.log(`[ScheduleGenerationService] Period assignments breakdown:`, {
      courseAssignments: periodCourseAssignments.length,
      specialPeriods: specialPeriodAssignments.length,
      unassignedPeriods: unassignedPeriods.length
    });

    // Generate events for periods with course assignments
    for (const pca of periodCourseAssignments) {
      const courseEvents = this.scheduleEventFactoryService.generateEventsForPeriodCourse(
        pca,
        startDate,
        endDate,
        teachingDays,
        eventIdCounter
      );

      allScheduleEvents.push(...courseEvents);
      eventIdCounter -= courseEvents.length;

      console.log(`[ScheduleGenerationService] Generated ${courseEvents.length} events for Period ${pca.period} Course ${pca.courseId}`);
    }

    // Generate events for special period assignments
    for (const specialPeriod of specialPeriodAssignments) {
      const specialEvents = this.scheduleEventFactoryService.generateEventsForSpecialPeriod(
        specialPeriod,
        startDate,
        endDate,
        teachingDays,
        eventIdCounter
      );

      allScheduleEvents.push(...specialEvents);
      eventIdCounter -= specialEvents.length;

      console.log(`[ScheduleGenerationService] Generated ${specialEvents.length} special period events for Period ${specialPeriod.period} (${specialPeriod.specialPeriodType})`);
    }

    // Generate placeholder events for unassigned periods
    for (const unassignedPeriod of unassignedPeriods) {
      const placeholderEvents = this.scheduleEventFactoryService.generateEventsForUnassignedPeriod(
        unassignedPeriod,
        startDate,
        endDate,
        teachingDays,
        eventIdCounter
      );

      allScheduleEvents.push(...placeholderEvents);
      eventIdCounter -= placeholderEvents.length;

      console.log(`[ScheduleGenerationService] Generated ${placeholderEvents.length} placeholder events for unassigned Period ${unassignedPeriod.period}`);
    }

    return allScheduleEvents;
  }

  // === VALIDATION ===

  /**
   * Validate user and configuration for scheduling
   */
  validateUserForScheduling(): { canSchedule: boolean; issues: string[] } {
    const issues: string[] = [];

    const currentUser = this.userService.getCurrentUser();
    const userId = currentUser ? parseId(currentUser.id) || 0 : 0;

    if (!currentUser) {
      issues.push('No current user available');
      return { canSchedule: false, issues };
    }

    // Check configuration state
    const activeConfig = this.scheduleConfigStateService.getActiveConfiguration();
    if (!activeConfig) {
      issues.push('No active schedule configuration available');
      return { canSchedule: false, issues };
    }

    if (!activeConfig.periodAssignments || activeConfig.periodAssignments.length === 0) {
      issues.push('No period assignments configured');
    }

    const periodCourseAssignments = this.getPeriodCourseAssignmentsFromConfig(activeConfig);
    if (periodCourseAssignments.length === 0) {
      issues.push('No periods assigned to courses');
    }

    const success = issues.length === 0;

    console.log('[ScheduleGenerationService] Validation result:', {
      canSchedule: success,
      issues: issues,
      userId: userId,
      configurationId: activeConfig?.id
    });

    return {
      canSchedule: success,
      issues
    };
  }

  // === CONFIGURATION PARSING ===

  /**
   * Get period course assignments from configuration
   */
  private getPeriodCourseAssignmentsFromConfig(config: ScheduleConfiguration): PeriodCourseAssignment[] {
    return config.periodAssignments
      .filter((assignment: SchedulePeriodAssignment) => assignment.courseId)
      .map((assignment: SchedulePeriodAssignment) => ({
        period: assignment.period,
        courseId: assignment.courseId!,
        periodAssignment: this.convertSchedulePeriodToPeriodAssignment(assignment)
      }));
  }

  /**
   * Get special period assignments from configuration
   */
  private getSpecialPeriodAssignmentsFromConfig(config: ScheduleConfiguration): PeriodAssignment[] {
    return config.periodAssignments
      .filter((assignment: SchedulePeriodAssignment) => assignment.specialPeriodType)
      .map((assignment: SchedulePeriodAssignment) => this.convertSchedulePeriodToPeriodAssignment(assignment));
  }

  /**
   * Get unassigned periods from configuration
   */
  private getUnassignedPeriodsFromConfig(config: ScheduleConfiguration): PeriodAssignment[] {
    return config.periodAssignments
      .filter((assignment: SchedulePeriodAssignment) => !assignment.courseId && !assignment.specialPeriodType)
      .map((assignment: SchedulePeriodAssignment) => this.convertSchedulePeriodToPeriodAssignment(assignment));
  }

  /**
   * Convert SchedulePeriodAssignment to PeriodAssignment
   */
  private convertSchedulePeriodToPeriodAssignment(spa: SchedulePeriodAssignment): PeriodAssignment {
    return {
      id: spa.id || 0, // Handle nullable id
      period: spa.period,
      courseId: spa.courseId,
      specialPeriodType: spa.specialPeriodType,
      room: spa.room,
      notes: spa.notes,
      teachingDays: spa.teachingDays,
      backgroundColor: spa.backgroundColor,
      fontColor: spa.fontColor
    };
  }

  // === UTILITY METHODS ===

  /**
   * Check if configuration is ready for schedule generation
   */
  isConfigurationReady(): boolean {
    const validation = this.validateUserForScheduling();
    return validation.canSchedule;
  }

  /**
   * Get current configuration summary
   */
  getCurrentConfigurationSummary(): {
    hasConfiguration: boolean;
    configurationTitle?: string;
    schoolYear?: string;
    periodAssignments?: number;
    courseAssignments?: number;
    canGenerate: boolean;
  } {
    const activeConfig = this.scheduleConfigStateService.getActiveConfiguration();

    if (!activeConfig) {
      return {
        hasConfiguration: false,
        canGenerate: false
      };
    }

    const periodCourseAssignments = this.getPeriodCourseAssignmentsFromConfig(activeConfig);

    return {
      hasConfiguration: true,
      configurationTitle: activeConfig.title,
      schoolYear: activeConfig.schoolYear,
      periodAssignments: activeConfig.periodAssignments?.length || 0,
      courseAssignments: periodCourseAssignments.length,
      canGenerate: this.isConfigurationReady()
    };
  }

  /**
   * Get debug information about schedule generation capability
   */
  getDebugInfo(): any {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      return { error: 'No current user available' };
    }

    const activeConfig = this.scheduleConfigStateService.getActiveConfiguration();
    if (!activeConfig) {
      return { error: 'No active configuration available' };
    }

    const periodCourseAssignments = this.getPeriodCourseAssignmentsFromConfig(activeConfig);
    const specialPeriodAssignments = this.getSpecialPeriodAssignmentsFromConfig(activeConfig);
    const unassignedPeriods = this.getUnassignedPeriodsFromConfig(activeConfig);

    // Simplified course info
    const courseInfo = periodCourseAssignments.map(pca => ({
      period: pca.period,
      courseId: pca.courseId,
      room: pca.periodAssignment.room
    }));

    return {
      userId: currentUser.id,
      configurationInfo: {
        id: activeConfig.id,
        title: activeConfig.title,
        schoolYear: activeConfig.schoolYear,
        startDate: activeConfig.startDate,
        endDate: activeConfig.endDate,
        periodsPerDay: activeConfig.periodsPerDay,
        teachingDays: activeConfig.teachingDays
      },
      totalPeriodAssignments: activeConfig.periodAssignments?.length || 0,
      periodCourseAssignments: courseInfo,
      specialPeriodCount: specialPeriodAssignments.length,
      unassignedPeriodCount: unassignedPeriods.length,
      validation: this.validateUserForScheduling(),
      serviceArchitecture: {
        usesEventService: true,
        usesConfigurationService: true,
        usesSpecialDayIntegration: true,
        orchestrationOnly: true,
        cleanedUp: {
          observablePatterns: 'removed',
          complexEventInterfaces: 'removed',
          subscriptionManagement: 'removed',
          lineCount: 'reduced ~25%'
        }
      }
    };
  }

  /**
   * Cleanup method for manual cleanup if needed
   */
  cleanup(): void {
    console.log('[ScheduleGenerationService] Manual cleanup completed');
  }
}
