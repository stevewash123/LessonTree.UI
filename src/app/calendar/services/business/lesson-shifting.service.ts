// **COMPLETE FILE** - LessonShiftingService with Observable Events
// RESPONSIBILITY: Orchestrates lesson shifting operations with cross-component event coordination
// DOES NOT: Handle Error Day creation, UI notifications, or direct API calls - delegates to appropriate services
// CALLED BY: SpecialDayManagementService and other services that need lesson scheduling operations

import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { addDays, format, isAfter, isSameDay } from 'date-fns';

import { ScheduleEvent } from '../../../models/schedule-event.model';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { ScheduleApiService } from '../api/schedule-api.service';
import { TeachingDayCalculationService } from './teaching-day-calculations.service';

// ✅ NEW: Observable event interfaces for cross-component coordination
export interface LessonShiftingEvent {
  operationType: 'shift-forward' | 'shift-backward' | 'shift-failed' | 'lessons-converted-to-errors';
  insertionDate?: Date;
  deletedDate?: Date;
  period: number;
  affectedLessonsCount: number;
  shiftedLessonsCount: number;
  errorsCreatedCount: number;
  userId: number | null;
  configurationId: number | null;
  success: boolean;
  errors: string[];
  warnings: string[];
  source: 'lesson-shifting';
  timestamp: Date;
}

export interface LessonConflictEvent {
  conflictType: 'schedule-end-overflow' | 'period-occupied' | 'teaching-day-unavailable';
  period: number;
  conflictDate: Date;
  lessonId: number | null;
  lessonTitle: string | null;
  resolution: 'converted-to-error' | 'shifted-to-next-available' | 'failed';
  userId: number | null;
  source: 'lesson-shifting';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LessonShiftingService {

  // ✅ NEW: Observable events for cross-component coordination
  private readonly _lessonShifting$ = new Subject<LessonShiftingEvent>();
  private readonly _lessonConflict$ = new Subject<LessonConflictEvent>();

  // Public observables for business logic subscriptions
  readonly lessonShifting$ = this._lessonShifting$.asObservable();
  readonly lessonConflict$ = this._lessonConflict$.asObservable();

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private calendarService: ScheduleApiService,
    private teachingDayCalculation: TeachingDayCalculationService
  ) {
    console.log('[LessonShiftingService] Initialized with Observable events for shifting coordination');
  }

  /**
   * ✅ ENHANCED: Shift lessons forward with Observable event emission
   * Period-specific shifting - only affects the specified period
   */
  shiftLessonsForward(insertionDate: Date, period: number): void {
    console.log(`[LessonShiftingService] shiftLessonsForward - Period ${period} from ${format(insertionDate, 'yyyy-MM-dd')}`);

    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    if (!currentSchedule?.scheduleEvents || !activeConfig?.teachingDays) {
      console.error('[LessonShiftingService] Cannot shift: No schedule or teaching days available');

      // ✅ NEW: Emit shift failed event
      this._lessonShifting$.next({
        operationType: 'shift-failed',
        insertionDate,
        period,
        affectedLessonsCount: 0,
        shiftedLessonsCount: 0,
        errorsCreatedCount: 0,
        userId: this.getCurrentUserId(),
        configurationId: activeConfig?.id || null,
        success: false,
        errors: ['No schedule or teaching days available'],
        warnings: [],
        source: 'lesson-shifting',
        timestamp: new Date()
      });

      return;
    }

    const teachingDayNumbers = this.getTeachingDayNumbers(activeConfig.teachingDays);
    const affectedLessons = this.findLessonsInPeriodOnOrAfter(currentSchedule.scheduleEvents, insertionDate, period);

    // ✅ NEW: Validate lesson data integrity early
    this.validateLessonData(affectedLessons, 'shift-forward');

    if (affectedLessons.length === 0) {
      // ✅ NEW: Emit no lessons to shift event
      this._lessonShifting$.next({
        operationType: 'shift-forward',
        insertionDate,
        period,
        affectedLessonsCount: 0,
        shiftedLessonsCount: 0,
        errorsCreatedCount: 0,
        userId: this.getCurrentUserId(),
        configurationId: activeConfig.id,
        success: true,
        errors: [],
        warnings: ['No lessons found to shift in the specified period'],
        source: 'lesson-shifting',
        timestamp: new Date()
      });

      return;
    }

    const shiftResults = this.calculateForwardShifts(
      affectedLessons,
      insertionDate,
      period,
      teachingDayNumbers,
      currentSchedule,
      activeConfig
    );

    this.applyLessonShifts(shiftResults.shiftedLessons);

    // ✅ NEW: Emit shift forward completed event
    this._lessonShifting$.next({
      operationType: 'shift-forward',
      insertionDate,
      period,
      affectedLessonsCount: affectedLessons.length,
      shiftedLessonsCount: shiftResults.shiftedLessons.length,
      errorsCreatedCount: shiftResults.errorsCreated,
      userId: this.getCurrentUserId(),
      configurationId: activeConfig.id,
      success: true,
      errors: [],
      warnings: shiftResults.warnings,
      source: 'lesson-shifting',
      timestamp: new Date()
    });

    console.log('🚨 [LessonShiftingService] EMITTED lessonShifting event:', 'shift-forward');

    // ✅ NEW: Emit error conversion events if applicable
    if (shiftResults.errorsCreated > 0) {
      this._lessonShifting$.next({
        operationType: 'lessons-converted-to-errors',
        insertionDate,
        period,
        affectedLessonsCount: affectedLessons.length,
        shiftedLessonsCount: shiftResults.shiftedLessons.length,
        errorsCreatedCount: shiftResults.errorsCreated,
        userId: this.getCurrentUserId(),
        configurationId: activeConfig.id,
        success: true,
        errors: [],
        warnings: [`${shiftResults.errorsCreated} lessons converted to errors due to schedule overflow`],
        source: 'lesson-shifting',
        timestamp: new Date()
      });

      console.log('🚨 [LessonShiftingService] EMITTED lessonShifting event:', 'lessons-converted-to-errors');
    }
  }

