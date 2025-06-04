// RESPONSIBILITY: Handles modal coordination and UI interactions for special day operations with multi-period support.
// DOES NOT: Handle business logic, API calls, or data persistence - delegates to SpecialDayManagementService.
// CALLED BY: ScheduleContextService for special day UI coordination.
import { Injectable, inject } from '@angular/core';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';
import { EventClickArg } from '@fullcalendar/core';
import { MatDialog } from '@angular/material/dialog';

import { ScheduleEvent } from '../../../models/schedule';
import { ScheduleStateService } from './schedule-state.service';
import { SpecialDayManagementService, SpecialDayData } from './special-day-management.service';
import { SpecialDayModalComponent, SpecialDayModalData, SpecialDayResult } from '../components/special-day-modal.component';

@Injectable({
  providedIn: 'root'
})
export class SpecialDayModalService {
  // Injected services
  private readonly scheduleStateService = inject(ScheduleStateService);
  private readonly specialDayManagement = inject(SpecialDayManagementService);
  private readonly toastr = inject(ToastrService);
  private readonly dialog = inject(MatDialog);

  constructor() {
    console.log('[SpecialDayModalService] Initialized for ScheduleEvent multi-period special days', { 
      timestamp: new Date().toISOString() 
    });
  }

  // Open special day modal for add or edit operations - UPDATED for multi-period support
  openSpecialDayModal(mode: 'add' | 'edit', date?: Date | null, event?: EventClickArg, periods?: number[]): void {
    let modalData: SpecialDayModalData;

    if (mode === 'add') {
      if (!date) {
        console.error(`[SpecialDayModalService] Cannot open modal: No date provided for add mode`, { 
          timestamp: new Date().toISOString() 
        });
        this.toastr.error('No date selected', 'Error');
        return;
      }

      // For add mode, use provided periods or default to empty (let user select)
      const targetPeriods = periods || [];

      modalData = {
        date: new Date(date),
        periods: targetPeriods,               // Optional initial periods
        mode: 'add',
        existingSpecialDay: null
      };

      console.log('[SpecialDayModalService] Opening add modal', {
        date: format(date, 'yyyy-MM-dd'),
        periods: targetPeriods
      });
    } else {
      // Edit mode
      if (!event) {
        console.error(`[SpecialDayModalService] Cannot open modal: No event provided for edit mode`, { 
          timestamp: new Date().toISOString() 
        });
        this.toastr.error('No special day selected', 'Error');
        return;
      }

      const existingData = this.prepareExistingDataFromEvent(event);
      if (!existingData) {
        return; // Error already logged in prepareExistingDataFromEvent
      }

      modalData = {
        date: existingData.date,
        periods: existingData.periods,        // Periods from existing data
        mode: 'edit',
        existingSpecialDay: existingData
      };

      console.log('[SpecialDayModalService] Opening edit modal', {
        date: format(existingData.date, 'yyyy-MM-dd'),
        periods: existingData.periods,
        specialCode: existingData.specialCode
      });
    }

    this.openModalWithData(modalData, mode);
  }

  // Edit special day directly from a schedule event - UPDATED for ScheduleEvent
  editSpecialDayOnDate(scheduleEvent: ScheduleEvent): void {
    console.log(`[SpecialDayModalService] Opening edit modal for special day event`, {
      scheduleEventId: scheduleEvent.id,
      date: format(new Date(scheduleEvent.date), 'yyyy-MM-dd'),
      period: scheduleEvent.period,
      specialCode: scheduleEvent.specialCode,
      timestamp: new Date().toISOString()
    });

    const specialDayData = this.specialDayManagement.extractSpecialDayData(scheduleEvent);
    if (!specialDayData) {
      this.toastr.error('Could not extract special day data', 'Error');
      return;
    }

    const modalData: SpecialDayModalData = {
      date: specialDayData.date,
      periods: specialDayData.periods,      // Multi-period support
      mode: 'edit',
      existingSpecialDay: {
        id: scheduleEvent.id,
        periods: specialDayData.periods,    // Multi-period in existing data
        specialCode: specialDayData.specialCode,
        title: specialDayData.title,
        description: specialDayData.description,
        date: specialDayData.date
      }
    };

    this.openModalWithData(modalData, 'edit', scheduleEvent);
  }

