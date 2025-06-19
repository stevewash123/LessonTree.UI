// RESPONSIBILITY: Orchestrates user interactions with calendar events and coordinates side effects.
// DOES NOT: Handle reactive state effects or calendar configuration - pure interaction orchestration.
// CALLED BY: LessonCalendarComponent for all user interaction handling.
import { Injectable } from '@angular/core';
import { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { ToastrService } from 'ngx-toastr';
import { NodeSelectionService } from '../../../../lesson-tree/services/node-selection.service';
import { ScheduleEvent } from '../../../../models/schedule-event.model';
import { CourseDataService } from '../../../../shared/services/course-data.service';
import { ScheduleApiService } from '../api/schedule-api.service';
import { ScheduleStateService } from '../state/schedule-state.service';
import { CalendarEventService } from './calendar-event.service';

@Injectable({
  providedIn: 'root'
})
export class CalendarInteractionService {
  constructor(
    private calendarEventService: CalendarEventService,
    private lessonCalendarService: ScheduleApiService,
    private scheduleStateService: ScheduleStateService,
    private nodeSelectionService: NodeSelectionService,
    private courseDataService: CourseDataService,
    private toastr: ToastrService
  ) {
    console.log('[CalendarInteractionService] Initialized for user interaction orchestration');
  }

  // Orchestrate event click handling with all side effects
  public handleEventClick(arg: any): any {
    console.log('[CalendarInteractionService] Handling event click:', arg);
    // Return the event data for processing
    return {
      success: true,
      eventData: arg.event.extendedProps || {},
      eventId: arg.event.id
    };
  }

  // Handle event drop - internal interaction logic  
  public handleEventDrop(arg: any): any {
    console.log('[CalendarInteractionService] Handling event drop:', arg);
    // Return the drop result for processing
    return {
      success: true,
      eventData: arg.event.extendedProps || {},
      newDate: arg.event.start,
      oldDate: arg.oldEvent?.start
    };
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