// COMPLETE FILE
// RESPONSIBILITY: Handles special day business logic, CRUD operations, and API coordination.
// DOES NOT: Handle UI interactions, modal coordination, or context management - pure business logic.
// CALLED BY: SpecialDayModalService for special day data operations.
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';

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

@Injectable({
  providedIn: 'root'
})
export class SpecialDayManagementService {
  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly calendarService = inject(LessonCalendarService);
  private readonly lessonShiftingService = inject(LessonShiftingService);
  private readonly toastr = inject(ToastrService);

  constructor() {
    console.log('[SpecialDayManagementService] Initialized', { timestamp: new Date().toISOString() });
  }

  // Create a new special day
  createSpecialDay(data: SpecialDayData): void {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule) {
      console.error(`[SpecialDayManagementService] Cannot create special day: No schedule available`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No schedule available', 'Error');
      return;
    }

    // Build comment from title and description
    const comment = this.buildComment(data);

    const newScheduleDay: ScheduleDay = {
      id: this.scheduleStateService.isInMemorySchedule() ? -(Date.now()) : 0,
      scheduleId: currentSchedule.id,
      date: new Date(data.date),
      lessonId: null,
      specialCode: data.specialCode,
      comment
    };

    if (this.scheduleStateService.isInMemorySchedule()) {
      // Add to in-memory schedule
      this.scheduleStateService.addScheduleDay(newScheduleDay);
      
      // Shift lessons after adding the special day
      this.lessonShiftingService.shiftLessonsForward(data.date);
      
      console.log(`[SpecialDayManagementService] Added special day to in-memory schedule and shifted lessons`, {
        specialCode: data.specialCode,
        title: data.title,
        date: format(newScheduleDay.date, 'yyyy-MM-dd'),
        timestamp: new Date().toISOString()
      });
      this.toastr.success('Special day added and lessons shifted', 'Success');
    } else {
      // Add through API
      this.calendarService.addScheduleDay(newScheduleDay).subscribe({
        next: (createdDay: ScheduleDay) => {
          this.scheduleStateService.addScheduleDay(createdDay);
          
          // Shift lessons after successfully adding the special day
          this.lessonShiftingService.shiftLessonsForward(data.date);
          
          console.log(`[SpecialDayManagementService] Added special day ID ${createdDay.id} and shifted lessons`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success('Special day added and lessons shifted', 'Success');
        },
        error: (err: any) => {
          console.error(`[SpecialDayManagementService] Failed to add special day: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to add special day', 'Error');
        }
      });
    }
  }

  // Update an existing special day
  updateSpecialDay(data: SpecialDayData, originalScheduleDay: ScheduleDay): void {
    // Build comment from title and description
    const comment = this.buildComment(data);

    const updatedScheduleDay: ScheduleDay = {
      id: originalScheduleDay.id,
      scheduleId: originalScheduleDay.scheduleId,
      date: new Date(data.date),
      lessonId: null,
      specialCode: data.specialCode,
      comment
    };

    this.performScheduleDayUpdate(updatedScheduleDay);
  }

  // Delete a special day
  deleteSpecialDay(scheduleDay: ScheduleDay): void {
    if (this.scheduleStateService.isInMemorySchedule()) {
      // Remove from in-memory schedule
      this.scheduleStateService.removeScheduleDay(scheduleDay.id);
      
      // Add reverse shifting after deletion
      this.lessonShiftingService.shiftLessonsBackward(scheduleDay.date);
      
      console.log(`[SpecialDayManagementService] Deleted special day from in-memory schedule and shifted lessons backward`, { 
        id: scheduleDay.id, 
        timestamp: new Date().toISOString() 
      });
      this.toastr.success('Non-teaching day deleted and lessons shifted backward', 'Success');
    } else {
      // Delete through API
      this.calendarService.deleteScheduleDay(scheduleDay.id).subscribe({
        next: () => {
          this.scheduleStateService.removeScheduleDay(scheduleDay.id);
          this.lessonShiftingService.shiftLessonsBackward(scheduleDay.date);
          
          console.log(`[SpecialDayManagementService] Deleted special day ID ${scheduleDay.id} and shifted lessons backward`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success('Non-teaching day deleted and lessons shifted backward', 'Success');
        },
        error: (err: any) => {
          console.error(`[SpecialDayManagementService] Failed to delete special day: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to delete non-teaching day', 'Error');
        }
      });
    }
  }

  // Extract special day data from a ScheduleDay for editing
  extractSpecialDayData(scheduleDay: ScheduleDay): SpecialDayData | null {
    if (!scheduleDay.specialCode) {
      console.error(`[SpecialDayManagementService] Cannot extract data: Not a special day`, { 
        timestamp: new Date().toISOString() 
      });
      return null;
    }

    // Parse title from comment if it contains the special code prefix
    let title = scheduleDay.comment || scheduleDay.specialCode;
    if (title.startsWith(scheduleDay.specialCode + ':')) {
      title = title.substring((scheduleDay.specialCode + ':').length).trim();
    }

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
      console.error(`[SpecialDayManagementService] Cannot find special day: No schedule available`, { 
        timestamp: new Date().toISOString() 
      });
      return null;
    }

    const scheduleDay = currentSchedule.scheduleDays.find(day => day.id === scheduleDayId);
    
    if (!scheduleDay?.specialCode) {
      console.error(`[SpecialDayManagementService] Cannot find special day: Item is not a special day`, { 
        timestamp: new Date().toISOString() 
      });
      return null;
    }

    return scheduleDay;
  }

  // Validate special day data
  validateSpecialDayData(data: SpecialDayData): { isValid: boolean; errors: string[] } {
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

  // Build comment from title and description
  private buildComment(data: SpecialDayData): string {
    let comment = data.title;
    if (data.description) {
      comment += ` - ${data.description}`;
    }
    return comment;
  }

  // Update a schedule day (extracted for reuse)
  private performScheduleDayUpdate(scheduleDay: ScheduleDay): void {
    if (this.scheduleStateService.isInMemorySchedule()) {
      this.scheduleStateService.updateScheduleDay(scheduleDay);
      this.scheduleStateService.markAsChanged();
      
      console.log(`[SpecialDayManagementService] Updated special day in in-memory schedule`, { 
        id: scheduleDay.id, 
        timestamp: new Date().toISOString() 
      });
      this.toastr.success('Special day updated in in-memory schedule', 'Success');
    } else {
      this.calendarService.updateScheduleDay(scheduleDay).subscribe({
        next: (updatedDay: ScheduleDay) => {
          this.scheduleStateService.updateScheduleDay(updatedDay);
          
          console.log(`[SpecialDayManagementService] Updated special day ID ${updatedDay.id}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success('Special day updated successfully', 'Success');
        },
        error: (err: any) => {
          console.error(`[SpecialDayManagementService] Failed to update special day: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to update special day', 'Error');
        }
      });
    }
  }
}