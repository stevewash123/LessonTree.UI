/* src/app/lessontree/calendar/services/calendar-event.service.ts - CLEAN SCHEDULE EVENT IMPLEMENTATION */
// RESPONSIBILITY: Transforms schedule event data into calendar events with period-based multiple events per day.
// DOES NOT: Store state, manage schedules, or calculate week numbers - pure transformation and event handling service.
// CALLED BY: LessonCalendarComponent for event mapping and user interactions.
import { Injectable, inject } from '@angular/core';
import { EventInput, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';

import { CourseDataService } from '../../../core/services/course-data.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { UserService } from '../../../core/services/user.service';
import { LessonCalendarService } from './lesson-calendar.service';
import { ScheduleStateService } from './schedule-state.service';
import { PeriodAssignment, ScheduleEvent } from '../../../models/schedule';
import { Lesson } from '../../../models/lesson';
import { parseId } from '../../../core/utils/type-conversion.utils';

@Injectable({
  providedIn: 'root'
})
export class CalendarEventService {
  // Injected services
  private readonly courseDataService = inject(CourseDataService);
  private readonly nodeSelectionService = inject(NodeSelectionService);
  private readonly userService = inject(UserService);
  private readonly calendarService = inject(LessonCalendarService);
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly toastr = inject(ToastrService);

  constructor() {
    console.log('[CalendarEventService] Initialized with ScheduleEvent period-based support', { 
      timestamp: new Date().toISOString() 
    });
  }

  // Map schedule events to calendar events - GENERATES MULTIPLE EVENTS PER DAY
  mapScheduleEventsToCalendarEvents(events: ScheduleEvent[], courseId: number): EventInput[] {
    const course = this.courseDataService.getCourseById(courseId);
    if (!course) {
      console.warn(`[CalendarEventService] Course not found for ID ${courseId}`, { 
        timestamp: new Date().toISOString() 
      });
      return [];
    }

    const teachingConfig = this.userService.getTeachingConfig();
    if (!teachingConfig) {
      console.warn('[CalendarEventService] No teaching config available, cannot generate period-based events');
      return [];
    }

    console.log('[CalendarEventService] Generating period-based events', {
      periodsPerDay: teachingConfig.periodsPerDay,
      periodAssignments: teachingConfig.periodAssignments.length,
      scheduleEvents: events.length
    });
    
    // Collect all lessons from the course
    const lessonsMap = this.buildLessonsMap(course);
    const calendarEvents: EventInput[] = [];
    
    // Group events by date to handle multiple periods per day
    const eventsByDate = this.groupEventsByDate(events);
    
    // For each date, generate all period events (both scheduled and free periods)
    for (const [dateStr, dayEvents] of eventsByDate.entries()) {
      const periodEvents = this.generatePeriodEventsForDate(dateStr, dayEvents, lessonsMap, teachingConfig);
      calendarEvents.push(...periodEvents);
    }
    
    console.log(`[CalendarEventService] Generated ${calendarEvents.length} total calendar events for ${events.length} schedule events`);
    return calendarEvents;
  }

  // Group schedule events by date
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

  // Generate all period events for a specific date
  private generatePeriodEventsForDate(
    dateStr: string,
    dayEvents: ScheduleEvent[],
    lessonsMap: Map<number, Lesson>,
    teachingConfig: any
  ): EventInput[] {
    const calendarEvents: EventInput[] = [];
    
    // Create event map by period for quick lookup
    const eventsByPeriod = new Map<number, ScheduleEvent>();
    for (const event of dayEvents) {
      eventsByPeriod.set(event.period, event);
    }
    
    // Generate events for all periods (1 to periodsPerDay)
    for (let period = 1; period <= teachingConfig.periodsPerDay; period++) {
      const scheduleEvent = eventsByPeriod.get(period);
      const periodAssignment = this.getPeriodAssignment(teachingConfig, period);
      
      const calendarEvent = this.createCalendarEventForPeriod(
        dateStr, 
        period, 
        scheduleEvent, 
        lessonsMap, 
        periodAssignment
      );
      
      if (calendarEvent) {
        calendarEvents.push(calendarEvent);
      }
    }
    
    return calendarEvents;
  }

  // Create calendar event for a specific period
  private createCalendarEventForPeriod(
    dateStr: string,
    period: number,
    scheduleEvent: ScheduleEvent | undefined,
    lessonsMap: Map<number, Lesson>,
    periodAssignment: PeriodAssignment | null
  ): EventInput | null {
    // Create unique event ID
    const eventId = scheduleEvent 
      ? `${scheduleEvent.id}-period-${period}`
      : `free-${dateStr}-period-${period}`;
    
    if (scheduleEvent) {
      // Have a scheduled event for this period
      return this.createScheduledEventForPeriod(eventId, dateStr, period, scheduleEvent, lessonsMap, periodAssignment);
    } else {
      // No scheduled event - show as free period
      return this.createFreePeriodEvent(eventId, dateStr, period, periodAssignment);
    }
  }

  // Create calendar event for scheduled event (lesson/special day)
  private createScheduledEventForPeriod(
    eventId: string,
    dateStr: string,
    period: number,
    scheduleEvent: ScheduleEvent,
    lessonsMap: Map<number, Lesson>,
    periodAssignment: PeriodAssignment | null
  ): EventInput {
    const lesson = scheduleEvent.lessonId ? lessonsMap.get(scheduleEvent.lessonId) : null;
    
    if (scheduleEvent.specialCode === 'Error Day') {
      return this.createErrorPeriodEvent(eventId, period, dateStr, scheduleEvent);
    }
    
    if (scheduleEvent.specialCode && !lesson) {
      return this.createSpecialPeriodEvent(eventId, period, scheduleEvent, dateStr);
    }
    
    if (lesson) {
      return this.createLessonPeriodEvent(eventId, period, lesson, scheduleEvent, periodAssignment, dateStr);
    }
    
    // Fallback to free period
    return this.createFreePeriodEvent(eventId, dateStr, period, periodAssignment);
  }

  // Create error period event
  private createErrorPeriodEvent(eventId: string, period: number, dateStr: string, scheduleEvent: ScheduleEvent): EventInput {
    return {
      id: eventId,
      title: `${period}: No Lesson Available`,
      start: dateStr,
      className: 'calendar-event-error period-event',
      extendedProps: {
        period,
        eventType: 'error',
        scheduleEvent
      }
    };
  }

  // Create special day period event
  private createSpecialPeriodEvent(eventId: string, period: number, scheduleEvent: ScheduleEvent, dateStr: string): EventInput {
    const title = scheduleEvent.comment 
      ? `${period}: ${scheduleEvent.specialCode} - ${scheduleEvent.comment}`
      : `${period}: ${scheduleEvent.specialCode}`;
      
    return {
      id: eventId,
      title,
      start: dateStr,
      className: 'calendar-event-special period-event',
      extendedProps: {
        period,
        eventType: 'special',
        specialCode: scheduleEvent.specialCode,
        comment: scheduleEvent.comment,
        scheduleEvent
      }
    };
  }

  // Create lesson period event with smart period detection
  private createLessonPeriodEvent(
    eventId: string, 
    period: number, 
    lesson: Lesson, 
    scheduleEvent: ScheduleEvent,
    periodAssignment: PeriodAssignment | null,
    dateStr: string
  ): EventInput {
    const roomInfo = periodAssignment?.room ? ` (${periodAssignment.room})` : '';
    
    return {
      id: eventId,
      title: `${period}: ${lesson.title || 'Untitled Lesson'}${roomInfo}`,
      start: dateStr,
      description: lesson.objective || '',
      className: this.getLessonPeriodCssClass(period, periodAssignment),
      extendedProps: {
        period,
        eventType: 'lesson',
        lesson,
        scheduleEvent,
        periodAssignment
      }
    };
  }

  // Create free period event
  private createFreePeriodEvent(
    eventId: string, 
    dateStr: string,
    period: number, 
    periodAssignment: PeriodAssignment | null
  ): EventInput {
    const title = periodAssignment?.room 
      ? `${period}: Free (${periodAssignment.room})`
      : `${period}: Free Period`;
      
    return {
      id: eventId,
      title,
      start: dateStr,
      className: this.getFreePeriodCssClass(period, periodAssignment),
      extendedProps: {
        period,
        eventType: 'free',
        periodAssignment
      }
    };
  }

  // Get period assignment for given period number
  private getPeriodAssignment(teachingConfig: any, period: number): PeriodAssignment | null {
    return teachingConfig.periodAssignments.find((assignment: PeriodAssignment) => 
      assignment.period === period
    ) || null;
  }

  // Get CSS class for lesson period events
  private getLessonPeriodCssClass(period: number, periodAssignment: PeriodAssignment | null): string {
    let classes = 'calendar-event-lesson period-event';
    
    if (periodAssignment) {
      classes += ` period-${period}-assigned`;
    } else {
      classes += ` period-${period}-default`;
    }
    
    return classes;
  }

  // Get CSS class for free period events
  private getFreePeriodCssClass(period: number, periodAssignment: PeriodAssignment | null): string {
    let classes = 'calendar-event-free period-event';
    
    if (periodAssignment) {
      classes += ` period-${period}-assigned`;
    } else {
      classes += ` period-${period}-unassigned`;
    }
    
    return classes;
  }

  // Build lessons map from course (unchanged)
  private buildLessonsMap(course: any): Map<number, Lesson> {
    const lessonsMap = new Map<number, Lesson>();
    
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
    
    return lessonsMap;
  }

  // Handle event click - ENHANCED for period events
  handleEventClick(arg: EventClickArg): { shouldOpenContextMenu: boolean } {
    const eventType = arg.event.extendedProps['eventType'];
    const period = arg.event.extendedProps['period'];
    
    console.log('[CalendarEventService] Event clicked', {
      eventId: arg.event.id,
      eventTitle: arg.event.title,
      eventType: eventType,
      period: period,
      timestamp: new Date().toISOString()
    });
    
    if (eventType === 'lesson') {
      const lesson = arg.event.extendedProps['lesson'];
      
      if (lesson) {
        console.log('[CalendarEventService] Lesson period event clicked, selecting node', {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          period: period,
          nodeType: 'Lesson',
          source: 'calendar',
          timestamp: new Date().toISOString()
        });

        this.nodeSelectionService.selectById(lesson.id, 'Lesson', 'calendar');
        
        this.toastr.info(`Selected lesson: ${lesson.title} (Period ${period})`, 'Calendar Selection', {
          timeOut: 2000
        });
        
        return { shouldOpenContextMenu: false };
      }
    } else if (eventType === 'special' || eventType === 'error' || eventType === 'free') {
      console.log('[CalendarEventService] Non-lesson period event clicked, opening context menu', {
        eventType: eventType,
        period: period,
        timestamp: new Date().toISOString()
      });
      
      return { shouldOpenContextMenu: true };
    }
    
    console.log('[CalendarEventService] Unknown event type clicked', {
      extendedProps: arg.event.extendedProps,
      timestamp: new Date().toISOString()
    });
    
    return { shouldOpenContextMenu: false };
  }

  // Handle event drag and drop
  handleEventDrop(arg: EventDropArg): void {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule || !currentSchedule.scheduleEvents) {
      console.error(`[CalendarEventService] Cannot update event: No schedule selected`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No schedule selected', 'Error');
      arg.revert();
      return;
    }

    // Extract original schedule event ID from period event ID
    const eventId = arg.event.id;
    const scheduleEventId = eventId.includes('-period-') 
      ? parseInt(eventId.split('-period-')[0], 10)
      : parseInt(eventId, 10);

    const scheduleEvent = currentSchedule.scheduleEvents.find(event => event.id === scheduleEventId);
    if (!scheduleEvent) {
      console.error(`[CalendarEventService] Schedule event not found for event ID ${eventId}`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('Schedule event not found', 'Error');
      arg.revert();
      return;
    }

    if (!arg.event.start) {
      console.error(`[CalendarEventService] Cannot update event: No start date`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('Invalid event date', 'Error');
      arg.revert();
      return;
    }

    // Update the schedule event
    const updatedEvent = {
      ...scheduleEvent,
      date: new Date(arg.event.start)
    };

    if (this.scheduleStateService.isInMemorySchedule()) {
      this.scheduleStateService.updateScheduleEvent(updatedEvent);
      this.scheduleStateService.markAsChanged();
      
      console.log(`[CalendarEventService] Updated in-memory schedule event`, {
        id: scheduleEvent.id,
        period: scheduleEvent.period,
        date: updatedEvent.date,
        timestamp: new Date().toISOString()
      });
      this.toastr.success('Event rescheduled in temporary schedule', 'Success');
    } else {
      this.calendarService.updateScheduleEvent(updatedEvent).subscribe({
        next: (apiUpdatedEvent: ScheduleEvent) => {
          this.scheduleStateService.updateScheduleEvent(apiUpdatedEvent);
          
          console.log(`[CalendarEventService] Updated schedule event ID ${apiUpdatedEvent.id}`, { 
            period: apiUpdatedEvent.period,
            timestamp: new Date().toISOString() 
          });
          this.toastr.success('Event rescheduled successfully', 'Success');
        },
        error: (err: any) => {
          console.error(`[CalendarEventService] Failed to update schedule event: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to reschedule event', 'Error');
          arg.revert();
        }
      });
    }
  }

  // Get current course ID for event mapping
  getCurrentCourseId(): number | null {
    const selectedNode = this.nodeSelectionService.selectedNode();
    
    if (selectedNode && selectedNode.nodeType === 'Course') {
      return parseId(selectedNode.id);
    }
    
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    return currentSchedule?.courseId || null;
  }
}