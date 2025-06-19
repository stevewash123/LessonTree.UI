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
export class ContextMenuService {
  // Context menu state
  private lastClickedEvent: EventClickArg | null = null;

  constructor(
    private specialDayModalService: SpecialDayModalService
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
    const actions: ContextMenuAction[] = [];
    
    if (this.lastClickedEvent) {
      const extendedProps = this.lastClickedEvent.event.extendedProps || {};
      const period = extendedProps['period'];
  
      // Only include actions that actually work
      if (this.isSpecialDayEvent(this.lastClickedEvent)) {
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
      }
      // Remove all other event types until handlers are implemented
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

}