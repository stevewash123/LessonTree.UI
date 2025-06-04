// RESPONSIBILITY: Handles special day business logic and CRUD operations with multi-period support.
// DOES NOT: Handle UI notifications, API persistence details, or modal coordination - focused on business logic.
// CALLED BY: SpecialDayModalService for special day data operations.
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { format } from 'date-fns';

import { ScheduleEvent } from '../../../models/schedule';
import { ScheduleStateService } from './schedule-state.service';
import { LessonCalendarService } from './lesson-calendar.service';
import { LessonShiftingService } from './lesson-shifting.service';

export interface SpecialDayData {
  date: Date;
  periods: number[];                 // UPDATED: Multiple periods array
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

  constructor() {
    console.log('[SpecialDayManagementService] Initialized for ScheduleEvent multi-period special days');
  }

  // Create special day events for multiple periods - UPDATED for multi-period
  createSpecialDay(data: SpecialDayData): Observable<ScheduleEvent[]> {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule) {
      console.error('[SpecialDayManagementService] Cannot create special day: No schedule available');
      throw new Error('No schedule available');
    }

    const newScheduleEvents = data.periods.map(period => 
      this.buildScheduleEvent(data, currentSchedule.id, period)
    );
    
    return new Observable<ScheduleEvent[]>(observer => {
      if (this.scheduleStateService.isInMemorySchedule()) {
        newScheduleEvents.forEach(event => {
          this.scheduleStateService.addScheduleEvent(event);
          // Shift lessons for each affected period
          this.lessonShiftingService.shiftLessonsForward(data.date, event.period);
        });
        
        console.log('[SpecialDayManagementService] Created special day events in memory', {
          date: format(data.date, 'yyyy-MM-dd'),
          periods: data.periods,
          specialCode: data.specialCode
        });
        
        observer.next(newScheduleEvents);
        observer.complete();
      } else {
        // Create all events via API
        const createPromises = newScheduleEvents.map(event => 
          this.calendarService.addScheduleEvent(event).toPromise()
        );
        
        Promise.all(createPromises).then((createdEvents: (ScheduleEvent | undefined)[]) => {
          const validEvents = createdEvents.filter(event => event !== undefined) as ScheduleEvent[];
          
          validEvents.forEach(event => {
            this.scheduleStateService.addScheduleEvent(event);
            this.lessonShiftingService.shiftLessonsForward(data.date, event.period);
          });
          
          console.log('[SpecialDayManagementService] Created special day events via API', {
            date: format(data.date, 'yyyy-MM-dd'),
            periods: data.periods,
            specialCode: data.specialCode,
            eventsCreated: validEvents.length
          });
          
          observer.next(validEvents);
          observer.complete();
        }).catch(err => {
          console.error('[SpecialDayManagementService] Failed to create special day:', err.message);
          observer.error(err);
        });
      }
    });
  }

  // Update an existing special day event - SINGLE PERIOD UPDATE
  updateSpecialDay(data: SpecialDayData, originalScheduleEvent: ScheduleEvent): Observable<ScheduleEvent> {
    // For update, we only update the single event provided (single period)
    const targetPeriod = originalScheduleEvent.period;
    
    const updatedScheduleEvent: ScheduleEvent = {
      id: originalScheduleEvent.id,
      scheduleId: originalScheduleEvent.scheduleId,
      date: new Date(data.date),
      period: targetPeriod,
      lessonId: null,
      specialCode: data.specialCode,
      comment: this.buildComment(data)
    };

    console.log('[SpecialDayManagementService] Updating special day event', {
      eventId: originalScheduleEvent.id,
      period: targetPeriod,
      specialCode: data.specialCode
    });

    return this.performScheduleEventUpdate(updatedScheduleEvent);
  }

  // Delete a special day event - SINGLE PERIOD DELETE
  deleteSpecialDay(scheduleEvent: ScheduleEvent): Observable<void> {
    return new Observable<void>(observer => {
      if (this.scheduleStateService.isInMemorySchedule()) {
        this.scheduleStateService.removeScheduleEvent(scheduleEvent.id);
        this.lessonShiftingService.shiftLessonsBackward(scheduleEvent.date, scheduleEvent.period);
        
        console.log('[SpecialDayManagementService] Deleted special day event from memory', {
          eventId: scheduleEvent.id,
          period: scheduleEvent.period,
          specialCode: scheduleEvent.specialCode
        });
        
        observer.next();
        observer.complete();
      } else {
        this.calendarService.deleteScheduleEvent(scheduleEvent.id).subscribe({
          next: () => {
            this.scheduleStateService.removeScheduleEvent(scheduleEvent.id);
            this.lessonShiftingService.shiftLessonsBackward(scheduleEvent.date, scheduleEvent.period);
            
            console.log('[SpecialDayManagementService] Deleted special day event via API', {
              eventId: scheduleEvent.id,
              period: scheduleEvent.period,
              specialCode: scheduleEvent.specialCode
            });
            
            observer.next();
            observer.complete();
          },
          error: (err: any) => {
            console.error('[SpecialDayManagementService] Failed to delete special day:', err.message);
            observer.error(err);
          }
        });
      }
    });
  }

  // Extract special day data from a ScheduleEvent for editing - SINGLE PERIOD
  extractSpecialDayData(scheduleEvent: ScheduleEvent): SpecialDayData | null {
    if (!scheduleEvent.specialCode) {
      console.error('[SpecialDayManagementService] Cannot extract data: Not a special day event');
      return null;
    }

    const title = this.extractTitleFromComment(scheduleEvent.comment, scheduleEvent.specialCode);

    return {
      date: new Date(scheduleEvent.date),
      periods: [scheduleEvent.period],     // Single period for editing
      specialCode: scheduleEvent.specialCode,
      title: title,
      description: undefined // We don't currently store separate description
    };
  }

  // Find special day by schedule event ID - UNCHANGED
  findSpecialDayById(scheduleEventId: number): ScheduleEvent | null {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleEvents) {
      console.error('[SpecialDayManagementService] Cannot find special day: No schedule available');
      return null;
    }

    const scheduleEvent = currentSchedule.scheduleEvents.find(event => event.id === scheduleEventId);
    
    if (!scheduleEvent?.specialCode) {
      console.error('[SpecialDayManagementService] Cannot find special day: Item is not a special day event');
      return null;
    }

    return scheduleEvent;
  }

  // Find special day for a specific date and period - UNCHANGED
  findSpecialDayForPeriod(date: Date, period: number): ScheduleEvent | null {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleEvents) return null;

    const dateStr = format(date, 'yyyy-MM-dd');
    return currentSchedule.scheduleEvents.find(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr && 
             event.period === period && 
             event.specialCode && 
             event.specialCode !== 'Error Day';
    }) || null;
  }

  // Get all special days for a specific date - UNCHANGED
  getSpecialDaysForDate(date: Date): ScheduleEvent[] {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleEvents) return [];

    const dateStr = format(date, 'yyyy-MM-dd');
    return currentSchedule.scheduleEvents.filter(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr && 
             event.specialCode && 
             event.specialCode !== 'Error Day';
    });
  }

  // Validate special day data - ENHANCED for multi-period support
  validateSpecialDayData(data: SpecialDayData): SpecialDayValidationResult {
    const errors: string[] = [];

    if (!data.date) {
      errors.push('Date is required');
    }

    if (!data.periods || data.periods.length === 0) {
      errors.push('At least one period must be selected');
    } else {
      // Validate each period
      for (const period of data.periods) {
        if (period < 1 || period > 10) {
          errors.push(`Period ${period} must be between 1 and 10`);
        }
      }
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

    // Check for conflicts with existing events in selected periods
    if (data.date && data.periods) {
      for (const period of data.periods) {
        const existingEvent = this.scheduleStateService.getScheduleEventForPeriod(data.date, period);
        if (existingEvent) {
          errors.push(`Period ${period} on ${format(data.date, 'yyyy-MM-dd')} is already occupied`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper method to create Error Events - UNCHANGED
  createErrorEvent(date: Date, period: number, scheduleId: number, comment?: string): ScheduleEvent {
    const defaultComment = comment || 'No lesson assigned - schedule needs more content';
    
    return {
      id: this.scheduleStateService.isInMemorySchedule() ? this.generateInMemoryId() : 0,
      scheduleId: scheduleId,
      date: new Date(date),
      period: period,
      lessonId: null,
      specialCode: 'Error Day',
      comment: defaultComment
    };
  }

  // Helper method to remove Error Events - UNCHANGED
  removeErrorEventIfExists(date: Date, period: number): boolean {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleEvents) return false;

    const existingErrorEvent = currentSchedule.scheduleEvents.find(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      const targetDateStr = format(date, 'yyyy-MM-dd');
      return eventDateStr === targetDateStr && 
             event.period === period && 
             event.specialCode === 'Error Day';
    });
    
    if (existingErrorEvent) {
      this.scheduleStateService.removeScheduleEvent(existingErrorEvent.id);
      console.log('[SpecialDayManagementService] Removed error event', {
        date: format(date, 'yyyy-MM-dd'),
        period: period
      });
      return true;
    }
    
    return false;
  }

  // Remove all error events for a specific date - UNCHANGED
  removeAllErrorEventsForDate(date: Date): number {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleEvents) return 0;

    const dateStr = format(date, 'yyyy-MM-dd');
    const errorEvents = currentSchedule.scheduleEvents.filter(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr && event.specialCode === 'Error Day';
    });

    errorEvents.forEach(event => {
      this.scheduleStateService.removeScheduleEvent(event.id);
    });

    if (errorEvents.length > 0) {
      console.log(`[SpecialDayManagementService] Removed ${errorEvents.length} error events for ${dateStr}`);
    }

    return errorEvents.length;
  }

  // Private helper methods
  private buildScheduleEvent(data: SpecialDayData, scheduleId: number, period: number): ScheduleEvent {
    return {
      id: this.scheduleStateService.isInMemorySchedule() ? this.generateInMemoryId() : 0,
      scheduleId: scheduleId,
      date: new Date(data.date),
      period: period,
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

  private performScheduleEventUpdate(scheduleEvent: ScheduleEvent): Observable<ScheduleEvent> {
    return new Observable<ScheduleEvent>(observer => {
      if (this.scheduleStateService.isInMemorySchedule()) {
        this.scheduleStateService.updateScheduleEvent(scheduleEvent);
        this.scheduleStateService.markAsChanged();
        observer.next(scheduleEvent);
        observer.complete();
      } else {
        this.calendarService.updateScheduleEvent(scheduleEvent).subscribe({
          next: (updatedEvent: ScheduleEvent) => {
            this.scheduleStateService.updateScheduleEvent(updatedEvent);
            observer.next(updatedEvent);
            observer.complete();
          },
          error: (err: any) => {
            console.error('[SpecialDayManagementService] Failed to update special day:', err.message);
            observer.error(err);
          }
        });
      }
    });
  }
}