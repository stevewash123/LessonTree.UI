// **NEW SERVICE** - LessonShiftingService - Pure Lesson Shifting Logic
// RESPONSIBILITY: Forward/backward lesson shifting when special days are added/removed
// DOES NOT: Handle Observable events, cross-service coordination, or special day CRUD
// CALLED BY: SpecialDayCoordinationService for lesson shifting operations

import { Injectable } from '@angular/core';
import { format, addDays, isAfter, isSameDay } from 'date-fns';

import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { TeachingDayCalculationService } from '../business/teaching-day-calculations.service';
import { ScheduleEvent } from '../../../models/schedule-event.model';

export interface LessonShiftingResult {
  shiftedLessons: ScheduleEvent[];
  errorsCreatedCount: number;
  warnings: string[];
  success: boolean;
}

export interface LessonShiftingEvent {
  operationType: 'shift-forward' | 'shift-backward' | 'shift-failed' | 'lessons-converted-to-errors';
  insertionDate?: Date;
  deletedDate?: Date;
  period: number;
  affectedLessonsCount: number;
  shiftedLessonsCount: number;
  errorsCreatedCount: number;
  success: boolean;
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LessonShiftingService {

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private teachingDayCalculation: TeachingDayCalculationService
  ) {
    console.log('[LessonShiftingService] Initialized for lesson shifting operations');
  }

  // === PUBLIC SHIFTING OPERATIONS ===

  /**
   * Shift lessons forward when special day is created
   */
  shiftLessonsForward(insertionDate: Date, period: number): LessonShiftingResult {
    console.log(`[LessonShiftingService] Shifting lessons forward - Period ${period} from ${format(insertionDate, 'yyyy-MM-dd')}`);

    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    if (!currentSchedule?.scheduleEvents || !activeConfig?.teachingDays) {
      console.error('[LessonShiftingService] Cannot shift: No schedule or teaching days available');
      return {
        shiftedLessons: [],
        errorsCreatedCount: 0,
        warnings: ['No schedule or teaching days available'],
        success: false
      };
    }

    const teachingDayNumbers = this.teachingDayCalculation.getTeachingDayNumbers(activeConfig.teachingDays);
    const affectedLessons = this.findLessonsInPeriodOnOrAfter(currentSchedule.scheduleEvents, insertionDate, period);

    if (affectedLessons.length === 0) {
      console.log('[LessonShiftingService] No lessons to shift forward');
      return {
        shiftedLessons: [],
        errorsCreatedCount: 0,
        warnings: [],
        success: true
      };
    }

    // Calculate and apply shifts
    const shiftResults = this.calculateForwardShifts(affectedLessons, insertionDate, period, teachingDayNumbers, currentSchedule, activeConfig);
    this.applyLessonShifts(shiftResults.shiftedLessons);

    console.log(`[LessonShiftingService] Forward shift completed - ${shiftResults.shiftedLessons.length} lessons shifted, ${shiftResults.errorsCreated} errors created`);

    return {
      shiftedLessons: shiftResults.shiftedLessons,
      errorsCreatedCount: shiftResults.errorsCreated,
      warnings: shiftResults.warnings,
      success: true
    };
  }

  /**
   * Shift lessons backward when special day is deleted
   */
  shiftLessonsBackward(deletedDate: Date, period: number): LessonShiftingResult {
    console.log(`[LessonShiftingService] Shifting lessons backward - Period ${period} from ${format(deletedDate, 'yyyy-MM-dd')}`);

    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    if (!currentSchedule?.scheduleEvents || !activeConfig?.teachingDays) {
      console.error('[LessonShiftingService] Cannot shift backward: No schedule or teaching days available');
      return {
        shiftedLessons: [],
        errorsCreatedCount: 0,
        warnings: ['No schedule or teaching days available'],
        success: false
      };
    }

    const teachingDayNumbers = this.teachingDayCalculation.getTeachingDayNumbers(activeConfig.teachingDays);
    const lessonsAfterDeleted = this.findLessonsInPeriodAfter(currentSchedule.scheduleEvents, deletedDate, period);

    if (lessonsAfterDeleted.length === 0) {
      console.log('[LessonShiftingService] No lessons to shift backward');
      return {
        shiftedLessons: [],
        errorsCreatedCount: 0,
        warnings: [],
        success: true
      };
    }

    // Perform backward shifts
    const shiftedLessons = this.performBackwardShifts(lessonsAfterDeleted, period, teachingDayNumbers, currentSchedule);
    this.scheduleStateService.markAsChanged();

    console.log(`[LessonShiftingService] Backward shift completed - ${shiftedLessons.length} lessons shifted`);

    return {
      shiftedLessons: shiftedLessons,
      errorsCreatedCount: 0,
      warnings: [],
      success: true
    };
  }

  // === LESSON FINDING METHODS ===

