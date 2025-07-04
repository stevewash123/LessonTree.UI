// **COMPLETE FILE** - LessonSequenceUtilityService - Helper Calculations and Utilities
// RESPONSIBILITY: Date calculations, availability checking, and utility operations for lesson sequences
// DOES NOT: Analyze sequences, generate events, or coordinate services
// CALLED BY: LessonSequenceGenerationService and LessonSequenceAnalysisService for utility functions

import { Injectable } from '@angular/core';
import { addDays, format } from 'date-fns';
import { ScheduleStateService } from '../state/schedule-state.service';
import { TeachingDayCalculationService } from './teaching-day-calculations.service';

@Injectable({
  providedIn: 'root'
})
export class LessonSequenceUtilityService {

  constructor(
    private scheduleStateService: ScheduleStateService,
    private teachingDayCalculation: TeachingDayCalculationService
  ) {
    console.log('[LessonSequenceUtilityService] Utility functions initialized');
  }

  // === DATE CALCULATIONS ===

  /**
   * Find next available date for a specific period
   */
  findNextAvailableDateForPeriod(startDate: Date, period: number, teachingDays: string[]): Date {
    const teachingDayNumbers = this.teachingDayCalculation.getTeachingDayNumbers(teachingDays);
    let candidateDate = new Date(startDate);
    const maxIterations = 365;
    let iterations = 0;

    while (iterations < maxIterations) {
      if (this.teachingDayCalculation.isTeachingDay(candidateDate, teachingDayNumbers)) {
        if (this.isPeriodAvailableOnDate(candidateDate, period)) {
          return candidateDate;
        }
      }
      candidateDate = addDays(candidateDate, 1);
      iterations++;
    }

    console.warn(`[LessonSequenceUtilityService] Could not find available date for Period ${period} after ${format(startDate, 'yyyy-MM-dd')}`);
    return startDate;
  }

  /**
   * Find next available date for multiple periods
   */
  findNextAvailableDateForMultiplePeriods(startDate: Date, periods: number[], teachingDays: string[]): Date {
    const teachingDayNumbers = this.teachingDayCalculation.getTeachingDayNumbers(teachingDays);
    let candidateDate = new Date(startDate);
    const maxIterations = 365;
    let iterations = 0;

    while (iterations < maxIterations) {
      if (this.teachingDayCalculation.isTeachingDay(candidateDate, teachingDayNumbers)) {
        const allPeriodsAvailable = periods.every(period =>
          this.isPeriodAvailableOnDate(candidateDate, period)
        );

        if (allPeriodsAvailable) {
          return candidateDate;
        }
      }
      candidateDate = addDays(candidateDate, 1);
      iterations++;
    }

    console.warn(`[LessonSequenceUtilityService] Could not find available date for periods ${periods.join(', ')} after ${format(startDate, 'yyyy-MM-dd')}`);
    return startDate;
  }

  /**
   * Get all teaching days between two dates
   */
  getTeachingDaysBetween(startDate: Date, endDate: Date, teachingDays: string[]): Date[] {
    const teachingDayNumbers = this.teachingDayCalculation.getTeachingDayNumbers(teachingDays);
    const dates: Date[] = [];

    const currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      if (this.teachingDayCalculation.isTeachingDay(currentDate, teachingDayNumbers)) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  }

  /**
   * Calculate number of teaching days between dates
   */
  countTeachingDaysBetween(startDate: Date, endDate: Date, teachingDays: string[]): number {
    return this.getTeachingDaysBetween(startDate, endDate, teachingDays).length;
  }

  // === AVAILABILITY CHECKING ===

  /**
   * Check if a period is available on a specific date
   */
  isPeriodAvailableOnDate(date: Date, period: number): boolean {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.scheduleEvents) return true;

    // Check if this date/period combination already has a non-lesson event
    const existingEvent = currentSchedule.scheduleEvents.find(event =>
      new Date(event.date).toDateString() === date.toDateString() &&
      event.period === period &&
      event.eventType !== 'Lesson' &&
      event.eventType !== 'Error'
    );