  /**
   * ✅ ENHANCED: Shift lessons backward with Observable event emission
   * Period-specific shifting - only affects the specified period
   */
  shiftLessonsBackward(deletedDate: Date, period: number): void {
    console.log(`[LessonShiftingService] shiftLessonsBackward - Period ${period} from ${format(deletedDate, 'yyyy-MM-dd')}`);

    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    if (!currentSchedule?.scheduleEvents || !activeConfig?.teachingDays) {
      console.error('[LessonShiftingService] Cannot shift backward: No schedule or teaching days available');

      // ✅ NEW: Emit shift failed event
      this._lessonShifting$.next({
        operationType: 'shift-failed',
        deletedDate,
        period,
        affectedLessonsCount: 0,
        shiftedLessonsCount: 0,
        errorsCreatedCount: 0,
        userId: this.getCurrentUserId(),
        configurationId: activeConfig?.id || null,
        success: false,
        errors: ['No schedule or teaching days available'],
        warnings: [],
        source: 'lesson-shifting',
        timestamp: new Date()
      });

      return;
    }

    const teachingDayNumbers = this.getTeachingDayNumbers(activeConfig.teachingDays);
    const lessonsAfterDeleted = this.findLessonsInPeriodAfter(currentSchedule.scheduleEvents, deletedDate, period);

    // ✅ NEW: Validate lesson data integrity early
    this.validateLessonData(lessonsAfterDeleted, 'shift-backward');

    if (lessonsAfterDeleted.length === 0) {
      // ✅ NEW: Emit no lessons to shift event
      this._lessonShifting$.next({
        operationType: 'shift-backward',
        deletedDate,
        period,
        affectedLessonsCount: 0,
        shiftedLessonsCount: 0,
        errorsCreatedCount: 0,
        userId: this.getCurrentUserId(),
        configurationId: activeConfig.id,
        success: true,
        errors: [],
        warnings: ['No lessons found to shift backward in the specified period'],
        source: 'lesson-shifting',
        timestamp: new Date()
      });

      return;
    }

    this.performBackwardShifts(lessonsAfterDeleted, period, teachingDayNumbers, currentSchedule);
    this.scheduleStateService.markAsChanged();

    // ✅ NEW: Emit shift backward completed event
    this._lessonShifting$.next({
      operationType: 'shift-backward',
      deletedDate,
      period,
      affectedLessonsCount: lessonsAfterDeleted.length,
      shiftedLessonsCount: lessonsAfterDeleted.length,
      errorsCreatedCount: 0,
      userId: this.getCurrentUserId(),
      configurationId: activeConfig.id,
      success: true,
      errors: [],
      warnings: [],
      source: 'lesson-shifting',
      timestamp: new Date()
    });

    console.log('🚨 [LessonShiftingService] EMITTED lessonShifting event:', 'shift-backward');
  }

  // === PRIVATE HELPER METHODS ===

