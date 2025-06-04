// RESPONSIBILITY: Orchestrates lesson shifting operations and conflict resolution.
// DOES NOT: Handle Error Day creation, UI notifications, or direct API calls - delegates to appropriate services.
// CALLED BY: SpecialDayManagementService and other services that need lesson scheduling operations.
import { Injectable, inject } from '@angular/core';
import { addDays, format, isAfter, isSameDay } from 'date-fns';

import { ScheduleEvent } from '../../../models/schedule';
import { ScheduleStateService } from './schedule-state.service';
import { LessonCalendarService } from './lesson-calendar.service';
import { TeachingDayCalculationService } from './teaching-day-calculations.service';

@Injectable({
  providedIn: 'root'
})
export class LessonShiftingService {
  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly calendarService = inject(LessonCalendarService);
  private readonly teachingDayCalculation = inject(TeachingDayCalculationService);

  constructor() {
    console.log('[LessonShiftingService] Initialized for ScheduleEvent period-based lesson shifting');
  }

  /**
   * Shift lessons that are scheduled on or after the given date forward by one teaching day
   * UPDATED: Period-specific shifting - only affects the specified period
   */
  shiftLessonsForward(insertionDate: Date, period: number): void {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleEvents || !currentSchedule?.teachingDays) {
      console.error('[LessonShiftingService] Cannot shift: No schedule or teaching days available');
      return;
    }

    const teachingDayNumbers = this.getTeachingDayNumbers(currentSchedule.teachingDays);
    const affectedLessons = this.findLessonsInPeriodOnOrAfter(currentSchedule.scheduleEvents, insertionDate, period);

    if (affectedLessons.length === 0) {
      console.log(`[LessonShiftingService] No lessons found in Period ${period} to shift forward`);
      return;
    }

    console.log(`[LessonShiftingService] Shifting ${affectedLessons.length} lessons in Period ${period} forward from ${format(insertionDate, 'yyyy-MM-dd')}`);

    const shiftedLessons = this.calculatePeriodSpecificForwardShifts(
      affectedLessons, 
      insertionDate, 
      period,
      teachingDayNumbers, 
      currentSchedule
    );