  // Delete special day directly from a schedule event - UNCHANGED
  deleteSpecialDayOnDate(scheduleEvent: ScheduleEvent): void {
    console.log(`[SpecialDayModalService] Deleting special day event`, {
      scheduleEventId: scheduleEvent.id,
      date: format(new Date(scheduleEvent.date), 'yyyy-MM-dd'),
      period: scheduleEvent.period,
      specialCode: scheduleEvent.specialCode,
      timestamp: new Date().toISOString()
    });

    this.specialDayManagement.deleteSpecialDay(scheduleEvent).subscribe({
      next: () => {
        this.toastr.success(`Deleted special day from Period ${scheduleEvent.period}`, 'Success');
      },
      error: (err) => {
        console.error('[SpecialDayModalService] Failed to delete special day:', err);
        this.toastr.error('Failed to delete special day', 'Error');
      }
    });
  }

  // Delete special day from event - UNCHANGED
  deleteSpecialDayFromEvent(event: EventClickArg): void {
    const eventId = this.extractEventIdFromCalendarEvent(event);
    if (!eventId) {
      this.toastr.error('Cannot identify event to delete', 'Error');
      return;
    }

    const scheduleEvent = this.specialDayManagement.findSpecialDayById(eventId);
    
    if (!scheduleEvent) {
      this.toastr.error('Selected item is not a special day', 'Error');
      return;
    }

    console.log('[SpecialDayModalService] Deleting special day from calendar event', {
      eventId: eventId,
      period: scheduleEvent.period,
      specialCode: scheduleEvent.specialCode
    });

    this.specialDayManagement.deleteSpecialDay(scheduleEvent).subscribe({
      next: () => {
        this.toastr.success(`Deleted special day from Period ${scheduleEvent.period}`, 'Success');
      },
      error: (err) => {
        console.error('[SpecialDayModalService] Failed to delete special day:', err);
        this.toastr.error('Failed to delete special day', 'Error');
      }
    });
  }

  // Show information about error days - ENHANCED for period support
  showErrorDayInfo(period?: number): void {
    const message = period 
      ? `Period ${period} has no lesson assigned because there are more school periods than lessons. Add more lessons to your course or adjust the schedule.`
      : 'This day has no lesson assigned because there are more school days than lessons. Add more lessons to your course or adjust the schedule end date.';
      
    this.toastr.info(message, 'Error Day Information', { timeOut: 8000 });
  }

  // Open modal with prepared data (internal helper) - UNCHANGED
  private openModalWithData(modalData: SpecialDayModalData, originalMode: 'add' | 'edit', originalScheduleEvent?: ScheduleEvent): void {
    // Open the modal
    const dialogRef = this.dialog.open(SpecialDayModalComponent, {
      data: modalData,
      width: '600px',
      maxWidth: '90vw',
      panelClass: 'special-day-modal-container'
    });

    // Handle modal result
    dialogRef.afterClosed().subscribe((result: SpecialDayResult | undefined) => {
      if (result) {
        this.handleModalResult(result, originalMode, originalScheduleEvent);
      } else {
        console.log('[SpecialDayModalService] Modal cancelled', { 
          mode: originalMode,
          periods: modalData.periods,
          timestamp: new Date().toISOString() 
        });
      }
    });
  }

