// RESPONSIBILITY: Orchestrates lesson shifting operations and conflict resolution.
// DOES NOT: Handle Error Day creation, UI notifications, or direct API calls - delegates to appropriate services.
// CALLED BY: SpecialDayManagementService and other services that need lesson scheduling operations.
import { Injectable, inject } from '@angular/core';
import { addDays, format, isAfter, isSameDay } from 'date-fns';

import { ScheduleDay } from '../../../models/schedule';
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

  /**
   * Shift lessons that are scheduled on or after the given date forward by one teaching day
   */
  shiftLessonsForward(insertionDate: Date): void {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleDays || !currentSchedule?.teachingDays) {
      console.error('[LessonShifting] Cannot shift: No schedule or teaching days available');
      return;
    }

    const teachingDayNumbers = this.getTeachingDayNumbers(currentSchedule.teachingDays);
    const affectedLessons = this.findLessonsOnOrAfter(currentSchedule.scheduleDays, insertionDate);

    if (affectedLessons.length === 0) return;

    const shiftedLessons = this.calculateForwardShifts(
      affectedLessons, 
      insertionDate, 
      teachingDayNumbers, 
      currentSchedule
    );

    this.applyLessonShifts(shiftedLessons);
  }

  /**
   * Shift lessons that are scheduled after the given date backward by one teaching day
   */
  shiftLessonsBackward(deletedDate: Date): void {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleDays || !currentSchedule?.teachingDays) {
      console.error('[LessonShifting] Cannot shift backward: No schedule or teaching days available');
      return;
    }

    const teachingDayNumbers = this.getTeachingDayNumbers(currentSchedule.teachingDays);
    const lessonsAfterDeleted = this.findLessonsAfter(currentSchedule.scheduleDays, deletedDate);

    if (lessonsAfterDeleted.length === 0) return;

    this.performBackwardShifts(lessonsAfterDeleted, teachingDayNumbers, currentSchedule);
    this.scheduleStateService.markAsChanged();
  }

  // Helper method to get teaching day numbers
  private getTeachingDayNumbers(teachingDaysString: string): number[] {
    const teachingDayNames = this.teachingDayCalculation.parseTeachingDaysFromString(teachingDaysString);
    return this.teachingDayCalculation.getTeachingDayNumbers(teachingDayNames);
  }

  // Find lessons on or after a specific date
  private findLessonsOnOrAfter(scheduleDays: ScheduleDay[], targetDate: Date): ScheduleDay[] {
    return scheduleDays
      .filter(day => 
        day.lessonId && 
        (isSameDay(new Date(day.date), targetDate) || isAfter(new Date(day.date), targetDate))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Find lessons after a specific date (not including the date itself)
  private findLessonsAfter(scheduleDays: ScheduleDay[], targetDate: Date): ScheduleDay[] {
    return scheduleDays
      .filter(day => 
        day.lessonId && 
        isAfter(new Date(day.date), targetDate)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Descending
  }

  // Calculate new dates for forward shifted lessons
  private calculateForwardShifts(
    affectedLessons: ScheduleDay[], 
    insertionDate: Date, 
    teachingDayNumbers: number[], 
    currentSchedule: any
  ): ScheduleDay[] {
    const shiftedLessons: ScheduleDay[] = [];
    let currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(insertionDate, 1), teachingDayNumbers);

    for (const lesson of affectedLessons) {
      currentShiftDate = this.teachingDayCalculation.findNextAvailableTeachingDay(
        currentShiftDate, 
        teachingDayNumbers, 
        currentSchedule.scheduleDays
      );

      const shiftedLesson = {
        ...lesson,
        date: new Date(currentShiftDate)
      };

      // Check if lesson goes past schedule end date
      if (currentSchedule.endDate && isAfter(currentShiftDate, new Date(currentSchedule.endDate))) {
        // Convert to error day
        shiftedLesson.lessonId = null;
        shiftedLesson.specialCode = 'Error Day';
        shiftedLesson.comment = `ERROR: Lesson ${lesson.lessonId} pushed past schedule end`;
        
        console.warn(`[LessonShifting] Lesson ${lesson.lessonId} pushed past schedule end`);
      }

      shiftedLessons.push(shiftedLesson);
      currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(currentShiftDate, 1), teachingDayNumbers);
    }

    return shiftedLessons;
  }

  // Perform backward shift operations
  private performBackwardShifts(
    lessonsAfterDeleted: ScheduleDay[], 
    teachingDayNumbers: number[], 
    currentSchedule: any
  ): void {
    for (const currentLesson of lessonsAfterDeleted) {
      const currentLessonDate = new Date(currentLesson.date);
      const targetDate = this.teachingDayCalculation.findPreviousAvailableTeachingDay(
        currentLessonDate, 
        teachingDayNumbers, 
        currentSchedule.scheduleDays
      );

      const updatedLesson: ScheduleDay = {
        ...currentLesson,
        date: new Date(targetDate)
      };

      this.scheduleStateService.updateScheduleDay(updatedLesson);
    }
  }

  // Apply lesson shifts (simplified - removed API/in-memory branching)
  private applyLessonShifts(shiftedLessons: ScheduleDay[]): void {
    if (shiftedLessons.length === 0) return;

    // Always update through state service - let it handle persistence
    shiftedLessons.forEach(lesson => {
      this.scheduleStateService.updateScheduleDay(lesson);
    });
    
    this.scheduleStateService.markAsChanged();
  }

  // REMOVED METHODS (Single Responsibility Violations):
  // - removeErrorDayIfExists() -> Should be handled by SpecialDayManagementService
  // - addErrorDaysIfNeeded() -> Should be handled by SpecialDayManagementService  
  // - updateShiftedLessons() API logic -> Should be handled by SchedulePersistenceService
  // - Toast notifications -> Should be handled by calling service or UI layer

  // NOTE: Error Day management should be delegated to SpecialDayManagementService
  // NOTE: Toast notifications should be handled by the calling service
  // NOTE: API persistence should be handled by SchedulePersistenceService
}