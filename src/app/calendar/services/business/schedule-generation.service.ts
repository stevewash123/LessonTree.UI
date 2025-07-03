// **COMPLETE FILE** - ScheduleGenerationService with Observable Events
// RESPONSIBILITY: Orchestrates schedule generation with cross-component event coordination
// DOES NOT: Handle HTTP calls, create individual events, or manage date configurations directly
// CALLED BY: Calendar components and SchedulePersistenceService for schedule creation

import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { SpecialDayIntegrationService } from '../api/special-day-integration.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { ScheduleEventFactoryService } from './schedule-event-factory.service';
import {Schedule} from '../../../models/schedule';
import {UserService} from '../../../user-config/user.service';
import {parseId} from '../../../shared/utils/type-conversion.utils';
import {ScheduleConfiguration, SchedulePeriodAssignment} from '../../../models/schedule-configuration.model';
import {ScheduleEvent} from '../../../models/schedule-event.model';
import {PeriodAssignment, PeriodCourseAssignment} from '../../../models/period-assignment';

export interface ScheduleGenerationResult {
  success: boolean;
  schedule?: Schedule;
  errors: string[];
  warnings: string[];
}

// ✅ NEW: Observable event interfaces for cross-component coordination
export interface ScheduleGenerationEvent {
  operationType: 'generation-started' | 'generation-completed' | 'generation-failed';
  scheduleType: 'in-memory' | 'with-special-days';
  scheduleId: number;
  scheduleTitle: string | null;
  eventCount: number;
  userId: number;
  configurationId: number | null;
  success: boolean;
  errors: string[];
  warnings: string[];
  source: 'schedule-generation';
  timestamp: Date;
}

