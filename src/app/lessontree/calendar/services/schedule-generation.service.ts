// RESPONSIBILITY: Orchestrates schedule generation using specialized services
// DOES NOT: Handle HTTP calls, create individual events, or manage date configurations directly
// CALLED BY: Calendar components and SchedulePersistenceService for schedule creation

import { Injectable } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { SpecialDayIntegrationService } from './special-day-integration.service';
import { ScheduleEventFactoryService } from './schedule-event-factory.service';
import { parseId } from '../../../core/utils/type-conversion.utils';
import { Schedule } from '../../../models/schedule';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { PeriodCourseAssignment, PeriodAssignment } from '../../../models/period-assignment';
import { ScheduleConfiguration, SchedulePeriodAssignment } from '../../../models/schedule-configuration.model';
import { ScheduleConfigurationStateService } from './schedule-configuration-state.service';


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
    console.log('[ScheduleGenerationService] Initialized as orchestration service');
  }

  // Create schedule for current user with all period assignments
  createSchedule(): ScheduleGenerationResult {
    console.log('[ScheduleGenerationService] createSchedule - orchestrating generation');
    
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
        scheduleEvents
      };
  
    console.log(`[ScheduleGenerationService] Generated schedule with ${scheduleEvents.length} events from configuration: ${activeConfig.title} (${activeConfig.schoolYear})`);
    return {
      success: true,
      schedule: schedule,
      errors,
      warnings
    };
  }

  // Generate schedule with special day integration for existing (saved) schedules
  async generateScheduleWithSpecialDays(scheduleId: number): Promise<ScheduleGenerationResult> {
    console.log(`[ScheduleGenerationService] generateScheduleWithSpecialDays for schedule ${scheduleId}`);
    
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
  
    try {
      // Generate base schedule events using configuration
      const startDate = new Date(activeConfig.startDate);
      const endDate = new Date(activeConfig.endDate);
      const teachingDaysArray = activeConfig.teachingDays;
      
      let scheduleEvents = this.generateScheduleEventsFromConfig(
        activeConfig,
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
  
      const schedule: Schedule = {
          id: scheduleId,
          title: activeConfig.title || `${activeConfig.schoolYear} Schedule`,
          userId: userId,
          scheduleConfigurationId: activeConfig.id,
          isLocked: false,
          createdDate: new Date(),
          scheduleEvents
        };
  
      console.log(`[ScheduleGenerationService] Generated schedule with special days: ${scheduleEvents.length} events`);
      return {
        success: true,
        schedule: schedule,
        errors,
        warnings
      };
  
    } catch (error: any) {
      console.error('[ScheduleGenerationService] Failed to generate schedule with special days:', error);
      errors.push(`Failed to load special days: ${error.message}`);
      return { success: false, errors, warnings };
    }
  }

  private generateScheduleEventsFromConfig(
    config: ScheduleConfiguration,
    startDate: Date,
    endDate: Date,
    teachingDays: string[]
  ): ScheduleEvent[] {
    console.log('[ScheduleGenerationService] generateScheduleEventsFromConfig - orchestrating event creation');
    
    const allScheduleEvents: ScheduleEvent[] = [];
    let eventIdCounter = -1; // Negative for in-memory events
  
    // Get period assignments by type directly from configuration
    const periodCourseAssignments = this.getPeriodCourseAssignmentsFromConfig(config);
    const specialPeriodAssignments = this.getSpecialPeriodAssignmentsFromConfig(config);
    const unassignedPeriods = this.getUnassignedPeriodsFromConfig(config);
  
    console.log(`[ScheduleGenerationService] Found ${periodCourseAssignments.length} period-course assignments, ${specialPeriodAssignments.length} special period assignments, and ${unassignedPeriods.length} unassigned periods`);
  
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

  // === VALIDATION AND DEBUG METHODS (KEPT IN ORCHESTRATOR) ===

  // Validate that schedule can be generated
  validateUserForScheduling(): { canSchedule: boolean; issues: string[] } {
    const issues: string[] = [];
    
    const currentUser = this.userService.getCurrentUser();
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
  
    return {
      canSchedule: issues.length === 0,
      issues
    };
  }

  private getPeriodCourseAssignmentsFromConfig(config: ScheduleConfiguration): PeriodCourseAssignment[] {
    return config.periodAssignments
      .filter((assignment: SchedulePeriodAssignment) => assignment.courseId)
      .map((assignment: SchedulePeriodAssignment) => ({
        period: assignment.period,
        courseId: assignment.courseId!,
        periodAssignment: this.convertSchedulePeriodToPeriodAssignment(assignment)
      }));
  }

  private getSpecialPeriodAssignmentsFromConfig(config: ScheduleConfiguration): PeriodAssignment[] {
    return config.periodAssignments
      .filter((assignment: SchedulePeriodAssignment) => assignment.specialPeriodType)
      .map((assignment: SchedulePeriodAssignment) => this.convertSchedulePeriodToPeriodAssignment(assignment));
  }

  private getUnassignedPeriodsFromConfig(config: ScheduleConfiguration): PeriodAssignment[] {
    return config.periodAssignments
      .filter((assignment: SchedulePeriodAssignment) => !assignment.courseId && !assignment.specialPeriodType)
      .map((assignment: SchedulePeriodAssignment) => this.convertSchedulePeriodToPeriodAssignment(assignment));
  }

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

  // Get debug information about current user's schedule generation capability
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
        orchestrationOnly: true
      }
    };
  }
}