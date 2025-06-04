// RESPONSIBILITY: Orchestrates user interactions with calendar events and coordinates side effects.
// DOES NOT: Handle reactive state effects or calendar configuration - pure interaction orchestration.
// CALLED BY: LessonCalendarComponent for all user interaction handling.
import { Injectable } from '@angular/core';
import { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { ToastrService } from 'ngx-toastr';

import { CalendarEventService } from './calendar-event.service';
import { LessonCalendarService } from './lesson-calendar.service';
import { ScheduleStateService } from './schedule-state.service';
import { NodeSelectionService } from '../../../core/services/node-selection.service';
import { CourseDataService } from '../../../core/services/course-data.service';
import { ScheduleEvent } from '../../../models/schedule';

@Injectable({
  providedIn: 'root'
})
export class CalendarInteractionService {
  constructor(
    private calendarEventService: CalendarEventService,
    private lessonCalendarService: LessonCalendarService,
    private scheduleStateService: ScheduleStateService,
    private nodeSelectionService: NodeSelectionService,
    private courseDataService: CourseDataService,
    private toastr: ToastrService
  ) {
    console.log('[CalendarInteractionService] Initialized for user interaction orchestration');
  }

  // Orchestrate event click handling with all side effects
  handleEventClick(arg: EventClickArg): boolean {
    console.log('[CalendarInteractionService] handleEventClick');
    
    const clickResult = this.calendarEventService.handleEventClick(arg);
    
    if (clickResult.eventType === 'lesson' && clickResult.lesson) {
      // Handle lesson selection
      this.nodeSelectionService.selectById(
        clickResult.lesson.id, 
        'Lesson', 
        'calendar'
      );
      
      if (clickResult.message) {
        this.toastr.info(clickResult.message, 'Calendar Selection', {
          timeOut: 2000
        });
      }
      
      return false; // Don't open context menu
    }
    
    // For non-lesson events, let caller decide on context menu
    return clickResult.shouldOpenContextMenu;
  }

  // Orchestrate event drop handling with persistence and state updates
  handleEventDrop(arg: EventDropArg): void {
    console.log('[CalendarInteractionService] handleEventDrop');
    
    const dropResult = this.calendarEventService.handleEventDrop(arg);
    
    if (!dropResult.success) {
      this.toastr.error(dropResult.errorMessage || 'Failed to move event', 'Error');
      arg.revert();
      return;
    }

    if (!dropResult.scheduleEventId || !dropResult.newDate) {
      this.toastr.error('Missing event data', 'Error');
      arg.revert();
      return;
    }

    // Find the original schedule event
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleEvents) {
      this.toastr.error('No schedule selected', 'Error');
      arg.revert();
      return;
    }

    const originalEvent = currentSchedule.scheduleEvents.find(
      (event: ScheduleEvent) => event.id === dropResult.scheduleEventId
    );
    
    if (!originalEvent) {
      this.toastr.error('Schedule event not found', 'Error');
      arg.revert();
      return;
    }

    // Create the updated event with all original properties
    const updatedEvent: ScheduleEvent = {
      ...originalEvent,
      date: dropResult.newDate
    };

    // Handle persistence based on schedule type
    if (this.scheduleStateService.isInMemorySchedule()) {
      this.handleInMemoryEventUpdate(updatedEvent);
    } else {
      this.handlePersistedEventUpdate(updatedEvent, arg);
    }
  }

  // Handle lesson moves initiated from calendar
  handleLessonMove(lessonId: number, newDate: Date, period: number): void {
    console.log('[CalendarInteractionService] handleLessonMove');
    
    // Find lesson and notify about the move
    const lesson = this.findLessonById(lessonId);
    if (lesson) {
      // For now, just show success message - node move notification will be added later
      this.toastr.info(`Lesson moved to ${newDate.toLocaleDateString()} Period ${period}`, 'Success');
    }
  }

  // Handle context menu interactions
  handleContextMenu(info: any, jsEvent: MouseEvent): void {
    console.log('[CalendarInteractionService] handleContextMenu');
    
    const eventType = info.event.extendedProps?.eventType;
    const period = info.event.extendedProps?.period;
    
    // Future: Could open different context menus based on event type
    // For now, just prevent default browser context menu
    jsEvent.preventDefault();
    jsEvent.stopPropagation();
  }

  // === PRIVATE HELPER METHODS ===

  private handleInMemoryEventUpdate(updatedEvent: ScheduleEvent): void {
    this.scheduleStateService.updateScheduleEvent(updatedEvent);
    this.scheduleStateService.markAsChanged();
    
    this.toastr.success('Event rescheduled in temporary schedule', 'Success');
    
    // Notify about the lesson move if it's a lesson event
    if (updatedEvent.lessonId) {
      this.handleLessonMove(updatedEvent.lessonId, updatedEvent.date, updatedEvent.period);
    }
  }

  private handlePersistedEventUpdate(updatedEvent: ScheduleEvent, arg: EventDropArg): void {
    this.lessonCalendarService.updateScheduleEvent(updatedEvent).subscribe({
      next: (apiUpdatedEvent: ScheduleEvent) => {
        this.scheduleStateService.updateScheduleEvent(apiUpdatedEvent);
        this.toastr.success('Event rescheduled successfully', 'Success');
        
        // Notify about the lesson move if it's a lesson event
        if (apiUpdatedEvent.lessonId) {
          this.handleLessonMove(apiUpdatedEvent.lessonId, apiUpdatedEvent.date, apiUpdatedEvent.period);
        }
      },
      error: (err: any) => {
        console.error(`[CalendarInteractionService] Failed to update schedule event: ${err.message}`);
        this.toastr.error('Failed to reschedule event', 'Error');
        arg.revert();
      }
    });
  }

  private findLessonById(lessonId: number): any | null {
    const activeCourseId = this.nodeSelectionService.activeCourseId();
    if (!activeCourseId) return null;

    const course = this.courseDataService.getCourseById(activeCourseId);
    if (!course?.topics) return null;

    // Search through course structure for lesson
    for (const topic of course.topics) {
      if (topic.lessons) {
        const lesson = topic.lessons.find((l: any) => l.id === lessonId);
        if (lesson) return lesson;
      }
      
      if (topic.subTopics) {
        for (const subTopic of topic.subTopics) {
          if (subTopic.lessons) {
            const lesson = subTopic.lessons.find((l: any) => l.id === lessonId);
            if (lesson) return lesson;
          }
        }
      }
    }
    
    return null;
  }

  // === PUBLIC UTILITY METHODS ===

  // Check if calendar interactions are available
  canInteractWithCalendar(): boolean {
    const activeCourseId = this.nodeSelectionService.activeCourseId();
    const hasSchedule = this.scheduleStateService.selectedSchedule() !== null;
    
    return !!(activeCourseId && hasSchedule);
  }

  // Get current interaction context for debugging
  getInteractionContext() {
    return {
      activeCourseId: this.nodeSelectionService.activeCourseId(),
      hasSchedule: !!this.scheduleStateService.selectedSchedule(),
      isInMemorySchedule: this.scheduleStateService.isInMemorySchedule(),
      hasSelection: this.nodeSelectionService.hasSelection(),
      selectionSource: this.nodeSelectionService.selectionSource()
    };
  }
}