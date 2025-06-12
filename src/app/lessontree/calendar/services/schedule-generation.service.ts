// RESPONSIBILITY: Orchestrates master schedule generation using specialized services
// DOES NOT: Handle HTTP calls, create individual events, or manage date configurations directly
// CALLED BY: Calendar components and SchedulePersistenceService for master schedule creation

import { Injectable } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { CalendarEventService } from './calendar-event.service';
import { CalendarConfigurationService } from './calendar-configuration.service';
import { SpecialDayIntegrationService } from './special-day-integration.service';
import { ScheduleEventFactoryService } from './schedule-event-factory.service';
import { parseId } from '../../../core/utils/type-conversion.utils';
import { Schedule } from '../../../models/schedule';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { 
  TeachingSchedule,
  PeriodCourseAssignment,
  PeriodAssignment
} from '../../../models/period-assignment';
import { getUserTeachingSchedule } from '../../../models/user-configuration.model';
import { getPeriodCourseAssignments, getSpecialPeriodAssignments, getUnassignedPeriods } from '../../../models/utils/period-asignment.utils';


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
  private calendarConfigurationService: CalendarConfigurationService,
  private specialDayIntegrationService: SpecialDayIntegrationService
  ) {
    console.log('[ScheduleGenerationService] Initialized as orchestration service');
  }

  // Create master schedule for current user with all period assignments
  createMasterSchedule(): ScheduleGenerationResult {
    console.log('[ScheduleGenerationService] createMasterSchedule - orchestrating generation');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Get current user and configuration
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

    const teachingSchedule = getUserTeachingSchedule(currentUser);
    if (!teachingSchedule.periodAssignments || teachingSchedule.periodAssignments.length === 0) {
      errors.push('Cannot create schedule: No period assignments configured');
      return { success: false, errors, warnings };
    }

    // Get configuration from dedicated service
    const { startDate, endDate } = this.calendarConfigurationService.getDefaultDateRange();
    const teachingDaysArray = this.calendarConfigurationService.getDefaultTeachingDays();

    // Generate master schedule events using specialized service
    const scheduleEvents = this.generateMasterScheduleEvents(
      teachingSchedule,
      startDate,
      endDate,
      teachingDaysArray
    );

    if (scheduleEvents.length === 0) {
      warnings.push('No schedule events generated');
    }

    const masterSchedule: Schedule = {
        id: 0, // In-memory schedule
        title: `Master Schedule - ${startDate.getFullYear()}`,
        userId: userId,
        startDate,
        endDate,
        teachingDays: teachingDaysArray,
        isLocked: false,
        scheduleEvents
      };

    console.log(`[ScheduleGenerationService] Generated master schedule with ${scheduleEvents.length} events`);
    return {
      success: true,
      schedule: masterSchedule,
      errors,
      warnings
    };
  }

  // Generate master schedule with special day integration for existing (saved) schedules
  async generateMasterScheduleWithSpecialDays(scheduleId: number): Promise<ScheduleGenerationResult> {
    console.log(`[ScheduleGenerationService] generateMasterScheduleWithSpecialDays for schedule ${scheduleId}`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Get current user and configuration
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

    const teachingSchedule = getUserTeachingSchedule(currentUser);
    if (!teachingSchedule.periodAssignments || teachingSchedule.periodAssignments.length === 0) {
      errors.push('Cannot create schedule: No period assignments configured');
      return { success: false, errors, warnings };
    }

    try {
      // Generate base schedule events using configuration service
      const { startDate, endDate } = this.calendarConfigurationService.getDefaultDateRange();
      const teachingDaysArray = this.calendarConfigurationService.getDefaultTeachingDays();
      let scheduleEvents = this.generateMasterScheduleEvents(
        teachingSchedule,
        startDate,
        endDate,
        teachingDaysArray
      );

      // Apply special days using specialized service
      const specialDaysResult = await this.specialDayIntegrationService.loadAndApplySpecialDays(scheduleId, scheduleEvents);
      if (specialDaysResult.success) {
        scheduleEvents = specialDaysResult.events;
        warnings.push(...specialDaysResult.warnings);
      } else {
        errors.push(...specialDaysResult.errors);
      }

      if (scheduleEvents.length === 0) {
        warnings.push('No schedule events generated');
      }

      const masterSchedule: Schedule = {
          id: scheduleId,
          title: `Master Schedule - ${startDate.getFullYear()}`,
          userId: userId,
          startDate,
          endDate,
          teachingDays: teachingDaysArray,
          isLocked: false,
          scheduleEvents
        };

      console.log(`[ScheduleGenerationService] Generated master schedule with special days: ${scheduleEvents.length} events`);
      return {
        success: true,
        schedule: masterSchedule,
        errors,
        warnings
      };

    } catch (error: any) {
      console.error('[ScheduleGenerationService] Failed to generate schedule with special days:', error);
      errors.push(`Failed to load special days: ${error.message}`);
      return { success: false, errors, warnings };
    }
  }

  // Generate all schedule events for master schedule - ORCHESTRATION ONLY
  private generateMasterScheduleEvents(
    teachingSchedule: TeachingSchedule,
    startDate: Date,
    endDate: Date,
    teachingDays: string[]
  ): ScheduleEvent[] {
    console.log('[ScheduleGenerationService] generateMasterScheduleEvents - orchestrating event creation');
    
    const allScheduleEvents: ScheduleEvent[] = [];
    let eventIdCounter = -1; // Negative for in-memory events

    // Get period assignments by type
    const periodCourseAssignments = getPeriodCourseAssignments(teachingSchedule);
    const specialPeriodAssignments = getSpecialPeriodAssignments(teachingSchedule);
    const unassignedPeriods = getUnassignedPeriods(teachingSchedule);

    console.log(`[ScheduleGenerationService] Found ${periodCourseAssignments.length} period-course assignments, ${specialPeriodAssignments.length} special period assignments, and ${unassignedPeriods.length} unassigned periods`);

    // Generate events for periods with course assignments using specialized service
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

    // Generate events for special period assignments using factory service
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
  
      // Generate placeholder events for truly unassigned periods using factory service
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

  // === VALIDATION AND DEBUG METHODS (KEPT IN ORCHESTRATOR) ===

  // Validate that master schedule can be generated
  validateUserForScheduling(): { canSchedule: boolean; issues: string[] } {
    const issues: string[] = [];
    
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      issues.push('No current user available');
      return { canSchedule: false, issues };
    }

    const teachingSchedule = getUserTeachingSchedule(currentUser);
    if (!teachingSchedule.periodAssignments || teachingSchedule.periodAssignments.length === 0) {
      issues.push('No period assignments configured');
    }

    const periodCourseAssignments = getPeriodCourseAssignments(teachingSchedule);
    if (periodCourseAssignments.length === 0) {
      issues.push('No periods assigned to courses');
    }

    // Note: Course validation removed - delegated to CalendarEventService
    // This keeps validation focused on orchestration-level concerns

    return {
      canSchedule: issues.length === 0,
      issues
    };
  }

  // Get debug information about current user's schedule generation capability
  getDebugInfo(): any {
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      return { error: 'No current user available' };
    }

    const teachingSchedule = getUserTeachingSchedule(currentUser);
    const periodCourseAssignments = getPeriodCourseAssignments(teachingSchedule);
    const specialPeriodAssignments = getSpecialPeriodAssignments(teachingSchedule);
    const unassignedPeriods = getUnassignedPeriods(teachingSchedule);

    // Simplified course info - detailed validation delegated to event service
    const courseInfo = periodCourseAssignments.map(pca => ({
      period: pca.period,
      courseId: pca.courseId,
      room: pca.periodAssignment.room
    }));

    return {
      userId: currentUser.id,
      periodsPerDay: teachingSchedule.periodsPerDay,
      totalPeriodAssignments: teachingSchedule.periodAssignments?.length || 0,
      periodCourseAssignments: courseInfo,
      specialPeriodCount: specialPeriodAssignments.length,
      unassignedPeriodCount: unassignedPeriods.length,
      validation: this.validateUserForScheduling(),
      serviceArchitecture: {
        usesEventService: true,
        usesConfigurationService: true,
        usesSpecialDayIntegration: true,
        orchestrationOnly: true
      }
    };
  }
}