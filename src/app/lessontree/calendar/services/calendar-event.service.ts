// RESPONSIBILITY: Transforms master schedule events into calendar events with period-based colors and multi-course support.
// DOES NOT: Store state, manage schedules, show toasts, or handle persistence - pure transformation and event handling service.
// CALLED BY: CalendarCoordinationService for event mapping and CalendarInteractionService for event handling.
import { Injectable } from '@angular/core';
import { EventInput, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { format } from 'date-fns';

import { CourseDataService } from '../../../core/services/course-data.service';
import { UserService } from '../../../core/services/user.service';
import { ScheduleEvent, isLessonEvent, isSpecialDayEvent, isSpecialPeriodEvent, isErrorEvent } from '../../../models/schedule';
import { Lesson } from '../../../models/lesson';
import { getUserTeachingSchedule } from '../../../models/user';
import { getPeriodAssignment, TeachingSchedule } from '../../../models/period-assignment';

export interface EventClickResult {
  eventType: 'lesson' | 'special_day' | 'special_period' | 'error' | 'unassigned';
  lesson?: Lesson;
  period: number;
  courseId?: number;
  shouldOpenContextMenu: boolean;
  message?: string;
}

export interface EventDropResult {
  success: boolean;
  scheduleEventId?: number;
  newDate?: Date;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarEventService {
  constructor(
    private courseDataService: CourseDataService,
    private userService: UserService
  ) {
    console.log('[CalendarEventService] Initialized for master schedule with period colors');
  }

  // Map master schedule events to calendar events - PERIOD-FIRST WITH COLORS
  mapScheduleEventsToCalendarEvents(events: ScheduleEvent[]): EventInput[] {
    console.log('[CalendarEventService] mapScheduleEventsToCalendarEvents for master schedule');
    
    const currentUser = this.userService.getCurrentUser();
    if (!currentUser) {
      console.warn('[CalendarEventService] No current user available');
      return [];
    }

    const teachingSchedule = getUserTeachingSchedule(currentUser);
    if (!teachingSchedule.periodAssignments) {
      console.warn('[CalendarEventService] No period assignments available');
      return [];
    }
    
    // Build lessons map from all assigned courses
    const lessonsMap = this.buildMasterLessonsMap(teachingSchedule);
    const calendarEvents: EventInput[] = [];
    
    // Group events by date to handle multiple periods per day
    const eventsByDate = this.groupEventsByDate(events);
    
    // Generate calendar events for each date
    for (const [dateStr, dayEvents] of eventsByDate.entries()) {
      const periodEvents = this.generateCalendarEventsForDate(dateStr, dayEvents, lessonsMap, teachingSchedule);
      calendarEvents.push(...periodEvents);
    }
    
    console.log(`[CalendarEventService] Generated ${calendarEvents.length} calendar events from ${events.length} schedule events`);
    return calendarEvents;
  }

  // Handle event click - ENHANCED for master schedule
  handleEventClick(arg: EventClickArg): EventClickResult {
    console.log('[CalendarEventService] handleEventClick for master schedule event');
    
    const scheduleEvent = arg.event.extendedProps['scheduleEvent'] as ScheduleEvent;
    const period = scheduleEvent?.period || arg.event.extendedProps['period'];
    
    if (!scheduleEvent) {
      return {
        eventType: 'unassigned',
        period,
        shouldOpenContextMenu: true,
        message: 'Invalid event data'
      };
    }

    // Handle lesson events
    if (isLessonEvent(scheduleEvent)) {
      const lesson = arg.event.extendedProps['lesson'];
      
      if (lesson) {
        return {
          eventType: 'lesson',
          lesson,
          period,
          courseId: scheduleEvent.courseId || undefined,
          shouldOpenContextMenu: false,
          message: `Selected lesson: ${lesson.title} (Period ${period})`
        };
      }
    }

    // Handle special period events (recurring)
    if (isSpecialPeriodEvent(scheduleEvent)) {
      return {
        eventType: 'special_period',
        period,
        shouldOpenContextMenu: true,
        message: `Period ${period}: ${scheduleEvent.eventType}`
      };
    }

    // Handle special day events (one-time overrides)
    if (isSpecialDayEvent(scheduleEvent)) {
      return {
        eventType: 'special_day',
        period,
        shouldOpenContextMenu: true,
        message: `Period ${period}: ${scheduleEvent.eventType}`
      };
    }

    // Handle error events
    if (isErrorEvent(scheduleEvent)) {
      return {
        eventType: 'error',
        period,
        shouldOpenContextMenu: true,
        message: `Period ${period}: Configuration needed`
      };
    }

    // Default to context menu for unknown events
    return {
      eventType: 'unassigned',
      period,
      shouldOpenContextMenu: true
    };
  }

  // Handle event drop - ENHANCED for master schedule
  handleEventDrop(arg: EventDropArg): EventDropResult {
    console.log('[CalendarEventService] handleEventDrop for master schedule');
    
    if (!arg.event.start) {
      return {
        success: false,
        errorMessage: 'Invalid event date'
      };
    }

    // Extract schedule event ID from calendar event
    const scheduleEvent = arg.event.extendedProps['scheduleEvent'] as ScheduleEvent;
    if (!scheduleEvent) {
      return {
        success: false,
        errorMessage: 'Cannot identify schedule event'
      };
    }

    return {
      success: true,
      scheduleEventId: scheduleEvent.id,
      newDate: new Date(arg.event.start)
    };
  }

  // === PRIVATE HELPER METHODS ===

  // Build comprehensive lessons map from all courses in period assignments
  private buildMasterLessonsMap(teachingSchedule: TeachingSchedule): Map<number, Lesson> {
    const lessonsMap = new Map<number, Lesson>();
    
    // Get all unique course IDs from period assignments
    const courseIds = new Set<number>();
    teachingSchedule.periodAssignments?.forEach(assignment => {
      if (assignment.courseId) {
        courseIds.add(assignment.courseId);
      }
    });

    // Load lessons from all assigned courses
    for (const courseId of courseIds) {
      const course = this.courseDataService.getCourseById(courseId);
      if (course) {
        this.addCourseLessonsToMap(course, lessonsMap);
      }
    }
    
    console.log(`[CalendarEventService] Built lessons map with ${lessonsMap.size} lessons from ${courseIds.size} courses`);
    return lessonsMap;
  }

  // Add all lessons from a course to the lessons map
  private addCourseLessonsToMap(course: any, lessonsMap: Map<number, Lesson>): void {
    if (course.topics) {
      for (const topic of course.topics) {
        if (topic.lessons) {
          for (const lesson of topic.lessons) {
            lessonsMap.set(lesson.id, lesson);
          }
        }
        
        if (topic.subTopics) {
          for (const subTopic of topic.subTopics) {
            if (subTopic.lessons) {
              for (const lesson of subTopic.lessons) {
                lessonsMap.set(lesson.id, lesson);
              }
            }
          }
        }
      }
    }
  }

  // Group schedule events by date string
  private groupEventsByDate(events: ScheduleEvent[]): Map<string, ScheduleEvent[]> {
    const eventsByDate = new Map<string, ScheduleEvent[]>();
    
    for (const event of events) {
      const dateStr = format(new Date(event.date), 'yyyy-MM-dd');
      if (!eventsByDate.has(dateStr)) {
        eventsByDate.set(dateStr, []);
      }
      eventsByDate.get(dateStr)!.push(event);
    }
    
    return eventsByDate;
  }

  // Generate calendar events for a specific date with period colors
  private generateCalendarEventsForDate(
    dateStr: string,
    dayEvents: ScheduleEvent[],
    lessonsMap: Map<number, Lesson>,
    teachingSchedule: TeachingSchedule
  ): EventInput[] {
    const calendarEvents: EventInput[] = [];
    
    // Sort events by period for consistent display
    const sortedEvents = dayEvents.sort((a, b) => a.period - b.period);
    
    for (const scheduleEvent of sortedEvents) {
      const calendarEvent = this.createCalendarEventForScheduleEvent(
        dateStr,
        scheduleEvent,
        lessonsMap,
        teachingSchedule
      );
      
      if (calendarEvent) {
        calendarEvents.push(calendarEvent);
      }
    }
    
    return calendarEvents;
  }

  // Create calendar event for a schedule event with period colors
  private createCalendarEventForScheduleEvent(
    dateStr: string,
    scheduleEvent: ScheduleEvent,
    lessonsMap: Map<number, Lesson>,
    teachingSchedule: TeachingSchedule
  ): EventInput | null {
    const periodAssignment = getPeriodAssignment(teachingSchedule, scheduleEvent.period);
    if (!periodAssignment) {
      console.warn(`[CalendarEventService] No period assignment found for period ${scheduleEvent.period}`);
      return null;
    }

    // Create base event with period colors
    const baseEvent = {
        id: `event-${scheduleEvent.id}-period-${scheduleEvent.period}`,
        start: dateStr,
        backgroundColor: periodAssignment.backgroundColor || '#2196F3',  // Default blue if null
        borderColor: periodAssignment.fontColor || '#FFFFFF',           // Default white if null
        textColor: periodAssignment.fontColor || '#FFFFFF',             // Default white if null
        extendedProps: {
          period: scheduleEvent.period,
          scheduleEvent: scheduleEvent,
          periodAssignment: periodAssignment
        }
    };

    // Generate event based on type
    if (isLessonEvent(scheduleEvent)) {
      return this.createLessonCalendarEvent(baseEvent, scheduleEvent, lessonsMap, periodAssignment);
    } else if (isSpecialPeriodEvent(scheduleEvent)) {
      return this.createSpecialPeriodCalendarEvent(baseEvent, scheduleEvent, periodAssignment);
    } else if (isSpecialDayEvent(scheduleEvent)) {
      return this.createSpecialDayCalendarEvent(baseEvent, scheduleEvent, periodAssignment);
    } else if (isErrorEvent(scheduleEvent)) {
      return this.createErrorCalendarEvent(baseEvent, scheduleEvent, periodAssignment);
    }

    // Default fallback
    return {
      ...baseEvent,
      title: `${scheduleEvent.period}: Unknown Event`,
      className: 'calendar-event-unknown'
    };
  }

  // Create lesson calendar event
  private createLessonCalendarEvent(
    baseEvent: any,
    scheduleEvent: ScheduleEvent,
    lessonsMap: Map<number, Lesson>,
    periodAssignment: any
  ): EventInput {
    const lesson = scheduleEvent.lessonId ? lessonsMap.get(scheduleEvent.lessonId) : null;
    const roomInfo = periodAssignment.room ? ` (${periodAssignment.room})` : '';
    
    return {
      ...baseEvent,
      title: `${scheduleEvent.period}: ${lesson?.title || 'Unknown Lesson'}${roomInfo}`,
      description: lesson?.objective || '',
      className: 'calendar-event-lesson',
      extendedProps: {
        ...baseEvent.extendedProps,
        lesson: lesson,
        courseId: scheduleEvent.courseId
      }
    };
  }

  // Create special period calendar event (recurring)
  private createSpecialPeriodCalendarEvent(
    baseEvent: any,
    scheduleEvent: ScheduleEvent,
    periodAssignment: any
  ): EventInput {
    const roomInfo = periodAssignment.room ? ` (${periodAssignment.room})` : '';
    
    return {
      ...baseEvent,
      title: `${scheduleEvent.period}: ${scheduleEvent.eventType}${roomInfo}`,
      description: scheduleEvent.comment || '',
      className: 'calendar-event-special-period'
    };
  }

  // Create special day calendar event (one-time override)
  private createSpecialDayCalendarEvent(
    baseEvent: any,
    scheduleEvent: ScheduleEvent,
    periodAssignment: any
  ): EventInput {
    const title = scheduleEvent.comment 
      ? `${scheduleEvent.period}: ${scheduleEvent.eventType} - ${scheduleEvent.comment}`
      : `${scheduleEvent.period}: ${scheduleEvent.eventType}`;
      
    return {
      ...baseEvent,
      title: title,
      className: 'calendar-event-special-day'
    };
  }

  // Create error calendar event
  private createErrorCalendarEvent(
    baseEvent: any,
    scheduleEvent: ScheduleEvent,
    periodAssignment: any
  ): EventInput {
    return {
      ...baseEvent,
      title: `${scheduleEvent.period}: ${scheduleEvent.eventType}`,
      description: scheduleEvent.comment || 'Period needs configuration',
      className: 'calendar-event-error',
      // Override colors for error events to be more prominent
      backgroundColor: '#ffebee',
      borderColor: '#f44336',
      textColor: '#d32f2f'
    };
  }
}