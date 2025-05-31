// COMPLETE FILE
// RESPONSIBILITY: Orchestrates lesson shifting operations, conflict resolution, and schedule day management.
// DOES NOT: Handle pure date calculations or UI interactions - delegates calculations to TeachingDayCalculationService.
// CALLED BY: SpecialDayManagementService and other services that need lesson scheduling operations.
import { Injectable, inject } from '@angular/core';
import { addDays, format, isAfter, isSameDay } from 'date-fns';
import { ToastrService } from 'ngx-toastr';

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
  private readonly toastr = inject(ToastrService);

  constructor() {
    console.log('[LessonShiftingService] Initialized', { timestamp: new Date().toISOString() });
  }

  /**
   * Shift lessons that are scheduled on or after the given date forward by one teaching day
   * Non-teaching days stay in place (simple rule)
   */
  shiftLessonsForward(insertionDate: Date): void {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleDays || !currentSchedule?.teachingDays) {
      console.error(`[LessonShiftingService] Cannot shift lessons: No schedule or teaching days available`, {
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Parse teaching days using calculation service
    const teachingDayNames = this.teachingDayCalculation.parseTeachingDaysFromString(currentSchedule.teachingDays);
    const teachingDayNumbers = this.teachingDayCalculation.getTeachingDayNumbers(teachingDayNames);
    
    console.log(`[LessonShiftingService] Starting lesson shift for insertion date ${format(insertionDate, 'yyyy-MM-dd')}`, {
      teachingDays: teachingDayNames,
      timestamp: new Date().toISOString()
    });

    // Find all lessons scheduled on or after the insertion date
    const affectedLessons = this.findAffectedLessonsForward(currentSchedule.scheduleDays, insertionDate);

    if (affectedLessons.length === 0) {
      console.log(`[LessonShiftingService] No lessons to shift after ${format(insertionDate, 'yyyy-MM-dd')}`, {
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`[LessonShiftingService] Found ${affectedLessons.length} lessons to shift`, {
      lessons: affectedLessons.map(l => ({ id: l.id, date: format(new Date(l.date), 'yyyy-MM-dd'), lessonId: l.lessonId })),
      timestamp: new Date().toISOString()
    });

    // Calculate new dates for all affected lessons
    const shiftedLessons = this.calculateShiftedLessonsForward(
      affectedLessons, 
      insertionDate, 
      teachingDayNumbers, 
      currentSchedule
    );

    // Update all shifted lessons
    this.updateShiftedLessons(shiftedLessons);
  }

  /**
   * Shift lessons that are scheduled after the given date backward by one teaching day
   * Used when a special day is deleted to fill the gap
   */
  shiftLessonsBackward(deletedDate: Date): void {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleDays || !currentSchedule?.teachingDays) {
      console.error(`[LessonShiftingService] Cannot shift lessons backward: No schedule or teaching days available`, {
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Parse teaching days using calculation service
    const teachingDayNames = this.teachingDayCalculation.parseTeachingDaysFromString(currentSchedule.teachingDays);
    const teachingDayNumbers = this.teachingDayCalculation.getTeachingDayNumbers(teachingDayNames);
    
    console.log(`[LessonShiftingService] Starting backward lesson shift for deleted date ${format(deletedDate, 'yyyy-MM-dd')}`, {
      teachingDays: teachingDayNames,
      timestamp: new Date().toISOString()
    });

    // Find all lessons scheduled after the deleted date
    const lessonsAfterDeleted = this.findAffectedLessonsBackward(currentSchedule.scheduleDays, deletedDate);

    if (lessonsAfterDeleted.length === 0) {
      console.log(`[LessonShiftingService] No lessons to shift backward after ${format(deletedDate, 'yyyy-MM-dd')}`, {
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`[LessonShiftingService] Found ${lessonsAfterDeleted.length} lessons to shift backward`, {
      lessons: lessonsAfterDeleted.map(l => ({ 
        id: l.id, 
        date: format(new Date(l.date), 'yyyy-MM-dd'), 
        lessonId: l.lessonId 
      })),
      timestamp: new Date().toISOString()
    });

    // Shift lessons backward one by one
    this.performBackwardShift(lessonsAfterDeleted, teachingDayNumbers, currentSchedule);

    // After shifting, check if we need to add Error Days at the end
    this.addErrorDaysIfNeeded(currentSchedule, teachingDayNumbers);

    this.scheduleStateService.markAsChanged();
    
    console.log(`[LessonShiftingService] Completed backward shifting ${lessonsAfterDeleted.length} lessons`, {
      timestamp: new Date().toISOString()
    });
    this.toastr.info(`Shifted ${lessonsAfterDeleted.length} lessons backward to fill gap`, 'Lessons Shifted');
  }

  // Find lessons affected by forward shift
  private findAffectedLessonsForward(scheduleDays: ScheduleDay[], insertionDate: Date): ScheduleDay[] {
    return scheduleDays
      .filter(day => 
        day.lessonId && // Has a lesson (not a special day)
        (isSameDay(new Date(day.date), insertionDate) || isAfter(new Date(day.date), insertionDate))
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date
  }

  // Find lessons affected by backward shift
  private findAffectedLessonsBackward(scheduleDays: ScheduleDay[], deletedDate: Date): ScheduleDay[] {
    return scheduleDays
      .filter(day => 
        day.lessonId && // Has a lesson (not a special day)
        isAfter(new Date(day.date), deletedDate) // Only lessons AFTER the deleted date
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort DESCENDING (latest first)
  }

  // Calculate new dates for forward shifted lessons
  private calculateShiftedLessonsForward(
    affectedLessons: ScheduleDay[], 
    insertionDate: Date, 
    teachingDayNumbers: number[], 
    currentSchedule: any
  ): ScheduleDay[] {
    const shiftedLessons: ScheduleDay[] = [];
    let currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(insertionDate, 1), teachingDayNumbers);

    for (const lesson of affectedLessons) {
      // Find next available teaching day using calculation service
      currentShiftDate = this.teachingDayCalculation.findNextAvailableTeachingDay(
        currentShiftDate, 
        teachingDayNumbers, 
        currentSchedule.scheduleDays
      );

      // Remove any Error Day that might be on this date
      this.removeErrorDayIfExists(currentShiftDate, currentSchedule.scheduleDays);
      
      const shiftedLesson = {
        ...lesson,
        date: new Date(currentShiftDate)
      };

      // Check if this lesson would go past the schedule end date
      if (currentSchedule.endDate && isAfter(currentShiftDate, new Date(currentSchedule.endDate))) {
        // Mark as error - lesson pushed past schedule end
        shiftedLesson.lessonId = null;
        shiftedLesson.specialCode = 'Error Day';
        shiftedLesson.comment = `ERROR: Lesson ${lesson.lessonId} pushed past schedule end`;
        
        console.warn(`[LessonShiftingService] Lesson ${lesson.lessonId} pushed past schedule end date`, {
          originalDate: format(new Date(lesson.date), 'yyyy-MM-dd'),
          newDate: format(currentShiftDate, 'yyyy-MM-dd'),
          endDate: format(new Date(currentSchedule.endDate), 'yyyy-MM-dd'),
          timestamp: new Date().toISOString()
        });
      }

      shiftedLessons.push(shiftedLesson);

      // Move to next teaching day for the next lesson
      currentShiftDate = this.teachingDayCalculation.getNextTeachingDay(addDays(currentShiftDate, 1), teachingDayNumbers);
    }

    return shiftedLessons;
  }

  // Perform backward shift operation
  private performBackwardShift(
    lessonsAfterDeleted: ScheduleDay[], 
    teachingDayNumbers: number[], 
    currentSchedule: any
  ): void {
    // Start from the last lesson and work backwards
    for (let i = 0; i < lessonsAfterDeleted.length; i++) {
      const currentLesson = lessonsAfterDeleted[i];
      
      // Find the previous available teaching day using calculation service
      const currentLessonDate = new Date(currentLesson.date);
      const targetDate = this.teachingDayCalculation.findPreviousAvailableTeachingDay(
        currentLessonDate, 
        teachingDayNumbers, 
        currentSchedule.scheduleDays
      );

      // Update this lesson to the target date
      const updatedLesson: ScheduleDay = {
        ...currentLesson,
        date: new Date(targetDate)
      };

      console.log(`[LessonShiftingService] Moving lesson ${currentLesson.lessonId} from ${format(currentLessonDate, 'yyyy-MM-dd')} to ${format(targetDate, 'yyyy-MM-dd')}`, {
        timestamp: new Date().toISOString()
      });

      this.scheduleStateService.updateScheduleDay(updatedLesson);
    }
  }

  // Remove error day if it exists on the given date
  private removeErrorDayIfExists(date: Date, scheduleDays: ScheduleDay[]): void {
    const existingErrorDay = scheduleDays.find(day => {
      const dayDateStr = format(new Date(day.date), 'yyyy-MM-dd');
      const targetDateStr = format(date, 'yyyy-MM-dd');
      return dayDateStr === targetDateStr && day.specialCode === 'Error Day';
    });
    
    if (existingErrorDay) {
      console.log(`[LessonShiftingService] Removing Error Day from ${format(date, 'yyyy-MM-dd')} to make room for lesson`, {
        errorDayId: existingErrorDay.id,
        timestamp: new Date().toISOString()
      });
      this.scheduleStateService.removeScheduleDay(existingErrorDay.id);
    }
  }

  /**
   * Update all shifted lessons in the schedule
   */
  private updateShiftedLessons(shiftedLessons: ScheduleDay[]): void {
    if (shiftedLessons.length === 0) return;

    console.log(`[LessonShiftingService] Updating ${shiftedLessons.length} shifted lessons`, {
      lessons: shiftedLessons.map(l => ({ 
        id: l.id, 
        newDate: format(new Date(l.date), 'yyyy-MM-dd'),
        isError: l.specialCode === 'Error Day'
      })),
      timestamp: new Date().toISOString()
    });

    if (this.scheduleStateService.isInMemorySchedule()) {
      // Update in-memory schedule
      shiftedLessons.forEach(lesson => {
        this.scheduleStateService.updateScheduleDay(lesson);
      });
      this.scheduleStateService.markAsChanged();
      
      console.log(`[LessonShiftingService] Updated ${shiftedLessons.length} lessons in in-memory schedule`, {
        timestamp: new Date().toISOString()
      });
      this.toastr.info(`Shifted ${shiftedLessons.length} lessons forward`, 'Lessons Shifted');
    } else {
      // Update through API - batch update all lessons
      const updates = shiftedLessons.map(lesson => 
        this.calendarService.updateScheduleDay(lesson)
      );

      // Execute all updates (could be optimized to batch API call)
      let completedUpdates = 0;
      const totalUpdates = updates.length;

      updates.forEach((update, index) => {
        update.subscribe({
          next: (updatedLesson) => {
            this.scheduleStateService.updateScheduleDay(updatedLesson);
            completedUpdates++;
            
            if (completedUpdates === totalUpdates) {
              console.log(`[LessonShiftingService] Completed shifting ${totalUpdates} lessons`, {
                timestamp: new Date().toISOString()
              });
              this.toastr.success(`Successfully shifted ${totalUpdates} lessons forward`, 'Lessons Shifted');
            }
          },
          error: (err) => {
            console.error(`[LessonShiftingService] Failed to update shifted lesson ${shiftedLessons[index].id}: ${err.message}`, {
              timestamp: new Date().toISOString()
            });
            this.toastr.error(`Failed to shift some lessons`, 'Shift Error');
          }
        });
      });
    }
  }

  /**
   * Add Error Days at the end if needed after backward shifting
   */
  private addErrorDaysIfNeeded(schedule: any, teachingDayNumbers: number[]): void {
    if (!schedule.endDate) {
      console.log(`[LessonShiftingService] No end date set, skipping Error Day check`, {
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Find the last lesson date
    const lessonsOnly = schedule.scheduleDays.filter((day: any) => day.lessonId);
    if (lessonsOnly.length === 0) {
      console.log(`[LessonShiftingService] No lessons in schedule, skipping Error Day check`, {
        timestamp: new Date().toISOString()
      });
      return;
    }

    const lastLessonDate = lessonsOnly
      .map((day: any) => new Date(day.date))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0]; // Latest date

    // Find all teaching days between last lesson and schedule end using calculation service
    const teachingDaysBetween = this.teachingDayCalculation.getTeachingDaysBetween(
      addDays(lastLessonDate, 1), 
      new Date(schedule.endDate), 
      teachingDayNumbers
    );

    const newErrorDays: ScheduleDay[] = [];

    for (const teachingDay of teachingDaysBetween) {
      // Check if this date already has something scheduled
      const existingDay = schedule.scheduleDays.find((day: any) => {
        const dayDate = format(new Date(day.date), 'yyyy-MM-dd');
        const teachingDayStr = format(teachingDay, 'yyyy-MM-dd');
        return dayDate === teachingDayStr;
      });

      if (!existingDay) {
        // Add Error Day
        const errorDay: ScheduleDay = {
          id: this.scheduleStateService.isInMemorySchedule() ? -(Date.now() + newErrorDays.length) : 0,
          scheduleId: schedule.id,
          date: new Date(teachingDay),
          lessonId: null,
          specialCode: 'Error Day',
          comment: 'No lesson assigned - schedule needs more content'
        };

        newErrorDays.push(errorDay);
      }
    }

    // Add the new Error Days
    if (newErrorDays.length > 0) {
      console.log(`[LessonShiftingService] Adding ${newErrorDays.length} Error Days after backward shift`, {
        errorDays: newErrorDays.map(d => format(new Date(d.date), 'yyyy-MM-dd')),
        timestamp: new Date().toISOString()
      });

      newErrorDays.forEach(errorDay => {
        this.scheduleStateService.addScheduleDay(errorDay);
      });
    }
  }
}