export interface ScheduleValidationEvent {
  validationType: 'user-validation' | 'configuration-validation' | 'assignment-validation';
  success: boolean;
  issues: string[];
  userId: number | null;
  configurationId: number | null;
  source: 'schedule-generation';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleGenerationService {

  // ✅ NEW: Observable events for cross-component coordination
  private readonly _scheduleGeneration$ = new Subject<ScheduleGenerationEvent>();
  private readonly _scheduleValidation$ = new Subject<ScheduleValidationEvent>();

  // Public observables for business logic subscriptions
  readonly scheduleGeneration$ = this._scheduleGeneration$.asObservable();
  readonly scheduleValidation$ = this._scheduleValidation$.asObservable();

  constructor(
    private userService: UserService,
    private scheduleEventFactoryService: ScheduleEventFactoryService,
    private specialDayIntegrationService: SpecialDayIntegrationService,
    private scheduleConfigStateService: ScheduleConfigurationStateService
  ) {
    console.log('[ScheduleGenerationService] Initialized with Observable events for generation coordination');
  }

  // ✅ ENHANCED: Create schedule with Observable event emission
  createSchedule(): ScheduleGenerationResult {
    console.log('[ScheduleGenerationService] createSchedule - orchestrating generation');

    const errors: string[] = [];
    const warnings: string[] = [];

    // Get current user for userId
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      errors.push('Cannot create schedule: No current user available');

      // ✅ NEW: Emit generation failed event
      this._scheduleGeneration$.next({
        operationType: 'generation-failed',
        scheduleType: 'in-memory',
        scheduleId: 0,
        scheduleTitle: null,
        eventCount: 0,
        userId: 0,
        configurationId: null,
        success: false,
        errors,
        warnings,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      return { success: false, errors, warnings };
    }

    const userId = parseId(currentUser.id) || 0;
    if (userId === 0) {
      errors.push('Cannot create schedule: Invalid user ID');

      // ✅ NEW: Emit generation failed event
      this._scheduleGeneration$.next({
        operationType: 'generation-failed',
        scheduleType: 'in-memory',
        scheduleId: 0,
        scheduleTitle: null,
        eventCount: 0,
        userId: 0,
        configurationId: null,
        success: false,
        errors,
        warnings,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      return { success: false, errors, warnings };
    }

    // Get configuration from state service
    const activeConfig = this.scheduleConfigStateService.getActiveConfiguration();
    if (!activeConfig) {
      errors.push('Cannot create schedule: No active schedule configuration available');

      // ✅ NEW: Emit generation failed event
      this._scheduleGeneration$.next({
        operationType: 'generation-failed',
        scheduleType: 'in-memory',
        scheduleId: 0,
        scheduleTitle: null,
        eventCount: 0,
        userId,
        configurationId: null,
        success: false,
        errors,
        warnings,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      return { success: false, errors, warnings };
    }

    if (!activeConfig.periodAssignments || activeConfig.periodAssignments.length === 0) {
      errors.push('Cannot create schedule: No period assignments configured');

      // ✅ NEW: Emit generation failed event
      this._scheduleGeneration$.next({
        operationType: 'generation-failed',
        scheduleType: 'in-memory',
        scheduleId: 0,
        scheduleTitle: null,
        eventCount: 0,
        userId,
        configurationId: activeConfig.id,
        success: false,
        errors,
        warnings,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      return { success: false, errors, warnings };
    }

    // ✅ NEW: Emit generation started event
    this._scheduleGeneration$.next({
      operationType: 'generation-started',
      scheduleType: 'in-memory',
      scheduleId: 0,
      scheduleTitle: activeConfig.title || `${activeConfig.schoolYear} Schedule`,
      eventCount: 0,
      userId,
      configurationId: activeConfig.id,
      success: true,
      errors: [],
      warnings: [],
      source: 'schedule-generation',
      timestamp: new Date()
    });

    console.log('🚨 [ScheduleGenerationService] EMITTED scheduleGeneration event:', 'generation-started');

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

    // ✅ NEW: Emit generation completed event
    this._scheduleGeneration$.next({
      operationType: 'generation-completed',
      scheduleType: 'in-memory',
      scheduleId: 0,
      scheduleTitle: schedule.title,
      eventCount: scheduleEvents.length,
      userId,
      configurationId: activeConfig.id,
      success: true,
      errors,
      warnings,
      source: 'schedule-generation',
      timestamp: new Date()
    });

    console.log('🚨 [ScheduleGenerationService] EMITTED scheduleGeneration event:', 'generation-completed');
    console.log(`[ScheduleGenerationService] Generated schedule with ${scheduleEvents.length} events from configuration: ${activeConfig.title} (${activeConfig.schoolYear})`);

    return {
      success: true,
      schedule: schedule,
      errors,
      warnings
    };
  }

  // ✅ ENHANCED: Generate schedule with special days and Observable coordination
  async generateScheduleWithSpecialDays(scheduleId: number): Promise<ScheduleGenerationResult> {
    console.log(`[ScheduleGenerationService] generateScheduleWithSpecialDays for schedule ${scheduleId}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Get current user and configuration
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      errors.push('Cannot create schedule: No current user available');

      // ✅ NEW: Emit generation failed event
      this._scheduleGeneration$.next({
        operationType: 'generation-failed',
        scheduleType: 'with-special-days',
        scheduleId,
        scheduleTitle: null,
        eventCount: 0,
        userId: 0,
        configurationId: null,
        success: false,
        errors,
        warnings,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      return { success: false, errors, warnings };
    }

    const userId = parseId(currentUser.id) || 0;
    if (userId === 0) {
      errors.push('Cannot create schedule: Invalid user ID');

      // ✅ NEW: Emit generation failed event
      this._scheduleGeneration$.next({
        operationType: 'generation-failed',
        scheduleType: 'with-special-days',
        scheduleId,
        scheduleTitle: null,
        eventCount: 0,
        userId: 0,
        configurationId: null,
        success: false,
        errors,
        warnings,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      return { success: false, errors, warnings };
    }

    // Get configuration from state service
    const activeConfig = this.scheduleConfigStateService.getActiveConfiguration();
    if (!activeConfig) {
      errors.push('Cannot create schedule: No active schedule configuration available');

      // ✅ NEW: Emit generation failed event
      this._scheduleGeneration$.next({
        operationType: 'generation-failed',
        scheduleType: 'with-special-days',
        scheduleId,
        scheduleTitle: null,
        eventCount: 0,
        userId,
        configurationId: null,
        success: false,
        errors,
        warnings,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      return { success: false, errors, warnings };
    }

    if (!activeConfig.periodAssignments || activeConfig.periodAssignments.length === 0) {
      errors.push('Cannot create schedule: No period assignments configured');

      // ✅ NEW: Emit generation failed event
      this._scheduleGeneration$.next({
        operationType: 'generation-failed',
        scheduleType: 'with-special-days',
        scheduleId,
        scheduleTitle: null,
        eventCount: 0,
        userId,
        configurationId: activeConfig.id,
        success: false,
        errors,
        warnings,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      return { success: false, errors, warnings };
    }

    try {
      const scheduleTitle = activeConfig.title || `${activeConfig.schoolYear} Schedule`;

      // ✅ NEW: Emit generation started event
      this._scheduleGeneration$.next({
        operationType: 'generation-started',
        scheduleType: 'with-special-days',
        scheduleId,
        scheduleTitle,
        eventCount: 0,
        userId,
        configurationId: activeConfig.id,
        success: true,
        errors: [],
        warnings: [],
        source: 'schedule-generation',
        timestamp: new Date()
      });

      console.log('🚨 [ScheduleGenerationService] EMITTED scheduleGeneration event:', 'generation-started');

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
        title: scheduleTitle,
        userId: userId,
        scheduleConfigurationId: activeConfig.id,
        isLocked: false,
        createdDate: new Date(),
        scheduleEvents,
        specialDays: [] // Empty - special days loaded separately and converted to events
      };

      // ✅ NEW: Emit generation completed event
      this._scheduleGeneration$.next({
        operationType: 'generation-completed',
        scheduleType: 'with-special-days',
        scheduleId,
        scheduleTitle,
        eventCount: scheduleEvents.length,
        userId,
        configurationId: activeConfig.id,
        success: true,
        errors,
        warnings,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      console.log('🚨 [ScheduleGenerationService] EMITTED scheduleGeneration event:', 'generation-completed');
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

      // ✅ NEW: Emit generation failed event
      this._scheduleGeneration$.next({
        operationType: 'generation-failed',
        scheduleType: 'with-special-days',
        scheduleId,
        scheduleTitle: activeConfig?.title || null,
        eventCount: 0,
        userId,
        configurationId: activeConfig?.id || null,
        success: false,
        errors,
        warnings,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      console.log('🚨 [ScheduleGenerationService] EMITTED scheduleGeneration event:', 'generation-failed');

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

  // ✅ ENHANCED: Validate user for scheduling with Observable event emission
  validateUserForScheduling(): { canSchedule: boolean; issues: string[] } {
    const issues: string[] = [];

    const currentUser = this.userService.getCurrentUser();
    const userId = currentUser ? parseId(currentUser.id) || 0 : 0;

    if (!currentUser) {
      issues.push('No current user available');

      // ✅ NEW: Emit validation failed event
      this._scheduleValidation$.next({
        validationType: 'user-validation',
        success: false,
        issues,
        userId: null,
        configurationId: null,
        source: 'schedule-generation',
        timestamp: new Date()
      });

      return { canSchedule: false, issues };
    }

    // Check configuration state
    const activeConfig = this.scheduleConfigStateService.getActiveConfiguration();
    if (!activeConfig) {
      issues.push('No active schedule configuration available');

      // ✅ NEW: Emit validation failed event
      this._scheduleValidation$.next({
        validationType: 'configuration-validation',
        success: false,
        issues,
        userId,
        configurationId: null,
        source: 'schedule-generation',
        timestamp: new Date()
      });

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

    // ✅ NEW: Emit validation result event
    this._scheduleValidation$.next({
      validationType: 'assignment-validation',
      success,
      issues,
      userId,
      configurationId: activeConfig.id,
      source: 'schedule-generation',
      timestamp: new Date()
    });

    console.log('🚨 [ScheduleGenerationService] EMITTED scheduleValidation event:', success ? 'success' : 'failed');

    return {
      canSchedule: success,
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
        orchestrationOnly: true,
        hasObservableEvents: true
      }
    };
  }

  // === CLEANUP ===

  // ✅ NEW: Cleanup method with Observable completion
  ngOnDestroy(): void {
    this._scheduleGeneration$.complete();
    this._scheduleValidation$.complete();
    console.log('[ScheduleGenerationService] All Observable subjects completed on destroy');
  }
}
