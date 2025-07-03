// **COMPLETE FILE** - ContextMenuService with dual Signal/Observable pattern
// RESPONSIBILITY: User interaction coordination with Observable events for cross-component workflows
// DOES NOT: Handle modal operations, lesson shifting logic, or direct API calls - delegates to specialized services
// CALLED BY: LessonCalendarComponent for context menu operations with comprehensive event emission

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { EventClickArg } from '@fullcalendar/core';
import { format } from 'date-fns';

import { ScheduleStateService } from '../state/schedule-state.service';
import { SpecialDayModalService } from './special-day-modal.service';
import { LessonShiftingService } from '../business/lesson-shifting.service';

// ✅ Observable event interfaces for user interaction workflows
export interface ContextMenuInteractionEvent {
  action: 'view-lesson' | 'edit-lesson' | 'reschedule-lesson' | 'add-special-day' | 'edit-special-day' | 'delete-special-day' | 'view-error' | 'add-activity' | 'view-details';
  success: boolean;
  contextType: 'lesson-event' | 'special-day-event' | 'error-event' | 'free-period' | 'date-only';
  eventId?: number;
  lessonId?: number;
  lessonTitle?: string;
  period?: number;
  date?: Date;
  eventType?: string;
  error?: Error;
  timestamp: Date;
}

export interface ContextMenuGenerationEvent {
  contextType: 'lesson-event' | 'special-day-event' | 'error-event' | 'free-period' | 'date-only' | 'no-context';
  actionCount: number;
  availableActions: string[];
  hasEventContext: boolean;
  hasDateContext: boolean;
  period?: number;
  eventType?: string;
  timestamp: Date;
}

