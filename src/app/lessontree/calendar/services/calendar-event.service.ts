// RESPONSIBILITY: Event transformation and handling for calendar display
// DOES NOT: Create events, manage course data, or handle generation logic
// CALLED BY: Calendar components for event transformation and display formatting

import { Injectable } from '@angular/core';
import { ScheduleEvent } from '../../../models/schedule-event.model';

@Injectable({
  providedIn: 'root'
})
export class CalendarEventService {

  constructor() {
    console.log('[CalendarEventService] Initialized for event transformation and handling');
  }

  // === EVENT TRANSFORMATION METHODS (ORIGINAL FUNCTIONALITY) ===

  // Transform schedule events for calendar display
  transformEventsForCalendar(events: ScheduleEvent[]): any[] {
    console.log('[CalendarEventService] Transforming events for calendar display');
    
    return events.map(event => this.transformSingleEvent(event));
  }

  // Transform a single schedule event
  private transformSingleEvent(event: ScheduleEvent): any {
    // Implementation for transforming events to calendar format
    // This would contain the original transformation logic
    return {
      id: event.id,
      title: this.getEventDisplayTitle(event),
      start: event.date,
      period: event.period,
      courseId: event.courseId,
      lessonId: event.lessonId,
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      comment: event.comment
    };
  }

  // Get display title for an event
  private getEventDisplayTitle(event: ScheduleEvent): string {
    if (event.comment) {
      return event.comment;
    }
    
    if (event.eventType) {
      return event.eventType;
    }
    
    return 'Untitled Event';
  }

  // Filter events by date range
  filterEventsByDateRange(events: ScheduleEvent[], startDate: Date, endDate: Date): ScheduleEvent[] {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  // Filter events by period
  filterEventsByPeriod(events: ScheduleEvent[], period: number): ScheduleEvent[] {
    return events.filter(event => event.period === period);
  }

  // Filter events by course
  filterEventsByCourse(events: ScheduleEvent[], courseId: number): ScheduleEvent[] {
    return events.filter(event => event.courseId === courseId);
  }

  // Group events by date
  groupEventsByDate(events: ScheduleEvent[]): Map<string, ScheduleEvent[]> {
    const grouped = new Map<string, ScheduleEvent[]>();
    
    for (const event of events) {
      const dateKey = new Date(event.date).toISOString().split('T')[0];
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      
      grouped.get(dateKey)!.push(event);
    }
    
    return grouped;
  }

  // Group events by period
  groupEventsByPeriod(events: ScheduleEvent[]): Map<number, ScheduleEvent[]> {
    const grouped = new Map<number, ScheduleEvent[]>();
    
    for (const event of events) {
      if (!grouped.has(event.period)) {
        grouped.set(event.period, []);
      }
      
      grouped.get(event.period)!.push(event);
    }
    
    return grouped;
  }

  // Sort events by date and period
  sortEvents(events: ScheduleEvent[]): ScheduleEvent[] {
    return [...events].sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return a.period - b.period;
    });
  }

  // Validate event data
  validateEvent(event: ScheduleEvent): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!event.date) {
      errors.push('Event date is required');
    }
    
    if (event.period <= 0) {
      errors.push('Event period must be greater than 0');
    }
    
    if (!event.eventType) {
      errors.push('Event type is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // === TRANSFORMATION METHODS (PROPER RESPONSIBILITY) ===

  // Map schedule events to calendar format - used by calendar-coordination.service
  mapScheduleEventsToCalendarEvents(scheduleEvents: ScheduleEvent[]): any[] {
    console.log('[CalendarEventService] Mapping schedule events to calendar format');
    return this.transformEventsForCalendar(scheduleEvents);
  }
}