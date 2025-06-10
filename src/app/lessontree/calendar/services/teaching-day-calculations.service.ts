// RESPONSIBILITY: Handles pure date calculations and teaching day logic (stateless mathematical operations).
// DOES NOT: Manage schedule state, handle API calls, or orchestrate complex operations - pure calculation functions.
// CALLED BY: LessonShiftingService and other services that need teaching day calculations.
import { Injectable } from '@angular/core';
import { addDays, format } from 'date-fns';
import { ScheduleEvent } from '../../../models/schedule-event.model';

@Injectable({
  providedIn: 'root'
})
export class TeachingDayCalculationService {

  constructor() {
    console.log('[TeachingDayCalculationService] Initialized for ScheduleEvent period-based calculations', { 
      timestamp: new Date().toISOString() 
    });
  }

  /**
   * Convert teaching day names to day numbers (0=Sunday, 1=Monday, etc.)
   */
  getTeachingDayNumbers(teachingDayNames: string[]): number[] {
    const dayMap: { [key: string]: number } = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    return teachingDayNames
      .map(dayName => dayMap[dayName])
      .filter(dayNum => dayNum !== undefined)
      .sort((a, b) => a - b);
  }

  /**
   * Parse teaching days from CSV string format
   */
  parseTeachingDays(teachingDays: string[]): string[] {
    if (!teachingDays || teachingDays.length === 0) {
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']; // Default
    }
    return teachingDays.filter(day => day && day.trim().length > 0);
  }

  /**
   * Get the next teaching day on or after the given date
   */
  getNextTeachingDay(fromDate: Date, teachingDayNumbers: number[]): Date {
    let candidate = new Date(fromDate);
    const maxIterations = 14; // Prevent infinite loop
    let iterations = 0;

    while (iterations < maxIterations) {
      const dayOfWeek = candidate.getDay();
      if (teachingDayNumbers.includes(dayOfWeek)) {
        return candidate;
      }
      candidate = addDays(candidate, 1);
      iterations++;
    }

    // Fallback - just return next day if we can't find a teaching day
    console.warn(`[TeachingDayCalculationService] Could not find teaching day after ${format(fromDate, 'yyyy-MM-dd')}`, {
      teachingDayNumbers,
      timestamp: new Date().toISOString()
    });
    return addDays(fromDate, 1);
  }

  /**
   * Get the previous teaching day before the given date
   */
  getPreviousTeachingDay(fromDate: Date, teachingDayNumbers: number[]): Date {
    let candidate = addDays(fromDate, -1); // Start one day before
    const maxIterations = 14; // Prevent infinite loop
    let iterations = 0;

    while (iterations < maxIterations) {
      const dayOfWeek = candidate.getDay();
      if (teachingDayNumbers.includes(dayOfWeek)) {
        return candidate;
      }
      candidate = addDays(candidate, -1);
      iterations++;
    }

    // Fallback - just return previous day if we can't find a teaching day
    console.warn(`[TeachingDayCalculationService] Could not find teaching day before ${format(fromDate, 'yyyy-MM-dd')}`, {
      teachingDayNumbers,
      timestamp: new Date().toISOString()
    });
    return addDays(fromDate, -1);
  }