export interface ContextStateChangeEvent {
  changeType: 'event-context-set' | 'date-context-set' | 'context-cleared';
  previousContext?: 'event' | 'date' | 'none';
  newContext: 'event' | 'date' | 'none';
  eventTitle?: string;
  date?: Date;
  period?: number;
  timestamp: Date;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  handler: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuService {

  // ✅ Observable event emissions following established pattern
  private readonly _interactionCompleted$ = new Subject<ContextMenuInteractionEvent>();
  private readonly _menuGenerated$ = new Subject<ContextMenuGenerationEvent>();
  private readonly _contextStateChanged$ = new Subject<ContextStateChangeEvent>();

  // Public observables
  readonly interactionCompleted$ = this._interactionCompleted$.asObservable();
  readonly menuGenerated$ = this._menuGenerated$.asObservable();
  readonly contextStateChanged$ = this._contextStateChanged$.asObservable();

  // Context menu state
  private lastClickedEvent: EventClickArg | null = null;
  private lastClickedDate: Date | null = null;

  constructor(
    private specialDayModalService: SpecialDayModalService
  ) {
    console.log('[ContextMenuService] Enhanced with comprehensive Observable events for user interaction coordination');
  }

  // === ENHANCED CONTEXT MANAGEMENT WITH OBSERVABLE EVENTS ===

  /**
   * ✅ Enhanced: Set date context with Observable event emission
   */
  setDateContext(date: Date): void {
    console.log('[ContextMenuService] Setting date context with event emission:', date);

    const previousContext = this.getCurrentContextType();
    this.lastClickedDate = date;
    this.lastClickedEvent = null; // Clear event context when setting date context

    // ✅ Emit context state change event
    this._contextStateChanged$.next({
      changeType: 'date-context-set',
      previousContext,
      newContext: 'date',
      date,
      timestamp: new Date()
    });
  }

  /**
   * ✅ Enhanced: Set event context with Observable event emission
   */
  setEventContext(event: EventClickArg): void {
    if (!event || !event.event) {
      console.warn('[ContextMenuService] Invalid event provided');
      this.lastClickedEvent = null;

      // ✅ Emit context state change for invalid event
      this._contextStateChanged$.next({
        changeType: 'context-cleared',
        previousContext: this.getCurrentContextType(),
        newContext: 'none',
        timestamp: new Date()
      });
      return;
    }

    console.log('[ContextMenuService] Setting event context with event emission:', event.event.title);

    const previousContext = this.getCurrentContextType();
    const extendedProps = event.event.extendedProps || {};

    this.lastClickedEvent = event;
    this.lastClickedDate = null;

    // ✅ Emit context state change event
    this._contextStateChanged$.next({
      changeType: 'event-context-set',
      previousContext,
      newContext: 'event',
      eventTitle: event.event.title,
      date: event.event.start ? new Date(event.event.start) : undefined,
      period: extendedProps['period'],
      timestamp: new Date()
    });
  }

  /**
   * ✅ Enhanced: Clear context with Observable event emission
   */
  clearContext(): void {
    console.log('[ContextMenuService] Clearing context with event emission');

    const previousContext = this.getCurrentContextType();
    this.lastClickedEvent = null;
    this.lastClickedDate = null;

    // ✅ Emit context state change event
    this._contextStateChanged$.next({
      changeType: 'context-cleared',
      previousContext,
      newContext: 'none',
      timestamp: new Date()
    });
  }

  // === ENHANCED CONTEXT MENU GENERATION WITH OBSERVABLE EVENTS ===

  /**
   * ✅ Enhanced: Get context menu actions with Observable event emission
   */
  getContextMenuActions(): ContextMenuAction[] {
    console.log('[ContextMenuService] Generating context menu actions with event emission');

    const actions: ContextMenuAction[] = [];
    let contextType: 'lesson-event' | 'special-day-event' | 'error-event' | 'free-period' | 'date-only' | 'no-context' = 'no-context';
    let eventType: string | undefined;
    let period: number | undefined;

    try {
      // ALWAYS ADD: "Add Special Day" option regardless of context
      const contextDate = this.getContextDate();
      if (contextDate) {
        contextType = 'date-only';
        actions.push({
          id: 'addSpecialDay',
          label: `Add Special Day (${contextDate.toLocaleDateString()})`,
          handler: () => this.handleAddSpecialDay()
        });
      }

      // EVENT-SPECIFIC ACTIONS (if we have an event context)
      if (this.lastClickedEvent) {
        const extendedProps = this.lastClickedEvent.event.extendedProps || {};
        period = extendedProps['period'];
        eventType = extendedProps['eventType'];
        const scheduleEvent = extendedProps['scheduleEvent'];

        // SPECIAL DAY EVENTS
        if (this.isSpecialDayEvent(this.lastClickedEvent)) {
          contextType = 'special-day-event';
          actions.push(
            {
              id: 'editSpecialDay',
              label: `Edit Non-Teaching Period ${period || ''}`,
              handler: () => this.handleEditSpecialDay()
            },
            {
              id: 'deleteSpecialDay',
              label: `Delete Non-Teaching Period ${period || ''}`,
              handler: () => this.handleDeleteSpecialDay()
            }
          );
        }

        // LESSON EVENTS
        else if (this.isLessonEvent(this.lastClickedEvent)) {
          contextType = 'lesson-event';
          const lessonTitle = scheduleEvent?.lessonTitle || 'Lesson';

          actions.push(
            {
              id: 'viewLessonDetails',
              label: `View "${lessonTitle}" Details`,
              handler: () => this.handleViewLessonDetails()
            },
            {
              id: 'editLesson',
              label: `Edit "${lessonTitle}"`,
              handler: () => this.handleEditLesson()
            }
          );

          // Add scheduling actions for lessons
          if (period) {
            actions.push(
              {
                id: 'rescheduleLesson',
                label: `Reschedule from Period ${period}`,
                handler: () => this.handleRescheduleLesson()
              }
            );
          }
        }

        // ERROR EVENTS
        else if (this.isErrorDayEvent(this.lastClickedEvent)) {
          contextType = 'error-event';
          actions.push(
            {
              id: 'viewErrorDetails',
              label: 'View Schedule Error Details',
              handler: () => this.handleViewErrorDetails()
            }
          );
        }

        // FREE PERIOD EVENTS
        else if (this.isFreePeriodEvent(this.lastClickedEvent)) {
          contextType = 'free-period';
          actions.push(
            {
              id: 'addSpecialActivity',
              label: `Add Activity to Period ${period || ''}`,
              handler: () => this.handleAddSpecialActivity()
            }
          );
        }

        // FALLBACK - Generic actions
        else {
          actions.push(
            {
              id: 'viewEventDetails',
              label: 'View Event Details',
              handler: () => this.handleViewEventDetails()
            }
          );
        }
      }

    } catch (error) {
      console.error('[ContextMenuService] Error generating context actions:', error);
      contextType = 'no-context';
    }

    console.log(`[ContextMenuService] Generated ${actions.length} actions for context type: ${contextType}`);

    // ✅ Emit menu generation event
    this._menuGenerated$.next({
      contextType,
      actionCount: actions.length,
      availableActions: actions.map(a => a.id),
      hasEventContext: !!this.lastClickedEvent,
      hasDateContext: !!this.lastClickedDate,
      period,
      eventType,
      timestamp: new Date()
    });

    return actions;
  }

  // === EVENT TYPE DETECTION METHODS (Unchanged - Pure Functions) ===

  private isLessonEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];

