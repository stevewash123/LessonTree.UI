// RESPONSIBILITY: Manages context menu state, event handling, and user interaction coordination for calendar operations.
// DOES NOT: Handle modal operations, lesson shifting logic, or direct API calls - delegates to specialized services.
// CALLED BY: LessonCalendarComponent for context menu operations and user interaction coordination.
import { Injectable } from '@angular/core';
import { EventClickArg } from '@fullcalendar/core';
import { format } from 'date-fns';

import { ScheduleStateService } from '../state/schedule-state.service';
import { SpecialDayModalService } from './special-day-modal.service';
import { LessonShiftingService } from '../business/lesson-shifting.service';

export interface ContextMenuAction {
  id: string;
  label: string;
  handler: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ContextMenuService {
  // Context menu state
  private lastClickedEvent: EventClickArg | null = null;
  private lastClickedDate: Date | null = null;

  constructor(
    private specialDayModalService: SpecialDayModalService
  ) {
    console.log('[ScheduleContextService] Initialized for ScheduleEvent period-based operations');
  }

  // Set context for operations
  setDateContext(date: Date): void {
    console.log('[ScheduleContextService] setDateContext for:', date);
    this.lastClickedDate = date;
    this.lastClickedEvent = null; // Clear event context when setting date context
  }


  // Enhanced setEventContext with detailed logging
  setEventContext(event: EventClickArg): void {
    if (!event || !event.event) {
      console.warn('[ScheduleContextService] Invalid event provided');
      this.lastClickedEvent = null;
      return;
    }

    console.log('[ScheduleContextService] Event context set:', event.event.title);
    this.lastClickedEvent = event;
    this.lastClickedDate = null;
  }

  // IMPROVED: Enhanced event type detection with better logging
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

  // Get available context menu actions based on current context
  getContextMenuActions(): ContextMenuAction[] {
    const actions: ContextMenuAction[] = [];

    try {
      // ALWAYS ADD: "Add Special Day" option regardless of context
      const contextDate = this.getContextDate();
      if (contextDate) {
        actions.push({
          id: 'addSpecialDay',
          label: `Add Special Day (${contextDate.toLocaleDateString()})`,
          handler: () => this.handleAddSpecialDay()
        });
      }

      // EVENT-SPECIFIC ACTIONS (if we have an event context)
      if (this.lastClickedEvent) {
        const extendedProps = this.lastClickedEvent.event.extendedProps || {};
        const period = extendedProps['period'];
        const eventType = extendedProps['eventType'];
        const scheduleEvent = extendedProps['scheduleEvent'];

        // SPECIAL DAY EVENTS
        if (this.isSpecialDayEvent(this.lastClickedEvent)) {
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

      // REDUCED: Only log once when actions are generated, not on every call
     // if (actions.length > 0) {
     //   console.log(`[ScheduleContextService] Generated ${actions.length} actions:`, actions.map(a => a.id));
     //}

    } catch (error) {
      console.error('[ScheduleContextService] Error generating context actions:', error);
    }

    return actions;
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

  // NEW: Handler methods for lesson actions
  private handleViewLessonDetails(): void {
    try {
      console.log('[ScheduleContextService] View lesson details requested');
      // TODO: Implement lesson details view
      // For now, just log the lesson information
      const scheduleEvent = this.lastClickedEvent?.event.extendedProps?.['scheduleEvent'];
      console.log('Lesson details:', scheduleEvent);
    } catch (error) {
      console.error('[ScheduleContextService] Error viewing lesson details:', error);
    }
  }

  private handleEditLesson(): void {
    try {
      console.log('[ScheduleContextService] Edit lesson requested');
      // TODO: Implement lesson editing
      // This would typically open the lesson in the InfoPanel
      const scheduleEvent = this.lastClickedEvent?.event.extendedProps?.['scheduleEvent'];
      console.log('Edit lesson:', scheduleEvent);
    } catch (error) {
      console.error('[ScheduleContextService] Error editing lesson:', error);
    }
  }

  private handleRescheduleLesson(): void {
    try {
      console.log('[ScheduleContextService] Reschedule lesson requested');
      // TODO: Implement lesson rescheduling
      const scheduleEvent = this.lastClickedEvent?.event.extendedProps?.['scheduleEvent'];
      console.log('Reschedule lesson:', scheduleEvent);
    } catch (error) {
      console.error('[ScheduleContextService] Error rescheduling lesson:', error);
    }
  }

  private handleViewErrorDetails(): void {
    try {
      console.log('[ScheduleContextService] View error details requested');
      const scheduleEvent = this.lastClickedEvent?.event.extendedProps?.['scheduleEvent'];
      console.log('Error details:', scheduleEvent);
    } catch (error) {
      console.error('[ScheduleContextService] Error viewing error details:', error);
    }
  }

  private handleAddSpecialActivity(): void {
    try {
      console.log('[ScheduleContextService] Add special activity requested');
      const period = this.lastClickedEvent?.event.extendedProps?.['period'];
      console.log('Add activity to period:', period);
    } catch (error) {
      console.error('[ScheduleContextService] Error adding special activity:', error);
    }
  }

  private handleViewEventDetails(): void {
    try {
      console.log('[ScheduleContextService] View event details requested');
      const event = this.lastClickedEvent?.event;
      console.log('Event details:', event?.extendedProps);
    } catch (error) {
      console.error('[ScheduleContextService] Error viewing event details:', error);
    }
  }

  private handleEditSpecialDay(): void {
    try {
      if (this.lastClickedEvent) {
        console.log('[ScheduleContextService] Opening special day edit modal');
        this.specialDayModalService.openSpecialDayModal('edit', null, this.lastClickedEvent);
      }
    } catch (error) {
      console.error('[ScheduleContextService] Error in handleEditSpecialDay:', error);
    }
  }

  private handleDeleteSpecialDay(): void {
    try {
      if (this.lastClickedEvent) {
        console.log('[ScheduleContextService] Deleting special day');
        this.specialDayModalService.deleteSpecialDayFromEvent(this.lastClickedEvent);
      }
    } catch (error) {
      console.error('[ScheduleContextService] Error in handleDeleteSpecialDay:', error);
    }
  }

  // Clear context (useful for cleanup)
  private handleAddSpecialDay(): void {
    try {
      const contextDate = this.getContextDate();
      console.log('[ScheduleContextService] Add special day requested for date:', contextDate);

      if (contextDate) {
        // Open special day modal in 'add' mode with the selected date
        this.specialDayModalService.openSpecialDayModal('add', contextDate, undefined);
      }
    } catch (error) {
      console.error('[ScheduleContextService] Error adding special day:', error);
    }
  }

  // Enhanced clearContext to clear both event and date context
  clearContext(): void {
    console.log('[ScheduleContextService] clearContext');
    this.lastClickedEvent = null;
    this.lastClickedDate = null;
  }


}