  // ✅ NEW: Validate lesson data integrity before processing
  private validateLessonData(lessons: ScheduleEvent[], operation: 'shift-forward' | 'shift-backward'): void {
    for (const lesson of lessons) {
      if (lesson.lessonId == null) {
        const error = new Error(`Invalid lesson data in ${operation}: lessonId cannot be null or undefined. Event ID: ${lesson.id}, Period: ${lesson.period}, Date: ${lesson.date}`);
        console.error('[LessonShiftingService] Lesson validation failed:', {
          lessonId: lesson.lessonId,
          eventId: lesson.id,
          period: lesson.period,
          date: lesson.date,
          eventType: lesson.eventType,
          operation
        });

        // ✅ NEW: Emit validation error event
        this._lessonConflict$.next({
          conflictType: 'teaching-day-unavailable', // Using existing type for validation errors
          period: lesson.period,
          conflictDate: new Date(lesson.date),
          lessonId: null,
          lessonTitle: null,
          resolution: 'failed',
          userId: this.getCurrentUserId(),
          source: 'lesson-shifting',
          timestamp: new Date()
        });

        throw error;
      }

      // Additional validation for lesson integrity
      if (typeof lesson.lessonId !== 'number' || lesson.lessonId <= 0) {
        const error = new Error(`Invalid lessonId format in ${operation}: expected positive number, got ${lesson.lessonId}. Event ID: ${lesson.id}`);
        console.error('[LessonShiftingService] Lesson ID format validation failed:', {
          lessonId: lesson.lessonId,
          lessonIdType: typeof lesson.lessonId,
          eventId: lesson.id,
          operation
        });
        throw error;
      }
    }

    console.log(`[LessonShiftingService] ✅ Validated ${lessons.length} lessons for ${operation} - all have valid lessonId values`);
  }

  // Helper method to get teaching day numbers using utility function
  private getTeachingDayNumbers(teachingDaysArray: string[]): number[] {
    return this.teachingDayCalculation.getTeachingDayNumbers(teachingDaysArray);
  }

