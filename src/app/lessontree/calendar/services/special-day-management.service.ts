// RESPONSIBILITY: Handles special day business logic and CRUD operations with multi-period support.
// DOES NOT: Handle UI notifications, API persistence details, or modal coordination - focused on business logic.
// CALLED BY: SpecialDayModalService for special day data operations.
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { format } from 'date-fns';

import { ScheduleEvent } from '../../../models/schedule';
import { ScheduleStateService } from './schedule-state.service';
import { LessonCalendarService } from './lesson-calendar.service';
import { LessonShiftingService } from './lesson-shifting.service';

export interface SpecialDayData {
  date: Date;
  periods: number[];
  eventType: string;           // UPDATED: was specialCode
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
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly calendarService = inject(LessonCalendarService);
  private readonly lessonShiftingService = inject(LessonShiftingService);

  constructor() {
    console.log('[SpecialDayManagementService] Initialized for multi-period special days');
  }

  // Create special day events for multiple periods - SIMPLIFIED
  createSpecialDay(data: SpecialDayData): Observable<ScheduleEvent[]> {
    console.log(`[SpecialDayManagementService] Creating special day for ${data.periods.length} periods`);
    
    const currentSchedule = this.scheduleStateService.getMasterSchedule();
    if (!currentSchedule) {
      throw new Error('No schedule available');
    }

    const newScheduleEvents = data.periods.map(period => 
      this.buildScheduleEvent(data, currentSchedule.id, period)
    );

    if (this.scheduleStateService.isInMemorySchedule()) {
      return this.createInMemoryEvents(newScheduleEvents, data);
    } else {
      return this.createApiEvents(newScheduleEvents, data);
    }
  }

  // Update an existing special day event
  updateSpecialDay(data: SpecialDayData, originalScheduleEvent: ScheduleEvent): Observable<ScheduleEvent> {
    console.log(`[SpecialDayManagementService] Updating special day event ${originalScheduleEvent.id}`);
    
    const updatedScheduleEvent: ScheduleEvent = {
      ...originalScheduleEvent,
      date: new Date(data.date),
      eventType: data.eventType,        // UPDATED: was specialCode
      comment: this.buildComment(data)
    };

    return this.performScheduleEventUpdate(updatedScheduleEvent);
  }

  // Delete a special day event - SIMPLIFIED
  deleteSpecialDay(scheduleEvent: ScheduleEvent): Observable<void> {
    console.log(`[SpecialDayManagementService] Deleting special day event ${scheduleEvent.id}`);
    
    if (this.scheduleStateService.isInMemorySchedule()) {
      return this.deleteInMemoryEvent(scheduleEvent);
    } else {
      return this.deleteApiEvent(scheduleEvent);
    }
  }

  // Extract special day data from a ScheduleEvent for editing
  extractSpecialDayData(scheduleEvent: ScheduleEvent): SpecialDayData | null {
    if (!scheduleEvent.eventType) {
      return null;
    }

    const title = this.extractTitleFromComment(scheduleEvent.comment, scheduleEvent.eventType);

    return {
      date: new Date(scheduleEvent.date),
      periods: [scheduleEvent.period],
      eventType: scheduleEvent.eventType,    // UPDATED: was specialCode
      title: title,
      description: undefined
    };
  }

  // Find special day by schedule event ID
  findSpecialDayById(scheduleEventId: number): ScheduleEvent | null {
    const currentSchedule = this.scheduleStateService.getMasterSchedule();
    if (!currentSchedule?.scheduleEvents) {
      return null;
    }

    const scheduleEvent = currentSchedule.scheduleEvents.find(event => event.id === scheduleEventId);
    return scheduleEvent?.eventType ? scheduleEvent : null;  // UPDATED: was specialCode
  }

