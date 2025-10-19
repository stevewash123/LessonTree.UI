// **COMPLETE FILE** - ContextMenuBusinessService - Context Menu Business Logic
// RESPONSIBILITY: Context menu generation logic, event type detection, and action decisions
// SCOPE: Pure business logic only (Observable coordination in separate service)
// RATIONALE: Context menu business rules separated from event emission patterns

import { Injectable } from '@angular/core';
import { EventClickArg } from '@fullcalendar/core';
import { ScheduleStateService } from '../state/schedule-state.service';

export interface ContextMenuAction {
  id: string;
  label: string;
  actionType: 'view-lesson' | 'edit-lesson' | 'reschedule-lesson' | 'add-special-day' | 'edit-special-day' | 'delete-special-day' | 'view-error' | 'add-activity' | 'view-details';
  contextType: 'lesson-event' | 'special-day-event' | 'error-event' | 'free-period' | 'date-only';
  metadata?: {
    lessonId?: number;
    lessonTitle?: string;
    period?: number;
    date?: Date;
    eventType?: string;
    scheduleEvent?: any;
  };
}

export interface ContextMenuResult {
  actions: ContextMenuAction[];
  contextType: 'lesson-event' | 'special-day-event' | 'error-event' | 'free-period' | 'date-only' | 'no-context';
  hasEventContext: boolean;
  hasDateContext: boolean;
  eventType?: string;
  period?: number;
  metadata: {
    eventTitle?: string;
    date?: Date;
    period?: number;
    lessonId?: number;
    lessonTitle?: string;
    scheduleEvent?: any;
  };
}

