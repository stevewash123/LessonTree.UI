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
  
    if (this.lastClickedDate) {
      // Check if this date already has a special day
      const existingSpecialDay = this.getSpecialDayOnDate(this.lastClickedDate);
      
      if (existingSpecialDay) {
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
        // Date is empty - allow adding non-teaching day
        actions.push({
          id: 'nonTeaching',
          label: 'Add Non-Teaching Day',
          handler: () => this.specialDayModalService.openSpecialDayModal('add', this.lastClickedDate!)
        });
      }
    }
  
    if (this.lastClickedEvent) {
      if (this.isErrorDayEvent(this.lastClickedEvent)) {
        // Error day event context - show info
        actions.push({
          id: 'errorDayInfo',
          label: 'Error Day Info',
          handler: () => this.specialDayModalService.showErrorDayInfo()
        });
      } else if (this.isSpecialDayEvent(this.lastClickedEvent)) {
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
      }
    }
  
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

  // Check if event is a special day (but not an error day)
  private isSpecialDayEvent(event: EventClickArg): boolean {
    const specialCode = event.event.extendedProps['specialCode'];
    return !!specialCode && specialCode !== 'Error Day';
  }

  // Check if event is an error day
  private isErrorDayEvent(event: EventClickArg): boolean {
    return event.event.extendedProps['specialCode'] === 'Error Day';
  }

  // Clear context (useful for cleanup)
  clearContext(): void {
    this.lastClickedDate = null;
    this.lastClickedEvent = null;
    console.log('[ScheduleContextService] Context cleared', { timestamp: new Date().toISOString() });
  }
}