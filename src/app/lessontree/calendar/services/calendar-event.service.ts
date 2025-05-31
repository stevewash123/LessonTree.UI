/* src/app/lessontree/calendar/services/calendar-event.service.ts - COMPLETE FILE */
// RESPONSIBILITY: Transforms schedule data into calendar events and handles calendar interactions.
// DOES NOT: Store state, manage schedules, or calculate week numbers - pure transformation and event handling service.
// CALLED BY: LessonCalendarComponent for event mapping and user interactions.
import { Injectable, inject } from '@angular/core';
import { EventInput, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';

import { CourseDataService } from '../../../core/services/course-data.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { LessonCalendarService } from './lesson-calendar.service';
import { ScheduleStateService } from './schedule-state.service';
import { ScheduleDay } from '../../../models/schedule';
import { Lesson } from '../../../models/lesson';
import { parseId } from '../../../core/utils/type-conversion.utils';

@Injectable({
  providedIn: 'root'
})
export class CalendarEventService {
  // Injected services
  private readonly courseDataService = inject(CourseDataService);
  private readonly nodeSelectionService = inject(NodeSelectionService);
  private readonly calendarService = inject(LessonCalendarService);
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly toastr = inject(ToastrService);

  constructor() {
    console.log('[CalendarEventService] Initialized', { timestamp: new Date().toISOString() });
  }

  // Map schedule days to calendar events
  mapScheduleDaysToEvents(days: ScheduleDay[], courseId: number): EventInput[] {
    const course = this.courseDataService.getCourseById(courseId);
    if (!course) {
      console.warn(`[CalendarEventService] Course not found for ID ${courseId}`, { 
        timestamp: new Date().toISOString() 
      });
      return [];
    }
    
    // Collect all lessons from the course
    const lessonsMap = this.buildLessonsMap(course);
    
    return days.map((day: ScheduleDay) => {
      const lesson = day.lessonId ? (lessonsMap.get(day.lessonId) || null) : null;
      const title = this.buildEventTitle(day, lesson);
      const objective = lesson?.objective || '';
      
      return {
        id: day.id.toString(),
        title: title, // Don't truncate - let CSS handle wrapping
        start: format(new Date(day.date), 'yyyy-MM-dd'),
        description: lesson ? objective : (day.comment || undefined),
        // Use CSS classes instead of direct colors for better styling control
        className: this.getEventCssClass(day, lesson),
        extendedProps: { 
          comment: day.comment || undefined, 
          specialCode: day.specialCode || undefined,
          lesson: lesson || undefined,
          scheduleDay: day // Include full schedule day data for reports
        }
      };
    });
  }

  // Build lessons map from course
  private buildLessonsMap(course: any): Map<number, Lesson> {
    const lessonsMap = new Map<number, Lesson>();
    
    if (course.topics) {
      for (const topic of course.topics) {
        // Add lessons from topic
        if (topic.lessons) {
          for (const lesson of topic.lessons) {
            lessonsMap.set(lesson.id, lesson);
          }
        }
        
        // Add lessons from subtopics
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

  // Build event title based on day type - simple titles only
  private buildEventTitle(day: ScheduleDay, lesson: Lesson | null): string {
    if (day.specialCode === 'Error Day') {
      return 'No Lesson Available';
    }
    
    if (day.specialCode) {
      if (day.comment) {
        return `${day.specialCode}: ${day.comment}`;
      }
      return day.specialCode;
    }
    
    if (lesson) {
      // Just return the lesson title - calendar configuration service handles detailed content
      return lesson.title || 'Untitled Lesson';
    }
    
    return 'Special Day';
  }

  // Get CSS class for event styling instead of direct colors
  private getEventCssClass(day: ScheduleDay, lesson: Lesson | null): string {
    if (day.specialCode === 'Error Day') {
      return 'error-event';
    }
    
    if (day.specialCode) {
      return 'special-event';
    }
    
    return 'lesson-event';
  }

  // Handle event click without week number tracking
  handleEventClick(arg: EventClickArg): { shouldOpenContextMenu: boolean } {
    console.log('[CalendarEventService] Event clicked', {
      eventId: arg.event.id,
      eventTitle: arg.event.title,
      timestamp: new Date().toISOString()
    });
    
    const lesson = arg.event.extendedProps['lesson'];
    
    if (lesson) {
      console.log('[CalendarEventService] Lesson found in event, selecting node', {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        nodeType: 'Lesson',
        source: 'calendar',
        timestamp: new Date().toISOString()
      });

      // Use selectById for better tree integration
      this.nodeSelectionService.selectById(lesson.id, 'Lesson', 'calendar');
      
      // Show toast to confirm selection
      this.toastr.info(`Selected lesson: ${lesson.title}`, 'Calendar Selection', {
        timeOut: 2000
      });
      
      return { shouldOpenContextMenu: false };
    } else if (arg.event.extendedProps['specialCode']) {
      console.log('[CalendarEventService] Special day event clicked, opening context menu', {
        specialCode: arg.event.extendedProps['specialCode'],
        timestamp: new Date().toISOString()
      });
      
      // For special days, indicate context menu should open
      return { shouldOpenContextMenu: true };
    }
    
    console.log('[CalendarEventService] No lesson or special code found in event', {
      extendedProps: arg.event.extendedProps,
      timestamp: new Date().toISOString()
    });
    
    return { shouldOpenContextMenu: false };
  }

  // Handle event drag and drop
  handleEventDrop(arg: EventDropArg): void {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule || !currentSchedule.scheduleDays) {
      console.error(`[CalendarEventService] Cannot update event: No schedule selected`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No schedule selected', 'Error');
      arg.revert();
      return;
    }

    const scheduleDay = currentSchedule.scheduleDays.find(day => day.id.toString() === arg.event.id);
    if (!scheduleDay) {
      console.error(`[CalendarEventService] Schedule day not found for event ID ${arg.event.id}`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('Schedule day not found', 'Error');
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

    // Update the schedule day
    const updatedDay = {
      ...scheduleDay,
      date: new Date(arg.event.start)
    };

    if (this.scheduleStateService.isInMemorySchedule()) {
      // For in-memory schedule, just update locally
      this.scheduleStateService.updateScheduleDay(updatedDay);
      this.scheduleStateService.markAsChanged();
      
      console.log(`[CalendarEventService] Updated in-memory schedule day`, {
        id: scheduleDay.id,
        date: updatedDay.date,
        timestamp: new Date().toISOString()
      });
      this.toastr.success('Lesson rescheduled in temporary schedule', 'Success');
    } else {
      // For real schedule, update through API
      this.calendarService.updateScheduleDay(updatedDay).subscribe({
        next: (apiUpdatedDay: ScheduleDay) => {
          this.scheduleStateService.updateScheduleDay(apiUpdatedDay);
          
          console.log(`[CalendarEventService] Updated schedule day ID ${apiUpdatedDay.id}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.success('Lesson rescheduled successfully', 'Success');
        },
        error: (err: any) => {
          console.error(`[CalendarEventService] Failed to update schedule day: ${err.message}`, { 
            timestamp: new Date().toISOString() 
          });
          this.toastr.error('Failed to reschedule lesson', 'Error');
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