export interface ContextState {
  type: 'event' | 'date' | 'none';
  event?: EventClickArg;
  date?: Date;
  metadata: {
    eventTitle?: string;
    date?: Date;
    period?: number;
    eventType?: string;
    scheduleEvent?: any;
    lessonId?: number;
    lessonTitle?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuBusinessService {

  // Context state management
  private lastClickedEvent: EventClickArg | null = null;
  private lastClickedDate: Date | null = null;

  constructor(private scheduleStateService: ScheduleStateService) {
    console.log('[ContextMenuBusinessService] Context menu business logic initialized');
  }

  // === CONTEXT STATE MANAGEMENT ===

  setEventContext(event: EventClickArg): ContextState {
    if (!event || !event.event) {
      console.warn('[ContextMenuBusinessService] Invalid event provided');
      this.lastClickedEvent = null;
      return this.getCurrentContextState();
    }

    console.log('[ContextMenuBusinessService] Setting event context:', event.event.title);

    const extendedProps = event.event.extendedProps || {};
    this.lastClickedEvent = event;
    this.lastClickedDate = null;

    return {
      type: 'event',
      event,
      metadata: {
        eventTitle: event.event.title,
        period: extendedProps['period'],
        eventType: extendedProps['eventType'],
        scheduleEvent: extendedProps['scheduleEvent']
      }
    };
  }

  setDateContext(date: Date): ContextState {
    console.log('[ContextMenuBusinessService] Setting date context:', date);

    this.lastClickedDate = date;
    this.lastClickedEvent = null;

    return {
      type: 'date',
      date,
      metadata: {
        date
      }
    };
  }

  clearContext(): ContextState {
    console.log('[ContextMenuBusinessService] Clearing context');

    this.lastClickedEvent = null;
    this.lastClickedDate = null;

    return {
      type: 'none',
      metadata: {}
    };
  }

  getCurrentContextState(): ContextState {
    if (this.lastClickedEvent) {
      const extendedProps = this.lastClickedEvent.event.extendedProps || {};
      return {
        type: 'event',
        event: this.lastClickedEvent,
        metadata: {
          eventTitle: this.lastClickedEvent.event.title,
          period: extendedProps['period'],
          eventType: extendedProps['eventType'],
          scheduleEvent: extendedProps['scheduleEvent']
        }
      };
    }

    if (this.lastClickedDate) {
      return {
        type: 'date',
        date: this.lastClickedDate,
        metadata: {
          date: this.lastClickedDate
        }
      };
    }

    return {
      type: 'none',
      metadata: {}
    };
  }

  // === CONTEXT MENU GENERATION LOGIC ===

  generateContextMenuActions(): ContextMenuResult {
    //console.log('[ContextMenuBusinessService] Generating context menu actions');

    const actions: ContextMenuAction[] = [];
    let contextType: 'lesson-event' | 'special-day-event' | 'error-event' | 'free-period' | 'date-only' | 'no-context' = 'no-context';
    let eventType: string | undefined;
    let period: number | undefined;
    const metadata: ContextMenuResult['metadata'] = {};

    try {
      // ADD "Add Special Day" option only if no special day already exists for the date
      const contextDate = this.getContextDate();
      if (contextDate) {
        contextType = 'date-only';
        metadata.date = contextDate;

        // Only add "Add Special Day" option if no special day exists for this date
        if (!this.hasSpecialDayForDate(contextDate)) {
          actions.push({
            id: 'addSpecialDay',
            label: `Add Special Day (${contextDate.toLocaleDateString()})`,
            actionType: 'add-special-day',
            contextType: 'date-only',
            metadata: { date: contextDate }
          });
        }
      }

      // EVENT-SPECIFIC ACTIONS
      if (this.lastClickedEvent) {
        const extendedProps = this.lastClickedEvent.event.extendedProps || {};
        period = extendedProps['period'];
        eventType = extendedProps['eventType'];
        const scheduleEvent = extendedProps['scheduleEvent'];

        metadata.period = period;
        metadata.scheduleEvent = scheduleEvent;
        metadata.eventTitle = this.lastClickedEvent.event.title;

        // SPECIAL DAY EVENTS
        if (this.isSpecialDayEvent(this.lastClickedEvent)) {
          contextType = 'special-day-event';

          actions.push(
            {
              id: 'editSpecialDay',
              label: `Edit Non-Teaching Period ${period || ''}`,
              actionType: 'edit-special-day',
              contextType: 'special-day-event',
              metadata: { period, scheduleEvent, eventType }
            },
            {
              id: 'deleteSpecialDay',
              label: `Delete Non-Teaching Period ${period || ''}`,
              actionType: 'delete-special-day',
              contextType: 'special-day-event',
              metadata: { period, scheduleEvent, eventType }
            }
          );
        }
        // LESSON EVENTS
        else if (this.isLessonEvent(this.lastClickedEvent)) {
          contextType = 'lesson-event';
          const lessonTitle = scheduleEvent?.lessonTitle || 'Lesson';
          const lessonId = scheduleEvent?.lessonId;

          metadata.lessonId = lessonId;
          metadata.lessonTitle = lessonTitle;

          actions.push(
            {
              id: 'viewLessonDetails',
              label: `View "${lessonTitle}" Details`,
              actionType: 'view-lesson',
              contextType: 'lesson-event',
              metadata: { lessonId, lessonTitle, period, scheduleEvent }
            },
            {
              id: 'editLesson',
              label: `Edit "${lessonTitle}"`,
              actionType: 'edit-lesson',
              contextType: 'lesson-event',
              metadata: { lessonId, lessonTitle, period, scheduleEvent }
            }
          );

          if (period) {
            actions.push({
              id: 'rescheduleLesson',
              label: `Reschedule from Period ${period}`,
              actionType: 'reschedule-lesson',
              contextType: 'lesson-event',
              metadata: { lessonId, lessonTitle, period, scheduleEvent }
            });
          }
        }
        // ERROR EVENTS
        else if (this.isErrorDayEvent(this.lastClickedEvent)) {
          contextType = 'error-event';

          actions.push({
            id: 'viewErrorDetails',
            label: 'View Schedule Error Details',
            actionType: 'view-error',
            contextType: 'error-event',
            metadata: { period, scheduleEvent, eventType }
          });
        }
        // FREE PERIOD EVENTS
        else if (this.isFreePeriodEvent(this.lastClickedEvent)) {
          contextType = 'free-period';

          actions.push({
            id: 'addSpecialActivity',
            label: `Add Activity to Period ${period || ''}`,
            actionType: 'add-activity',
            contextType: 'free-period',
            metadata: { period, scheduleEvent }
          });
        }
        // FALLBACK - Generic actions
        else {
          actions.push({
            id: 'viewEventDetails',
            label: 'View Event Details',
            actionType: 'view-details',
            contextType: 'date-only',
            metadata: { scheduleEvent, period }
          });
        }
      }

    } catch (error) {
      console.error('[ContextMenuBusinessService] Error generating context actions:', error);
      contextType = 'no-context';
    }

    //console.log(`[ContextMenuBusinessService] Generated ${actions.length} actions for context type: ${contextType}`);

    return {
      actions,
      contextType,
      hasEventContext: !!this.lastClickedEvent,
      hasDateContext: !!this.lastClickedDate,
      eventType,
      period,
      metadata
    };
  }

  // === EVENT TYPE DETECTION METHODS ===

  isLessonEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];

    return extendedProps['eventType'] === 'lesson' ||
      extendedProps['eventCategory'] === 'Lesson' ||
      scheduleEvent?.eventCategory === 'Lesson' ||
      scheduleEvent?.lessonId !== undefined ||
      scheduleEvent?.lessonTitle !== undefined;
  }

  isSpecialDayEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];

    return extendedProps['eventType'] === 'special' ||
      extendedProps['eventCategory'] === 'SpecialDay' ||
      scheduleEvent?.eventCategory === 'SpecialDay' ||
      scheduleEvent?.eventType === 'special';
  }

  isErrorDayEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];

    return extendedProps['eventType'] === 'error' ||
      extendedProps['eventType'] === 'Error' ||
      scheduleEvent?.eventType === 'Error' ||
      scheduleEvent?.eventCategory === 'Error';
  }

  isFreePeriodEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];

    return extendedProps['eventType'] === 'free' ||
      extendedProps['eventCategory'] === 'Free' ||
      scheduleEvent?.eventCategory === 'Free' ||
      (scheduleEvent?.period && !scheduleEvent?.lessonId && !scheduleEvent?.specialCode);
  }

  // === UTILITY METHODS ===

  getContextDate(): Date | null {
    // If we have an event, extract the date from it
    if (this.lastClickedEvent?.event?.start) {
      return new Date(this.lastClickedEvent.event.start);
    }

    // If we have a direct date context
    if (this.lastClickedDate) {
      return this.lastClickedDate;
    }

    return null;
  }

  /**
   * Check if a special day already exists for the given date
   */
  private hasSpecialDayForDate(date: Date): boolean {
    const currentSchedule = this.scheduleStateService.getSchedule();
    if (!currentSchedule || !currentSchedule.specialDays) {
      return false;
    }

    const targetDateStr = date.toDateString();

    return currentSchedule.specialDays.some(specialDay => {
      const specialDayDate = new Date(specialDay.date);
      return specialDayDate.toDateString() === targetDateStr;
    });
  }

  getCurrentContextType(): 'event' | 'date' | 'none' {
    if (this.lastClickedEvent) return 'event';
    if (this.lastClickedDate) return 'date';
    return 'none';
  }

  // === ACTION VALIDATION ===

  validateAction(actionId: string): { isValid: boolean; reason?: string } {
    const result = this.generateContextMenuActions();
    const action = result.actions.find(a => a.id === actionId);

    if (!action) {
      return { isValid: false, reason: 'Action not available in current context' };
    }

    // Additional validation logic could go here
    return { isValid: true };
  }

  getActionMetadata(actionId: string): ContextMenuAction['metadata'] | null {
    const result = this.generateContextMenuActions();
    const action = result.actions.find(a => a.id === actionId);
    return action?.metadata || null;
  }
}
