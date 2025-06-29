// RESPONSIBILITY: Handles special day business logic and CRUD operations with multi-period support.
// DOES NOT: Handle UI notifications, API persistence details, or modal coordination - focused on business logic.
// CALLED BY: SpecialDayModalService for special day data operations.
// RESPONSIBILITY: Handles special day business logic and CRUD operations with multi-period support and lesson sequence continuation.
// DOES NOT: Handle UI notifications, API persistence details, or modal coordination - focused on business logic.
// CALLED BY: SpecialDayModalService for special day data operations.
import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { format } from 'date-fns';
import {LessonShiftingService} from './lesson-shifting.service';
import {LessonSequenceService} from './lesson-sequence.service';
import {ScheduleApiService} from '../api/schedule-api.service';
import {ScheduleStateService} from '../state/schedule-state.service';
import {ScheduleEvent} from '../../../models/schedule-event.model';

export interface SpecialDayData {
  date: Date;
  periods: number[];
  eventType: string;
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

  constructor(
    private scheduleStateService: ScheduleStateService,
    private scheduleApiService: ScheduleApiService,
    private lessonShiftingService: LessonShiftingService,
    private lessonSequenceService: LessonSequenceService
  ) {
    console.log('[SpecialDayManagementService] Initialized for multi-period special days with lesson sequence continuation');
  }

  // Create special day events for multiple periods - SIMPLIFIED
  createSpecialDay(data: SpecialDayData): Observable<ScheduleEvent[]> {
    console.log(`[SpecialDayManagementService] Creating special day for ${data.periods.length} periods`);

    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      throw new Error('No schedule available');
    }

    // Create SpecialDay via API (not ScheduleEvent directly)
    const specialDayCreateResource = {
      date: data.date,
      periods: data.periods,
      eventType: data.eventType,
      title: this.buildTitle(data)
    };

