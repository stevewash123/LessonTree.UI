// RESPONSIBILITY: Handles special day business logic and CRUD operations.
// DOES NOT: Handle UI notifications, API persistence details, or modal coordination - focused on business logic.
// CALLED BY: SpecialDayModalService for special day data operations.
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { format } from 'date-fns';

import { ScheduleDay } from '../../../models/schedule';
import { ScheduleStateService } from './schedule-state.service';
import { LessonCalendarService } from './lesson-calendar.service';
import { LessonShiftingService } from './lesson-shifting.service';

export interface SpecialDayData {
  date: Date;
  specialCode: string;
  title: string;
  description?: string;
}

export interface SpecialDayValidationResult {
  isValid: boolean;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SpecialDayManagementService {
  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly calendarService = inject(LessonCalendarService);
  private readonly lessonShiftingService = inject(LessonShiftingService);

  // Create a new special day
  createSpecialDay(data: SpecialDayData): Observable<ScheduleDay> {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule) {
      console.error('[SpecialDayManagement] Cannot create special day: No schedule available');
      throw new Error('No schedule available');
    }

    const newScheduleDay = this.buildScheduleDay(data, currentSchedule.id);
    
    return new Observable<ScheduleDay>(observer => {
      if (this.scheduleStateService.isInMemorySchedule()) {
        this.scheduleStateService.addScheduleDay(newScheduleDay);
        this.lessonShiftingService.shiftLessonsForward(data.date);
        observer.next(newScheduleDay);
        observer.complete();
      } else {
        this.calendarService.addScheduleDay(newScheduleDay).subscribe({
          next: (createdDay: ScheduleDay) => {
            this.scheduleStateService.addScheduleDay(createdDay);
            this.lessonShiftingService.shiftLessonsForward(data.date);
            observer.next(createdDay);
            observer.complete();
          },
          error: (err: any) => {
            console.error('[SpecialDayManagement] Failed to create special day:', err.message);
            observer.error(err);
          }
        });
      }
    });
  }

  // Update an existing special day
  updateSpecialDay(data: SpecialDayData, originalScheduleDay: ScheduleDay): Observable<ScheduleDay> {
    const updatedScheduleDay: ScheduleDay = {
      id: originalScheduleDay.id,
      scheduleId: originalScheduleDay.scheduleId,
      date: new Date(data.date),
      lessonId: null,
      specialCode: data.specialCode,
      comment: this.buildComment(data)
    };

    return this.performScheduleDayUpdate(updatedScheduleDay);
  }

  // Delete a special day
  deleteSpecialDay(scheduleDay: ScheduleDay): Observable<void> {
    return new Observable<void>(observer => {
      if (this.scheduleStateService.isInMemorySchedule()) {
        this.scheduleStateService.removeScheduleDay(scheduleDay.id);
        this.lessonShiftingService.shiftLessonsBackward(scheduleDay.date);
        observer.next();
        observer.complete();
      } else {
        this.calendarService.deleteScheduleDay(scheduleDay.id).subscribe({
          next: () => {
            this.scheduleStateService.removeScheduleDay(scheduleDay.id);
            this.lessonShiftingService.shiftLessonsBackward(scheduleDay.date);
            observer.next();
            observer.complete();
          },
          error: (err: any) => {
            console.error('[SpecialDayManagement] Failed to delete special day:', err.message);
            observer.error(err);
          }
        });
      }
    });
  }

  // Extract special day data from a ScheduleDay for editing
  extractSpecialDayData(scheduleDay: ScheduleDay): SpecialDayData | null {
    if (!scheduleDay.specialCode) {
      console.error('[SpecialDayManagement] Cannot extract data: Not a special day');
      return null;
    }

    const title = this.extractTitleFromComment(scheduleDay.comment, scheduleDay.specialCode);

    return {
      date: new Date(scheduleDay.date),
      specialCode: scheduleDay.specialCode,
      title: title,
      description: undefined // We don't currently store separate description
    };
  }