  // Find special day for a specific date and period
  findSpecialDayForPeriod(date: Date, period: number): ScheduleEvent | null {
    const currentSchedule = this.scheduleStateService.getMasterSchedule();
    if (!currentSchedule?.scheduleEvents) return null;

    const dateStr = format(date, 'yyyy-MM-dd');
    return currentSchedule.scheduleEvents.find(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr && 
             event.period === period && 
             event.eventType && 
             event.eventType !== 'Error';    // UPDATED: was specialCode !== 'Error Day'
    }) || null;
  }

  // Get all special days for a specific date
  getSpecialDaysForDate(date: Date): ScheduleEvent[] {
    const currentSchedule = this.scheduleStateService.getMasterSchedule();
    if (!currentSchedule?.scheduleEvents) return [];

    const dateStr = format(date, 'yyyy-MM-dd');
    return currentSchedule.scheduleEvents.filter(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr && 
             event.eventType && 
             event.eventType !== 'Error';    // UPDATED: was specialCode !== 'Error Day'
    });
  }

  // Validate special day data
  validateSpecialDayData(data: SpecialDayData): SpecialDayValidationResult {
    const errors: string[] = [];

    if (!data.date) {
      errors.push('Date is required');
    }

    if (!data.periods || data.periods.length === 0) {
      errors.push('At least one period must be selected');
    } else {
      for (const period of data.periods) {
        if (period < 1 || period > 10) {
          errors.push(`Period ${period} must be between 1 and 10`);
        }
      }
    }

    if (!data.eventType?.trim()) {               // UPDATED: was specialCode
      errors.push('Event type is required');
    }

    if (!data.title?.trim()) {
      errors.push('Title is required');
    }

    if (data.title && data.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    // Check for conflicts with existing events
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

  // Helper method to create Error Events
  createErrorEvent(date: Date, period: number, scheduleId: number, comment?: string): ScheduleEvent {
    const defaultComment = comment || 'No lesson assigned - schedule needs more content';
    
    return {
      id: this.scheduleStateService.isInMemorySchedule() ? this.generateInMemoryId() : 0,
      scheduleId: scheduleId,
      courseId: null,
      date: new Date(date),
      period: period,
      lessonId: null,
      eventType: 'Error',                      // UPDATED: was specialCode: 'Error Day'
      eventCategory: null,                     // NEW: Error events have null category
      comment: defaultComment
    };
  }

  // Helper method to remove Error Events
  removeErrorEventIfExists(date: Date, period: number): boolean {
    const currentSchedule = this.scheduleStateService.getMasterSchedule();
    if (!currentSchedule?.scheduleEvents) return false;

    const existingErrorEvent = currentSchedule.scheduleEvents.find(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      const targetDateStr = format(date, 'yyyy-MM-dd');
      return eventDateStr === targetDateStr && 
             event.period === period && 
             event.eventType === 'Error';      // UPDATED: was specialCode === 'Error Day'
    });
    
    if (existingErrorEvent) {
      this.scheduleStateService.removeScheduleEvent(existingErrorEvent.id);
      return true;
    }
    
    return false;
  }

  // Remove all error events for a specific date
  removeAllErrorEventsForDate(date: Date): number {
    const currentSchedule = this.scheduleStateService.getMasterSchedule();
    if (!currentSchedule?.scheduleEvents) return 0;

    const dateStr = format(date, 'yyyy-MM-dd');
    const errorEvents = currentSchedule.scheduleEvents.filter(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr && event.eventType === 'Error';  // UPDATED: was specialCode === 'Error Day'
    });

    errorEvents.forEach(event => {
      this.scheduleStateService.removeScheduleEvent(event.id);
    });

    return errorEvents.length;
  }

  // === PRIVATE HELPER METHODS ===

  // SIMPLIFIED: In-memory creation
  private createInMemoryEvents(events: ScheduleEvent[], data: SpecialDayData): Observable<ScheduleEvent[]> {
    events.forEach(event => {
      this.scheduleStateService.addScheduleEvent(event);
      this.lessonShiftingService.shiftLessonsForward(data.date, event.period);
    });
    
    return of(events);
  }

  // FIXED: Modern Observable pattern instead of deprecated toPromise()
  private createApiEvents(events: ScheduleEvent[], data: SpecialDayData): Observable<ScheduleEvent[]> {
    const createRequests = events.map(event => 
      this.calendarService.addScheduleEvent(event)
    );
    
    return forkJoin(createRequests).pipe(
      map(createdEvents => {
        createdEvents.forEach(event => {
          this.scheduleStateService.addScheduleEvent(event);
          this.lessonShiftingService.shiftLessonsForward(data.date, event.period);
        });
        return createdEvents;
      })
    );
  }

  private deleteInMemoryEvent(scheduleEvent: ScheduleEvent): Observable<void> {
    this.scheduleStateService.removeScheduleEvent(scheduleEvent.id);
    this.lessonShiftingService.shiftLessonsBackward(scheduleEvent.date, scheduleEvent.period);
    return of(void 0);
  }

  private deleteApiEvent(scheduleEvent: ScheduleEvent): Observable<void> {
    return this.calendarService.deleteScheduleEvent(scheduleEvent.id).pipe(
      map(() => {
        this.scheduleStateService.removeScheduleEvent(scheduleEvent.id);
        this.lessonShiftingService.shiftLessonsBackward(scheduleEvent.date, scheduleEvent.period);
      })
    );
  }

  private buildScheduleEvent(data: SpecialDayData, scheduleId: number, period: number): ScheduleEvent {
    return {
      id: this.scheduleStateService.isInMemorySchedule() ? this.generateInMemoryId() : 0,
      scheduleId: scheduleId,
      courseId: null,
      date: new Date(data.date),
      period: period,
      lessonId: null,
      eventType: data.eventType,              // UPDATED: was specialCode
      eventCategory: 'SpecialDay',            // NEW: Special day events have SpecialDay category
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

  private extractTitleFromComment(comment: string | null | undefined, eventType: string): string {  // UPDATED: was specialCode
    if (!comment) return eventType;
    
    if (comment.startsWith(eventType + ':')) {
      return comment.substring((eventType + ':').length).trim();
    }
    
    return comment;
  }

  private generateInMemoryId(): number {
    return -(Date.now() + Math.floor(Math.random() * 1000));
  }

  private performScheduleEventUpdate(scheduleEvent: ScheduleEvent): Observable<ScheduleEvent> {
    if (this.scheduleStateService.isInMemorySchedule()) {
      this.scheduleStateService.updateScheduleEvent(scheduleEvent);
      this.scheduleStateService.markAsChanged();
      return of(scheduleEvent);
    } else {
      return this.calendarService.updateScheduleEvent(scheduleEvent).pipe(
        map(updatedEvent => {
          this.scheduleStateService.updateScheduleEvent(updatedEvent);
          return updatedEvent;
        })
      );
    }
  }
}