    return this.scheduleApiService.createSpecialDay(currentSchedule.id, specialDayCreateResource).pipe(
      map(createdSpecialDay => {
        console.log(`[SpecialDayManagementService] Created special day ${createdSpecialDay.id}`);
        console.log(`[DEBUG] Starting lesson sequence continuation after special day on ${format(data.date, 'yyyy-MM-dd')}`);

        // Convert to ScheduleEvents for local state
        const scheduleEvents = this.convertSpecialDayToScheduleEvents(createdSpecialDay, currentSchedule.id);

        // Update local state with lesson shifting and sequence continuation
        scheduleEvents.forEach(event => {
          this.scheduleStateService.addScheduleEvent(event);
          this.lessonShiftingService.shiftLessonsForward(data.date, event.period);
        });

        // Continue lesson sequences after shifting
        this.lessonSequenceService.continueSequencesAfterDate(data.date);

        return scheduleEvents;
      })
    );
  }

  // Update an existing special day
  updateSpecialDay(data: SpecialDayData, originalScheduleEvent: ScheduleEvent): Observable<ScheduleEvent> {
    console.log(`[SpecialDayManagementService] Updating special day event ${originalScheduleEvent.id}`);

    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      throw new Error('No schedule available');
    }

    // Find the SpecialDay ID from the ScheduleEvent
    const specialDay = this.findSpecialDayByScheduleEvent(originalScheduleEvent);
    if (!specialDay) {
      throw new Error('Cannot find special day for this schedule event');
    }

    const specialDayUpdateResource = {
      id: specialDay.id,
      date: data.date,
      periods: data.periods,
      eventType: data.eventType,
      title: this.buildTitle(data)
    };

    return this.scheduleApiService.updateSpecialDay(currentSchedule.id, specialDay.id, specialDayUpdateResource).pipe(
      map(updatedSpecialDay => {
        console.log(`[SpecialDayManagementService] Updated special day ${updatedSpecialDay.id}`);

        // Update the ScheduleEvent in local state
        const updatedScheduleEvent: ScheduleEvent = {
          ...originalScheduleEvent,
          date: new Date(data.date),
          eventType: data.eventType,
          comment: this.buildTitle(data)
        };

        this.scheduleStateService.updateScheduleEvent(updatedScheduleEvent);
        return updatedScheduleEvent;
      })
    );
  }

  // Delete a special day event - SIMPLIFIED
  deleteSpecialDay(scheduleEvent: ScheduleEvent): Observable<void> {
    console.log(`[SpecialDayManagementService] Deleting special day event ${scheduleEvent.id}`);

    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule) {
      throw new Error('No schedule available');
    }

    // Find the SpecialDay ID from the ScheduleEvent
    const specialDay = this.findSpecialDayByScheduleEvent(scheduleEvent);
    if (!specialDay) {
      throw new Error('Cannot find special day for this schedule event');
    }

    return this.scheduleApiService.deleteSpecialDay(currentSchedule.id, specialDay.id).pipe(
      map(() => {
        console.log(`[SpecialDayManagementService] Deleted special day ${specialDay.id}`);

        // Remove from local state and shift lessons backward
        this.scheduleStateService.removeScheduleEvent(scheduleEvent.id);
        this.lessonShiftingService.shiftLessonsBackward(scheduleEvent.date, scheduleEvent.period);

        // Continue lesson sequences after backward shift
        this.lessonSequenceService.continueSequencesAfterDate(scheduleEvent.date);
      })
    );
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
      eventType: scheduleEvent.eventType,
      title: title,
      description: undefined
    };
  }

  // Find special day by schedule event ID
  findSpecialDayById(scheduleEventId: number): ScheduleEvent | null {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.scheduleEvents) {
      return null;
    }

    const scheduleEvent = currentSchedule.scheduleEvents.find(event => event.id === scheduleEventId);
    return scheduleEvent?.eventType ? scheduleEvent : null;
  }

  // Find special day for a specific date and period
  findSpecialDayForPeriod(date: Date, period: number): ScheduleEvent | null {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.scheduleEvents) return null;

    const dateStr = format(date, 'yyyy-MM-dd');
    return currentSchedule.scheduleEvents.find(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr &&
        event.period === period &&
        event.eventType &&
        event.eventType !== 'Error';
    }) || null;
  }

  // Get all special days for a specific date
  getSpecialDaysForDate(date: Date): ScheduleEvent[] {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.scheduleEvents) return [];

    const dateStr = format(date, 'yyyy-MM-dd');
    return currentSchedule.scheduleEvents.filter(event => {
      const eventDateStr = format(new Date(event.date), 'yyyy-MM-dd');
      return eventDateStr === dateStr &&
        event.eventType &&
        event.eventType !== 'Error';
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

    if (!data.eventType?.trim()) {
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
        const allEvents = this.scheduleStateService.getScheduleEvents();
        const existingEvent = allEvents.find(event =>
          event.date === data.date && event.period === period
        );

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

  // === PRIVATE HELPER METHODS ===

  private convertSpecialDayToScheduleEvents(specialDay: any, scheduleId: number): ScheduleEvent[] {
    const scheduleEvents: ScheduleEvent[] = [];
    let eventIdCounter = -10000; // Use distinct negative range for special day events

    for (const period of specialDay.periods) {
      const scheduleEvent: ScheduleEvent = {
        id: eventIdCounter--,
        scheduleId: scheduleId,
        courseId: null,
        date: new Date(specialDay.date),
        period: period,
        lessonId: null,
        eventType: specialDay.eventType,
        eventCategory: 'SpecialDay',
        comment: specialDay.title
      };

      scheduleEvents.push(scheduleEvent);
    }

    return scheduleEvents;
  }

  private findSpecialDayByScheduleEvent(scheduleEvent: ScheduleEvent): any | null {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule?.specialDays) {
      return null;
    }

    // Find special day that matches the schedule event's date and includes the period
    const dateStr = format(new Date(scheduleEvent.date), 'yyyy-MM-dd');
    return currentSchedule.specialDays.find(sd => {
      const specialDayDateStr = format(new Date(sd.date), 'yyyy-MM-dd');
      return specialDayDateStr === dateStr &&
        sd.periods.includes(scheduleEvent.period) &&
        sd.eventType === scheduleEvent.eventType;
    }) || null;
  }

  private buildTitle(data: SpecialDayData): string {
    let title = data.title;
    if (data.description) {
      title += ` - ${data.description}`;
    }
    return title;
  }

  private extractTitleFromComment(comment: string | null | undefined, eventType: string): string {
    if (!comment) return eventType;

    if (comment.startsWith(eventType + ':')) {
      return comment.substring((eventType + ':').length).trim();
    }

    return comment;
  }

  private generateInMemoryId(): number {
    return -(Date.now() + Math.floor(Math.random() * 1000));
  }
}