  // Find special day by schedule day ID
  findSpecialDayById(scheduleDayId: number): ScheduleDay | null {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleDays) {
      console.error('[SpecialDayManagement] Cannot find special day: No schedule available');
      return null;
    }

    const scheduleDay = currentSchedule.scheduleDays.find(day => day.id === scheduleDayId);
    
    if (!scheduleDay?.specialCode) {
      console.error('[SpecialDayManagement] Cannot find special day: Item is not a special day');
      return null;
    }

    return scheduleDay;
  }

  // Validate special day data
  validateSpecialDayData(data: SpecialDayData): SpecialDayValidationResult {
    const errors: string[] = [];

    if (!data.date) {
      errors.push('Date is required');
    }

    if (!data.specialCode || data.specialCode.trim() === '') {
      errors.push('Special code is required');
    }

    if (!data.title || data.title.trim() === '') {
      errors.push('Title is required');
    }

    if (data.title && data.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper method to create Error Days (called by LessonShiftingService)
  createErrorDay(date: Date, scheduleId: number, comment?: string): ScheduleDay {
    const defaultComment = comment || 'No lesson assigned - schedule needs more content';
    
    return {
      id: this.scheduleStateService.isInMemorySchedule() ? this.generateInMemoryId() : 0,
      scheduleId: scheduleId,
      date: new Date(date),
      lessonId: null,
      specialCode: 'Error Day',
      comment: defaultComment
    };
  }

  // Helper method to remove Error Days (called by LessonShiftingService)
  removeErrorDayIfExists(date: Date): boolean {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleDays) return false;

    const existingErrorDay = currentSchedule.scheduleDays.find(day => {
      const dayDateStr = format(new Date(day.date), 'yyyy-MM-dd');
      const targetDateStr = format(date, 'yyyy-MM-dd');
      return dayDateStr === targetDateStr && day.specialCode === 'Error Day';
    });
    
    if (existingErrorDay) {
      this.scheduleStateService.removeScheduleDay(existingErrorDay.id);
      return true;
    }
    
    return false;
  }

  // Private helper methods
  private buildScheduleDay(data: SpecialDayData, scheduleId: number): ScheduleDay {
    return {
      id: this.scheduleStateService.isInMemorySchedule() ? this.generateInMemoryId() : 0,
      scheduleId: scheduleId,
      date: new Date(data.date),
      lessonId: null,
      specialCode: data.specialCode,
      comment: this.buildComment(data)
    };
  }

  private buildComment(data: SpecialDayData): string {
    let comment = data.title;
    if (data.description) {
      comment += ` - ${data.description}`;
    }
    return comment;
  }

  private extractTitleFromComment(comment: string | null | undefined, specialCode: string): string {
    if (!comment) return specialCode;
    
    // Parse title from comment if it contains the special code prefix
    if (comment.startsWith(specialCode + ':')) {
      return comment.substring((specialCode + ':').length).trim();
    }
    
    return comment;
  }

  private generateInMemoryId(): number {
    return -(Date.now() + Math.floor(Math.random() * 1000));
  }

  private performScheduleDayUpdate(scheduleDay: ScheduleDay): Observable<ScheduleDay> {
    return new Observable<ScheduleDay>(observer => {
      if (this.scheduleStateService.isInMemorySchedule()) {
        this.scheduleStateService.updateScheduleDay(scheduleDay);
        this.scheduleStateService.markAsChanged();
        observer.next(scheduleDay);
        observer.complete();
      } else {
        this.calendarService.updateScheduleDay(scheduleDay).subscribe({
          next: (updatedDay: ScheduleDay) => {
            this.scheduleStateService.updateScheduleDay(updatedDay);
            observer.next(updatedDay);
            observer.complete();
          },
          error: (err: any) => {
            console.error('[SpecialDayManagement] Failed to update special day:', err.message);
            observer.error(err);
          }
        });
      }
    });
  }
}