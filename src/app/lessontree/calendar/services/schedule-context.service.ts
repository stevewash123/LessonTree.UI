// RESPONSIBILITY: Manages context menu state, event handling, and user interaction coordination for calendar operations.
// DOES NOT: Handle modal operations, lesson shifting logic, or direct API calls - delegates to specialized services.
// CALLED BY: LessonCalendarComponent for context menu operations and user interaction coordination.
import { Injectable } from '@angular/core';
import { EventClickArg } from '@fullcalendar/core';
import { format } from 'date-fns';

import { ScheduleStateService } from './schedule-state.service';
import { SpecialDayModalService } from './special-day-modal.service';
import { LessonShiftingService } from './lesson-shifting.service';

export interface ContextMenuAction {
  id: string;
  label: string;
  handler: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleContextService {
  // Context menu state
  private lastClickedEvent: EventClickArg | null = null;

  constructor(
    private scheduleStateService: ScheduleStateService,
    private specialDayModalService: SpecialDayModalService,
    private lessonShiftingService: LessonShiftingService
  ) {
    console.log('[ScheduleContextService] Initialized for ScheduleEvent period-based operations');
  }

  // Set context for operations
  setDateContext(date: Date): void {
    console.log('[ScheduleContextService] setDateContext');
    this.lastClickedEvent = null;
  }

  setEventContext(event: EventClickArg): void {
    console.log('[ScheduleContextService] setEventContext');
    this.lastClickedEvent = event;
  }

  // Get available context menu actions based on current context
  getContextMenuActions(): ContextMenuAction[] {
    //console.log('[ScheduleContextService] getContextMenuActions');
    
    const actions: ContextMenuAction[] = [];

    if (this.lastClickedEvent) {
      const event = this.lastClickedEvent.event;
      const extendedProps = event.extendedProps || {};
      const period = extendedProps['period'];

      if (this.isErrorDayEvent(this.lastClickedEvent)) {
        actions.push(
          {
            id: 'addLesson',
            label: `Add Lesson - Period ${period}`,
            handler: () => this.handleAddLesson()
          },
          {
            id: 'addNonTeaching',
            label: `Add Non-Teaching Period ${period}`,
            handler: () => this.handleAddNonTeachingToErrorPeriod()
          }
        );
      } else if (this.isSpecialDayEvent(this.lastClickedEvent)) {
        actions.push(
          {
            id: 'editSpecialDay',
            label: `Edit Non-Teaching Period ${period}`,
            handler: () => this.specialDayModalService.openSpecialDayModal('edit', null, this.lastClickedEvent!)
          },
          {
            id: 'deleteSpecialDay',
            label: `Delete Non-Teaching Period ${period}`,
            handler: () => this.specialDayModalService.deleteSpecialDayFromEvent(this.lastClickedEvent!)
          }
        );
      } else if (this.isLessonEvent(this.lastClickedEvent)) {
        actions.push(
          {
            id: 'editLesson',
            label: `Edit Lesson - Period ${period}`,
            handler: () => this.handleEditLesson()
          },
          {
            id: 'deleteLesson',
            label: `Delete Lesson - Period ${period}`,
            handler: () => this.handleDeleteLesson()
          }
        );
      } else if (this.isFreePeriodEvent(this.lastClickedEvent)) {
        actions.push(
          {
            id: 'addLessonToPeriod',
            label: `Add Lesson to Period ${period}`,
            handler: () => this.handleAddLessonToFreePeriod()
          },
          {
            id: 'addSpecialToPeriod',
            label: `Add Special Event to Period ${period}`,
            handler: () => this.handleAddSpecialToFreePeriod()
          }
        );
      }
    }

    return actions;
  }

  // Clear context (useful for cleanup)
  clearContext(): void {
    console.log('[ScheduleContextService] clearContext');
    this.lastClickedEvent = null;
  }

  // Check if event is a lesson (has lesson but no special code)
  private isLessonEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    return extendedProps['eventType'] === 'lesson';
  }

