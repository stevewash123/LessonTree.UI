// **COMPLETE FILE** - CalendarEventService Final Clean Version
// RESPONSIBILITY: Event transformation and handling for calendar display
// DOES NOT: Create events, manage course data, or handle generation logic
// CALLED BY: Calendar components for event transformation and display formatting

import { Injectable } from '@angular/core';
import { ScheduleEvent } from '../../../models/schedule-event.model';
import { ScheduleConfigurationStateService } from '../state/schedule-configuration-state.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarEventService {
  constructor(private scheduleConfigurationStateService: ScheduleConfigurationStateService) {
    console.log('[CalendarEventService] Initialized for event transformation');
  }

  // === EVENT TRANSFORMATION METHODS (CORE RESPONSIBILITY) ===

  /**
   * Transform schedule events for calendar display
   */
  transformEventsForCalendar(events: ScheduleEvent[]): any[] {
    console.log(`[CalendarEventService] Transforming ${events.length} events for calendar`);
    console.log('🔍 [CalendarEventService] RAW INPUT EVENTS:', {
      eventCount: events.length,
      firstEventSample: events[0],
      allEventDates: events.map(e => ({
        id: e.id,
        date: e.date,
        period: e.period,
        lessonId: e.lessonId,
        lessonTitle: e.lessonTitle,
        eventType: e.eventType
      }))
    });

    const transformedEvents = events.map(event => this.transformSingleEvent(event));

    return transformedEvents;
  }

  /**
   * Transform a single schedule event
   */
  transformSingleEvent(event: ScheduleEvent): any {
    // Get time slot mapping for this event
    const timeSlot = this.mapPeriodToTimeSlot(event.period, new Date(event.date));

    console.log('🔍 TRANSFORM SINGLE EVENT:', {
      inputDate: event.date,
      inputPeriod: event.period,
      outputStart: timeSlot.start,
      outputEnd: timeSlot.end,
      title: this.getEventDisplayTitle(event)
    });

    // Get period assignment for styling
    const periodAssignment = this.getPeriodAssignmentForEvent(event);

    return {
      id: event.id,
      title: this.getEventDisplayTitle(event),
      start: timeSlot.start,
      end: timeSlot.end,
      backgroundColor: periodAssignment?.backgroundColor || '#2196F3',
      borderColor: periodAssignment?.backgroundColor || '#2196F3',
      textColor: periodAssignment?.fontColor || '#FFFFFF',
      extendedProps: {
        scheduleEvent: event,
        period: event.period,
        courseId: event.courseId,
        lessonId: event.lessonId,
        specialDayId: event.specialDayId, // ✅ CRITICAL FIX: Include Special Day ID for edit/delete operations
        eventType: event.eventType,
        eventCategory: event.eventCategory, // ✅ Also include category for easier identification
        room: periodAssignment?.room || '',
        lessonTitle: event.lessonTitle,
        lessonObjective: event.lessonObjective,
        lessonMethods: event.lessonMethods
      }
    };
  }

  /**
   * Map period number to time slot for FullCalendar
   */
  private mapPeriodToTimeSlot(period: number, date: Date): { start: string; end: string } {
    const startHour = 8;
    const eventStartHour = startHour + period - 1;
    const eventEndHour = eventStartHour + 1;

    const eventDate = new Date(date);
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getDate()).padStart(2, '0');

    const start = `${year}-${month}-${day}T${eventStartHour.toString().padStart(2, '0')}:00:00`;
    const end = `${year}-${month}-${day}T${eventEndHour.toString().padStart(2, '0')}:00:00`;

    return { start, end };
  }

  /**
   * Look up period assignment colors and details for an event
   */
  private getPeriodAssignmentForEvent(event: ScheduleEvent): any | null {
    const activeConfig = this.scheduleConfigurationStateService.activeConfiguration();

    if (!activeConfig?.periodAssignments) {
      return null;
    }

    const periodAssignment = activeConfig.periodAssignments.find(
      (assignment: any) => assignment.period === event.period
    );

    if (!periodAssignment) {
      return null;
    }

    return {
      backgroundColor: periodAssignment.backgroundColor,
      fontColor: periodAssignment.fontColor,
      period: periodAssignment.period,
      room: periodAssignment.room,
      notes: periodAssignment.notes
    };
  }

  /**
   * Get display title for an event
   */
  getEventDisplayTitle(event: ScheduleEvent): string {
    // Use rich lesson data if available (from enhanced API)
    if (event.lessonTitle) {
      return event.lessonTitle;
    }

    // Fallback to generic titles for non-lesson events
    if (event.eventCategory === 'SpecialPeriod') {
      return event.eventType || 'Special Period';
    }

    if (event.eventCategory === 'SpecialDay') {
      return event.eventType || 'Special Day';
    }

    // Final fallback
    return event.eventType || 'Event';
  }

  /**
   * Map schedule events to calendar format - used by calendar-coordination.service
   */
  mapScheduleEventsToCalendarEvents(scheduleEvents: ScheduleEvent[]): any[] {
    console.log('[CalendarEventService] 🔍 MAPPING SCHEDULE EVENTS TO CALENDAR:', {
      inputEventCount: scheduleEvents.length,
      timestamp: new Date().toISOString()
    });

    // ✅ ADD THIS DETAILED DEBUG
    console.log('🔍 [CalendarEventService] DETAILED INPUT ANALYSIS:', {
      totalEvents: scheduleEvents.length,
      eventsByType: scheduleEvents.reduce((acc, e) => {
        acc[e.eventType || 'unknown'] = (acc[e.eventType || 'unknown'] || 0) + 1;
        return acc;
      }, {} as any),
      eventsByCategory: scheduleEvents.reduce((acc, e) => {
        acc[e.eventCategory || 'null'] = (acc[e.eventCategory || 'null'] || 0) + 1;
        return acc;
      }, {} as any),
      sampleEvents: scheduleEvents.slice(0, 3).map(e => ({
        id: e.id,
        date: e.date,
        period: e.period,
        eventType: e.eventType,
        eventCategory: e.eventCategory,
        lessonId: e.lessonId,
        lessonTitle: e.lessonTitle
      }))
    });

    const lessonEvents = scheduleEvents.filter(e => e.eventCategory === 'Lesson');
    console.log('[CalendarEventService] 📚 LESSON EVENTS IN SCHEDULE:', {
      totalLessonEvents: lessonEvents.length,
      lessonEventDetails: lessonEvents.map(e => ({
        eventId: e.id,
        date: e.date,
        period: e.period,
        lessonId: e.lessonId,
        lessonTitle: e.lessonTitle,
        lessonSort: e.lessonSort,
        courseId: e.courseId
      }))
    });

    // ✅ CALL THE TRANSFORMATION AND LOG RESULT
    const result = this.transformEventsForCalendar(scheduleEvents);

    console.log('🔍 [CalendarEventService] FINAL MAPPING RESULT:', {
      inputCount: scheduleEvents.length,
      outputCount: result.length,
      successful: result.length === scheduleEvents.length
    });

    return result;
  }
}
