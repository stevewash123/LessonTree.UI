// RESPONSIBILITY: Orchestrates lesson shifting operations and conflict resolution for period-based events.
// DOES NOT: Handle Error Day creation, UI notifications, or direct API calls - delegates to appropriate services.
// CALLED BY: SpecialDayManagementService and other services that need lesson scheduling operations.
import { Injectable } from '@angular/core';
import { addDays, format, isAfter, isSameDay } from 'date-fns';

import { ScheduleEvent } from '../../../../models/schedule-event.model';
import { ScheduleStateService } from '../state/schedule-state.service';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';
import { ScheduleApiService } from '../api/schedule-api.service';
import { TeachingDayCalculationService } from './teaching-day-calculations.service';

@Injectable({
  providedIn: 'root'
})
export class LessonShiftingService {
  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleConfigurationStateService: ScheduleConfigurationStateService,
    private calendarService: ScheduleApiService,
    private teachingDayCalculation: TeachingDayCalculationService
  ) {
    console.log('[LessonShiftingService] Initialized for period-based lesson shifting');
  }

  /**
   * Shift lessons that are scheduled on or after the given date forward by one teaching day
   * Period-specific shifting - only affects the specified period
   */
  shiftLessonsForward(insertionDate: Date, period: number): void {
    console.log(`[LessonShiftingService] shiftLessonsForward - Period ${period} from ${format(insertionDate, 'yyyy-MM-dd')}`);
    
    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    
    if (!currentSchedule?.scheduleEvents || !activeConfig?.teachingDays) {
      console.error('[LessonShiftingService] Cannot shift: No schedule or teaching days available');
      return;
    }

    const teachingDayNumbers = this.getTeachingDayNumbers(activeConfig.teachingDays);
    const affectedLessons = this.findLessonsInPeriodOnOrAfter(currentSchedule.scheduleEvents, insertionDate, period);

    if (affectedLessons.length === 0) {
      return;
    }

    const shiftedLessons = this.calculateForwardShifts(
      affectedLessons, 
      insertionDate, 
      period,
      teachingDayNumbers, 
      currentSchedule,
      activeConfig
    );

    this.applyLessonShifts(shiftedLessons);
  }

  /**
   * Shift lessons that are scheduled after the given date backward by one teaching day
   * Period-specific shifting - only affects the specified period
   */
  shiftLessonsBackward(deletedDate: Date, period: number): void {
    console.log(`[LessonShiftingService] shiftLessonsBackward - Period ${period} from ${format(deletedDate, 'yyyy-MM-dd')}`);
    
    const currentSchedule = this.scheduleStateService.getSchedule();
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();
    
    if (!currentSchedule?.scheduleEvents || !activeConfig?.teachingDays) {
      console.error('[LessonShiftingService] Cannot shift backward: No schedule or teaching days available');
      return;
    }

    const teachingDayNumbers = this.getTeachingDayNumbers(activeConfig.teachingDays);
    const lessonsAfterDeleted = this.findLessonsInPeriodAfter(currentSchedule.scheduleEvents, deletedDate, period);

    if (lessonsAfterDeleted.length === 0) {
      return;
    }

    this.performBackwardShifts(lessonsAfterDeleted, period, teachingDayNumbers, currentSchedule);
    this.scheduleStateService.markAsChanged();
  }

  // === PRIVATE HELPER METHODS ===

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

  // Calculate new dates for forward shifted lessons
  private calculateForwardShifts(
    affectedLessons: ScheduleEvent[], 
    insertionDate: Date, 
    period: number,
    teachingDayNumbers: number[], 
    currentSchedule: any,
    activeConfig: any
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
      if (activeConfig.endDate && isAfter(currentShiftDate, new Date(activeConfig.endDate))) {
        // Convert to error event
        shiftedLesson.lessonId = null;
        shiftedLesson.eventType = 'Error';
        shiftedLesson.eventCategory = null;
        shiftedLesson.comment = `ERROR: Lesson pushed past schedule end (Period ${period})`;
      }

      shiftedLessons.push(shiftedLesson);
      currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(currentShiftDate, 1), teachingDayNumbers);
    }

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
}