  // Check if event is a special day (but not an error day)
  private isSpecialDayEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    return extendedProps['eventType'] === 'special';
  }

  // Check if event is an error day
  private isErrorDayEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    return extendedProps['eventType'] === 'error';
  }

  // Check if event is a free period
  private isFreePeriodEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    return extendedProps['eventType'] === 'free';
  }

  // ENHANCED LESSON ACTIONS - Period-aware

  private handleEditLesson(): void {
    if (!this.lastClickedEvent) {
      console.warn('[ScheduleContextService] No event context for edit lesson');
      return;
    }

    const lesson = this.lastClickedEvent.event.extendedProps['lesson'];
    const period = this.lastClickedEvent.event.extendedProps['period'];
    const scheduleEvent = this.lastClickedEvent.event.extendedProps['scheduleEvent'];
    
    if (!lesson) {
      console.warn('[ScheduleContextService] No lesson data in event');
      return;
    }

    console.log('[ScheduleContextService] STUBBED: Edit lesson', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      period: period,
      scheduleEventId: scheduleEvent?.id,
      eventDate: this.lastClickedEvent.event.start,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement with proper lesson service
    // Example: this.lessonCrudService.openEditLessonModal(lesson, period, scheduleEvent);
  }

  private handleDeleteLesson(): void {
    if (!this.lastClickedEvent) {
      console.warn('[ScheduleContextService] No event context for delete lesson');
      return;
    }

    const lesson = this.lastClickedEvent.event.extendedProps['lesson'];
    const period = this.lastClickedEvent.event.extendedProps['period'];
    const scheduleEvent = this.lastClickedEvent.event.extendedProps['scheduleEvent'];
    
    if (!lesson) {
      console.warn('[ScheduleContextService] No lesson data in event');
      return;
    }

    console.log('[ScheduleContextService] STUBBED: Delete lesson from period', {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      period: period,
      scheduleEventId: scheduleEvent?.id,
      eventDate: this.lastClickedEvent.event.start,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement with proper lesson service
    // Example: this.lessonCrudService.confirmDeleteLessonFromPeriod(lesson, period, scheduleEvent);
  }

  private handleAddLesson(): void {
    if (!this.lastClickedEvent) {
      console.warn('[ScheduleContextService] No event context for add lesson');
      return;
    }

    const eventDate = this.lastClickedEvent.event.start;
    const period = this.lastClickedEvent.event.extendedProps['period'];
    
    if (!eventDate) {
      console.warn('[ScheduleContextService] No date available for add lesson');
      return;
    }

    console.log('[ScheduleContextService] STUBBED: Add lesson to error period', {
      targetDate: format(eventDate, 'yyyy-MM-dd'),
      period: period,
      eventTitle: this.lastClickedEvent.event.title,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement with proper lesson service
    // Example: this.lessonCrudService.openAddLessonModal(eventDate, period);
  }

  private handleAddLessonToFreePeriod(): void {
    if (!this.lastClickedEvent) {
      console.warn('[ScheduleContextService] No event context for add lesson to free period');
      return;
    }

    const eventDate = this.lastClickedEvent.event.start;
    const period = this.lastClickedEvent.event.extendedProps['period'];
    
    if (!eventDate) {
      console.warn('[ScheduleContextService] No date available for add lesson');
      return;
    }

    console.log('[ScheduleContextService] STUBBED: Add lesson to free period', {
      targetDate: format(eventDate, 'yyyy-MM-dd'),
      period: period,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement with proper lesson service
    // Example: this.lessonCrudService.openAddLessonModal(eventDate, period);
  }

  private handleAddSpecialToFreePeriod(): void {
    if (!this.lastClickedEvent) {
      console.warn('[ScheduleContextService] No event context for add special to free period');
      return;
    }

    const eventDate = this.lastClickedEvent.event.start;
    const period = this.lastClickedEvent.event.extendedProps['period'];
    
    if (!eventDate) {
      console.warn('[ScheduleContextService] No date available for add special event');
      return;
    }

    console.log('[ScheduleContextService] STUBBED: Add special event to free period', {
      targetDate: format(eventDate, 'yyyy-MM-dd'),
      period: period,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement with special day modal for period-specific events
    // Example: this.specialDayModalService.openSpecialDayModal('add', eventDate, null, period);
  }

  private handleAddNonTeachingToErrorPeriod(): void {
    if (!this.lastClickedEvent) {
      console.warn('[ScheduleContextService] No event context for add non-teaching period');
      return;
    }

    const eventDate = this.lastClickedEvent.event.start;
    const period = this.lastClickedEvent.event.extendedProps['period'];
    
    if (!eventDate) {
      console.warn('[ScheduleContextService] No date available for add non-teaching period');
      return;
    }

    console.log('[ScheduleContextService] Converting error period to non-teaching period', {
      targetDate: format(eventDate, 'yyyy-MM-dd'),
      period: period,
      timestamp: new Date().toISOString()
    });

    // Reuse existing special day modal for error period conversion
    this.specialDayModalService.openSpecialDayModal('add', eventDate);
  }
}