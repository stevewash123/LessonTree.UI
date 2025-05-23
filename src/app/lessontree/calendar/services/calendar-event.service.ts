// src/app/lessontree/calendar/services/calendar-event.service.ts - COMPLETE FILE
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
      const lesson = day.lessonId ? lessonsMap.get(day.lessonId) : null;
      const title = this.buildEventTitle(day, lesson ?? null);
      const objective = lesson?.objective || '';
      
      return {
        id: day.id.toString(),
        title: this.truncateText(title, 20),
        start: format(new Date(day.date), 'yyyy-MM-dd'),
        description: lesson ? this.truncateText(objective, 30) : (day.comment ? this.truncateText(day.comment, 30) : undefined),
        backgroundColor: day.specialCode ? '#ffcccb' : '#90ee90',
        borderColor: day.specialCode ? '#ff0000' : '#008000',
        extendedProps: { 
          comment: day.comment || undefined, 
          specialCode: day.specialCode || undefined,
          lesson: lesson || undefined,
          icon: day.specialCode ? 'event_busy' : 'school'
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

  // Build event title based on day type
  private buildEventTitle(day: ScheduleDay, lesson: Lesson | null): string {
    if (day.specialCode) {
      return `${day.specialCode}${day.comment ? `: ${day.comment}` : ''}`;
    }
    
    return lesson?.title || 'Special Day';
  }

  // Handle event click
  handleEventClick(arg: EventClickArg): { shouldOpenContextMenu: boolean } {
    console.log(`[CalendarEventService] Event clicked: ${arg.event.id}`, { 
      timestamp: new Date().toISOString() 
    });
    
    const lesson = arg.event.extendedProps['lesson'];
    
    if (lesson) {
      // Select lesson in the node selection service
      this.nodeSelectionService.selectNode(lesson, 'calendar');
      return { shouldOpenContextMenu: false };
    } else if (arg.event.extendedProps['specialCode']) {
      // For special days, indicate context menu should open
      return { shouldOpenContextMenu: true };
    }
    
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

  // Helper method to truncate text for display
  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length > maxLength) {
      return text.substring(0, maxLength - 3) + '...';
    }
    return text;
  }
}