  private findLessonsInPeriodOnOrAfter(scheduleEvents: ScheduleEvent[], targetDate: Date, period: number): ScheduleEvent[] {
    return scheduleEvents
      .filter(event =>
        event.lessonId &&
        event.period === period &&
        (isSameDay(new Date(event.date), targetDate) || isAfter(new Date(event.date), targetDate))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private findLessonsInPeriodAfter(scheduleEvents: ScheduleEvent[], targetDate: Date, period: number): ScheduleEvent[] {
    return scheduleEvents
      .filter(event =>
        event.lessonId &&
        event.period === period &&
        isAfter(new Date(event.date), targetDate)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  // === FORWARD SHIFTING LOGIC ===

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
      currentShiftDate = this.findNextAvailableDateForPeriod(currentShiftDate, period, teachingDayNumbers, currentSchedule.scheduleEvents);

      const shiftedLesson: ScheduleEvent = {
        ...lesson,
        date: new Date(currentShiftDate)
      };

      // Check if lesson goes past schedule end date
      if (activeConfig.endDate && isAfter(currentShiftDate, new Date(activeConfig.endDate))) {
        shiftedLesson.lessonId = null;
        shiftedLesson.eventType = 'Error';
        shiftedLesson.eventCategory = null;
        shiftedLesson.comment = `ERROR: Lesson pushed past schedule end (Period ${period})`;
        errorsCreated++;
        warnings.push(`Lesson ${lesson.id} converted to error - pushed past schedule end date`);
      }

      shiftedLessons.push(shiftedLesson);
      currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(currentShiftDate, 1), teachingDayNumbers);
    }

    return { shiftedLessons, errorsCreated, warnings };
  }

  private findNextAvailableDateForPeriod(
    startDate: Date,
    period: number,
    teachingDayNumbers: number[],
    scheduleEvents: ScheduleEvent[]
  ): Date {
    let candidateDate = new Date(startDate);
    const maxIterations = 365;
    let iterations = 0;

    while (iterations < maxIterations) {
      if (this.teachingDayCalculation.isTeachingDay(candidateDate, teachingDayNumbers)) {
        const isOccupied = this.teachingDayCalculation.isPeriodOccupiedByNonTeachingEvent(candidateDate, period, scheduleEvents);
        if (!isOccupied) {
          return candidateDate;
        }
      }
      candidateDate = addDays(candidateDate, 1);
      iterations++;
    }

    console.warn(`[LessonShiftingService] Could not find available date for Period ${period} after ${format(startDate, 'yyyy-MM-dd')}`);
    return startDate;
  }

  // === BACKWARD SHIFTING LOGIC ===

  private performBackwardShifts(
    lessonsAfterDeleted: ScheduleEvent[],
    period: number,
    teachingDayNumbers: number[],
    currentSchedule: any
  ): ScheduleEvent[] {
    const shiftedLessons: ScheduleEvent[] = [];

    for (const currentLesson of lessonsAfterDeleted) {
      const currentLessonDate = new Date(currentLesson.date);
      const targetDate = this.findPreviousAvailableDateForPeriod(currentLessonDate, period, teachingDayNumbers, currentSchedule.scheduleEvents);

      const updatedLesson: ScheduleEvent = {
        ...currentLesson,
        date: new Date(targetDate)
      };

      this.scheduleStateService.updateScheduleEvent(updatedLesson);
      shiftedLessons.push(updatedLesson);
    }

    return shiftedLessons;
  }

  private findPreviousAvailableDateForPeriod(
    startDate: Date,
    period: number,
    teachingDayNumbers: number[],
    scheduleEvents: ScheduleEvent[]
  ): Date {
    let candidateDate = addDays(startDate, -1);
    const maxIterations = 365;
    let iterations = 0;

    while (iterations < maxIterations) {
      if (this.teachingDayCalculation.isTeachingDay(candidateDate, teachingDayNumbers)) {
        const isOccupied = this.teachingDayCalculation.isPeriodOccupiedByNonTeachingEvent(candidateDate, period, scheduleEvents);
        if (!isOccupied) {
          return candidateDate;
        }
      }
      candidateDate = addDays(candidateDate, -1);
      iterations++;
    }

    console.warn(`[LessonShiftingService] Could not find previous available date for Period ${period} before ${format(startDate, 'yyyy-MM-dd')}`);
    return addDays(startDate, -1);
  }

  // === APPLY CHANGES ===

  private applyLessonShifts(shiftedLessons: ScheduleEvent[]): void {
    if (shiftedLessons.length === 0) return;

    shiftedLessons.forEach(lesson => {
      this.scheduleStateService.updateScheduleEvent(lesson);
    });

    this.scheduleStateService.markAsChanged();
  }

  // === UTILITY METHODS ===

  /**
   * Get count of lessons that would be affected by a forward shift
   */
  getAffectedLessonsCount(insertionDate: Date, period: number): number {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.scheduleEvents) return 0;

    return this.findLessonsInPeriodOnOrAfter(currentSchedule.scheduleEvents, insertionDate, period).length;
  }

  /**
   * Get count of lessons that would be affected by a backward shift
   */
  getAffectedLessonsCountBackward(deletedDate: Date, period: number): number {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.scheduleEvents) return 0;

    return this.findLessonsInPeriodAfter(currentSchedule.scheduleEvents, deletedDate, period).length;
  }
}
