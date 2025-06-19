// RESPONSIBILITY: Calculates week numbers for schedules based on Monday-start weeks.
// DOES NOT: Handle UI display or schedule data management.  
// CALLED BY: Calendar components and services for week-based operations.

import { addDays, differenceInDays, startOfWeek } from 'date-fns';

/**
 * Calculate which week number a given date falls into relative to schedule start
 * @param scheduleStartDate The start date of the schedule
 * @param targetDate The date to calculate week number for
 * @returns Week number (1-based)
 */
export function getWeekNumber(scheduleStartDate: Date, targetDate: Date): number {
  // Find the Monday of the week containing the schedule start date
  const firstMonday = startOfWeek(scheduleStartDate, { weekStartsOn: 1 }); // 1 = Monday
  
  // Calculate days elapsed since first Monday
  const daysDifference = differenceInDays(targetDate, firstMonday);
  
  // Calculate week number (1-based)
  return Math.floor(daysDifference / 7) + 1;
}

/**
 * Get the Monday-Sunday date range for a specific week number
 * @param scheduleStartDate The start date of the schedule
 * @param weekNumber The week number (1-based)
 * @returns Object with start (Monday) and end (Sunday) dates
 */
export function getWeekDateRange(scheduleStartDate: Date, weekNumber: number): { start: Date; end: Date; } {
  // Find the Monday of the week containing the schedule start date
  const firstMonday = startOfWeek(scheduleStartDate, { weekStartsOn: 1 });
  
  // Calculate the Monday of the target week
  const weekStart = addDays(firstMonday, (weekNumber - 1) * 7);
  const weekEnd = addDays(weekStart, 6); // Sunday
  
  return {
    start: weekStart,
    end: weekEnd
  };
}

/**
 * Get a formatted week label for display
 * @param scheduleStartDate The start date of the schedule
 * @param weekNumber The week number (1-based)
 * @returns Formatted string like "Week 1 (Aug 1-7)"
 */
export function getWeekLabel(scheduleStartDate: Date, weekNumber: number): string {
  const { start, end } = getWeekDateRange(scheduleStartDate, weekNumber);
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();
  
  // Format: "Week 1 (Aug 1-7)" or "Week 1 (Aug 31-Sep 6)" for cross-month
  const dateRange = startMonth === endMonth 
    ? `${startMonth} ${startDay}-${endDay}`
    : `${startMonth} ${startDay}-${endMonth} ${endDay}`;
    
  return `Week ${weekNumber} (${dateRange})`;
}

/**
 * Get the total number of weeks in a schedule
 * @param scheduleStartDate The start date of the schedule
 * @param scheduleEndDate The end date of the schedule
 * @returns Total number of weeks
 */
export function getTotalWeeksInSchedule(scheduleStartDate: Date, scheduleEndDate: Date): number {
  return getWeekNumber(scheduleStartDate, scheduleEndDate);
}

/**
 * Check if a date falls within a specific week
 * @param scheduleStartDate The start date of the schedule
 * @param targetDate The date to check
 * @param weekNumber The week number to check against
 * @returns True if the date falls within the specified week
 */
export function isDateInWeek(scheduleStartDate: Date, targetDate: Date, weekNumber: number): boolean {
  const actualWeek = getWeekNumber(scheduleStartDate, targetDate);
  return actualWeek === weekNumber;
}

/**
 * Get all dates within a specific week that match the teaching days
 * @param scheduleStartDate The start date of the schedule
 * @param weekNumber The week number
 * @param teachingDays Array of teaching day names (e.g., ['Monday', 'Wednesday', 'Friday'])
 * @returns Array of dates that are both in the week and are teaching days
 */
export function getTeachingDatesInWeek(
  scheduleStartDate: Date, 
  weekNumber: number, 
  teachingDays: string[]
): Date[] {
  const { start, end } = getWeekDateRange(scheduleStartDate, weekNumber);
  const teachingDates: Date[] = [];
  
  // Check each day in the week
  for (let currentDate = new Date(start); currentDate <= end; currentDate.setDate(currentDate.getDate() + 1)) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (teachingDays.includes(dayName)) {
      teachingDates.push(new Date(currentDate));
    }
  }
  
  return teachingDates;
}