    return extendedProps['eventType'] === 'lesson' ||
      extendedProps['eventCategory'] === 'Lesson' ||
      scheduleEvent?.eventCategory === 'Lesson' ||
      scheduleEvent?.lessonId !== undefined ||
      scheduleEvent?.lessonTitle !== undefined;
  }

  private isSpecialDayEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];

    return extendedProps['eventType'] === 'special' ||
      extendedProps['eventCategory'] === 'SpecialDay' ||
      scheduleEvent?.eventCategory === 'SpecialDay' ||
      scheduleEvent?.eventType === 'special';
  }

  private isErrorDayEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];

    return extendedProps['eventType'] === 'error' ||
      extendedProps['eventType'] === 'Error' ||
      scheduleEvent?.eventType === 'Error' ||
      scheduleEvent?.eventCategory === 'Error';
  }

  private isFreePeriodEvent(event: EventClickArg): boolean {
    const extendedProps = event.event.extendedProps || {};
    const scheduleEvent = extendedProps['scheduleEvent'];

    return extendedProps['eventType'] === 'free' ||
      extendedProps['eventCategory'] === 'Free' ||
      scheduleEvent?.eventCategory === 'Free' ||
      (scheduleEvent?.period && !scheduleEvent?.lessonId && !scheduleEvent?.specialCode);
  }

  private getContextDate(): Date | null {
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

  private getCurrentContextType(): 'event' | 'date' | 'none' {
    if (this.lastClickedEvent) return 'event';
    if (this.lastClickedDate) return 'date';
    return 'none';
  }

  // === ENHANCED HANDLER METHODS WITH OBSERVABLE EVENTS ===

  /**
   * ✅ Enhanced: Handle lesson details view with Observable event emission
   */
  private handleViewLessonDetails(): void {
    console.log('[ContextMenuService] Handling view lesson details with event emission');

    try {
      const scheduleEvent = this.lastClickedEvent?.event.extendedProps?.['scheduleEvent'];
      const lessonId = scheduleEvent?.lessonId;
      const lessonTitle = scheduleEvent?.lessonTitle || 'Unknown';

      console.log('Lesson details:', scheduleEvent);

      // ✅ Emit successful interaction event
      this._interactionCompleted$.next({
        action: 'view-lesson',
        success: true,
        contextType: 'lesson-event',
        lessonId,
        lessonTitle,
        period: scheduleEvent?.period,
        date: this.getContextDate() || undefined,
        timestamp: new Date()
      });

    } catch (error: any) {
      console.error('[ContextMenuService] Error viewing lesson details:', error);

      // ✅ Emit failed interaction event
      this._interactionCompleted$.next({
        action: 'view-lesson',
        success: false,
        contextType: 'lesson-event',
        error,
        timestamp: new Date()
      });
    }
  }

  /**
   * ✅ Enhanced: Handle lesson editing with Observable event emission
   */
  private handleEditLesson(): void {
    console.log('[ContextMenuService] Handling edit lesson with event emission');

    try {
      const scheduleEvent = this.lastClickedEvent?.event.extendedProps?.['scheduleEvent'];
      const lessonId = scheduleEvent?.lessonId;
      const lessonTitle = scheduleEvent?.lessonTitle || 'Unknown';

      console.log('Edit lesson:', scheduleEvent);

      // ✅ Emit successful interaction event
      this._interactionCompleted$.next({
        action: 'edit-lesson',
        success: true,
        contextType: 'lesson-event',
        lessonId,
        lessonTitle,
        period: scheduleEvent?.period,
        date: this.getContextDate() || undefined,
        timestamp: new Date()
      });

    } catch (error: any) {
      console.error('[ContextMenuService] Error editing lesson:', error);

      // ✅ Emit failed interaction event
      this._interactionCompleted$.next({
        action: 'edit-lesson',
        success: false,
        contextType: 'lesson-event',
        error,
        timestamp: new Date()
      });
    }
  }

  /**
   * ✅ Enhanced: Handle lesson rescheduling with Observable event emission
   */
  private handleRescheduleLesson(): void {
    console.log('[ContextMenuService] Handling reschedule lesson with event emission');

    try {
      const scheduleEvent = this.lastClickedEvent?.event.extendedProps?.['scheduleEvent'];
      const lessonId = scheduleEvent?.lessonId;
      const lessonTitle = scheduleEvent?.lessonTitle || 'Unknown';

      console.log('Reschedule lesson:', scheduleEvent);

      // ✅ Emit successful interaction event
      this._interactionCompleted$.next({
        action: 'reschedule-lesson',
        success: true,
        contextType: 'lesson-event',
        lessonId,
        lessonTitle,
        period: scheduleEvent?.period,
        date: this.getContextDate() || undefined,
        timestamp: new Date()
      });

    } catch (error: any) {
      console.error('[ContextMenuService] Error rescheduling lesson:', error);

      // ✅ Emit failed interaction event
      this._interactionCompleted$.next({
        action: 'reschedule-lesson',
        success: false,
        contextType: 'lesson-event',
        error,
        timestamp: new Date()
      });
    }
  }

  /**
   * ✅ Enhanced: Handle add special day with Observable event emission
   */
  private handleAddSpecialDay(): void {
    console.log('[ContextMenuService] Handling add special day with event emission');

    try {
      const contextDate = this.getContextDate();
      console.log('Add special day requested for date:', contextDate);

      if (contextDate) {
        // Open special day modal in 'add' mode with the selected date
        this.specialDayModalService.openSpecialDayModal('add', contextDate, undefined);

        // ✅ Emit successful interaction event
        this._interactionCompleted$.next({
          action: 'add-special-day',
          success: true,
          contextType: 'date-only',
          date: contextDate,
          timestamp: new Date()
        });
      } else {
        throw new Error('No date context available for special day creation');
      }

    } catch (error: any) {
      console.error('[ContextMenuService] Error adding special day:', error);

      // ✅ Emit failed interaction event
      this._interactionCompleted$.next({
        action: 'add-special-day',
        success: false,
        contextType: 'date-only',
        error,
        timestamp: new Date()
      });
    }
  }

  /**
   * ✅ Enhanced: Handle edit special day with Observable event emission
   */
  private handleEditSpecialDay(): void {
    console.log('[ContextMenuService] Handling edit special day with event emission');

    try {
      if (this.lastClickedEvent) {
        const extendedProps = this.lastClickedEvent.event.extendedProps || {};
        const scheduleEvent = extendedProps['scheduleEvent'];

        this.specialDayModalService.openSpecialDayModal('edit', null, this.lastClickedEvent);

        // ✅ Emit successful interaction event
        this._interactionCompleted$.next({
          action: 'edit-special-day',
          success: true,
          contextType: 'special-day-event',
          eventId: scheduleEvent?.id,
          period: scheduleEvent?.period,
          date: this.getContextDate() || undefined,
          eventType: scheduleEvent?.eventType,
          timestamp: new Date()
        });
      } else {
        throw new Error('No event context available for special day editing');
      }

    } catch (error: any) {
      console.error('[ContextMenuService] Error editing special day:', error);

      // ✅ Emit failed interaction event
      this._interactionCompleted$.next({
        action: 'edit-special-day',
        success: false,
        contextType: 'special-day-event',
        error,
        timestamp: new Date()
      });
    }
  }

  /**
   * ✅ Enhanced: Handle delete special day with Observable event emission
   */
  private handleDeleteSpecialDay(): void {
    console.log('[ContextMenuService] Handling delete special day with event emission');

    try {
      if (this.lastClickedEvent) {
        const extendedProps = this.lastClickedEvent.event.extendedProps || {};
        const scheduleEvent = extendedProps['scheduleEvent'];

        this.specialDayModalService.deleteSpecialDayFromEvent(this.lastClickedEvent);

        // ✅ Emit successful interaction event
        this._interactionCompleted$.next({
          action: 'delete-special-day',
          success: true,
          contextType: 'special-day-event',
          eventId: scheduleEvent?.id,
          period: scheduleEvent?.period,
          date: this.getContextDate() || undefined,
          eventType: scheduleEvent?.eventType,
          timestamp: new Date()
        });
      } else {
        throw new Error('No event context available for special day deletion');
      }

    } catch (error: any) {
      console.error('[ContextMenuService] Error deleting special day:', error);

      // ✅ Emit failed interaction event
      this._interactionCompleted$.next({
        action: 'delete-special-day',
        success: false,
        contextType: 'special-day-event',
        error,
        timestamp: new Date()
      });
    }
  }

  /**
   * ✅ Enhanced: Handle view error details with Observable event emission
   */
  private handleViewErrorDetails(): void {
    console.log('[ContextMenuService] Handling view error details with event emission');

    try {
      const scheduleEvent = this.lastClickedEvent?.event.extendedProps?.['scheduleEvent'];
      console.log('Error details:', scheduleEvent);

      // ✅ Emit successful interaction event
      this._interactionCompleted$.next({
        action: 'view-error',
        success: true,
        contextType: 'error-event',
        eventId: scheduleEvent?.id,
        period: scheduleEvent?.period,
        date: this.getContextDate() || undefined,
        eventType: scheduleEvent?.eventType,
        timestamp: new Date()
      });

    } catch (error: any) {
      console.error('[ContextMenuService] Error viewing error details:', error);

      // ✅ Emit failed interaction event
      this._interactionCompleted$.next({
        action: 'view-error',
        success: false,
        contextType: 'error-event',
        error,
        timestamp: new Date()
      });
    }
  }

  /**
   * ✅ Enhanced: Handle add special activity with Observable event emission
   */
  private handleAddSpecialActivity(): void {
    console.log('[ContextMenuService] Handling add special activity with event emission');

    try {
      const period = this.lastClickedEvent?.event.extendedProps?.['period'];
      console.log('Add activity to period:', period);

      // ✅ Emit successful interaction event
      this._interactionCompleted$.next({
        action: 'add-activity',
        success: true,
        contextType: 'free-period',
        period,
        date: this.getContextDate() || undefined,
        timestamp: new Date()
      });

    } catch (error: any) {
      console.error('[ContextMenuService] Error adding special activity:', error);

      // ✅ Emit failed interaction event
      this._interactionCompleted$.next({
        action: 'add-activity',
        success: false,
        contextType: 'free-period',
        error,
        timestamp: new Date()
      });
    }
  }

  /**
   * ✅ Enhanced: Handle view event details with Observable event emission
   */
  private handleViewEventDetails(): void {
    console.log('[ContextMenuService] Handling view event details with event emission');

    try {
      const event = this.lastClickedEvent?.event;
      console.log('Event details:', event?.extendedProps);

      // ✅ Emit successful interaction event
      this._interactionCompleted$.next({
        action: 'view-details',
        success: true,
        contextType: 'date-only',
        eventId: event?.id ? parseInt(event.id) : undefined,
        date: this.getContextDate() || undefined,
        timestamp: new Date()
      });

    } catch (error: any) {
      console.error('[ContextMenuService] Error viewing event details:', error);

      // ✅ Emit failed interaction event
      this._interactionCompleted$.next({
        action: 'view-details',
        success: false,
        contextType: 'date-only',
        error,
        timestamp: new Date()
      });
    }
  }

  // === CLEANUP ===

  /**
   * ✅ Complete Observable cleanup following established pattern
   */
  ngOnDestroy(): void {
    this._interactionCompleted$.complete();
    this._menuGenerated$.complete();
    this._contextStateChanged$.complete();
    console.log('[ContextMenuService] All Observable subjects completed');
  }
}
