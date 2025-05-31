// COMPLETE FILE
// RESPONSIBILITY: Handles pure date calculations and teaching day logic (stateless mathematical operations).
// DOES NOT: Manage schedule state, handle API calls, or orchestrate complex operations - pure calculation functions.
// CALLED BY: LessonShiftingService and other services that need teaching day calculations.
import { Injectable } from '@angular/core';
import { addDays, format } from 'date-fns';
import { ScheduleDay } from '../../../models/schedule';

@Injectable({
  providedIn: 'root'
})
export class TeachingDayCalculationService {

  constructor() {
    console.log('[TeachingDayCalculationService] Initialized', { timestamp: new Date().toISOString() });
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
  parseTeachingDaysFromString(teachingDaysString: string): string[] {
    if (!teachingDaysString || teachingDaysString.trim() === '') {
      return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']; // Default
    }
    return teachingDaysString.split(',').map(day => day.trim());
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
   * Check if a date is occupied by a non-teaching day (but not an error day)
   */
  isDateOccupiedByNonTeachingDay(date: Date, scheduleDays: ScheduleDay[]): boolean {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduleDays.some(day => {
      const dayDateStr = format(new Date(day.date), 'yyyy-MM-dd');
      return dayDateStr === dateStr && 
             day.specialCode && 
             day.specialCode !== 'Error Day';
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
   * Find the next available teaching day that's not occupied by non-teaching days
   */
  findNextAvailableTeachingDay(fromDate: Date, teachingDayNumbers: number[], scheduleDays: ScheduleDay[]): Date {
    let candidate = this.getNextTeachingDay(fromDate, teachingDayNumbers);
    let whileLoopCounter = 0;

    while (this.isDateOccupiedByNonTeachingDay(candidate, scheduleDays) && whileLoopCounter < 50) {
      console.log(`[TeachingDayCalculationService] Date ${format(candidate, 'yyyy-MM-dd')} is occupied, finding next teaching day`, { 
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
   * Find the previous available teaching day that's not occupied by non-teaching days
   */
  findPreviousAvailableTeachingDay(fromDate: Date, teachingDayNumbers: number[], scheduleDays: ScheduleDay[]): Date {
    let candidate = this.getPreviousTeachingDay(fromDate, teachingDayNumbers);
    let whileLoopCounter = 0;

    while (this.isDateOccupiedByNonTeachingDay(candidate, scheduleDays) && whileLoopCounter < 50) {
      console.log(`[TeachingDayCalculationService] Date ${format(candidate, 'yyyy-MM-dd')} is occupied by non-teaching day, finding previous teaching day`, { 
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
   * Calculate how many teaching days exist between two dates
   */
  countTeachingDaysBetween(startDate: Date, endDate: Date, teachingDayNumbers: number[]): number {
    return this.getTeachingDaysBetween(startDate, endDate, teachingDayNumbers).length;
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
   */
  getTeachingDayDebugInfo(teachingDaysString: string): any {
    const teachingDayNames = this.parseTeachingDaysFromString(teachingDaysString);
    const teachingDayNumbers = this.getTeachingDayNumbers(teachingDayNames);
    const validation = this.validateTeachingDays(teachingDayNames);

    return {
      teachingDaysString,
      teachingDayNames,
      teachingDayNumbers,
      validation,
      displayNames: teachingDayNumbers.map(num => this.getDayDisplayName(num))
    };
  }
}