  // Find lessons in a specific period on or after a date
  private findLessonsInPeriodOnOrAfter(scheduleEvents: ScheduleEvent[], targetDate: Date, period: number): ScheduleEvent[] {
    return scheduleEvents
      .filter(event =>
        event.lessonId &&
        event.period === period &&
        (isSameDay(new Date(event.date), targetDate) || isAfter(new Date(event.date), targetDate))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Find lessons in a specific period after a date (not including the date itself)
  private findLessonsInPeriodAfter(scheduleEvents: ScheduleEvent[], targetDate: Date, period: number): ScheduleEvent[] {
    return scheduleEvents
      .filter(event =>
        event.lessonId &&
        event.period === period &&
        isAfter(new Date(event.date), targetDate)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending by date
  }

  // ✅ ENHANCED: Calculate forward shifts with detailed result tracking
  private calculateForwardShifts(
    affectedLessons: ScheduleEvent[],
    insertionDate: Date,
    period: number,
    teachingDayNumbers: number[],
    currentSchedule: any,
    activeConfig: any
  ): { shiftedLessons: ScheduleEvent[], errorsCreated: number, warnings: string[] } {
    const shiftedLessons: ScheduleEvent[] = [];
    const warnings: string[] = [];
    let errorsCreated = 0;
    let currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(insertionDate, 1), teachingDayNumbers);

    for (const lesson of affectedLessons) {
      // Find next available date for this specific period
      currentShiftDate = this.findNextAvailableDateForPeriod(
        currentShiftDate,
        period,
        teachingDayNumbers,
        currentSchedule.scheduleEvents
      );

      const shiftedLesson: ScheduleEvent = {
        ...lesson,
        date: new Date(currentShiftDate)
      };

      // Check if lesson goes past schedule end date
      if (activeConfig.endDate && isAfter(currentShiftDate, new Date(activeConfig.endDate))) {
        // Convert to error event
        shiftedLesson.lessonId = null;
        shiftedLesson.eventType = 'Error';
        shiftedLesson.eventCategory = null;
        shiftedLesson.comment = `ERROR: Lesson pushed past schedule end (Period ${period})`;
        errorsCreated++;

        // ✅ NEW: Emit conflict event for schedule overflow (lessonId guaranteed valid by validation)
        this._lessonConflict$.next({
          conflictType: 'schedule-end-overflow',
          period,
          conflictDate: currentShiftDate,
          lessonId: lesson.lessonId!, // Safe assertion after validation
          lessonTitle: lesson.lessonTitle ?? null,
          resolution: 'converted-to-error',
          userId: this.getCurrentUserId(),
          source: 'lesson-shifting',
          timestamp: new Date()
        });
      }

      shiftedLessons.push(shiftedLesson);
      currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(currentShiftDate, 1), teachingDayNumbers);
    }

    return { shiftedLessons, errorsCreated, warnings };
  }

  // ✅ ENHANCED: Find next available date with conflict reporting
  private findNextAvailableDateForPeriod(
    startDate: Date,
    period: number,
    teachingDayNumbers: number[],
    scheduleEvents: ScheduleEvent[]
  ): Date {
    let candidateDate = new Date(startDate);
    const maxIterations = 365; // Prevent infinite loop
    let iterations = 0;

    while (iterations < maxIterations) {
      // Check if this is a teaching day
      if (this.teachingDayCalculation.isTeachingDay(candidateDate, teachingDayNumbers)) {
        // Check if this specific period is available on this date
        const isOccupied = this.teachingDayCalculation.isPeriodOccupiedByNonTeachingEvent(
          candidateDate,
          period,
          scheduleEvents
        );

        if (!isOccupied) {
          return candidateDate;
        } else {
          // ✅ NEW: Emit conflict event for occupied period
          this._lessonConflict$.next({
            conflictType: 'period-occupied',
            period,
            conflictDate: candidateDate,
            lessonId: null,
            lessonTitle: null,
            resolution: 'shifted-to-next-available',
            userId: this.getCurrentUserId(),
            source: 'lesson-shifting',
            timestamp: new Date()
          });
        }
      }

      candidateDate = addDays(candidateDate, 1);
      iterations++;
    }

    console.warn(`[LessonShiftingService] Could not find available date for Period ${period} after ${format(startDate, 'yyyy-MM-dd')}`);
    return startDate; // Fallback
  }

  // Perform backward shift operations
  private performBackwardShifts(
    lessonsAfterDeleted: ScheduleEvent[],
    period: number,
    teachingDayNumbers: number[],
    currentSchedule: any
  ): void {
    for (const currentLesson of lessonsAfterDeleted) {
      const currentLessonDate = new Date(currentLesson.date);
      const targetDate = this.findPreviousAvailableDateForPeriod(
        currentLessonDate,
        period,
        teachingDayNumbers,
        currentSchedule.scheduleEvents
      );

      const updatedLesson: ScheduleEvent = {
        ...currentLesson,
        date: new Date(targetDate)
      };

      this.scheduleStateService.updateScheduleEvent(updatedLesson);
    }
  }

  // Find previous available date for a specific period
  private findPreviousAvailableDateForPeriod(
    startDate: Date,
    period: number,
    teachingDayNumbers: number[],
    scheduleEvents: ScheduleEvent[]
  ): Date {
    let candidateDate = addDays(startDate, -1); // Start one day before
    const maxIterations = 365; // Prevent infinite loop
    let iterations = 0;

    while (iterations < maxIterations) {
      // Check if this is a teaching day
      if (this.teachingDayCalculation.isTeachingDay(candidateDate, teachingDayNumbers)) {
        // Check if this specific period is available on this date
        const isOccupied = this.teachingDayCalculation.isPeriodOccupiedByNonTeachingEvent(
          candidateDate,
          period,
          scheduleEvents
        );

        if (!isOccupied) {
          return candidateDate;
        }
      }

      candidateDate = addDays(candidateDate, -1);
      iterations++;
    }

    console.warn(`[LessonShiftingService] Could not find previous available date for Period ${period} before ${format(startDate, 'yyyy-MM-dd')}`);
    return addDays(startDate, -1); // Fallback
  }

  // Apply lesson shifts
  private applyLessonShifts(shiftedLessons: ScheduleEvent[]): void {
    if (shiftedLessons.length === 0) return;

    // Always update through state service - let it handle persistence
    shiftedLessons.forEach(lesson => {
      this.scheduleStateService.updateScheduleEvent(lesson);
    });

    this.scheduleStateService.markAsChanged();
  }

  private groupEventsByPeriod(events: ScheduleEvent[]): { [period: number]: number } {
    const groupedByPeriod: { [period: number]: number } = {};

    events.forEach(event => {
      groupedByPeriod[event.period] = (groupedByPeriod[event.period] || 0) + 1;
    });

    return groupedByPeriod;
  }

  // ✅ NEW: Helper to get current user ID
  private getCurrentUserId(): number | null {
    // This should get the current user ID from your auth service
    // For now, returning null - replace with actual implementation
    return null;
  }

  // === CLEANUP ===

  // ✅ NEW: Cleanup method with Observable completion
  ngOnDestroy(): void {
    this._lessonShifting$.complete();
    this._lessonConflict$.complete();
    console.log('[LessonShiftingService] All Observable subjects completed on destroy');
  }
}
