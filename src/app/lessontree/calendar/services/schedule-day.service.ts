// src/app/lessontree/calendar/services/schedule-day.service.ts - COMPLETE FILE
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { EventClickArg } from '@fullcalendar/core';

import { ScheduleDay } from '../../../models/schedule';
import { ScheduleStateService } from './schedule-state.service';
import { LessonCalendarService } from './lesson-calendar.service';

export interface ContextMenuAction {
  id: string;
  label: string;
  handler: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleDayService {
  // Injected services
  private readonly calendarService = inject(LessonCalendarService);
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly toastr = inject(ToastrService);

  // Context menu state
  private lastClickedDate: Date | null = null;
  private lastClickedEvent: EventClickArg | null = null;

  constructor() {
    console.log('[ScheduleDayService] Initialized', { timestamp: new Date().toISOString() });
  }

  // Set context for operations
  setDateContext(date: Date): void {
    this.lastClickedDate = date;
    this.lastClickedEvent = null;
    console.log(`[ScheduleDayService] Date context set: ${format(date, 'yyyy-MM-dd')}`, { 
      timestamp: new Date().toISOString() 
    });
  }

  setEventContext(event: EventClickArg): void {
    this.lastClickedEvent = event;
    this.lastClickedDate = null;
    console.log(`[ScheduleDayService] Event context set: ${event.event.id}`, { 
      timestamp: new Date().toISOString() 
    });
  }

  // Get context menu actions based on current context
  getContextMenuActions(): ContextMenuAction[] {
    const actions: ContextMenuAction[] = [];

    if (this.lastClickedDate) {
      // Date context - can add special days
      actions.push(
        {
          id: 'nonTeaching',
          label: 'Add Non-Teaching Day',
          handler: () => this.addSpecialDay('Non-Teaching Day', 'No classes today')
        },
        {
          id: 'instructorPT',
          label: 'Add Instructor PT',
          handler: () => this.addSpecialDay('Instructor PT', 'Professional development time')
        }
      );
    }

    if (this.lastClickedEvent && this.isSpecialDayEvent(this.lastClickedEvent)) {
      // Special day event context - can edit or delete
      actions.push(
        {
          id: 'editSpecialDay',
          label: 'Edit Special Day',
          handler: () => this.editSpecialDay()
        },
        {
          id: 'deleteSpecialDay',
          label: 'Delete Special Day',
          handler: () => this.deleteSpecialDay()
        }
      );
    }

    return actions;
  }

  // Check if event is a special day
  private isSpecialDayEvent(event: EventClickArg): boolean {
    return !!event.event.extendedProps['specialCode'];
  }

  // Add a special day
  addSpecialDay(specialCode: string, comment: string): void {
    if (!this.lastClickedDate) {
      console.error(`[ScheduleDayService] Cannot add special day: No date selected`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No date selected', 'Error');
      return;
    }

    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule) {
      console.error(`[ScheduleDayService] Cannot add special day: No schedule available`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No schedule available', 'Error');
      return;
    }

    const newScheduleDay: ScheduleDay = {
      id: this.scheduleStateService.isInMemorySchedule() ? -(Date.now()) : 0,
      scheduleId: currentSchedule.id,
      date: new Date(this.lastClickedDate),
      lessonId: null,
      specialCode,
      comment
    };

    if (this.scheduleStateService.isInMemorySchedule()) {
      // Add to in-memory schedule
      this.scheduleStateService.addScheduleDay(newScheduleDay);
      
      console.log(`[ScheduleDayService] Added special day to in-memory schedule`, {
        specialCode,
        date: format(newScheduleDay.date, 'yyyy-MM-dd'),
        timestamp: new Date().toISOString()
      });
      this.toastr.success('Special day added to in-memory schedule', 'Success');
    } else {
      // Add through API
      this.calendarService.addScheduleDay(newScheduleDay).subscribe({
        next: (createdDay: ScheduleDay) => {
          this.scheduleStateService.addScheduleDay(createdDay);
          
          console.log(`[ScheduleDayService] Added special day ID ${createdDay.id}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success('Special day added successfully', 'Success');
        },
        error: (err: any) => {
          console.error(`[ScheduleDayService] Failed to add special day: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to add special day', 'Error');
        }
      });
    }
  }

  // Edit a special day
  editSpecialDay(): void {
    if (!this.lastClickedEvent) {
      console.error(`[ScheduleDayService] Cannot edit special day: No event selected`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No special day selected', 'Error');
      return;
    }

    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleDays) {
      console.error(`[ScheduleDayService] Cannot edit special day: No schedule available`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No schedule available', 'Error');
      return;
    }

    const eventId = parseInt(this.lastClickedEvent.event.id);
    const scheduleDay = currentSchedule.scheduleDays.find(day => day.id === eventId);
    
    if (!scheduleDay?.specialCode) {
      console.error(`[ScheduleDayService] Cannot edit: Not a special day`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('Selected item is not a special day', 'Error');
      return;
    }

    // For now, toggle between non-teaching and instructor PT
    const newSpecialCode = scheduleDay.specialCode === 'Non-Teaching Day' ? 'Instructor PT' : 'Non-Teaching Day';
    const newComment = newSpecialCode === 'Non-Teaching Day' ? 'No classes today' : 'Professional development time';
    
    const updatedScheduleDay = {
      ...scheduleDay,
      specialCode: newSpecialCode,
      comment: newComment
    };

    this.updateScheduleDay(updatedScheduleDay);
  }

  // Delete a special day
  deleteSpecialDay(): void {
    if (!this.lastClickedEvent) {
      console.error(`[ScheduleDayService] Cannot delete special day: No event selected`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No special day selected', 'Error');
      return;
    }

    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleDays) {
      console.error(`[ScheduleDayService] Cannot delete special day: No schedule available`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No schedule available', 'Error');
      return;
    }

    const eventId = parseInt(this.lastClickedEvent.event.id);
    const scheduleDay = currentSchedule.scheduleDays.find(day => day.id === eventId);
    
    if (!scheduleDay?.specialCode) {
      console.error(`[ScheduleDayService] Cannot delete: Not a special day`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('Selected item is not a special day', 'Error');
      return;
    }

    if (this.scheduleStateService.isInMemorySchedule()) {
      // Remove from in-memory schedule
      this.scheduleStateService.removeScheduleDay(scheduleDay.id);
      
      console.log(`[ScheduleDayService] Deleted special day from in-memory schedule`, { 
        id: scheduleDay.id, 
        timestamp: new Date().toISOString() 
      });
      this.toastr.success('Special day deleted from in-memory schedule', 'Success');
    } else {
      // Delete through API
      this.calendarService.deleteScheduleDay(scheduleDay.id).subscribe({
        next: () => {
          this.scheduleStateService.removeScheduleDay(scheduleDay.id);
          this.shiftSubsequentDays(scheduleDay.date);
          
          console.log(`[ScheduleDayService] Deleted special day ID ${scheduleDay.id}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success('Special day deleted successfully', 'Success');
        },
        error: (err: any) => {
          console.error(`[ScheduleDayService] Failed to delete special day: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to delete special day', 'Error');
        }
      });
    }
  }

  // Update a schedule day
  private updateScheduleDay(scheduleDay: ScheduleDay): void {
    if (this.scheduleStateService.isInMemorySchedule()) {
      this.scheduleStateService.updateScheduleDay(scheduleDay);
      
      console.log(`[ScheduleDayService] Updated special day in in-memory schedule`, { 
        id: scheduleDay.id, 
        timestamp: new Date().toISOString() 
      });
      this.toastr.success('Special day updated in in-memory schedule', 'Success');
    } else {
      this.calendarService.updateScheduleDay(scheduleDay).subscribe({
        next: (updatedDay: ScheduleDay) => {
          this.scheduleStateService.updateScheduleDay(updatedDay);
          
          console.log(`[ScheduleDayService] Updated special day ID ${updatedDay.id}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success('Special day updated successfully', 'Success');
        },
        error: (err: any) => {
          console.error(`[ScheduleDayService] Failed to update special day: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to update special day', 'Error');
        }
      });
    }
  }

  // Shift subsequent days after deletion (placeholder for future implementation)
  private shiftSubsequentDays(deletedDate: Date): void {
    console.log(`[ScheduleDayService] Would shift subsequent days after ${format(deletedDate, 'yyyy-MM-dd')}`, { 
      timestamp: new Date().toISOString() 
    });
    // TODO: Implement logic to shift lessons to fill the gap
  }

  // Clear context (useful for cleanup)
  clearContext(): void {
    this.lastClickedDate = null;
    this.lastClickedEvent = null;
    console.log('[ScheduleDayService] Context cleared', { timestamp: new Date().toISOString() });
  }
}