    this.applyLessonShifts(shiftedLessons);
  }

  /**
   * Shift lessons that are scheduled after the given date backward by one teaching day
   * UPDATED: Period-specific shifting - only affects the specified period
   */
  shiftLessonsBackward(deletedDate: Date, period: number): void {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleEvents || !currentSchedule?.teachingDays) {
      console.error('[LessonShiftingService] Cannot shift backward: No schedule or teaching days available');
      return;
    }

    const teachingDayNumbers = this.getTeachingDayNumbers(currentSchedule.teachingDays);
    const lessonsAfterDeleted = this.findLessonsInPeriodAfter(currentSchedule.scheduleEvents, deletedDate, period);

    if (lessonsAfterDeleted.length === 0) {
      console.log(`[LessonShiftingService] No lessons found in Period ${period} to shift backward`);
      return;
    }

    console.log(`[LessonShiftingService] Shifting ${lessonsAfterDeleted.length} lessons in Period ${period} backward from ${format(deletedDate, 'yyyy-MM-dd')}`);

    this.performPeriodSpecificBackwardShifts(lessonsAfterDeleted, period, teachingDayNumbers, currentSchedule);
    this.scheduleStateService.markAsChanged();
  }

  // Helper method to get teaching day numbers
  private getTeachingDayNumbers(teachingDaysString: string): number[] {
    const teachingDayNames = this.teachingDayCalculation.parseTeachingDaysFromString(teachingDaysString);
    return this.teachingDayCalculation.getTeachingDayNumbers(teachingDayNames);
  }

  // Find lessons in a specific period on or after a date
  private findLessonsInPeriodOnOrAfter(scheduleEvents: ScheduleEvent[], targetDate: Date, period: number): ScheduleEvent[] {
    const lessonEvents = scheduleEvents
      .filter(event => 
        event.lessonId && 
        event.period === period &&
        (isSameDay(new Date(event.date), targetDate) || isAfter(new Date(event.date), targetDate))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`[LessonShiftingService] Found ${lessonEvents.length} lesson events in Period ${period} on or after ${format(targetDate, 'yyyy-MM-dd')}`);
    return lessonEvents;
  }

  // Find lessons in a specific period after a date (not including the date itself)
  private findLessonsInPeriodAfter(scheduleEvents: ScheduleEvent[], targetDate: Date, period: number): ScheduleEvent[] {
    const lessonEvents = scheduleEvents
      .filter(event => 
        event.lessonId && 
        event.period === period &&
        isAfter(new Date(event.date), targetDate)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending by date

    console.log(`[LessonShiftingService] Found ${lessonEvents.length} lesson events in Period ${period} after ${format(targetDate, 'yyyy-MM-dd')}`);
    return lessonEvents;
  }

  // Calculate new dates for forward shifted lessons - PERIOD-SPECIFIC
  private calculatePeriodSpecificForwardShifts(
    affectedLessons: ScheduleEvent[], 
    insertionDate: Date, 
    period: number,
    teachingDayNumbers: number[], 
    currentSchedule: any
  ): ScheduleEvent[] {
    const shiftedLessons: ScheduleEvent[] = [];
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
      if (currentSchedule.endDate && isAfter(currentShiftDate, new Date(currentSchedule.endDate))) {
        // Convert to error event
        shiftedLesson.lessonId = null;
        shiftedLesson.specialCode = 'Error Day';
        shiftedLesson.comment = `ERROR: Lesson ${lesson.lessonId} pushed past schedule end (Period ${period})`;
        
        console.warn(`[LessonShiftingService] Lesson ${lesson.lessonId} (Period ${period}) pushed past schedule end`);
      }

      shiftedLessons.push(shiftedLesson);
      currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(currentShiftDate, 1), teachingDayNumbers);
    }

    console.log(`[LessonShiftingService] Calculated ${shiftedLessons.length} forward shifts for Period ${period}`);
    return shiftedLessons;
  }

  // Find next available date for a specific period
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
        }
      }
      
      candidateDate = addDays(candidateDate, 1);
      iterations++;
    }

    console.warn(`[LessonShiftingService] Could not find available date for Period ${period} after ${format(startDate, 'yyyy-MM-dd')}`);
    return startDate; // Fallback
  }

  // Perform backward shift operations - PERIOD-SPECIFIC
  private performPeriodSpecificBackwardShifts(
    lessonsAfterDeleted: ScheduleEvent[], 
    period: number,
    teachingDayNumbers: number[], 
    currentSchedule: any
  ): void {
    let shiftsApplied = 0;

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
      shiftsApplied++;

      console.log(`[LessonShiftingService] Shifted lesson ${currentLesson.lessonId} (Period ${period}) from ${format(currentLessonDate, 'yyyy-MM-dd')} to ${format(targetDate, 'yyyy-MM-dd')}`);
    }

    console.log(`[LessonShiftingService] Applied ${shiftsApplied} backward shifts for Period ${period}`);
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

  // Apply lesson shifts - UPDATED for ScheduleEvent
  private applyLessonShifts(shiftedLessons: ScheduleEvent[]): void {
    if (shiftedLessons.length === 0) return;

    console.log(`[LessonShiftingService] Applying ${shiftedLessons.length} lesson shifts`);

    // Always update through state service - let it handle persistence
    shiftedLessons.forEach(lesson => {
      this.scheduleStateService.updateScheduleEvent(lesson);
    });
    
    this.scheduleStateService.markAsChanged();
    console.log(`[LessonShiftingService] Successfully applied ${shiftedLessons.length} lesson shifts`);
  }

  // === NEW: PERIOD-SPECIFIC SHIFTING METHODS ===

  /**
   * Public method: Shift lessons in a specific period forward
   * This is the main entry point for period-specific forward shifting
   */
  shiftLessonsInPeriodForward(insertionDate: Date, period: number): void {
    // This is now the same as the main shiftLessonsForward method
    this.shiftLessonsForward(insertionDate, period);
  }

  /**
   * Public method: Shift lessons in a specific period backward  
   * This is the main entry point for period-specific backward shifting
   */
  shiftLessonsInPeriodBackward(deletedDate: Date, period: number): void {
    // This is now the same as the main shiftLessonsBackward method
    this.shiftLessonsBackward(deletedDate, period);
  }

  // === DEBUG AND UTILITY METHODS ===

  getShiftingDebugInfo(): any {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    
    if (!currentSchedule) {
      return { error: 'No schedule selected' };
    }

    const lessonEvents = currentSchedule.scheduleEvents?.filter(event => event.lessonId) || [];
    const specialEvents = currentSchedule.scheduleEvents?.filter(event => event.specialCode) || [];

    return {
      scheduleId: currentSchedule.id,
      scheduleTitle: currentSchedule.title,
      totalEvents: currentSchedule.scheduleEvents?.length || 0,
      lessonEvents: lessonEvents.length,
      specialEvents: specialEvents.length,
      lessonEventsByPeriod: this.groupEventsByPeriod(lessonEvents),
      teachingDays: currentSchedule.teachingDays,
      dateRange: {
        start: currentSchedule.startDate,
        end: currentSchedule.endDate
      }
    };
  }

  private groupEventsByPeriod(events: ScheduleEvent[]): { [period: number]: number } {
    const groupedByPeriod: { [period: number]: number } = {};
    
    events.forEach(event => {
      groupedByPeriod[event.period] = (groupedByPeriod[event.period] || 0) + 1;
    });
    
    return groupedByPeriod;
  }

  // REMOVED METHODS (Single Responsibility Violations):
  // - removeErrorDayIfExists() -> Should be handled by SpecialDayManagementService
  // - addErrorDaysIfNeeded() -> Should be handled by SpecialDayManagementService  
  // - updateShiftedLessons() API logic -> Should be handled by SchedulePersistenceService
  // - Toast notifications -> Should be handled by calling service or UI layer

  // NOTE: Error Event management should be delegated to SpecialDayManagementService
  // NOTE: Toast notifications should be handled by the calling service
  // NOTE: API persistence should be handled by SchedulePersistenceService
}