// COMPLETE FILE
// RESPONSIBILITY: Manages context menu state, event handling, and user interaction coordination for calendar operations.
// DOES NOT: Handle modal operations, lesson shifting logic, or direct API calls - delegates to specialized services.
// CALLED BY: LessonCalendarComponent for context menu operations and user interaction coordination.
import { Injectable, inject } from '@angular/core';
import { EventClickArg } from '@fullcalendar/core';
import { format } from 'date-fns';

import { ScheduleStateService } from './schedule-state.service';
import { SpecialDayModalService } from './special-day-modal.service';
import { LessonShiftingService } from './lesson-shifting.service';
import { ScheduleDay } from '../../../models/schedule';

export interface ContextMenuAction {
  id: string;
  label: string;
  handler: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleContextService {
  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly specialDayModalService = inject(SpecialDayModalService);
  private readonly lessonShiftingService = inject(LessonShiftingService);

  // Context menu state
  private lastClickedDate: Date | null = null;
  private lastClickedEvent: EventClickArg | null = null;

  constructor() {
    console.log('[ScheduleContextService] Initialized', { timestamp: new Date().toISOString() });
  }

  // Set context for operations
  setDateContext(date: Date): void {
    this.lastClickedDate = date;
    this.lastClickedEvent = null;
    console.log(`[ScheduleContextService] Date context set: ${format(date, 'yyyy-MM-dd')}`, { 
      timestamp: new Date().toISOString() 
    });
  }

  setEventContext(event: EventClickArg): void {
    this.lastClickedEvent = event;
    this.lastClickedDate = null;
    console.log(`[ScheduleContextService] Event context set: ${event.event.id}`, { 
      timestamp: new Date().toISOString() 
    });
  }

  // Get available context menu actions based on current context
  getContextMenuActions(): ContextMenuAction[] {
    const actions: ContextMenuAction[] = [];

    console.log('[ScheduleContextService] Getting context menu actions:', {
      hasDateContext: !!this.lastClickedDate,
      hasEventContext: !!this.lastClickedEvent,
      lastClickedDate: this.lastClickedDate ? format(this.lastClickedDate, 'yyyy-MM-dd') : null,
      lastClickedEventId: this.lastClickedEvent?.event?.id || null,
      timestamp: new Date().toISOString()
    });
  
    if (this.lastClickedDate) {
      console.log('[ScheduleContextService] Processing date context');
      // Check if this date already has a special day
      const existingSpecialDay = this.getSpecialDayOnDate(this.lastClickedDate);
      
      if (existingSpecialDay) {
        console.log('[ScheduleContextService] Found existing special day:', existingSpecialDay);
        // Date has an existing non-teaching day - only allow edit/delete
        actions.push(
          {
            id: 'editSpecialDay',
            label: 'Edit Non-Teaching Day',
            handler: () => this.specialDayModalService.editSpecialDayOnDate(existingSpecialDay)
          },
          {
            id: 'deleteSpecialDay',
            label: 'Delete Non-Teaching Day',
            handler: () => this.specialDayModalService.deleteSpecialDayOnDate(existingSpecialDay)
          }
        );
      } else {
        console.log('[ScheduleContextService] No existing special day, adding add option');
        // Date is empty - allow adding non-teaching day
        actions.push({
          id: 'addNonTeaching',
          label: 'Add Non-Teaching Day',
          handler: () => this.specialDayModalService.openSpecialDayModal('add', this.lastClickedDate!)
        });
      }
    }
  
    if (this.lastClickedEvent) {
      const event = this.lastClickedEvent.event;
      const extendedProps = event.extendedProps || {};
      
      console.log('[ScheduleContextService] Processing event context:', {
        eventId: event.id,
        eventTitle: event.title,
        specialCode: extendedProps['specialCode'],
        hasLesson: !!extendedProps['lesson'],
        isErrorDay: this.isErrorDayEvent(this.lastClickedEvent),
        isSpecialDay: this.isSpecialDayEvent(this.lastClickedEvent),
        isLesson: this.isLessonEvent(this.lastClickedEvent)
      });

      if (this.isErrorDayEvent(this.lastClickedEvent)) {
        console.log('[ScheduleContextService] Adding error day actions');
        // Error day event context - can add lesson or add non-teaching day
        actions.push(
          {
            id: 'addLesson',
            label: 'Add Lesson',
            handler: () => this.handleAddLesson()
          },
          {
            id: 'addNonTeaching',
            label: 'Add Non-Teaching Day',
            handler: () => this.handleAddNonTeachingToErrorDay()
          }
        );
      } else if (this.isSpecialDayEvent(this.lastClickedEvent)) {
        console.log('[ScheduleContextService] Adding special day actions');
        // Special day event context - can edit or delete
        actions.push(
          {
            id: 'editSpecialDay',
            label: 'Edit Non-Teaching Day',
            handler: () => this.specialDayModalService.openSpecialDayModal('edit', null, this.lastClickedEvent!)
          },
          {
            id: 'deleteSpecialDay',
            label: 'Delete Non-Teaching Day',
            handler: () => this.specialDayModalService.deleteSpecialDayFromEvent(this.lastClickedEvent!)
          }
        );
      } else if (this.isLessonEvent(this.lastClickedEvent)) {
        console.log('[ScheduleContextService] Adding lesson actions');
        // Lesson event context - can edit or delete lesson
        actions.push(
          {
            id: 'editLesson',
            label: 'Edit Lesson',
            handler: () => this.handleEditLesson()
          },
          {
            id: 'deleteLesson',
            label: 'Delete Lesson',
            handler: () => this.handleDeleteLesson()
          }
        );
      } else {
        console.log('[ScheduleContextService] Event type not recognized - no actions added');
      }
    }

    console.log('[ScheduleContextService] Final actions array:', {
      actionCount: actions.length,
      actionIds: actions.map(a => a.id),
      actionLabels: actions.map(a => a.label)
    });
  
    return actions;
  }

  // Helper method to check if a date has a special day
  private getSpecialDayOnDate(date: Date): ScheduleDay | null {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleDays) {
      return null;
    }
  
    const dateStr = format(date, 'yyyy-MM-dd');
    const specialDay = currentSchedule.scheduleDays.find(day => {
      const dayDateStr = format(new Date(day.date), 'yyyy-MM-dd');
      return dayDateStr === dateStr && 
             day.specialCode && 
             day.specialCode !== 'Error Day'; // Exclude error days
    });
  
    return specialDay || null;
  }