    return !existingEvent;
  }

  /**
   * Check if multiple periods are available on a specific date
   */
  arePeriodsAvailableOnDate(date: Date, periods: number[]): boolean {
    return periods.every(period => this.isPeriodAvailableOnDate(date, period));
  }

  /**
   * Get all occupied periods for a specific date
   */
  getOccupiedPeriodsOnDate(date: Date): number[] {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.scheduleEvents) return [];

    return currentSchedule.scheduleEvents
      .filter(event =>
        new Date(event.date).toDateString() === date.toDateString() &&
        event.eventType !== 'Lesson' &&
        event.eventType !== 'Error'
      )
      .map(event => event.period);
  }

  /**
   * Get all available periods for a specific date
   */
  getAvailablePeriodsOnDate(date: Date, totalPeriods: number = 10): number[] {
    const occupiedPeriods = this.getOccupiedPeriodsOnDate(date);
    const allPeriods = Array.from({ length: totalPeriods }, (_, i) => i + 1);

    return allPeriods.filter(period => !occupiedPeriods.includes(period));
  }

  // === EVENT ID GENERATION ===

  /**
   * Generate unique negative event ID for in-memory events
   */
  generateNegativeEventId(): number {
    return -(Date.now() + Math.floor(Math.random() * 1000));
  }

  /**
   * Generate multiple unique negative event IDs
   */
  generateMultipleNegativeEventIds(count: number): number[] {
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(this.generateNegativeEventId());
    }
    return ids;
  }

  // === VALIDATION UTILITIES ===

  /**
   * Validate date is within schedule bounds
   */
  isDateWithinScheduleBounds(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  }

  /**
   * Validate period number is valid
   */
  isValidPeriod(period: number, maxPeriods: number = 10): boolean {
    return period >= 1 && period <= maxPeriods;
  }

  /**
   * Validate lesson index is within course bounds
   */
  isValidLessonIndex(lessonIndex: number, totalLessons: number): boolean {
    return lessonIndex >= 0 && lessonIndex < totalLessons;
  }

  // === FORMATTING UTILITIES ===

  /**
   * Format date for logging and display
   */
  formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  /**
   * Format date range for logging
   */
  formatDateRange(startDate: Date, endDate: Date): string {
    return `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
  }

  /**
   * Format period list for display
   */
  formatPeriodList(periods: number[]): string {
    if (periods.length === 1) {
      return `Period ${periods[0]}`;
    }
    return `Periods ${periods.join(', ')}`;
  }

  // === CALCULATION UTILITIES ===

  /**
   * Calculate maximum possible events for a period in date range
   */
  calculateMaxPossibleEventsForPeriod(
    startDate: Date,
    endDate: Date,
    period: number,
    teachingDays: string[]
  ): number {
    const teachingDatesInRange = this.getTeachingDaysBetween(startDate, endDate, teachingDays);

    return teachingDatesInRange.filter(date =>
      this.isPeriodAvailableOnDate(date, period)
    ).length;
  }

  /**
   * Calculate schedule efficiency for a course period
   */
  calculateScheduleEfficiency(
    totalLessons: number,
    assignedLessons: number,
    availableSlots: number
  ): {
    utilizationPercentage: number;
    efficiency: 'high' | 'medium' | 'low';
    hasGaps: boolean;
  } {
    const utilizationPercentage = availableSlots > 0 ? (assignedLessons / availableSlots) * 100 : 0;

    let efficiency: 'high' | 'medium' | 'low' = 'low';
    if (utilizationPercentage >= 80) efficiency = 'high';
    else if (utilizationPercentage >= 60) efficiency = 'medium';

    const hasGaps = assignedLessons < totalLessons && availableSlots > assignedLessons;

    return {
      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
      efficiency,
      hasGaps
    };
  }

  // === DEBUG UTILITIES ===

  /**
   * Get debug information about utility service
   */
  getDebugInfo(): any {
    const currentSchedule = this.scheduleStateService.getSchedule();

    return {
      utilityService: {
        initialized: true,
        canCalculateDates: true,
        canCheckAvailability: true,
        hasSchedule: !!currentSchedule,
        scheduleEventCount: currentSchedule?.scheduleEvents?.length || 0,
        supportedOperations: [
          'findNextAvailableDateForPeriod',
          'isPeriodAvailableOnDate',
          'generateNegativeEventId',
          'calculateMaxPossibleEventsForPeriod',
          'calculateScheduleEfficiency'
        ]
      }
    };
  }

  /**
   * Log diagnostic information for debugging
   */
  logDiagnostics(context: string): void {
    const currentSchedule = this.scheduleStateService.getSchedule();

    console.log(`[LessonSequenceUtilityService] ${context} Diagnostics:`, {
      hasSchedule: !!currentSchedule,
      eventCount: currentSchedule?.scheduleEvents?.length || 0,
      timestamp: new Date().toISOString()
    });
  }
}
