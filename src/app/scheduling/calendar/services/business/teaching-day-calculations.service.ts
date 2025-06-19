// **COMPLETE FILE** - Enhanced teaching-day-calculations.service.ts
// RESPONSIBILITY: Pure date calculations, teaching day logic, and schedule event queries (stateless operations)
// DOES NOT: Manage schedule state, handle API calls, or orchestrate complex operations - pure calculation functions
// CALLED BY: LessonShiftingService, ScheduleStateService callers, and other services that need date/period calculations

import { Injectable } from '@angular/core';
import { addDays, format } from 'date-fns';
import { ScheduleEvent } from '../../../../models/schedule-event.model';

@Injectable({
  providedIn: 'root'
})
export class TeachingDayCalculationService {

  constructor() {
    console.log('[TeachingDayCalculationService] Initialized for date calculations and schedule event queries');
  }
  
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
      teachingDayNumbers
    });
    return addDays(fromDate, 1);
  }

  
  isPeriodOccupiedByNonTeachingEvent(date: Date, period: number, scheduleEvents: ScheduleEvent[]): boolean {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduleEvents.some(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr && 
             event.period === period &&
             event.eventType && 
             event.eventType !== 'Error';
    });
  }

  
//    * Check if a date is a teaching day based on day of week
//    */
  isTeachingDay(date: Date, teachingDayNumbers: number[]): boolean {
    const dayOfWeek = date.getDay();
    return teachingDayNumbers.includes(dayOfWeek);
  }
}