  // Prepare existing data from event for edit mode - UPDATED for multi-period
  private prepareExistingDataFromEvent(event: EventClickArg): { id: number; periods: number[]; specialCode: string; title: string; description?: string; date: Date } | null {
    const currentSchedule = this.scheduleStateService.selectedSchedule();
    if (!currentSchedule?.scheduleEvents) {
      console.error(`[SpecialDayModalService] Cannot get existing data: No schedule available`, { 
        timestamp: new Date().toISOString() 
      });
      this.toastr.error('No schedule available', 'Error');
      return null;
    }

    const eventId = this.extractEventIdFromCalendarEvent(event);
    if (!eventId) {
      this.toastr.error('Cannot identify event', 'Error');
      return null;
    }

    const scheduleEvent = this.specialDayManagement.findSpecialDayById(eventId);
    
    if (!scheduleEvent) {
      this.toastr.error('Selected item is not a special day', 'Error');
      return null;
    }

    const specialDayData = this.specialDayManagement.extractSpecialDayData(scheduleEvent);
    if (!specialDayData) {
      this.toastr.error('Could not extract special day data', 'Error');
      return null;
    }

    return {
      id: scheduleEvent.id,
      periods: specialDayData.periods,       // Multi-period support
      specialCode: specialDayData.specialCode,
      title: specialDayData.title,
      description: specialDayData.description,
      date: specialDayData.date
    };
  }

  // Extract event ID from calendar event (handles period-based event IDs) - UNCHANGED
  private extractEventIdFromCalendarEvent(event: EventClickArg): number | null {
    const eventId = event.event.id;
    
    // Handle period-based event IDs like "123-period-2"
    if (eventId.includes('-period-')) {
      const scheduleDayId = parseInt(eventId.split('-period-')[0], 10);
      return isNaN(scheduleDayId) ? null : scheduleDayId;
    }
    
    // Handle simple numeric IDs
    const numericId = parseInt(eventId, 10);
    return isNaN(numericId) ? null : numericId;
  }

  // Handle the result from the modal - UPDATED for multi-period support
  private handleModalResult(result: SpecialDayResult, originalMode: 'add' | 'edit', originalScheduleEvent?: ScheduleEvent): void {
    console.log('[SpecialDayModalService] Processing modal result', { 
      action: result.action, 
      originalMode,
      periods: result.data?.periods,
      timestamp: new Date().toISOString() 
    });

    if (result.action === 'save') {
      if (!result.data) {
        console.error('[SpecialDayModalService] No data provided for save action');
        this.toastr.error('No data provided', 'Error');
        return;
      }

      // Validate the data first
      const validation = this.specialDayManagement.validateSpecialDayData(result.data);
      if (!validation.isValid) {
        console.error('[SpecialDayModalService] Invalid special day data:', validation.errors);
        this.toastr.error(`Invalid data: ${validation.errors.join(', ')}`, 'Validation Error');
        return;
      }

      if (originalMode === 'add') {
        this.specialDayManagement.createSpecialDay(result.data).subscribe({
          next: (createdEvents) => {
            const periodText = createdEvents.length === 1 
              ? `Period ${createdEvents[0].period}` 
              : `Periods ${createdEvents.map(e => e.period).join(', ')}`;
            this.toastr.success(`Created special day for ${periodText}`, 'Success');
          },
          error: (err) => {
            console.error('[SpecialDayModalService] Failed to create special day:', err);
            this.toastr.error('Failed to create special day', 'Error');
          }
        });
      } else if (originalScheduleEvent) {
        // For edit mode, we update the single event (since edit is per-period)
        this.specialDayManagement.updateSpecialDay(result.data, originalScheduleEvent).subscribe({
          next: (updatedEvent) => {
            this.toastr.success(`Updated special day for Period ${updatedEvent.period}`, 'Success');
          },
          error: (err) => {
            console.error('[SpecialDayModalService] Failed to update special day:', err);
            this.toastr.error('Failed to update special day', 'Error');
          }
        });
      } else {
        console.error('[SpecialDayModalService] Edit mode but no original schedule event provided');
        this.toastr.error('Update operation failed - missing context', 'Error');
      }
    } else if (result.action === 'delete') {
      if (originalScheduleEvent) {
        this.specialDayManagement.deleteSpecialDay(originalScheduleEvent).subscribe({
          next: () => {
            this.toastr.success(`Deleted special day from Period ${originalScheduleEvent.period}`, 'Success');
          },
          error: (err) => {
            console.error('[SpecialDayModalService] Failed to delete special day:', err);
            this.toastr.error('Failed to delete special day', 'Error');
          }
        });
      } else {
        console.error('[SpecialDayModalService] Delete action but no original schedule event provided');
        this.toastr.error('Delete operation failed - missing context', 'Error');
      }
    }
  }
}