  /**
   * Check if a date is occupied by a non-teaching event (but not an error event)
   * UPDATED: Now works with ScheduleEvent and considers all periods for a date
   */
  isDateOccupiedByNonTeachingEvents(date: Date, scheduleEvents: ScheduleEvent[]): boolean {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduleEvents.some(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr && 
             event.eventType && 
             event.eventType !== 'Error';      // UPDATED: was specialCode !== 'Error Day'
    });
  }

  /**
   * Check if a specific period on a date is occupied by a non-teaching event
   * UPDATED: Uses eventType instead of specialCode
   */
  isPeriodOccupiedByNonTeachingEvent(date: Date, period: number, scheduleEvents: ScheduleEvent[]): boolean {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduleEvents.some(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr && 
             event.period === period &&
             event.eventType && 
             event.eventType !== 'Error';      // UPDATED: was specialCode !== 'Error Day'
    });
  }

  /**
   * Check if a date is a teaching day based on day of week
   */
  isTeachingDay(date: Date, teachingDayNumbers: number[]): boolean {
    const dayOfWeek = date.getDay();
    return teachingDayNumbers.includes(dayOfWeek);
  }

  /**
   * Get all teaching days between two dates (inclusive)
   */
  getTeachingDaysBetween(startDate: Date, endDate: Date, teachingDayNumbers: number[]): Date[] {
    const teachingDays: Date[] = [];
    let currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      if (this.isTeachingDay(currentDate, teachingDayNumbers)) {
        teachingDays.push(new Date(currentDate));
      }
      currentDate = addDays(currentDate, 1);
    }

    return teachingDays;
  }

  /**
   * Find the next available teaching day that's not occupied by non-teaching events
   * UPDATED: Works with ScheduleEvent and eventType
   */
  findNextAvailableTeachingDay(fromDate: Date, teachingDayNumbers: number[], scheduleEvents: ScheduleEvent[]): Date {
    let candidate = this.getNextTeachingDay(fromDate, teachingDayNumbers);
    let whileLoopCounter = 0;

    while (this.isDateOccupiedByNonTeachingEvents(candidate, scheduleEvents) && whileLoopCounter < 50) {
      console.log(`[TeachingDayCalculationService] Date ${format(candidate, 'yyyy-MM-dd')} is occupied by non-teaching events, finding next teaching day`, { 
        whileLoopCounter 
      });
      candidate = this.getNextTeachingDay(addDays(candidate, 1), teachingDayNumbers);
      whileLoopCounter++;
    }

    if (whileLoopCounter >= 50) {
      console.error(`[TeachingDayCalculationService] Breaking infinite loop - couldn't find available teaching day after ${format(candidate, 'yyyy-MM-dd')}`);
      return addDays(fromDate, 1); // Fallback
    }

    return candidate;
  }

  /**
   * Find the previous available teaching day that's not occupied by non-teaching events
   * UPDATED: Works with ScheduleEvent and eventType
   */
  findPreviousAvailableTeachingDay(fromDate: Date, teachingDayNumbers: number[], scheduleEvents: ScheduleEvent[]): Date {
    let candidate = this.getPreviousTeachingDay(fromDate, teachingDayNumbers);
    let whileLoopCounter = 0;

    while (this.isDateOccupiedByNonTeachingEvents(candidate, scheduleEvents) && whileLoopCounter < 50) {
      console.log(`[TeachingDayCalculationService] Date ${format(candidate, 'yyyy-MM-dd')} is occupied by non-teaching events, finding previous teaching day`, { 
        whileLoopCounter 
      });
      candidate = this.getPreviousTeachingDay(addDays(candidate, -1), teachingDayNumbers);
      whileLoopCounter++;
    }

    if (whileLoopCounter >= 50) {
      console.error(`[TeachingDayCalculationService] Breaking infinite loop - couldn't find available teaching day before ${format(candidate, 'yyyy-MM-dd')}`);
      return addDays(fromDate, -1); // Fallback
    }

    return candidate;
  }

  /**
   * Find next available period on a specific date
   * Returns null if no periods are available on that date
   */
  findNextAvailablePeriodOnDate(date: Date, maxPeriods: number, scheduleEvents: ScheduleEvent[]): number | null {
    const dateStr = format(date, 'yyyy-MM-dd');
    const occupiedPeriods = new Set(
      scheduleEvents
        .filter(event => format(new Date(event.date), 'yyyy-MM-dd') === dateStr)
        .map(event => event.period)
    );

    for (let period = 1; period <= maxPeriods; period++) {
      if (!occupiedPeriods.has(period)) {
        return period;
      }
    }

    return null; // No available periods
  }

  /**
   * Get all occupied periods for a specific date
   */
  getOccupiedPeriodsForDate(date: Date, scheduleEvents: ScheduleEvent[]): number[] {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduleEvents
      .filter(event => format(new Date(event.date), 'yyyy-MM-dd') === dateStr)
      .map(event => event.period)
      .sort((a, b) => a - b);
  }

  /**
   * Get all available periods for a specific date
   */
  getAvailablePeriodsForDate(date: Date, maxPeriods: number, scheduleEvents: ScheduleEvent[]): number[] {
    const occupiedPeriods = new Set(this.getOccupiedPeriodsForDate(date, scheduleEvents));
    const availablePeriods: number[] = [];

    for (let period = 1; period <= maxPeriods; period++) {
      if (!occupiedPeriods.has(period)) {
        availablePeriods.push(period);
      }
    }

    return availablePeriods;
  }

  /**
   * Calculate how many teaching days exist between two dates
   */
  countTeachingDaysBetween(startDate: Date, endDate: Date, teachingDayNumbers: number[]): number {
    return this.getTeachingDaysBetween(startDate, endDate, teachingDayNumbers).length;
  }

  /**
   * Count total available lesson slots between dates (teaching days × periods)
   */
  countAvailableLessonSlotsBetween(
    startDate: Date, 
    endDate: Date, 
    teachingDayNumbers: number[], 
    periodsPerDay: number,
    scheduleEvents: ScheduleEvent[]
  ): number {
    const teachingDays = this.getTeachingDaysBetween(startDate, endDate, teachingDayNumbers);
    let totalSlots = 0;

    for (const teachingDay of teachingDays) {
      const availablePeriods = this.getAvailablePeriodsForDate(teachingDay, periodsPerDay, scheduleEvents);
      totalSlots += availablePeriods.length;
    }

    return totalSlots;
  }

  /**
   * Get display name for day of week number
   */
  getDayDisplayName(dayNumber: number): string {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[dayNumber] || 'Unknown';
  }

  /**
   * Validate teaching days configuration
   */
  validateTeachingDays(teachingDayNames: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (!teachingDayNames || teachingDayNames.length === 0) {
      errors.push('At least one teaching day must be specified');
    } else {
      for (const dayName of teachingDayNames) {
        if (!validDays.includes(dayName)) {
          errors.push(`Invalid day name: ${dayName}`);
        }
      }

      if (teachingDayNames.length > 7) {
        errors.push('Cannot have more than 7 teaching days');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get debug info for teaching day configuration
   * ENHANCED: Now includes period-based information with eventType
   */
  getTeachingDayDebugInfo(
    teachingDays: string[], 
    periodsPerDay: number = 6,
    scheduleEvents: ScheduleEvent[] = []
  ): any {
    const teachingDayNames = this.parseTeachingDays(teachingDays);
    const teachingDayNumbers = this.getTeachingDayNumbers(teachingDayNames);
    const validation = this.validateTeachingDays(teachingDayNames);
  
    // Calculate period statistics for the next 7 days
    const today = new Date();
    const nextWeek = addDays(today, 7);
    const upcomingTeachingDays = this.getTeachingDaysBetween(today, nextWeek, teachingDayNumbers);
    
    const periodStats = upcomingTeachingDays.map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      dayName: this.getDayDisplayName(date.getDay()),
      occupiedPeriods: this.getOccupiedPeriodsForDate(date, scheduleEvents),
      availablePeriods: this.getAvailablePeriodsForDate(date, periodsPerDay, scheduleEvents)
    }));
  
    return {
      teachingDays,
      teachingDayNames,
      teachingDayNumbers,
      validation,
      displayNames: teachingDayNumbers.map(num => this.getDayDisplayName(num)),
      periodsPerDay,
      upcomingWeekStats: {
        teachingDaysCount: upcomingTeachingDays.length,
        totalPossibleSlots: upcomingTeachingDays.length * periodsPerDay,
        occupiedSlots: scheduleEvents.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= today && eventDate <= nextWeek;
        }).length,
        periodStats
      }
    };
  }
}