  // Check if event is a lesson (has lesson but no special code)
  private isLessonEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    const lesson = extendedProps['lesson'];
    const specialCode = extendedProps['specialCode'];
    
    return !!lesson && !specialCode;
  }

  // Check if event is a special day (but not an error day)
  private isSpecialDayEvent(event: EventClickArg): boolean {
    const specialCode = event.event.extendedProps['specialCode'];
    return !!specialCode && specialCode !== 'Error Day';
  }

  // Check if event is an error day
  private isErrorDayEvent(event: EventClickArg): boolean {
    return event.event.extendedProps['specialCode'] === 'Error Day';
  }

  // STUBBED LESSON ACTIONS - To be implemented with proper lesson services

  private handleEditLesson(): void {
    if (!this.lastClickedEvent) {
      console.warn('[ScheduleContextService] No event context for edit lesson');
      return;
    }

    const lesson = this.lastClickedEvent.event.extendedProps['lesson'];
    if (!lesson) {
      console.warn('[ScheduleContextService] No lesson data in event');
      return;
    }

    console.log('[ScheduleContextService] STUBBED: Edit lesson', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      eventDate: this.lastClickedEvent.event.start,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement with proper lesson service
    // Example: this.lessonCrudService.openEditLessonModal(lesson);
  }

  private handleDeleteLesson(): void {
    if (!this.lastClickedEvent) {
      console.warn('[ScheduleContextService] No event context for delete lesson');
      return;
    }

    const lesson = this.lastClickedEvent.event.extendedProps['lesson'];
    if (!lesson) {
      console.warn('[ScheduleContextService] No lesson data in event');
      return;
    }

    console.log('[ScheduleContextService] STUBBED: Delete lesson', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      eventDate: this.lastClickedEvent.event.start,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement with proper lesson service
    // Example: this.lessonCrudService.confirmDeleteLesson(lesson);
  }

  private handleAddLesson(): void {
    if (!this.lastClickedEvent) {
      console.warn('[ScheduleContextService] No event context for add lesson');
      return;
    }

    const eventDate = this.lastClickedEvent.event.start;
    if (!eventDate) {
      console.warn('[ScheduleContextService] No date available for add lesson');
      return;
    }

    console.log('[ScheduleContextService] STUBBED: Add lesson to error day', {
      targetDate: format(eventDate, 'yyyy-MM-dd'),
      eventTitle: this.lastClickedEvent.event.title,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement with proper lesson service
    // Example: this.lessonCrudService.openAddLessonModal(eventDate);
  }

  private handleAddNonTeachingToErrorDay(): void {
    if (!this.lastClickedEvent) {
      console.warn('[ScheduleContextService] No event context for add non-teaching day');
      return;
    }

    const eventDate = this.lastClickedEvent.event.start;
    if (!eventDate) {
      console.warn('[ScheduleContextService] No date available for add non-teaching day');
      return;
    }

    console.log('[ScheduleContextService] Converting error day to non-teaching day', {
      targetDate: format(eventDate, 'yyyy-MM-dd'),
      timestamp: new Date().toISOString()
    });

    // Reuse existing special day modal for error day conversion
    this.specialDayModalService.openSpecialDayModal('add', eventDate);
  }

  // Clear context (useful for cleanup)
  clearContext(): void {
    this.lastClickedDate = null;
    this.lastClickedEvent = null;
    console.log('[ScheduleContextService] Context cleared', { timestamp: new Date().toISOString() });
  }
}